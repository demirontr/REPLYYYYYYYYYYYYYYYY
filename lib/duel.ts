// Duel and live-tournament rules (owner: Claude 2). Pure functions, no I/O.

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionRef = { id: number; difficulty: Difficulty };

export type DuelSize = 5 | 10;
export const DUEL_SIZES: DuelSize[] = [5, 10];
/** An invitation not accepted within this time expires. */
export const INVITE_TTL_MS = 60_000;
/** Per-question time limit in duels and live tournaments. */
export const QUESTION_TIME_LIMIT_MS: Record<Difficulty, number> = {
  easy: 20_000,
  medium: 40_000,
  hard: 60_000,
};

/** Difficulty mix per duel size, played easy → hard (same order as daily tests). */
const MIX: Record<DuelSize, Record<Difficulty, number>> = {
  5: { easy: 2, medium: 2, hard: 1 },
  10: { easy: 3, medium: 4, hard: 3 },
};

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick question ids for a duel: right difficulty mix, ordered easy → hard.
 * If a difficulty runs short, the gap is filled from the remaining pool so the duel still has `size` questions.
 */
export function pickDuelQuestions(
  pool: QuestionRef[],
  size: DuelSize,
  rand: () => number = Math.random,
): number[] {
  if (pool.length < size) throw new Error(`Need at least ${size} questions, pool has ${pool.length}`);
  const order: Difficulty[] = ['easy', 'medium', 'hard'];
  const picked: QuestionRef[] = [];
  for (const d of order) {
    picked.push(...shuffle(pool.filter((q) => q.difficulty === d), rand).slice(0, MIX[size][d]));
  }
  if (picked.length < size) {
    const used = new Set(picked.map((q) => q.id));
    picked.push(...shuffle(pool.filter((q) => !used.has(q.id)), rand).slice(0, size - picked.length));
  }
  const rank = { easy: 0, medium: 1, hard: 2 } as const;
  return picked.sort((a, b) => rank[a.difficulty] - rank[b.difficulty]).map((q) => q.id);
}

export function isInviteExpired(createdAt: string | Date, now: number = Date.now()): boolean {
  return now - new Date(createdAt).getTime() > INVITE_TTL_MS;
}

export type PlayerScore = { userId: number; correct: number; timeMs: number };

/** More correct answers wins; on a tie, less total time wins; identical → draw (null). */
export function decideWinner(a: PlayerScore, b: PlayerScore): number | null {
  if (a.correct !== b.correct) return a.correct > b.correct ? a.userId : b.userId;
  if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs ? a.userId : b.userId;
  return null;
}

/** Live tournament leaderboard: same rule as duels — correct desc, then time asc. */
export function rankEntries<T extends PlayerScore>(entries: T[]): Array<T & { rank: number }> {
  return [...entries]
    .sort((x, y) => y.correct - x.correct || x.timeMs - y.timeMs)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** XP prizes for the top 3 of a live tournament. */
export const TOURNAMENT_PRIZE_XP = [100, 60, 30] as const;

export function tournamentPrizes(entries: PlayerScore[]): Array<{ userId: number; xp: number }> {
  return rankEntries(entries)
    .slice(0, TOURNAMENT_PRIZE_XP.length)
    .filter((e) => e.correct > 0)
    .map((e, i) => ({ userId: e.userId, xp: TOURNAMENT_PRIZE_XP[i] }));
}
