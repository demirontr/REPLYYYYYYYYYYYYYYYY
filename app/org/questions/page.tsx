import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import type { Course, Question } from "@/lib/types";
import { SubmitButton } from "@/app/careers/SubmitButton";
import { approve, generate, reject } from "./actions";

const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

export default async function QuestionReviewPage({ searchParams }: PageProps<"/org/questions">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const me = await getCurrentUser();
  if (me.role !== "university") return <PageTitle sub="Switch to the university account to review questions.">Question review</PageTitle>;

  const db = supabaseAdmin();
  const { data: courses } = await db.from("courses").select("*").eq("university_id", me.university_id ?? -1).order("id");
  const course = ((courses ?? []) as Course[])[0];
  if (!course) return <><PageTitle>Question review</PageTitle><Card>No course yet.</Card></>;

  const [{ data: pending }, { data: topicRows }] = await Promise.all([
    db.from("questions").select("*").eq("course_id", course.id).eq("status", "pending_review").order("id", { ascending: false }).limit(50),
    db.from("questions").select("topic").eq("course_id", course.id).eq("status", "approved"),
  ]);
  const list = (pending ?? []) as Question[];
  const topics = [...new Set(((topicRows ?? []) as { topic: string }[]).map((t) => t.topic))];
  const generated = one("generated"), rejectedN = one("rejected"), error = one("error");

  return (
    <>
      <PageTitle sub={<><Link href="/org" className="underline">Back to panel</Link> · {course.name}</>}>Question review</PageTitle>

      <Card className="mb-6">
        <h2 className="mb-1 font-semibold">Generate questions from course material</h2>
        <p className="mb-3 text-sm text-zinc-600">Paste your lecture notes for one topic (or leave empty to use the built-in notes). The agent writes questions only from this text; nothing reaches students until you approve it.</p>
        {generated !== null && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">{generated} question(s) added for review{rejectedN ? `; ${rejectedN} rejected by the automatic checks` : ""}.</p>}
        {error && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{error}</p>}
        <form action={generate.bind(null, course.id)} className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <select name="topic" className={`${input} max-w-xs`}>{topics.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            {(["easy", "medium", "hard"] as const).map((d, i) => (
              <label key={d} className="flex items-center gap-1 text-sm">{d}
                <input name={d} type="number" min={0} max={5} defaultValue={[1, 2, 1][i]} className="w-16 rounded-lg border border-zinc-300 px-2 py-1" />
              </label>
            ))}
          </div>
          <textarea name="material" rows={5} className={input} placeholder="Paste course notes here (optional)" />
          <div><SubmitButton pendingText="Generating and checking…">Generate</SubmitButton></div>
        </form>
      </Card>

      <h2 className="mb-2 font-semibold">Waiting for review ({list.length})</h2>
      <div className="grid gap-3">
        {list.map((q) => (
          <Card key={q.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={q.difficulty}>{q.difficulty}</Badge>
              <Badge>{q.topic}</Badge>
              <span className="text-zinc-500">{q.source === "ai-similar" ? `similar to question #${q.parent_question_id}` : q.source}</span>
            </div>
            <p className="mb-2">{q.prompt}</p>
            <ol className="mb-2 grid gap-1 text-sm sm:grid-cols-2">
              {q.choices.map((c, i) => (
                <li key={i} className={`rounded-lg border px-2 py-1 ${i === q.correct_index ? "border-emerald-400 bg-emerald-50" : "border-zinc-200"}`}>{String.fromCharCode(65 + i)}. {c}</li>
              ))}
            </ol>
            <p className="text-sm text-zinc-600"><span className="font-medium">Explanation: </span>{q.explanation}</p>
            <div className="mt-3 flex gap-2">
              <form action={approve.bind(null, q.id)}><Button type="submit">Approve</Button></form>
              <form action={reject.bind(null, q.id)}><Button type="submit" variant="ghost">Reject</Button></form>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="text-sm text-zinc-500">Nothing to review.</Card>}
      </div>
    </>
  );
}
