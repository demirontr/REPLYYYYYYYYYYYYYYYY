import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { Badge, Card, PageTitle, Stat } from "@/components/ui";
import { SCOPES, SCOPE_LABEL, studentView, viewerFor } from "../../data";

export default async function OrgStudentPage({ params }: PageProps<"/org/students/[id]">) {
  const id = Number((await params).id);
  const me = await getCurrentUser();
  const viewer = await viewerFor(me);
  if (!viewer) return <PageTitle>Organization panel</PageTitle>;
  const v = Number.isInteger(id) ? await studentView(viewer, id) : null;
  const back = <Link href="/org" className="underline">Back to panel</Link>;
  if (!v) return <><PageTitle sub={back}>Not shared</PageTitle><Card>This student has not shared any data with {viewer.name}.</Card></>;

  const hidden = SCOPES.filter((s) => !v.scopes.includes(s));
  return (
    <>
      <PageTitle sub={back}>{v.name}{viewer.type === "company" ? ": pre-interview summary" : ""}</PageTitle>

      {v.xp && (
        <div className="mb-4 grid gap-4 sm:grid-cols-4">
          <Stat label="XP" value={v.xp.xp} />
          <Stat label="Rank at university" value={`#${v.xp.uniRank}`} />
          <Stat label="Global rank" value={`#${v.xp.globalRank}`} />
          <Stat label="Duel Elo" value={v.xp.elo} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {v.interests && (
          <Card>
            <h2 className="mb-2 font-semibold">Profile</h2>
            <p className="text-sm">{v.interests.department ?? "-"} · year {v.interests.year ?? "-"}</p>
            <p className="text-sm text-zinc-600">{v.interests.academic_status}</p>
            <div className="mt-2 flex flex-wrap gap-1">{v.interests.interests.map((i) => <Badge key={i}>{i}</Badge>)}</div>
          </Card>
        )}
        {v.recommendations && (
          <Card>
            <h2 className="mb-2 font-semibold">Career direction</h2>
            <p className="text-sm">Suggested field: <span className="font-medium capitalize">{v.recommendations.field ?? "none yet"}</span></p>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-700">{v.recommendations.items.map((r, i) => <li key={i}>{r.kind}: {r.title}</li>)}</ul>
          </Card>
        )}
        {v.courses && (
          <Card>
            <h2 className="mb-2 font-semibold">Results by topic</h2>
            {v.courses.map((t) => (
              <div key={t.topic} className="flex justify-between text-sm"><span>{t.topic}</span><span>{Math.round(t.accuracy * 100)}% ({t.n})</span></div>
            ))}
            {v.courses.length === 0 && <p className="text-sm text-zinc-500">No answers yet.</p>}
          </Card>
        )}
        {v.answers && (
          <Card>
            <h2 className="mb-2 font-semibold">Answer pattern</h2>
            <p className="text-sm">{v.answers.total} answers · {Math.round(v.answers.accuracy * 100)}% correct · trend: {v.answers.trend}</p>
            {v.answers.byDifficulty.map((d) => (
              <div key={d.difficulty} className="mt-1 flex items-center justify-between text-sm">
                <Badge tone={d.difficulty}>{d.difficulty}</Badge><span>{Math.round(d.accuracy * 100)}% · {d.avgSeconds}s (target {d.targetSeconds}s)</span>
              </div>
            ))}
            <p className="mt-2 text-sm text-zinc-600">Wrong answers: {v.answers.mistakes.rushed} rushed, {v.answers.mistakes.stuck} after long thinking.</p>
          </Card>
        )}
      </div>

      {hidden.length > 0 && (
        <p className="mt-6 text-sm text-zinc-500">Not shared with you: {hidden.map((s) => SCOPE_LABEL[s]).join("; ")}.</p>
      )}
    </>
  );
}
