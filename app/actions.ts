"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";

export async function switchUser(formData: FormData) {
  const id = Number(formData.get("uid"));
  if (!Number.isInteger(id) || id <= 0) return;
  (await cookies()).set(SESSION_COOKIE, String(id), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  redirect("/");
}
