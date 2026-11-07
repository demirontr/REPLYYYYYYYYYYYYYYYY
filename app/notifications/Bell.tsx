"use client";

// Bell with unread count for the header (app/layout.tsx is Claude 1's file: see issue #1).
// Usage in layout: <NotificationBell userId={me.id} initial={await unreadCount(me.id)} />  (unreadCount from app/notifications/data.ts)
// Live updates use Supabase Realtime (notifications is in the supabase_realtime publication).
// If Realtime is not allowed for the anon key, the count still updates on every page load.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";

export function NotificationBell({ userId, initial }: { userId: number; initial: number }) {
  const [count, setCount] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) { setSeen(initial); setCount(initial); } // new server count after navigation

  useEffect(() => {
    const channel = supabaseBrowser()
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => setCount((c) => c + 1))
      .subscribe();
    return () => { void supabaseBrowser().removeChannel(channel); };
  }, [userId]);

  return (
    <Link href="/notifications" className="relative px-1 text-lg" aria-label={`Notifications: ${count} unread`}>
      🔔
      {count > 0 && <span className="absolute -top-1 -right-2 rounded-full bg-pen px-1.5 text-[10px] font-bold text-white">{count}</span>}
    </Link>
  );
}
