"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import type { ConsentScope } from "@/lib/types";

const SCOPES: ConsentScope[] = ["xp", "courses", "answers", "interests", "recommendations"];

/** Saves which scopes one company or university may see. No scopes = consent removed. */
export async function saveConsent(viewerType: "company" | "university", viewerId: number, formData: FormData) {
  const me = await getCurrentUser();
  if (me.role !== "student") throw new Error("Only students manage consents.");
  if (viewerType !== "company" && viewerType !== "university") throw new Error("Invalid viewer");
  if (viewerType === "university" && viewerId !== me.university_id) throw new Error("You can only share with your own university.");
  const scopes = formData.getAll("scopes").map(String).filter((s): s is ConsentScope => (SCOPES as string[]).includes(s));

  const db = supabaseAdmin();
  const match = { student_id: me.id, viewer_type: viewerType, viewer_id: viewerId };
  const { error } = scopes.length
    ? await db.from("consents").upsert({ ...match, scopes, created_at: new Date().toISOString() }, { onConflict: "student_id,viewer_type,viewer_id" })
    : await db.from("consents").delete().match(match);
  if (error) throw error;
  revalidatePath("/settings/privacy");
}
