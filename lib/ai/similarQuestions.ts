// Similar-question agent (PLAN.md §6, Claude 3).
// For each question the student got wrong, makes new questions that practise the same concept
// with different numbers or functions. New rows are linked with parent_question_id and saved as
// status='pending_review', so they never enter the daily test pool, only retry tests.
//
// Used by startRetry() in app/tests/actions.ts (integration by Claude 1).

import { supabaseAdmin } from "@/lib/supabase";
import type { Difficulty, Question } from "@/lib/types";
import { generateJson, llmAvailable, type GeminiSchema } from "./llm";
import { checkGeneratedQuestion, normalizeText, shuffleChoices, type CheckedQuestion, type ParentInfo } from "./questionCheck";

export const SIMILAR_SOURCE = "ai-similar";
const ORDER: Difficulty[] = ["easy", "medium", "hard"];
const MAX_PER_PARENT = 3;

export interface SimilarQuestionsInput {
  userId: number;
  courseId: number;
  /** Questions the user got wrong, e.g. from wrongQuestionIds(). */
  wrongQuestionIds: number[];
  /** How many question ids to return at most. Default 10. */
  max?: number;
}

export interface SimilarQuestionsResult {
  /** Question ids ready for test_sessions.question_ids, easy → hard. May be fewer than `max` (or empty). */
  ids: number[];
  /** How many of `ids` were generated in this call (the rest are earlier AI questions the user has not answered yet). */
  generated: number;
  /** Set when Gemini failed or is not configured. The caller should fill the rest from seed questions. */
  error?: string;
}

const responseSchema: GeminiSchema = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          parent_id: { type: "INTEGER", description: "id of the original question this one is based on" },
          prompt: { type: "STRING" },
          choices: { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 },
          correct_index: { type: "INTEGER", description: "0-based index of the only correct choice" },
          final_answer: { type: "STRING", description: "exact copy of choices[correct_index]" },
          explanation: { type: "STRING" },
        },
        required: ["parent_id", "prompt", "choices", "correct_index", "final_answer", "explanation"],
      },
    },
  },
  required: ["questions"],
};

const SYSTEM = `You write practice questions for a university Mathematical Analysis I course.
A student answered some questions wrong. For each original question, write new multiple-choice questions that train the SAME concept and method at the SAME difficulty, using different numbers, functions or set-up. Never copy or lightly reword the original.
Rules:
- Exactly 4 choices, exactly one correct. Wrong choices must come from typical student mistakes for this topic.
- Work out the solution carefully before choosing correct_index. final_answer must be an exact copy of choices[correct_index].
- The explanation is shown only AFTER the student answers. It explains the method and the usual mistake in 1-3 sentences. It must not mention the original question.
- Plain text with Unicode math, like the examples (e.g. lim_{x→0}, x², √x, ∫, π, e^x). No LaTeX, no Markdown.
- Write in English.`;

function buildPrompt(parents: Question[], counts: Map<number, number>): string {
  const items = parents.map((p) => ({
    parent_id: p.id,
    topic: p.topic,
    difficulty: p.difficulty,
    prompt: p.prompt,
    choices: p.choices,
    correct_answer: p.choices[p.correct_index],
    explanation: p.explanation,
    how_many_new_questions: counts.get(p.id),
  }));
  return `Original questions the student got wrong (JSON):\n${JSON.stringify(items, null, 2)}\n\nReturn {"questions": [...]} with how_many_new_questions items for each parent_id.`;
}

const byDifficulty = (a: { difficulty: Difficulty }, b: { difficulty: Difficulty }) => ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty);

/**
 * Returns ids of questions similar to the ones the user got wrong.
 * Reuses earlier AI questions the user has not answered yet, and asks Gemini only for the missing ones.
 * Never throws for AI problems: on failure it returns what it has plus `error`.
 */
