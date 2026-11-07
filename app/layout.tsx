import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { SwitchUser } from "@/components/SwitchUser";

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
  ["/companies", "Companies"],
  ["/notifications", "Notifications"],
] as const;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await getCurrentUser(); // reads cookies first, which keeps every route dynamic
  const { data: users } = await supabaseAdmin().from("users").select("id,name,role").order("id");
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="font-bold text-indigo-700">AI on Campus</Link>
            <nav className="flex flex-wrap gap-4 text-sm">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="text-zinc-600 hover:text-zinc-900">{label}</Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-zinc-500">{me.xp} XP</span>
              <SwitchUser users={users ?? []} currentId={me.id} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
