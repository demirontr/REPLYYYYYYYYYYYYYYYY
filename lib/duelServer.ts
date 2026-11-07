// Server-side logic for duels and live tournaments (owner: Claude 2).
// Only import from Route Handlers / Server Components.
// Depends on Claude 1's skeleton: supabaseAdmin(), getCurrentUser(), awardXp() (see issue #1).

import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/session';
import { awardXp } from '@/lib/xp';
import {
  decideWinner,
  pickDuelQuestions,
  QUESTION_TIME_LIMIT_MS,
  tournamentPrizes,
  type Difficulty,
  type DuelSize,
  type PlayerScore,
} from '@/lib/duel';
import { eloAfterDraw, eloAfterWin, winnerBonusXp } from '@/lib/elo';

/** Demo course: Analisi Matematica I (issue #1). */
export const DEMO_COURSE_ID = 1;

export type Me = {
  id: number;
  name: string;
  role: 'student' | 'company' | 'university';
  university_id: number | null;
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wrap a Route Handler body: JSON result, HttpError → status, anything else → 500 (logged). */
export async function route(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error('[duel/live]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function requireUser(): Promise<Me> {
  const u = (await getCurrentUser()) as Me | null;
  if (!u) throw new HttpError(401, 'No user selected');
  return u;
}

export const db = () => supabaseAdmin();

type Res<T> = { data: T | null; error: { message: string; code?: string } | null };
export function must<T>(res: Res<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export const toInt = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Invalid id');
  return n;
};

// ---------- Questions ----------

export async function questionPool(courseId: number) {
  return must<{ id: number; difficulty: Difficulty }[]>(
    await db().from('questions').select('id, difficulty').eq('course_id', courseId).eq('status', 'approved'),
  );
}

export type PublicQuestion = {
  id: number;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  choices: string[];
};

/** Questions WITHOUT correct_index / explanation, in the order of `ids`. */
export async function publicQuestions(ids: number[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) return [];
  const rows = must<PublicQuestion[]>(
    await db().from('questions').select('id, topic, difficulty, prompt, choices').in('id', ids),
  );
  const byId = new Map(rows.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is PublicQuestion => Boolean(q));
}

export async function pickQuestions(courseId: number, size: DuelSize) {
  const pool = await questionPool(courseId);
  if (pool.length < size) throw new HttpError(409, `Not enough approved questions (${pool.length}) for ${size}`);
  return pickDuelQuestions(pool, size);
}

// ---------- Sessions & answers ----------

type Kind = 'duel' | 'tournament';
type Session = { id: number; user_id: number; finished_at: string | null };

export async function getOrCreateSession(
  userId: number,
  kind: Kind,
  refId: number,
  courseId: number,
  questionIds: number[],
): Promise<Session> {
  const existing = must<Session[]>(
    await db()
      .from('test_sessions')
      .select('id, user_id, finished_at')
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('ref_id', refId)
      .limit(1),
  );
  if (existing[0]) return existing[0];
  return must<Session>(
    await db()
      .from('test_sessions')
      .insert({
        user_id: userId,
        course_id: courseId,
        kind,
        ref_id: refId,
        date: new Date().toISOString().slice(0, 10),
        started_at: new Date().toISOString(),
        question_ids: questionIds,
        total_xp: 0,
      })
      .select('id, user_id, finished_at')
      .single(),
  );
}

export async function findSession(userId: number, kind: Kind, refId: number) {
  const rows = must<Session[]>(
    await db()
      .from('test_sessions')
      .select('id, user_id, finished_at')
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('ref_id', refId)
      .limit(1),
  );
  return rows[0] ?? null;
}

/** Clamp a client-reported time into [0, limit]. */
export function clampTime(ms: unknown, difficulty: Difficulty) {
  const n = typeof ms === 'number' && Number.isFinite(ms) ? ms : QUESTION_TIME_LIMIT_MS[difficulty];
  return Math.max(0, Math.min(Math.round(n), QUESTION_TIME_LIMIT_MS[difficulty]));
}

/**
 * Store one answer. Duel/tournament answers give no per-question XP (xp_awarded = 0):
 * XP comes only from the duel bonus / tournament prizes, so the daily limit cannot be bypassed.
 * `chosenIndex = null` means the time ran out (counts as wrong).
 */
export async function recordAnswer(
  session: Session,
  questionId: number,
  chosenIndex: number | null,
  timeMs: number | null,
) {
  const q = must<{ correct_index: number; explanation: string | null; difficulty: Difficulty }>(
    await db().from('questions').select('correct_index, explanation, difficulty').eq('id', questionId).single(),
  );
  const isCorrect = chosenIndex !== null && chosenIndex === q.correct_index;
  const time = clampTime(timeMs, q.difficulty);
  const { error } = await db().from('answers').insert({
    session_id: session.id,
    user_id: session.user_id,
    question_id: questionId,
    chosen_index: chosenIndex,
    is_correct: isCorrect,
    time_ms: time,
    xp_awarded: 0,
  });
  if (error) {
    if (error.code === '23505') throw new HttpError(409, 'Already answered');
    throw new Error(error.message);
  }
  return { isCorrect, correctIndex: q.correct_index, explanation: q.explanation, timeMs: time };
}

export async function sessionScore(sessionId: number) {
  const rows = must<{ question_id: number; is_correct: boolean; time_ms: number }[]>(
    await db().from('answers').select('question_id, is_correct, time_ms').eq('session_id', sessionId),
  );
  return {
    answered: rows.length,
    answeredIds: rows.map((r) => r.question_id),
    correct: rows.filter((r) => r.is_correct).length,
    timeMs: rows.reduce((s, r) => s + (r.time_ms ?? 0), 0),
  };
}

export async function userNames(ids: number[]) {
  if (ids.length === 0) return new Map<number, { name: string; elo: number; xp: number }>();
  const rows = must<{ id: number; name: string; elo: number; xp: number }[]>(
    await db().from('users').select('id, name, elo, xp').in('id', ids),
  );
  return new Map(rows.map((u) => [u.id, u]));
}

// ---------- Duel ----------

export type Duel = {
  id: number;
  challenger_id: number;
  opponent_id: number;
  course_id: number;
  n_questions: DuelSize;
  status: 'invited' | 'active' | 'finished' | 'declined' | 'expired';
  question_ids: number[];
  winner_id: number | null;
  created_at: string;
  finished_at: string | null;
  result: DuelResult | null;
};

export type DuelResult = {
  scores: Record<string, { correct: number; timeMs: number }>;
  winnerId: number | null;
  /** Elo change per player id (as string key). */
  eloChange: Record<string, number>;
  bonusXp: number;
};

export async function getDuel(id: number) {
  const rows = must<Duel[]>(await db().from('duels').select('*').eq('id', id).limit(1));
  if (!rows[0]) throw new HttpError(404, 'Duel not found');
  return rows[0];
}

export function assertParticipant(duel: Duel, userId: number) {
  if (duel.challenger_id !== userId && duel.opponent_id !== userId) throw new HttpError(403, 'Not your duel');
}

/** When both players have answered every question: decide winner, update Elo, award bonus XP. Idempotent. */
export async function finalizeDuelIfDone(duelId: number) {
  const duel = await getDuel(duelId);
  if (duel.status !== 'active') return;

  const players = [duel.challenger_id, duel.opponent_id];
  const scores: PlayerScore[] = [];
  for (const uid of players) {
    const s = await findSession(uid, 'duel', duel.id);
    if (!s) return;
    const sc = await sessionScore(s.id);
    if (sc.answered < duel.n_questions) return;
    scores.push({ userId: uid, correct: sc.correct, timeMs: sc.timeMs });
  }

  const winnerId = decideWinner(scores[0], scores[1]);

  // Claim the duel first so only one request applies Elo / XP.
  const claimed = must<{ id: number }[]>(
    await db()
      .from('duels')
      .update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() })
      .eq('id', duel.id)
      .eq('status', 'active')
      .select('id'),
  );
  if (claimed.length === 0) return;

  const users = await userNames(players);
  const elo = (id: number) => users.get(id)?.elo ?? 1200;
  let bonusXp = 0;
  // `first` gains `delta`, `second` loses it (delta may be negative for a draw).
  let first = players[0];
  let second = players[1];
  let delta: number;

  if (winnerId !== null) {
    first = winnerId;
    second = winnerId === players[0] ? players[1] : players[0];
    const up = eloAfterWin(elo(first), elo(second));
    delta = up.winnerNew - elo(first);
    bonusXp = winnerBonusXp(up.winnerExpected);
  } else {
    delta = eloAfterDraw(elo(first), elo(second)).aNew - elo(first);
  }
  must(await db().rpc('update_elo', { p_winner: first, p_loser: second, p_delta: delta }));
  if (winnerId !== null) await awardXp(winnerId, bonusXp);

  const result: DuelResult = {
    scores: Object.fromEntries(scores.map((s) => [String(s.userId), { correct: s.correct, timeMs: s.timeMs }])),
    winnerId,
    eloChange: { [String(first)]: delta, [String(second)]: -delta },
    bonusXp,
  };
  must(await db().from('duels').update({ result }).eq('id', duel.id).select('id'));
  must(
    await db()
      .from('test_sessions')
      .update({ finished_at: new Date().toISOString(), total_xp: 0 })
      .eq('kind', 'duel')
      .eq('ref_id', duel.id)
      .select('id'),
  );
  if (winnerId !== null) {
    must(
      await db()
        .from('test_sessions')
        .update({ total_xp: bonusXp })
        .eq('kind', 'duel')
        .eq('ref_id', duel.id)
        .eq('user_id', winnerId)
        .select('id'),
    );
  }
}

