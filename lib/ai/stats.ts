// Performance numbers for the analysis bot. All math happens here, in code; Gemini only
// turns the result into a short summary (PLAN.md §6). Pure: no DB, no network.
// Tests: node --experimental-strip-types lib/ai/stats.test.ts

import type { Difficulty } from "../types.ts";
import { TARGET_MS } from "../xp.ts";

export interface AnswerRow {
  is_correct: boolean;
  time_ms: number;
  created_at: string;
  topic: string;
  difficulty: Difficulty;
}

export interface TopicStat { topic: string; n: number; correct: number; accuracy: number }
export interface DifficultyStat { difficulty: Difficulty; n: number; accuracy: number; avgSeconds: number; targetSeconds: number }
export interface DayStat { date: string; n: number; accuracy: number }

export interface PerformanceStats {
  total: number;
  correct: number;
  accuracy: number;
  /** weakest first */
  byTopic: TopicStat[];
  byDifficulty: DifficultyStat[];
  last7Days: DayStat[];
  trend: "improving" | "declining" | "steady" | "not enough data";
  mistakes: {
    /** wrong and answered in under a quarter of the target time: likely guessing or rushing */
    rushed: number;
    /** wrong after more than the target time: likely stuck on the method */
    stuck: number;
    other: number;
    /** topics with the most wrong answers */
    topWrongTopics: { topic: string; wrong: number }[];
  };
  /** topics with at least 2 answers and accuracy below 60%, weakest first (max 3) */
  weakTopics: string[];
  /** topics with at least 2 answers and accuracy of 80% or more */
  strongTopics: string[];
}

const ORDER: Difficulty[] = ["easy", "medium", "hard"];
const round2 = (x: number) => Math.round(x * 100) / 100;

export function computeStats(rows: AnswerRow[], now: Date = new Date()): PerformanceStats {
  const total = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;

  const topics = new Map<string, { n: number; correct: number }>();
  for (const r of rows) {
    const t = topics.get(r.topic) ?? { n: 0, correct: 0 };
    t.n++; if (r.is_correct) t.correct++;
    topics.set(r.topic, t);
  }
  const byTopic = [...topics.entries()]
    .map(([topic, t]) => ({ topic, n: t.n, correct: t.correct, accuracy: round2(t.correct / t.n) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.n - a.n);

  const byDifficulty = ORDER.map((difficulty) => {
    const list = rows.filter((r) => r.difficulty === difficulty);
    const n = list.length;
    return {
      difficulty, n,
      accuracy: n ? round2(list.filter((r) => r.is_correct).length / n) : 0,
      avgSeconds: n ? Math.round(list.reduce((s, r) => s + r.time_ms, 0) / n / 100) / 10 : 0,
      targetSeconds: TARGET_MS[difficulty] / 1000,
    };
  }).filter((d) => d.n > 0);

  // last 7 days (UTC dates are fine for a weekly trend)
  const days: DayStat[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const list = rows.filter((r) => r.created_at.slice(0, 10) === d);
    if (list.length) days.push({ date: d, n: list.length, accuracy: round2(list.filter((r) => r.is_correct).length / list.length) });
  }
  let trend: PerformanceStats["trend"] = "not enough data";
  if (days.length >= 2) {
    const half = Math.floor(days.length / 2);
    const avg = (l: DayStat[]) => l.reduce((s, d) => s + d.accuracy, 0) / l.length;
    const diff = avg(days.slice(-half)) - avg(days.slice(0, half));
    trend = diff > 0.1 ? "improving" : diff < -0.1 ? "declining" : "steady";
  }

  let rushed = 0, stuck = 0, other = 0;
  const wrongByTopic = new Map<string, number>();
  for (const r of rows) {
    if (r.is_correct) continue;
    const target = TARGET_MS[r.difficulty];
    if (r.time_ms < target / 4) rushed++;
    else if (r.time_ms > target) stuck++;
    else other++;
    wrongByTopic.set(r.topic, (wrongByTopic.get(r.topic) ?? 0) + 1);
  }
  const topWrongTopics = [...wrongByTopic.entries()].map(([topic, wrong]) => ({ topic, wrong }))
    .sort((a, b) => b.wrong - a.wrong).slice(0, 3);

  return {
    total, correct, accuracy: total ? round2(correct / total) : 0,
    byTopic, byDifficulty, last7Days: days, trend,
    mistakes: { rushed, stuck, other, topWrongTopics },
    weakTopics: byTopic.filter((t) => t.n >= 2 && t.accuracy < 0.6).slice(0, 3).map((t) => t.topic),
    strongTopics: byTopic.filter((t) => t.n >= 2 && t.accuracy >= 0.8).map((t) => t.topic),
  };
}

/** Plain-language summary used when Gemini is not available. */
export function fallbackSummary(s: PerformanceStats): string {
  if (s.total === 0) return "No answers yet. Take a daily test so the analysis has something to work with.";
  const parts = [`You answered ${s.total} questions with ${Math.round(s.accuracy * 100)}% accuracy.`];
  if (s.weakTopics.length) parts.push(`Focus next on ${s.weakTopics.join(", ")}.`);
  if (s.strongTopics.length) parts.push(`You are solid in ${s.strongTopics.slice(0, 2).join(" and ")}.`);
  if (s.mistakes.rushed > s.mistakes.stuck && s.mistakes.rushed >= 2) parts.push("Several wrong answers came very fast: slow down and check the method before choosing.");
  else if (s.mistakes.stuck >= 2) parts.push("Several wrong answers took longer than the target time: review the method for those topics before practising speed.");
  if (s.trend === "improving") parts.push("Your accuracy is improving this week.");
  if (s.trend === "declining") parts.push("Your accuracy dropped this week.");
  return parts.join(" ");
}
