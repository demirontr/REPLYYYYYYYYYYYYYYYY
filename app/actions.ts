"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { DUEL_COOKIE, duelPasswordMatches } from "@/lib/demo";

export async function switchUser(formData: FormData) {
  const id = Number(formData.get("uid"));
  if (!Number.isInteger(id) || id <= 0) return;
  (await cookies()).set(SESSION_COOKIE, String(id), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  redirect("/");
}

export async function unlockDuel(formData: FormData) {
  const given = String(formData.get("password") ?? "");
  if (!duelPasswordMatches(given)) redirect("/duel?wrong=1");
  (await cookies()).set(DUEL_COOKIE, given, { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12 });
  redirect("/duel");
}
