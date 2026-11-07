// Pure checks for AI-generated multiple-choice questions (no DB, no network).
// Used by similarQuestions.ts now and questionGenerator.ts later.
// Run tests: node --experimental-strip-types lib/ai/questionCheck.test.ts

import type { Difficulty } from "../types.ts";

/** What we ask Gemini to return for each question. */
export interface RawGeneratedQuestion {
  parent_id?: unknown;
  prompt?: unknown;
  choices?: unknown;
  correct_index?: unknown;
  /** Must equal choices[correct_index]: a cheap self-consistency check on the model's own answer. */
  final_answer?: unknown;
  explanation?: unknown;
}

export interface CheckedQuestion {
  parent_id: number;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string;
}

export interface ParentInfo {
  id: number;
  topic: string;
  difficulty: Difficulty;
}

export type CheckResult = { ok: true; question: CheckedQuestion } | { ok: false; reason: string };

/** Lowercase, drop whitespace and most punctuation so near-identical prompts compare equal. */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFKC").replace(/[\s.,;:!?'"`()[\]{}]+/g, "");
}

const MAX_PROMPT = 600;
const MAX_CHOICE = 200;
const MAX_EXPLANATION = 1200;

/**
 * Validates one generated question against its parent.
 * Topic and difficulty always come from the parent, never from the model.
 */
export function checkGeneratedQuestion(
  raw: RawGeneratedQuestion,
  parents: Map<number, ParentInfo>,
  seenPrompts: Set<string>,
): CheckResult {
  const parentId = Number(raw.parent_id);
  const parent = parents.get(parentId);
  if (!parent) return { ok: false, reason: `unknown parent_id ${String(raw.parent_id)}` };

  if (typeof raw.prompt !== "string" || raw.prompt.trim().length < 8) return { ok: false, reason: "prompt missing or too short" };
  const prompt = raw.prompt.trim();
  if (prompt.length > MAX_PROMPT) return { ok: false, reason: "prompt too long" };

  if (!Array.isArray(raw.choices) || raw.choices.length !== 4) return { ok: false, reason: "need exactly 4 choices" };
  const choices = raw.choices.map((c) => (typeof c === "string" ? c.trim() : ""));
  if (choices.some((c) => c.length === 0 || c.length > MAX_CHOICE)) return { ok: false, reason: "empty or too long choice" };
  if (new Set(choices.map(normalizeText)).size !== 4) return { ok: false, reason: "duplicate choices" };

  const idx = raw.correct_index;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > 3) return { ok: false, reason: "correct_index must be 0-3" };

  if (typeof raw.final_answer !== "string" || normalizeText(raw.final_answer) !== normalizeText(choices[idx])) {
    return { ok: false, reason: "final_answer does not match choices[correct_index]" };
  }

  if (typeof raw.explanation !== "string" || raw.explanation.trim().length < 10) return { ok: false, reason: "explanation missing" };
  const explanation = raw.explanation.trim().slice(0, MAX_EXPLANATION);

  const key = normalizeText(prompt);
  if (seenPrompts.has(key)) return { ok: false, reason: "duplicate prompt" };
  seenPrompts.add(key);

  return {
    ok: true,
    question: { parent_id: parentId, topic: parent.topic, difficulty: parent.difficulty, prompt, choices, correct_index: idx, explanation },
  };
}

/** Shuffles the choices so the correct answer is not always in the position the model picked. */
export function shuffleChoices<T extends { choices: string[]; correct_index: number }>(q: T, rand: () => number = Math.random): T {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, choices: order.map((i) => q.choices[i]), correct_index: order.indexOf(q.correct_index) };
}
