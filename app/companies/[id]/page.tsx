import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { FIELDS } from "@/lib/ai/fields";
import type { Company, JobPost } from "@/lib/types";
import { createJobPost } from "../actions";
import { FollowButton } from "../FollowButton";

const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

export default async function CompanyPage({ params, searchParams }: PageProps<"/companies/[id]">) {
  const id = Number((await params).id);
  const notifiedRaw = (await searchParams).notified;
  const notified = typeof notifiedRaw === "string" ? Number(notifiedRaw) : null;
  const me = await getCurrentUser();
  const db = supabaseAdmin();

  const [{ data: company }, { data: posts }, { count: followers }, { data: mine }] = await Promise.all([
    db.from("companies").select("*").eq("id", id).maybeSingle<Company>(),
    db.from("job_posts").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    db.from("follows").select("user_id", { count: "exact", head: true }).eq("company_id", id),
    db.from("follows").select("user_id").eq("company_id", id).eq("user_id", me.id).maybeSingle(),
  ]);
  if (!company) notFound();
  const isOwner = me.role === "company" && me.company_id === id;

  return (
    <>
      <PageTitle sub={<Link href="/companies" className="underline">All companies</Link>}>{company.name}</PageTitle>
      <Card className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-sm text-zinc-500">{company.sector} · {followers ?? 0} followers</div>
          <p className="mt-2">{company.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">{company.fields.map((x) => <Badge key={x}>{x}</Badge>)}</div>
          {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-indigo-700 underline">Website</a>}
        </div>
        {me.role === "student" && <FollowButton companyId={id} following={!!mine} />}
      </Card>

      {isOwner && (
        <Card className="mb-6">
          <h2 className="mb-1 font-semibold">Post an opening</h2>
          <p className="mb-3 text-sm text-zinc-600">All followers get a notification right away.</p>
          {notified !== null && <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">Posted. {notified} follower(s) notified.</p>}
          <form action={createJobPost.bind(null, id)} className="grid gap-2 md:grid-cols-2">
            <input name="title" required minLength={3} placeholder="Title" className={input} />
            <div className="flex gap-2">
              <select name="kind" className={input} defaultValue="internship">
                <option value="internship">Internship</option>
                <option value="job">Job</option>
              </select>
              <select name="field" className={input} defaultValue={company.fields[0] ?? ""}>
                {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <textarea name="description" rows={3} placeholder="Description" className={`${input} md:col-span-2`} />
            <div><Button type="submit">Publish and notify followers</Button></div>
          </form>
        </Card>
      )}

      <h2 className="mb-2 font-semibold">Open positions</h2>
      <div className="grid gap-3">
        {((posts ?? []) as JobPost[]).map((j) => (
          <Card key={j.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{j.title}</span>
              <Badge tone={j.kind === "internship" ? "easy" : "medium"}>{j.kind}</Badge>
              {j.field && <Badge>{j.field}</Badge>}
              <span className="ml-auto text-xs text-zinc-500">{new Date(j.created_at).toLocaleDateString("en-GB")}</span>
            </div>
            {j.description && <p className="mt-2 text-sm text-zinc-700">{j.description}</p>}
          </Card>
        ))}
        {(posts ?? []).length === 0 && <Card className="text-sm text-zinc-500">No open positions right now.</Card>}
      </div>
    </>
  );
}
