import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { Badge, Card, PageTitle, Stat } from "@/components/ui";
import { SCOPE_LABEL, consentingStudents, universityAggregate, viewerFor } from "./data";

export default async function OrgPage() {
  const me = await getCurrentUser();
  const viewer = await viewerFor(me);
  if (!viewer) return <PageTitle sub="Switch to a company or university account to open this panel.">Organization panel</PageTitle>;

  const [students, agg] = await Promise.all([
    consentingStudents(viewer),
    viewer.type === "university" ? universityAggregate(viewer.id) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageTitle sub="You only see students who chose to share with you, and only the data they chose.">{viewer.name}</PageTitle>

      {agg && (
        <section className="mb-8">
          <h2 className="mb-2 font-semibold">All your students (aggregate, no individual data)</h2>
          <div className="mb-3 grid gap-4 sm:grid-cols-4">
            <Stat label="Students" value={agg.students} />
            <Stat label="Average XP" value={agg.avgXp} />
            <Stat label="Answers" value={agg.stats.total} />
            <Stat label="Overall accuracy" value={`${Math.round(agg.stats.accuracy * 100)}%`} />
          </div>
          <Card>
            <h3 className="mb-2 font-medium">Accuracy by topic: where students struggle most</h3>
            {agg.stats.byTopic.map((t) => (
              <div key={t.topic} className="mb-2">
                <div className="flex justify-between text-sm"><span>{t.topic}</span><span>{Math.round(t.accuracy * 100)}% ({t.n} answers)</span></div>
                <div className="h-2 rounded bg-zinc-100"><div className="h-2 rounded bg-indigo-500" style={{ width: `${Math.round(t.accuracy * 100)}%` }} /></div>
              </div>
            ))}
            {agg.stats.total === 0 && <p className="text-sm text-zinc-500">No answers yet.</p>}
          </Card>
        </section>
      )}

      <h2 className="mb-2 font-semibold">Students who share data with you</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {students.map((s) => (
          <Card key={s.studentId}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{s.name}</span>
              <Link href={`/org/students/${s.studentId}`} className="text-sm text-indigo-700 underline">{viewer.type === "company" ? "Pre-interview summary" : "Open"}</Link>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{s.scopes.map((sc) => <Badge key={sc}>{SCOPE_LABEL[sc]}</Badge>)}</div>
          </Card>
        ))}
        {students.length === 0 && <Card className="text-sm text-zinc-500">No student has shared data with you yet.</Card>}
      </div>
    </>
  );
}
