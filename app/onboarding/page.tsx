import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Button, Card, PageTitle } from "@/components/ui";
import { FIELDS } from "@/lib/ai/fields";
import type { UserExternalInfo } from "@/lib/types";
import { addExternalInfo, deleteExternalInfo, saveProfile } from "./actions";

const STATUSES = ["on track", "strong", "struggling with some courses", "returning after a break"];
const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

export default async function OnboardingPage() {
  const me = await getCurrentUser();
  if (me.role !== "student") return <PageTitle sub="Switch to a student account to fill in a study profile.">Profile</PageTitle>;
  const { data } = await supabaseAdmin().from("user_external_info").select("*").eq("user_id", me.id).order("created_at", { ascending: false });
  const notes = (data ?? []) as UserExternalInfo[];

  return (
    <>
      <PageTitle sub="The career agent uses this, together with your test results, to suggest a field and next steps.">Your profile</PageTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <form action={saveProfile} className="grid gap-3">
            <label className="grid gap-1 text-sm">Department
              <input name="department" defaultValue={me.department ?? ""} className={input} placeholder="e.g. Computer Engineering" />
            </label>
            <label className="grid gap-1 text-sm">Year
              <input name="year" type="number" min={1} max={6} defaultValue={me.year ?? 1} className={input} />
            </label>
            <fieldset className="text-sm">
              <legend className="mb-1">Interests</legend>
              <div className="flex flex-wrap gap-2">
                {FIELDS.map((f) => (
                  <label key={f} className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1">
                    <input type="checkbox" name="interests" value={f} defaultChecked={me.interests.includes(f)} /> {f}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-1 text-sm">How are your studies going?
              <select name="academic_status" defaultValue={STATUSES.find((s) => me.academic_status?.includes(s)) ?? "on track"} className={input}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <Button type="submit">Save and see suggestions</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Anything else the agent should know?</h2>
          <p className="mb-3 text-sm text-zinc-600">Courses or notes from outside this site, events you joined, projects. Only you and the agent see this.</p>
          <form action={addExternalInfo} className="mb-4 grid gap-2">
            <select name="kind" className={input} defaultValue="notes">
              <option value="notes">Notes / outside course</option>
              <option value="event">Event I joined</option>
              <option value="other">Other</option>
            </select>
            <textarea name="text" rows={3} className={input} placeholder="e.g. I did an online Python course; I joined a robotics workshop in October." />
            <Button type="submit" variant="ghost">Add</Button>
          </form>
          <ul className="grid gap-2 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg bg-zinc-50 p-2">
                <span><span className="text-zinc-500">{n.kind}:</span> {n.text}</span>
                <form action={deleteExternalInfo.bind(null, n.id)}><button className="text-zinc-400 hover:text-rose-600" aria-label="Delete">✕</button></form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-4 text-sm text-zinc-500">Privacy: companies and universities never see this page. Choose what they can see in <Link href="/settings/privacy" className="underline">privacy settings</Link>.</p>
    </>
  );
}
