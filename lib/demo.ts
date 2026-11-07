// Presentation build: set DEMO_MODE=1 and DEMO_PASSWORD on the demo deployment only.
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const DEMO_MODE = process.env.DEMO_MODE === "1";
export const DUEL_COOKIE = "duel_key";

const digest = (s: string) => createHash("sha256").update(s).digest();

export function duelPasswordMatches(given: string): boolean {
  const pw = process.env.DEMO_PASSWORD;
  return !!pw && timingSafeEqual(digest(given), digest(pw));
}

/** Duels are open unless DEMO_PASSWORD is set; then only browsers that entered it may play. */
export async function duelUnlocked(): Promise<boolean> {
  if (!process.env.DEMO_PASSWORD) return true;
  return duelPasswordMatches((await cookies()).get(DUEL_COOKIE)?.value ?? "");
}
