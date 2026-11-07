import Link from "next/link";
import { getCurrentUser, todayRome } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Button, Card, PageTitle } from "@/components/ui";
import type { Course } from "@/lib/types";
import { startDaily, startRetry } from "./actions";
import { wrongQuestionIds } from "./data";

export default async function TestsPage() {
  const me = await getCurrentUser();
  if (me.role !== "student") return <PageTitle sub="Switch to a student account to take tests.">Tests</PageTitle>;

  const db = supabaseAdmin();
  const [{ data: courses }, { data: today }] = await Promise.all([
    db.from("courses").select("*").eq("university_id", me.university_id ?? -1).order("id"),
    db.from("test_sessions").select("id,course_id,finished_at").eq("user_id", me.id).eq("kind", "daily").eq("date", todayRome()),
  ]);
  const list = (courses ?? []) as Course[];
  const wrong = await Promise.all(list.map((c) => wrongQuestionIds(me.id, c.id)));

  return (
    <>
      <PageTitle sub="One daily test per course: 10 questions, from easy to hard. Retry tests do not count towards it.">Tests</PageTitle>
      {list.length === 0 && <Card>No courses for your university yet.</Card>}
      <div className="grid gap-4">
        {list.map((c, i) => {
          const daily = today?.find((s) => s.course_id === c.id);
          return (
            <Card key={c.id} className="flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-zinc-500">{c.code}</div>
              </div>
              {daily?.finished_at ? (
                <Link href={`/tests/session/${daily.id}`} className="text-sm text-indigo-700 underline">Today&apos;s result</Link>
              ) : (
                <form action={startDaily.bind(null, c.id)}>
                  <Button>{daily ? "Continue today's test" : "Start today's test"}</Button>
                </form>
              )}
              <form action={startRetry.bind(null, c.id)}>
                <Button variant="ghost" disabled={wrong[i].length === 0}>Retry mistakes ({wrong[i].length})</Button>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
