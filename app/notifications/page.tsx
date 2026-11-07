import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Button, Card, PageTitle } from "@/components/ui";
import type { Notification } from "@/lib/types";
import { markAllRead, markRead } from "./actions";

/** Turns a notification into a sentence and an optional link. Other teams' types fall back to payload.message. */
function describe(n: Notification): { text: string; href?: string } {
  const p = n.payload as Record<string, string | number | undefined>;
  if (n.type === "job_post") {
    return { text: `${p.company_name} posted a new ${p.kind === "job" ? "job" : "internship"}: ${p.title}`, href: `/companies/${p.company_id}` };
  }
  return { text: typeof p.message === "string" ? p.message : n.type.replaceAll("_", " "), href: typeof p.href === "string" ? p.href : undefined };
}

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  const { data, error } = await supabaseAdmin().from("notifications").select("*")
    .eq("user_id", me.id).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  const list = (data ?? []) as Notification[];
  const unread = list.filter((n) => !n.read).length;

  return (
    <>
      <PageTitle sub={`${unread} unread`}>Notifications</PageTitle>
      {unread > 0 && <form action={markAllRead} className="mb-4"><Button type="submit" variant="ghost">Mark all as read</Button></form>}
      <div className="grid gap-2">
        {list.map((n) => {
          const d = describe(n);
          return (
            <Card key={n.id} className={`flex items-center gap-3 py-3 ${n.read ? "opacity-60" : "border-indigo-200"}`}>
              {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-label="unread" />}
              <div className="flex-1 text-sm">
                {d.href ? <Link href={d.href} className="hover:underline">{d.text}</Link> : d.text}
                <div className="text-xs text-zinc-500">{new Date(n.created_at).toLocaleString("en-GB", { timeZone: "Europe/Rome" })}</div>
              </div>
              {!n.read && <form action={markRead.bind(null, n.id)}><button className="text-xs text-zinc-500 underline">Mark read</button></form>}
            </Card>
          );
        })}
        {list.length === 0 && <Card className="text-sm text-zinc-500">Nothing yet. <Link href="/companies" className="underline">Follow a company</Link> to hear about new openings.</Card>}
      </div>
    </>
  );
}
