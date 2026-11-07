import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Card, PageTitle } from "@/components/ui";
import type { StudyPlanPayload } from "@/lib/ai/studyPlanner";
import type { Course } from "@/lib/types";
import { SubmitButton } from "../careers/SubmitButton";
import { generateStudyPlan } from "./actions";

const ACTIVITY_LINK: Record<string, string> = { "daily test": "/tests", "retry test": "/tests" };

export default async function StudyPlanPage() {
  const me = await getCurrentUser();
  if (me.role !== "student") return <PageTitle>Study plan</PageTitle>;
  const db = supabaseAdmin();
  const [{ data: courses }, { data: plans }] = await Promise.all([
    db.from("courses").select("*").eq("university_id", me.university_id ?? -1).order("id"),
    db.from("recommendations").select("payload,created_at").eq("user_id", me.id).eq("kind", "study_plan").order("created_at", { ascending: false }).limit(1),
  ]);
  const course = ((courses ?? []) as Course[])[0];
  const plan = (plans?.[0]?.payload ?? null) as StudyPlanPayload | null;

  if (!course) return <><PageTitle>Study plan</PageTitle><Card>No course at your university yet.</Card></>;
  return (
    <>
      <PageTitle sub={`${course.name} · built from your latest analysis report`}>Study plan</PageTitle>
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {plan ? <><span className="font-medium">Focus: </span>{plan.focus}</> : "No plan yet."}
          {plan?.source === "fallback" && <span className="ml-2"><Badge tone="medium">rule-based (AI unavailable)</Badge></span>}
        </div>
        <form action={generateStudyPlan.bind(null, course.id)}>
          <SubmitButton pendingText="Planning…">{plan ? "Make a new plan" : "Make my plan"}</SubmitButton>
        </form>
      </Card>
      {plan && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plan.days.map((d) => (
            <Card key={d.day}>
              <h2 className="mb-2 font-semibold">{d.day}</h2>
              {d.tasks.length === 0 && <p className="text-sm text-zinc-500">Rest day.</p>}
              <ul className="grid gap-2 text-sm">
                {d.tasks.map((t, i) => (
                  <li key={i}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{t.minutes} min</Badge>
                      {ACTIVITY_LINK[t.activity] ? <Link href={ACTIVITY_LINK[t.activity]} className="font-medium underline">{t.activity}</Link> : <span className="font-medium">{t.activity}</span>}
                      <span className="text-zinc-600">{t.topic}</span>
                    </div>
                    {t.note && <p className="mt-0.5 text-zinc-500">{t.note}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
