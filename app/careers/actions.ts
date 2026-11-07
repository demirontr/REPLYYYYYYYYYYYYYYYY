"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { runRecommender } from "@/lib/ai/recommender";

async function student() {
  const me = await getCurrentUser();
  if (me.role !== "student") throw new Error("Only students get career recommendations.");
  return me;
}

/** Analysis bot (if needed) → recommender. Uses earlier ratings automatically. */
export async function generateRecommendations() {
  const me = await student();
  await runRecommender(me);
  revalidatePath("/careers");
}

export async function rateRecommendation(recommendationId: number, formData: FormData) {
  const me = await student();
  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500) || null;
  const db = supabaseAdmin();
  const { data: rec, error } = await db.from("recommendations").select("id").eq("id", recommendationId).eq("user_id", me.id).maybeSingle();
  if (error) throw error;
  if (!rec) throw new Error("Not your recommendation");
  const { error: upErr } = await db.from("recommendation_feedback")
    .upsert({ recommendation_id: recommendationId, user_id: me.id, rating, comment, created_at: new Date().toISOString() }, { onConflict: "recommendation_id,user_id" });
  if (upErr) throw upErr;
  revalidatePath("/careers");
}