// ---------- Live tournament ----------

export type Tournament = {
  id: number;
  university_id: number;
  course_id: number;
  title: string;
  starts_at: string;
  status: 'scheduled' | 'live' | 'finished';
  question_ids: number[];
  current_index: number;
  question_started_at: string | null;
  result: { prizes: { userId: number; xp: number }[] } | null;
};

export async function getTournament(id: number) {
  const rows = must<Tournament[]>(await db().from('tournaments').select('*').eq('id', id).limit(1));
  if (!rows[0]) throw new HttpError(404, 'Tournament not found');
  return rows[0];
}

export function assertHost(t: Tournament, me: Me) {
  if (me.role !== 'university' || me.university_id !== t.university_id) {
    throw new HttpError(403, 'Only the university account can control this competition');
  }
}

export function assertSameUniversity(t: Tournament, me: Me) {
  if (me.university_id !== t.university_id) throw new HttpError(403, 'This competition is for another university');
}

/** Rebuild one player's leaderboard row from their answers (safe against races and retries). */
export async function syncEntry(tournamentId: number, session: Session) {
  const sc = await sessionScore(session.id);
  must(
    await db()
      .from('tournament_entries')
      .upsert(
        { tournament_id: tournamentId, user_id: session.user_id, correct: sc.correct, time_ms: sc.timeMs },
        { onConflict: 'tournament_id,user_id' },
      )
      .select('user_id'),
  );
}

export async function finishTournament(t: Tournament) {
  const claimed = must<{ id: number }[]>(
    await db()
      .from('tournaments')
      .update({ status: 'finished' })
      .eq('id', t.id)
      .neq('status', 'finished')
      .select('id'),
  );
  if (claimed.length === 0) return;
  const entries = must<{ user_id: number; correct: number; time_ms: number }[]>(
    await db().from('tournament_entries').select('user_id, correct, time_ms').eq('tournament_id', t.id),
  );
  const prizes = tournamentPrizes(entries.map((e) => ({ userId: e.user_id, correct: e.correct, timeMs: e.time_ms })));
  for (const p of prizes) await awardXp(p.userId, p.xp);
  must(await db().from('tournaments').update({ result: { prizes } }).eq('id', t.id).select('id'));
}
