import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Card, PageTitle } from "@/components/ui";

type Row = { id: number; name: string; xp: number; elo: number; department: string | null; universities: { name: string } | null };

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const me = await getCurrentUser();
  const global = (await searchParams).tab === "global" || me.university_id === null;

  let query = supabaseAdmin().from("users")
    .select("id,name,xp,elo,department,universities(name)")
    .eq("role", "student").order("xp", { ascending: false }).order("id").limit(50);
  if (!global) query = query.eq("university_id", me.university_id!);
  const { data, error } = await query.overrideTypes<Row[], { merge: false }>();
  if (error) throw error;

  const tab = (active: boolean) => `rounded-md px-3 py-1.5 font-semibold ${active ? "bg-ink text-white" : "border border-graphite/30 bg-white hover:border-ink"}`;
  return (
    <>
      <PageTitle sub="Ranked by XP. Elo is the duel rating.">Leaderboard</PageTitle>
      <div className="mb-4 flex gap-2">
        <Link href="/leaderboard" className={tab(!global)}>My university</Link>
        <Link href="/leaderboard?tab=global" className={tab(global)}>Global</Link>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-grid text-left text-graphite/60">
            <tr><th className="p-3">#</th><th className="p-3">Student</th><th className="p-3">University</th><th className="p-3 text-right">XP</th><th className="p-3 text-right">Elo</th></tr>
          </thead>
          <tbody>
            {data.map((u, i) => (
              <tr key={u.id} className={`border-t border-grid ${u.id === me.id ? "bg-marker/50 font-semibold" : ""}`}>
                <td className="p-3 font-math text-lg">{i + 1}</td>
                <td className="p-3">{u.name}<div className="text-sm font-normal text-graphite/60">{u.department}</div></td>
                <td className="p-3">{u.universities?.name}</td>
                <td className="p-3 text-right font-math text-lg">{u.xp}</td>
                <td className="p-3 text-right font-math text-lg text-graphite/70">{u.elo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
