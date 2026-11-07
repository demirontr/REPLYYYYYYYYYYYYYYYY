import type { Difficulty } from "@/lib/types";

export const BASE_XP: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 40 };
export const TARGET_MS: Record<Difficulty, number> = { easy: 20_000, medium: 40_000, hard: 60_000 };

/** XP for one answer: base by difficulty, +25% (rounded) if correct and faster than the target time. */
export function xpForAnswer(difficulty: Difficulty, isCorrect: boolean, timeMs: number): number {
  if (!isCorrect) return 0;
  const base = BASE_XP[difficulty];
  return timeMs < TARGET_MS[difficulty] ? Math.round(base * 1.25) : base;
}

/** The only place that changes users.xp. Returns the new total. Server only. */
export async function awardXp(userId: number, amount: number): Promise<number> {
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`awardXp: invalid amount ${amount}`);
  // lazy import keeps xpForAnswer usable in plain-node tests (lib/xp.test.ts)
  const { supabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await supabaseAdmin().rpc("award_xp", { p_user: userId, p_amount: amount });
  if (error) throw error;
  return data as number;
}