export async function generateSimilarQuestions(input: SimilarQuestionsInput): Promise<SimilarQuestionsResult> {
  const { userId, courseId } = input;
  const max = Math.max(1, Math.min(input.max ?? 10, 20));
  const wrong = [...new Set(input.wrongQuestionIds)];
  if (wrong.length === 0) return { ids: [], generated: 0 };
  const db = supabaseAdmin();

  // 1. Parents: the wrong questions in this course (most recent ids first, at most `max`).
  const { data: parentRows, error: pErr } = await db.from("questions").select("*")
    .eq("course_id", courseId).in("id", wrong).order("id", { ascending: false }).limit(max);
  if (pErr) throw pErr;
  const parents = (parentRows ?? []) as Question[];
  if (parents.length === 0) return { ids: [], generated: 0 };
  const perParent = Math.min(MAX_PER_PARENT, Math.ceil(max / parents.length));

  // 2. Cache: earlier AI children of these parents that this user has not answered yet.
  const [{ data: childRows, error: cErr }, { data: answered, error: aErr }] = await Promise.all([
    db.from("questions").select("id,parent_question_id,difficulty,prompt").eq("course_id", courseId).eq("source", SIMILAR_SOURCE)
      .in("parent_question_id", parents.map((p) => p.id)),
    db.from("answers").select("question_id").eq("user_id", userId),
  ]);
  if (cErr) throw cErr;
  if (aErr) throw aErr;
  const seen = new Set(((answered ?? []) as { question_id: number }[]).map((a) => a.question_id));
  const children = (childRows ?? []) as Pick<Question, "id" | "parent_question_id" | "difficulty" | "prompt">[];

  const reuse: { id: number; difficulty: Difficulty }[] = [];
  const missing = new Map<number, number>();
  for (const p of parents) {
    const fresh = children.filter((c) => c.parent_question_id === p.id && !seen.has(c.id)).slice(0, perParent);
    reuse.push(...fresh.map((c) => ({ id: c.id, difficulty: c.difficulty })));
    if (fresh.length < perParent) missing.set(p.id, perParent - fresh.length);
  }

  const finish = (made: { id: number; difficulty: Difficulty }[], error?: string): SimilarQuestionsResult => ({
    ids: [...reuse, ...made].sort(byDifficulty).slice(0, max).map((q) => q.id),
    generated: made.length,
    ...(error ? { error } : {}),
  });

  if (missing.size === 0) return finish([]);
  if (!llmAvailable()) return finish([], "AI is not configured (GEMINI_API_KEY missing). Using saved questions.");

  // 3. Ask Gemini for the missing ones and check every question in code.
  const need = parents.filter((p) => missing.has(p.id));
  const parentInfo = new Map<number, ParentInfo>(need.map((p) => [p.id, { id: p.id, topic: p.topic, difficulty: p.difficulty }]));
  const { data: coursePrompts } = await db.from("questions").select("prompt").eq("course_id", courseId);
  const knownPrompts = new Set(((coursePrompts ?? []) as { prompt: string }[]).map((q) => normalizeText(q.prompt)));

  let checked: CheckedQuestion[];
  try {
    checked = await generateJson({
      agent: "similarQuestions",
      system: SYSTEM,
      prompt: buildPrompt(need, missing),
      responseSchema,
      temperature: 0.8,
      parse: (raw) => {
        const list = (raw as { questions?: unknown }).questions;
        if (!Array.isArray(list)) throw new Error("missing questions array");
        const seenPrompts = new Set(knownPrompts);
        const left = new Map(missing);
        const ok: CheckedQuestion[] = [];
        const reasons: string[] = [];
        for (const item of list) {
          const r = checkGeneratedQuestion(item ?? {}, parentInfo, seenPrompts);
          if (!r.ok) { reasons.push(r.reason); continue; }
          const n = left.get(r.question.parent_id) ?? 0;
          if (n <= 0) continue; // more than we asked for
          left.set(r.question.parent_id, n - 1);
          ok.push(r.question);
        }
        if (ok.length === 0) throw new Error(`no valid questions (${reasons.slice(0, 3).join("; ") || "empty list"})`);
        if (reasons.length) console.warn(JSON.stringify({ ai: "similarQuestions", dropped: reasons }));
        return ok;
      },
    });
  } catch (e) {
    return finish([], `Could not generate new questions right now (${e instanceof Error ? e.message : String(e)}). Using saved questions.`);
  }

  // 4. Save as pending_review, linked to the parent.
  const rows = checked.map((q) => {
    const s = shuffleChoices(q);
    return {
      course_id: courseId, topic: s.topic, difficulty: s.difficulty, prompt: s.prompt, choices: s.choices,
      correct_index: s.correct_index, explanation: s.explanation, source: SIMILAR_SOURCE,
      parent_question_id: s.parent_id, status: "pending_review" as const,
    };
  });
  const { data: inserted, error: iErr } = await db.from("questions").insert(rows).select("id,difficulty");
  if (iErr) return finish([], `Generated questions could not be saved (${iErr.message}).`);
  return finish((inserted ?? []) as { id: number; difficulty: Difficulty }[]);
}
