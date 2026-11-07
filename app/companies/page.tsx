import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Card, PageTitle } from "@/components/ui";
import type { Company } from "@/lib/types";
import { FollowButton } from "./FollowButton";

export default async function CompaniesPage() {
  const me = await getCurrentUser();
  const db = supabaseAdmin();
  const [{ data: companies, error }, { data: follows }, { data: posts }] = await Promise.all([
    db.from("companies").select("*").order("name"),
    db.from("follows").select("user_id,company_id"),
    db.from("job_posts").select("company_id"),
  ]);
  if (error) throw error;
  const f = (follows ?? []) as { user_id: number; company_id: number }[];
  const p = (posts ?? []) as { company_id: number }[];

  return (
    <>
      <PageTitle sub="Follow a company to get a notification when it posts an internship or a job.">Companies</PageTitle>
      {me.role === "company" && me.company_id && (
        <Card className="mb-4 text-sm">You are signed in as a company. <Link href={`/companies/${me.company_id}`} className="underline">Open your company page</Link> to post an opening.</Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {((companies ?? []) as Company[]).map((c) => {
          const following = f.some((x) => x.company_id === c.id && x.user_id === me.id);
          return (
            <Card key={c.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/companies/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>
                  <div className="text-sm text-zinc-500">{c.sector}</div>
                </div>
                {me.role === "student" && <FollowButton companyId={c.id} following={following} />}
              </div>
              <p className="text-sm text-zinc-700">{c.description}</p>
              <div className="flex flex-wrap gap-1">{c.fields.map((x) => <Badge key={x}>{x}</Badge>)}</div>
              <div className="text-xs text-zinc-500">{f.filter((x) => x.company_id === c.id).length} followers · {p.filter((x) => x.company_id === c.id).length} open positions</div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
