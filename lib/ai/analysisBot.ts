// Analysis bot (PLAN.md §6). Numbers are computed in code (stats.ts); Gemini only writes
// a short summary of them. The report is saved to analysis_reports and feeds the recommender
// and the study planner.

import { supabaseAdmin } from "@/lib/supabase";
import type { AnalysisReport, Difficulty } from "@/lib/types";
import { generateJson, llmAvailable, logFallback } from "./llm";
import { computeStats, fallbackSummary, type AnswerRow, type PerformanceStats } from "./stats";

export interface AnalysisPayload {
  stats: PerformanceStats;
  /** "ai" when Gemini wrote the summary, "fallback" when the template did */
  summary_source: "ai" | "fallback";
  error?: string;
}

type Row = { is_correct: boolean; time_ms: number; created_at: string; questions: { topic: string; difficulty: Difficulty } | null };

export async function loadAnswerRows(userId: number): Promise<AnswerRow[]> {
  const { data, error } = await supabaseAdmin().from("answers")
    .select("is_correct,time_ms,created_at,questions(topic,difficulty)").eq("user_id", userId)
    .order("created_at", { ascending: true }).limit(2000);
  if (error) throw error;
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.questions)
    .map((r) => ({ is_correct: r.is_correct, time_ms: r.time_ms, created_at: r.created_at, topic: r.questions!.topic, difficulty: r.questions!.difficulty }));
}

const SYSTEM = `You are a study coach for a first-year Mathematical Analysis I student.
You get performance numbers that were already computed. Write a short summary (3-4 sentences, max 90 words) addressed to the student as "you".
Rules: use only the numbers given, never invent new ones. Name the weakest topics and one concrete next step for each. Mention the mistake pattern (rushing vs. getting stuck) if it is clear. Encouraging but honest. No answers to specific questions. Plain text, English.`;

/** Builds a new report for the user and saves it. Never throws for AI problems. */
export async function runAnalysis(userId: number): Promise<AnalysisReport> {
  const stats = computeStats(await loadAnswerRows(userId));

  let summary = fallbackSummary(stats);
  let payload: AnalysisPayload = { stats, summary_source: "fallback" };
  if (stats.total > 0 && llmAvailable()) {
    try {
      summary = await generateJson({
        agent: "analysisBot",
        userId,
        system: SYSTEM,
        prompt: `Performance numbers (JSON):\n${JSON.stringify(stats)}\n\nReturn {"summary": "..."}.`,
        responseSchema: { type: "OBJECT", properties: { summary: { type: "STRING" } }, required: ["summary"] },
        temperature: 0.4,
        parse: (raw) => {
          const s = (raw as { summary?: unknown }).summary;
          if (typeof s !== "string" || s.trim().length < 20) throw new Error("summary missing");
          return s.trim().slice(0, 1000);
        },
      });
      payload = { stats, summary_source: "ai" };
    } catch (e) {
      payload = { stats, summary_source: "fallback", error: e instanceof Error ? e.message : String(e) };
    }
  }
  if (payload.summary_source === "fallback") await logFallback("analysisBot", userId, payload.error ?? (stats.total ? "no GEMINI_API_KEY" : "no answers"), summary);

  const { data, error } = await supabaseAdmin().from("analysis_reports")
    .insert({ user_id: userId, payload, summary }).select("*").single();
  if (error) throw error;
  return data as AnalysisReport;
}

export async function latestAnalysis(userId: number): Promise<AnalysisReport | null> {
  const { data, error } = await supabaseAdmin().from("analysis_reports").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as AnalysisReport | null) ?? null;
}
