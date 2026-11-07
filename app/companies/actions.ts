"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function toggleFollow(companyId: number, follow: boolean) {
  const me = await getCurrentUser();
  if (me.role !== "student") throw new Error("Only students can follow companies.");
  const db = supabaseAdmin();
  const { error } = follow
    ? await db.from("follows").upsert({ user_id: me.id, company_id: companyId }, { onConflict: "user_id,company_id", ignoreDuplicates: true })
    : await db.from("follows").delete().eq("user_id", me.id).eq("company_id", companyId);
  if (error) throw error;
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}

/** Company account adds a post; every follower gets a notification (notify_followers in migration 30). */
export async function createJobPost(companyId: number, formData: FormData) {
  const me = await getCurrentUser();
  if (me.role !== "company" || me.company_id !== companyId) throw new Error("Only this company's account can post here.");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const kind = formData.get("kind") === "job" ? "job" : "internship";
  const field = String(formData.get("field") ?? "").trim().slice(0, 60) || null;
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  if (title.length < 3) throw new Error("Title is too short");

  const db = supabaseAdmin();
  const { data, error } = await db.from("job_posts").insert({ company_id: companyId, title, kind, field, description }).select("id").single();
  if (error) throw error;
  const { data: notified, error: nErr } = await db.rpc("notify_followers", { p_job: data.id });
  if (nErr) throw nErr;
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?notified=${Number(notified) || 0}`);
}
