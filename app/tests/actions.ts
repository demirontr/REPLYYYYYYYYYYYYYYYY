"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, todayRome } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { awardXp, xpForAnswer } from "@/lib/xp";
import type { Difficulty, Question, TestSession } from "@/lib/types";
import { wrongQuestionIds } from "./data";
import { generateSimilarQuestions } from "@/lib/ai/similarQuestions";
import { explainMistake } from "@/lib/ai/explainMistake";
import { DEMO_MODE } from "@/lib/demo";

const ORDER: Difficulty[] = ["easy", "medium", "hard"];
const DAILY_MIX: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 3 };
const MAX_TIME_MS = 10 * 60_000;

const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const byDifficulty = (a: Pick<Question, "difficulty">, b: Pick<Question, "difficulty">) => ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty);

async function approvedQuestions(courseId: number) {
  const { data, error } = await supabaseAdmin()
    .from("questions").select("id,topic,difficulty").eq("course_id", courseId).eq("status", "approved");
  if (error) throw error;
  return data as Pick<Question, "id" | "topic" | "difficulty">[];
}

async function dailyMix(courseId: number): Promise<number[]> {
  const pool = shuffle(await approvedQuestions(courseId));
  const ids = ORDER.flatMap((d) => pool.filter((q) => q.difficulty === d).slice(0, DAILY_MIX[d])).map((q) => q.id);
  if (ids.length === 0) throw new Error("This course has no approved questions yet.");
  return ids;
}

/** Presentation build only: a fresh 10-question test every time, no daily limit. */
export async function startDemoTest(courseId: number) {
  if (!DEMO_MODE) throw new Error("Only available in the presentation build");
  const me = await getCurrentUser();
  const { data, error } = await supabaseAdmin().from("test_sessions")
    .insert({ user_id: me.id, course_id: courseId, kind: "retry", question_ids: await dailyMix(courseId), date: todayRome() })
    .select("id").single();
  if (error) throw error;
  redirect(`/tests/session/${data.id}`);
}

/** Start (or resume) today's daily test: 10 questions, 3 easy / 4 medium / 3 hard, easy first. */
export async function startDaily(courseId: number) {
  const me = await getCurrentUser();
  const db = supabaseAdmin();
  const date = todayRome();

  const existing = await db.from("test_sessions").select("id")
    .eq("user_id", me.id).eq("course_id", courseId).eq("kind", "daily").eq("date", date).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) redirect(`/tests/session/${existing.data.id}`);

  const ids = await dailyMix(courseId);

  const { data, error } = await db.from("test_sessions")
    .insert({ user_id: me.id, course_id: courseId, kind: "daily", question_ids: ids, date })
    .select("id").single();
  if (error?.code === "23505") redirect("/tests"); // double click: the other request created it
  if (error) throw error;
  redirect(`/tests/session/${data.id}`);
}

/** Retry test on the topics the user got wrong. Does not use up the daily test. */
export async function startRetry(courseId: number) {
  const me = await getCurrentUser();
  const wrong = await wrongQuestionIds(me.id, courseId);
  if (wrong.length === 0) redirect("/tests");

  // AI-made similar questions first (never throws on AI errors), then same-topic seed questions fill the gap
  const ai = await generateSimilarQuestions({ userId: me.id, courseId, wrongQuestionIds: wrong, max: 10 });
  const pool = await approvedQuestions(courseId);
  const wrongTopics = new Set(pool.filter((q) => wrong.includes(q.id)).map((q) => q.topic));
  const { data: answered } = await supabaseAdmin().from("answers").select("question_id").eq("user_id", me.id).eq("is_correct", true);
  const solved = new Set((answered ?? []).map((a) => a.question_id as number));
  const fallback = shuffle(pool.filter((q) => wrongTopics.has(q.topic) && !solved.has(q.id))).sort(byDifficulty).map((q) => q.id);
  const ids = [...ai.ids, ...fallback.filter((id) => !ai.ids.includes(id))].slice(0, 10);

  const { data, error } = await supabaseAdmin().from("test_sessions")
    .insert({ user_id: me.id, course_id: courseId, kind: "retry", question_ids: ids, date: todayRome() })
    .select("id").single();
  if (error) throw error;
  redirect(`/tests/session/${data.id}`);
}

export interface AnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  xp: number;
  finished: boolean;
}

/**
 * Records one answer. The correct answer and explanation are only returned here, after the
 * answer is stored, so the client never sees them before answering.
 */
export async function submitAnswer(sessionId: number, questionId: number, chosenIndex: number, timeMs: number): Promise<AnswerResult> {
  const me = await getCurrentUser();
  const db = supabaseAdmin();
  if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex > 3) throw new Error("Invalid choice");
  const time = Math.min(Math.max(Math.round(Number(timeMs) || 0), 0), MAX_TIME_MS);

  const s = await db.from("test_sessions").select("*").eq("id", sessionId).single();
  if (s.error) throw s.error;
  const session = s.data as TestSession;
  if (session.user_id !== me.id) throw new Error("Not your test");
  if (session.finished_at) throw new Error("Test already finished");
  if (!session.question_ids.includes(questionId)) throw new Error("Question not in this test");

  const q = await db.from("questions").select("difficulty,correct_index,explanation").eq("id", questionId).single();
  if (q.error) throw q.error;
  const isCorrect = chosenIndex === q.data.correct_index;
  // duels and tournaments give no per-question XP (only winner bonuses, see issue #1)
  const xp = session.kind === "daily" || session.kind === "retry" ? xpForAnswer(q.data.difficulty, isCorrect, time) : 0;

  const ins = await db.from("answers").insert({
    session_id: sessionId, user_id: me.id, question_id: questionId,
    chosen_index: chosenIndex, is_correct: isCorrect, time_ms: time, xp_awarded: xp,
  });
  if (ins.error?.code === "23505") throw new Error("Already answered");
  if (ins.error) throw ins.error;
  if (xp > 0) await awardXp(me.id, xp);

  const all = await db.from("answers").select("xp_awarded").eq("session_id", sessionId);
  if (all.error) throw all.error;
  const finished = all.data.length >= session.question_ids.length;
  if (finished) {
    const total = all.data.reduce((sum, a) => sum + (a.xp_awarded as number), 0);
    const up = await db.from("test_sessions").update({ finished_at: new Date().toISOString(), total_xp: total }).eq("id", sessionId);
    if (up.error) throw up.error;
  }
  return { isCorrect, correctIndex: q.data.correct_index, explanation: q.data.explanation, xp, finished };
}

/** "Why was I wrong?": the agent refuses (BoundaryError) unless this user already answered this question. */
export async function explainAnswer(sessionId: number, questionId: number) {
  const me = await getCurrentUser();
  return explainMistake(me.id, sessionId, questionId);
}
