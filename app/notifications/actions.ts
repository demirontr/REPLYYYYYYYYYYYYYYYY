"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function markRead(id: number) {
  const me = await getCurrentUser();
  const { error } = await supabaseAdmin().from("notifications").update({ read: true }).eq("id", id).eq("user_id", me.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const me = await getCurrentUser();
  const { error } = await supabaseAdmin().from("notifications").update({ read: true }).eq("user_id", me.id).eq("read", false);
  if (error) throw error;
  revalidatePath("/", "layout");
}

