// Study plan agent (PLAN.md §6): turns the latest analysis report into a weekly plan
// (day → topic → minutes → which test). Saved as recommendations.kind = 'study_plan'.

import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/lib/types";
import { generateJson, llmAvailable, logFallback, type GeminiSchema } from "./llm";
import { latestAnalysis, runAnalysis, type AnalysisPayload } from "./analysisBot";
import { ACTIVITIES, DAYS, fallbackPlan, validatePlan, type StudyPlan } from "./studyPlanCore";

export interface StudyPlanPayload extends StudyPlan { run: number; source: "ai" | "fallback"; course_id: number; error?: string }

const responseSchema: GeminiSchema = {
  type: "OBJECT",
  properties: {
    focus: { type: "STRING" },
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "STRING", enum: [...DAYS] },
          tasks: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                topic: { type: "STRING" },
                minutes: { type: "INTEGER" },
                activity: { type: "STRING", enum: [...ACTIVITIES] },
                note: { type: "STRING" },
              },
              required: ["topic", "minutes", "activity", "note"],
            },
          },
        },
        required: ["day", "tasks"],
      },
    },
  },
  required: ["focus", "days"],
};

const SYSTEM = `You plan one study week for a first-year Mathematical Analysis I student.
Use only the topics and activities given. Give weak topics more time and put a "retry test" after reviewing them. Keep the daily test on weekdays (topic "all topics"). 10-120 minutes per task, at most 150 minutes per day, a lighter weekend.
Each note is one short, practical sentence (what to do, not the answer to any question). Plain text, English.`;

export async function runStudyPlanner(me: User, courseId: number): Promise<StudyPlanPayload> {
  const db = supabaseAdmin();
  let report = await latestAnalysis(me.id);
  if (!report || report.created_at.slice(0, 10) !== new Date().toISOString().slice(0, 10)) report = await runAnalysis(me.id);
  const stats = (report.payload as unknown as AnalysisPayload).stats;

  const { data: qs, error: qErr } = await db.from("questions").select("topic").eq("course_id", courseId).eq("status", "approved");
  if (qErr) throw qErr;
  const topics = [...new Set(((qs ?? []) as { topic: string }[]).map((q) => q.topic))];

  let plan: StudyPlan;
  let source: "ai" | "fallback" = "fallback";
  let error: string | undefined = llmAvailable() ? undefined : "AI is not configured (GEMINI_API_KEY missing)";
  if (llmAvailable()) {
    try {
      plan = await generateJson({
        agent: "studyPlanner",
        userId: me.id,
        system: SYSTEM,
        prompt: `Data (JSON):\n${JSON.stringify({
          topics, activities: ACTIVITIES, days: DAYS,
          analysis_summary: report.summary,
          by_topic: stats.byTopic, weak_topics: stats.weakTopics, mistakes: stats.mistakes, trend: stats.trend,
        })}\n\nReturn the JSON plan.`,
        responseSchema,
        temperature: 0.5,
        parse: (raw) => validatePlan(raw, topics),
      });
      source = "ai";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      plan = fallbackPlan(topics, stats.weakTopics);
    }
  } else {
    plan = fallbackPlan(topics, stats.weakTopics);
  }
  if (source === "fallback") await logFallback("studyPlanner", me.id, error ?? "", plan);

  const payload: StudyPlanPayload = { ...plan, run: Date.now(), source, course_id: courseId, ...(error ? { error } : {}) };
  const { error: insErr } = await db.from("recommendations").insert({ user_id: me.id, kind: "study_plan", item_id: courseId, payload, reason: plan.focus });
  if (insErr) throw insErr;
  return payload;
}
