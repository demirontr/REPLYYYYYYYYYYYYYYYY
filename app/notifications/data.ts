import { supabaseAdmin } from "@/lib/supabase";

/** Unread count for the bell in the header (server only, not a server action). */
export async function unreadCount(userId: number): Promise<number> {
  const { count, error } = await supabaseAdmin().from("notifications")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
  return count ?? 0;
}
