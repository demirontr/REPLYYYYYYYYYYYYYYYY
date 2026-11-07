import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Card, PageTitle, Stat } from "@/components/ui";
import type { Answer, PublicQuestion, Question, TestSession } from "@/lib/types";
import { Quiz } from "./Quiz";

export default async function SessionPage({ params }: PageProps<"/tests/session/[id]">) {
  const id = Number((await params).id);
  const me = await getCurrentUser();
  const db = supabaseAdmin();

  const { data: session } = await db.from("test_sessions").select("*").eq("id", id).maybeSingle<TestSession>();
  if (!session || session.user_id !== me.id) notFound();

  const [{ data: qs }, { data: ans }] = await Promise.all([
    db.from("questions").select("*").in("id", session.question_ids),
    db.from("answers").select("*").eq("session_id", id),
  ]);
  const byId = new Map((qs as Question[]).map((q) => [q.id, q]));
  const questions = session.question_ids.map((qid) => byId.get(qid)).filter((q): q is Question => !!q);
  const answers = (ans ?? []) as Answer[];
  const title = session.kind === "daily" ? `Daily test · ${session.date}` : "Retry test";

  if (!session.finished_at) {
    // strip correct_index and explanation: the client only gets them back after answering
    const pub: PublicQuestion[] = questions.map(({ id, topic, difficulty, prompt, choices }) => ({ id, topic, difficulty, prompt, choices }));
    return (
      <>
        <PageTitle sub="No hints during the test. The explanation appears after you answer.">{title}</PageTitle>
        <Quiz sessionId={id} questions={pub} answeredIds={answers.map((a) => a.question_id)} />
      </>
    );
  }

  const ansBy = new Map(answers.map((a) => [a.question_id, a]));
  const correct = answers.filter((a) => a.is_correct).length;
  const avgS = answers.length ? answers.reduce((s, a) => s + a.time_ms, 0) / answers.length / 1000 : 0;
  return (
    <>
      <PageTitle sub={<Link href="/tests" className="underline">Back to tests</Link>}>{title}: result</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Correct" value={`${correct} / ${questions.length}`} />
        <Stat label="XP earned" value={session.total_xp} />
        <Stat label="Avg. time per question" value={`${avgS.toFixed(1)} s`} />
      </div>
      <div className="grid gap-3">
        {questions.map((q, i) => {
          const a = ansBy.get(q.id);
          return (
            <Card key={q.id}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">Q{i + 1}</span>
                <Badge tone={q.difficulty}>{q.difficulty}</Badge>
                <Badge>{q.topic}</Badge>
                <span className={a?.is_correct ? "text-emerald-700" : "text-rose-700"}>{a?.is_correct ? "Correct" : "Wrong"}</span>
                {a && <span className="text-zinc-500">{(a.time_ms / 1000).toFixed(1)} s · +{a.xp_awarded} XP</span>}
              </div>
              <p className="mb-2">{q.prompt}</p>
              <p className="text-sm">
                Your answer: <b>{a ? q.choices[a.chosen_index] : "-"}</b>
                {!a?.is_correct && <> · Correct: <b>{q.choices[q.correct_index]}</b></>}
              </p>
              <p className="mt-2 text-sm text-zinc-600">{q.explanation}</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
