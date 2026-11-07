import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/titillium-web/400.css";
import "@fontsource/titillium-web/600.css";
import "@fontsource/titillium-web/700.css";
import "@fontsource-variable/stix-two-text";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { SwitchUser } from "@/components/SwitchUser";
import { NavLinks } from "@/components/NavLinks";
import { NotificationBell } from "@/app/notifications/Bell";
import { unreadCount } from "@/app/notifications/data";

export const metadata: Metadata = {
  title: "AI on Campus",
  description: "Daily practice, duels and AI study guidance for university courses.",
};

const NAV = [
  ["/dashboard", "Dashboard"],
  ["/tests", "Tests"],
  ["/leaderboard", "Leaderboard"],
  ["/duel", "Duel"],
  ["/live", "Live"],
  ["/careers", "Careers"],
  ["/study-plan", "Study plan"],
  ["/companies", "Companies"],
  ["/settings/privacy", "Privacy"],
] as const;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await getCurrentUser(); // reads cookies first, which keeps every route dynamic
  const [{ data: users }, unread] = await Promise.all([
    supabaseAdmin().from("users").select("id,name,role").order("id"),
    unreadCount(me.id),
  ]);
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-[#d3dce6] bg-white/95">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-ink">
              AI on Campus <span className="font-math font-normal italic">∫</span>
            </Link>
            <NavLinks items={NAV} />
            <div className="ml-auto flex items-center gap-3">
              <span className="font-math text-lg"><span className="marker">{me.xp}</span> XP</span>
              <NotificationBell userId={me.id} initial={unread} />
              <SwitchUser users={users ?? []} currentId={me.id} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
