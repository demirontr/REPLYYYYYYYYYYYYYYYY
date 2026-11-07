import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Card, PageTitle, Stat } from "@/components/ui";
import type { Difficulty } from "@/lib/types";

type Row = { is_correct: boolean; time_ms: number; questions: { topic: string; difficulty: Difficulty } };

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (me.role !== "student") {
    return <PageTitle sub={<Link href="/org" className="underline">Open your organization panel</Link>}>Hi, {me.name}</PageTitle>;
  }
  const db = supabaseAdmin();
  const higher = (scope: "uni" | "global") => {
    let q = db.from("users").select("id", { count: "exact", head: true }).eq("role", "student").gt("xp", me.xp);
    if (scope === "uni") q = q.eq("university_id", me.university_id ?? -1);
    return q;
  };
  const [uni, global, { data, error }] = await Promise.all([
    higher("uni"),
    higher("global"),
    db.from("answers").select("is_correct,time_ms,questions(topic,difficulty)").eq("user_id", me.id).overrideTypes<Row[], { merge: false }>(),
  ]);
  if (error) throw error;

  const group = <K extends string>(key: (r: Row) => K) => {
    const m = new Map<K, { n: number; ok: number; ms: number }>();
    for (const r of data) {
      const g = m.get(key(r)) ?? { n: 0, ok: 0, ms: 0 };
      g.n++; g.ok += r.is_correct ? 1 : 0; g.ms += r.time_ms;
      m.set(key(r), g);
    }
    return [...m.entries()];
  };
  const topics = group((r) => r.questions.topic).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n); // weakest first
  const levels = group((r) => r.questions.difficulty);
  const pct = (g: { n: number; ok: number }) => Math.round((g.ok / g.n) * 100);

  return (
    <>
      <PageTitle sub={`${me.department ?? ""} · year ${me.year ?? "-"}`}>Hi, {me.name}</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="XP" value={me.xp} />
        <Stat label="Rank at my university" value={`#${(uni.count ?? 0) + 1}`} />
        <Stat label="Global rank" value={`#${(global.count ?? 0) + 1}`} />
        <Stat label="Duel Elo" value={me.elo} />
      </div>
      {data.length === 0 ? (
        <Card>No answers yet. <Link href="/tests" className="underline">Take today&apos;s test</Link> to see your progress.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">Accuracy by topic</h2>
            {topics.map(([t, g]) => (
              <div key={t} className="mb-2">
                <div className="flex justify-between text-sm"><span>{t}</span><span>{pct(g)}% ({g.ok}/{g.n})</span></div>
                <div className="h-2 rounded bg-zinc-100"><div className="h-2 rounded bg-indigo-500" style={{ width: `${pct(g)}%` }} /></div>
              </div>
            ))}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Average solve time</h2>
            {levels.map(([d, g]) => (
              <div key={d} className="mb-2 flex items-center justify-between text-sm">
                <Badge tone={d}>{d}</Badge>
                <span>{(g.ms / g.n / 1000).toFixed(1)} s · {pct(g)}% correct</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </>
  );
}
