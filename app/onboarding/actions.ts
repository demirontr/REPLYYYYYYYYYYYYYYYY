"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { isField } from "@/lib/ai/fields";

const STATUSES = ["on track", "strong", "struggling with some courses", "returning after a break"];

async function student() {
  const me = await getCurrentUser();
  if (me.role !== "student") throw new Error("Only student accounts have a study profile.");
  return me;
}

export async function saveProfile(formData: FormData) {
  const me = await student();
  const department = String(formData.get("department") ?? "").trim().slice(0, 100) || null;
  const yearRaw = Number(formData.get("year"));
  const year = Number.isInteger(yearRaw) && yearRaw >= 1 && yearRaw <= 6 ? yearRaw : null;
  const interests = formData.getAll("interests").map(String).filter(isField);
  const statusRaw = String(formData.get("academic_status") ?? "");
  const academic_status = STATUSES.includes(statusRaw) ? statusRaw : null;

  const { error } = await supabaseAdmin().from("users").update({ department, year, interests, academic_status }).eq("id", me.id);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/careers");
}

export async function addExternalInfo(formData: FormData) {
  const me = await student();
  const kindRaw = String(formData.get("kind") ?? "notes");
  const kind = (["notes", "event", "other"] as const).find((k) => k === kindRaw) ?? "other";
  const text = String(formData.get("text") ?? "").trim().slice(0, 1000);
  if (text.length < 3) return;
  const { error } = await supabaseAdmin().from("user_external_info").insert({ user_id: me.id, kind, text });
  if (error) throw error;
  revalidatePath("/onboarding");
}

export async function deleteExternalInfo(id: number) {
  const me = await student();
  const { error } = await supabaseAdmin().from("user_external_info").delete().eq("id", id).eq("user_id", me.id);
  if (error) throw error;
  revalidatePath("/onboarding");
}
