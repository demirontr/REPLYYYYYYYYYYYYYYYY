import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Card, PageTitle } from "@/components/ui";
import { latestAnalysis } from "@/lib/ai/analysisBot";
import { loadRated, type RecPayload } from "@/lib/ai/recommender";
import { feedbackPolicy } from "@/lib/ai/recommendCore";
import type { Recommendation } from "@/lib/types";
import { generateRecommendations, rateRecommendation } from "./actions";
import { SubmitButton } from "./SubmitButton";

type Rec = Recommendation & { payload: RecPayload; recommendation_feedback: { rating: number; comment: string | null }[] };

const SECTIONS = [
  ["event", "Events worldwide"],
  ["club", "Clubs at your university"],
  ["company", "Companies"],
  ["master", "Master's programs"],
] as const;

function RateForm({ rec }: { rec: Rec }) {
  const current = rec.recommendation_feedback.at(-1);
  return (
    <form action={rateRecommendation.bind(null, rec.id)} className="mt-3 border-t border-zinc-100 pt-3 text-sm">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-zinc-500">Useful?</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name="rating" value={n} defaultChecked={current?.rating === n} className="peer sr-only" required />
            <span className="inline-block rounded px-2 py-0.5 text-zinc-400 peer-checked:bg-amber-100 peer-checked:text-amber-700 hover:text-amber-600">{n}★</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input name="comment" defaultValue={current?.comment ?? ""} placeholder="Why? (optional)" className="flex-1 rounded-lg border border-zinc-300 px-2 py-1" />
        <button className="rounded-lg border border-zinc-300 px-3 py-1 hover:bg-zinc-100">{current ? "Update" : "Rate"}</button>
      </div>
    </form>
  );
}

function RecCard({ rec }: { rec: Rec }) {
  const p = rec.payload;
  const link = p.url ? (p.url.startsWith("/") ? <Link href={p.url} className="text-sm text-indigo-700 underline">Open</Link>
    : <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline">Website</a>) : null;
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{p.title}</h3>
        {p.field && <Badge>{p.field}</Badge>}
      </div>
      {p.subtitle && <p className="mt-1 text-sm text-zinc-600">{p.subtitle}</p>}
      <p className="mt-2 text-sm"><span className="font-medium">Why: </span>{rec.reason}</p>
      {link}
      <RateForm rec={rec} />
    </Card>
  );
}

export default async function CareersPage() {
  const me = await getCurrentUser();
  if (me.role !== "student") return <PageTitle sub={<Link href="/org" className="underline">Open your organization panel</Link>}>Careers</PageTitle>;

  const db = supabaseAdmin();
  const [{ data, error }, report, rated] = await Promise.all([
    db.from("recommendations").select("*,recommendation_feedback(rating,comment)")
      .eq("user_id", me.id).neq("kind", "study_plan").order("created_at", { ascending: false }).limit(60),
    latestAnalysis(me.id),
    loadRated(me.id),
  ]);
  if (error) throw error;
  const all = (data ?? []) as Rec[];
  const runs = [...new Set(all.map((r) => r.payload.run))].sort((a, b) => b - a);
  const latest = all.filter((r) => r.payload.run === runs[0]);
  const field = latest.find((r) => r.kind === "field");
  const policy = feedbackPolicy(rated);
  const excludedCount = Object.values(policy.excluded).reduce((s, set) => s + set.size, 0);
  const profileEmpty = me.interests.length === 0 && !me.department;

  return (
    <>
      <PageTitle sub="Suggestions come only from our curated lists. Rate them: the next run uses your ratings.">Careers</PageTitle>

      {profileEmpty && <Card className="mb-4">Tell the agent about yourself first: <Link href="/onboarding" className="underline">fill in your profile</Link>.</Card>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-1 font-semibold">What the analysis bot sees</h2>
          <p className="text-sm text-zinc-700">{report?.summary ?? "No analysis yet. It runs automatically when you ask for recommendations."}</p>
          <p className="mt-2 text-xs text-zinc-500"><Link href="/onboarding" className="underline">Edit profile</Link> · <Link href="/study-plan" className="underline">Study plan</Link></p>
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Your feedback so far</h2>
          <p className="text-sm text-zinc-700">{rated.length} ratings · {excludedCount} items removed for low ratings</p>
          {policy.lowKinds.length > 0 && <p className="mt-1 text-sm text-amber-700">Next run changes approach for: {policy.lowKinds.join(", ")}</p>}
          {policy.rejectedFields.size > 0 && <p className="mt-1 text-sm text-amber-700">Fields you rejected: {[...policy.rejectedFields].join(", ")}</p>}
          <form action={generateRecommendations} className="mt-3">
            <SubmitButton pendingText="The agent is thinking…">{runs.length ? "New suggestions using my ratings" : "Get suggestions"}</SubmitButton>
          </form>
        </Card>
      </div>

      {field ? (
        <>
          {field.payload.source === "fallback" && (
            <Card className="mb-4 border-amber-200 bg-amber-50 text-sm text-amber-800">
              The AI agent was not available, so these are rule-based suggestions from the same curated lists.
            </Card>
          )}
          <Card className="mb-6 border-indigo-200 bg-indigo-50">
            <div className="text-sm text-indigo-700">Suggested field · {new Date(field.payload.run).toLocaleString("en-GB", { timeZone: "Europe/Rome" })}</div>
            <div className="mt-1 text-2xl font-bold capitalize">{field.payload.title}</div>
            <p className="mt-2 text-sm">{field.reason}</p>
            <RateForm rec={field} />
          </Card>
          {SECTIONS.map(([kind, title]) => {
            const list = latest.filter((r) => r.kind === kind);
            if (!list.length) return null;
            return (
              <section key={kind} className="mb-6">
                <h2 className="mb-2 font-semibold">{title}</h2>
                <div className="grid gap-3 md:grid-cols-2">{list.map((r) => <RecCard key={r.id} rec={r} />)}</div>
              </section>
            );
          })}
          {runs.length > 1 && <p className="text-sm text-zinc-500">{runs.length - 1} earlier run(s) kept for the feedback loop.</p>}
        </>
      ) : (
        <Card>No suggestions yet. Press &quot;Get suggestions&quot; to run the analysis bot and the career agent.</Card>
      )}
    </>
  );
}
