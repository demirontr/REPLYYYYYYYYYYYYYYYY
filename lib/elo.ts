// Elo rating for duels (owner: Claude 2). Chess-style, K = 32.
// XP itself is always granted through awardXp() in lib/xp.ts — this file only computes amounts.

export const ELO_K = 32;
export const ELO_START = 1200;

/** Probability that a player rated `ra` beats a player rated `rb`. */
export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

export type EloUpdate = {
  winnerNew: number;
  loserNew: number;
  /** Winner's expected score before the match (low = upset). */
  winnerExpected: number;
};

export function eloAfterWin(winnerElo: number, loserElo: number, k: number = ELO_K): EloUpdate {
  const eW = expectedScore(winnerElo, loserElo);
  const delta = Math.round(k * (1 - eW));
  return { winnerNew: winnerElo + delta, loserNew: loserElo - delta, winnerExpected: eW };
}

/** Full tie (same correct answers and same total time) — practically rare. */
export function eloAfterDraw(aElo: number, bElo: number, k: number = ELO_K): { aNew: number; bNew: number } {
  const delta = Math.round(k * (0.5 - expectedScore(aElo, bElo)));
  return { aNew: aElo + delta, bNew: bElo - delta };
}

/**
 * Extra XP for the duel winner: beating a stronger opponent pays more.
 * max(10, round(40 × (1 − E_winner))) → ~10 vs a much weaker player, 20 vs an equal, up to 40 for a big upset.
 */
export function winnerBonusXp(winnerExpected: number): number {
  return Math.max(10, Math.round(40 * (1 - winnerExpected)));
}
