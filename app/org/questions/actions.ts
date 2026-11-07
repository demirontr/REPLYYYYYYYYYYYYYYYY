"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { generateQuestions } from "@/lib/ai/questionGenerator";

/** University staff only, and only for courses of their own university. */
async function staffFor(courseId: number) {
  const me = await getCurrentUser();
  if (me.role !== "university" || !me.university_id) throw new Error("Only university accounts review questions.");
  const { data, error } = await supabaseAdmin().from("courses").select("id").eq("id", courseId).eq("university_id", me.university_id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This course does not belong to your university.");
  return me;
}

async function questionCourse(id: number): Promise<number> {
  const { data, error } = await supabaseAdmin().from("questions").select("course_id").eq("id", id).single();
  if (error) throw error;
  return data.course_id as number;
}

export async function generate(courseId: number, formData: FormData) {
  const me = await staffFor(courseId);
  const n = (k: string) => Number(formData.get(k)) || 0;
  const res = await generateQuestions({
    courseId,
    topic: String(formData.get("topic") ?? ""),
    material: String(formData.get("material") ?? ""),
    counts: { easy: n("easy"), medium: n("medium"), hard: n("hard") },
    userId: me.id,
  });
  const q = new URLSearchParams({ generated: String(res.ids.length) });
  if (res.rejected.length) q.set("rejected", String(res.rejected.length));
  if (res.error) q.set("error", res.error.slice(0, 300));
  redirect(`/org/questions?${q}`);
}

/** Approved questions join the daily test pool. */
export async function approve(id: number) {
  await staffFor(await questionCourse(id));
  const { error } = await supabaseAdmin().from("questions").update({ status: "approved" }).eq("id", id).eq("status", "pending_review");
  if (error) throw error;
  revalidatePath("/org/questions");
}

/** Deletes a pending question. One already used in a retry test is kept (answers point to it) but stays out of the pool. */
export async function reject(id: number) {
  await staffFor(await questionCourse(id));
  const db = supabaseAdmin();
  const { count, error } = await db.from("answers").select("id", { count: "exact", head: true }).eq("question_id", id);
  if (error) throw error;
  if ((count ?? 0) > 0) redirect("/org/questions?error=" + encodeURIComponent("Already answered in a retry test: kept, but it stays out of the daily pool."));
  const { error: delErr } = await db.from("questions").delete().eq("id", id).eq("status", "pending_review");
  if (delErr) throw delErr;
  revalidatePath("/org/questions");
}
