import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "uid";
const DEFAULT_USER_ID = 1; // demo student, used until someone picks "Switch user"

/** Demo login: the selected user's id lives in a cookie. No passwords. */
export async function getCurrentUser(): Promise<User> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = Number(raw) || DEFAULT_USER_ID;
  const { data, error } = await supabaseAdmin().from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (data) return data as User;
  if (id === DEFAULT_USER_ID) throw new Error("Demo user 1 not found. Run supabase/seed.sql.");
  // stale cookie (e.g. DB re-seeded): fall back to the default demo user
  const fallback = await supabaseAdmin().from("users").select("*").eq("id", DEFAULT_USER_ID).single();
  if (fallback.error) throw fallback.error;
  return fallback.data as User;
}

/** Today's date (YYYY-MM-DD) in Torino; used for the one-daily-test-per-day rule. */
export function todayRome(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
}
