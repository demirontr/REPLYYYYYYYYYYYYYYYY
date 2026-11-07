// "Explain" agent with the boundary rule enforced in code (PLAN.md §6):
// - it refuses to run before the student has answered the question (checked in the DB, not in the prompt);
// - it explains WHY the chosen answer is wrong and what to check next time,
//   instead of simply repeating the correct answer.
// For the Quiz screen (Claude 1): call explainMistake after submitAnswer returned isCorrect = false.

import { supabaseAdmin } from "@/lib/supabase";
import type { Question } from "@/lib/types";
import { generateJson, llmAvailable, logFallback } from "./llm";

export class BoundaryError extends Error {
  constructor(message: string) { super(message); this.name = "BoundaryError"; }
}

export interface Explanation { text: string; source: "ai" | "fallback" }

const SYSTEM = `You are a tutor. The student already answered this multiple-choice question and got it wrong.
Explain in 2-4 sentences the most likely reasoning error that leads to the student's chosen answer, and one thing to check next time.
Do not just restate the correct answer or the full solution; focus on the mistake. Never give answers to other questions. Plain text with Unicode math, English.`;

export async function explainMistake(userId: number, sessionId: number, questionId: number): Promise<Explanation> {
  const db = supabaseAdmin();
  // Boundary rule: only after this user answered this question in this session.
  const { data: ans, error } = await db.from("answers").select("chosen_index,is_correct")
    .eq("session_id", sessionId).eq("question_id", questionId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!ans) throw new BoundaryError("Answer the question first. Explanations are only available after you answer.");

  const { data: q, error: qErr } = await db.from("questions").select("*").eq("id", questionId).single();
  if (qErr) throw qErr;
  const question = q as Question;
  if (ans.is_correct) return { text: question.explanation, source: "fallback" };

  if (llmAvailable()) {
    try {
      const text = await generateJson({
        agent: "explainMistake",
        userId,
        system: SYSTEM,
        prompt: JSON.stringify({
          topic: question.topic, question: question.prompt, choices: question.choices,
          student_answer: question.choices[ans.chosen_index], correct_answer: question.choices[question.correct_index],
          reference_explanation: question.explanation,
        }),
        responseSchema: { type: "OBJECT", properties: { explanation: { type: "STRING" } }, required: ["explanation"] },
        temperature: 0.3,
        parse: (raw) => {
          const t = (raw as { explanation?: unknown }).explanation;
          if (typeof t !== "string" || t.trim().length < 20) throw new Error("explanation missing");
          return t.trim().slice(0, 800);
        },
      });
      return { text, source: "ai" };
    } catch { /* fall through to the stored explanation */ }
  }
  await logFallback("explainMistake", userId, llmAvailable() ? "gemini failed" : "no GEMINI_API_KEY", question.explanation);
  return { text: question.explanation, source: "fallback" };
}
