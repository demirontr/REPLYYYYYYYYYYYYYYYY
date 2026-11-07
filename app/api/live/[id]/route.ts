// GET — live competition state: current question (no answer), leaderboard, my progress.
import {
  assertSameUniversity,
  db,
  findSession,
  getTournament,
  must,
  publicQuestions,
  requireUser,
  route,
  toInt,
  userNames,
  type PublicQuestion,
} from '@/lib/duelServer';
import { rankEntries } from '@/lib/duel';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const me = await requireUser();
    const t = await getTournament(toInt((await ctx.params).id));
    assertSameUniversity(t, me);

    const entries = must<{ user_id: number; correct: number; time_ms: number }[]>(
      await db().from('tournament_entries').select('user_id, correct, time_ms').eq('tournament_id', t.id),
    );
    const names = await userNames(entries.map((e) => e.user_id));
    const leaderboard = rankEntries(entries.map((e) => ({ userId: e.user_id, correct: e.correct, timeMs: e.time_ms }))).map(
      (e) => ({ ...e, name: names.get(e.userId)?.name ?? `User ${e.userId}` }),
    );

    let current: PublicQuestion | null = null;
    let answeredCurrent = false;
    if (t.status === 'live') {
      const qid = t.question_ids[t.current_index];
      current = (await publicQuestions([qid]))[0] ?? null;
      const s = await findSession(me.id, 'tournament', t.id);
      if (s) {
        const { data } = await db().from('answers').select('id').eq('session_id', s.id).eq('question_id', qid).maybeSingle();
        answeredCurrent = Boolean(data);
      }
    }

    return {
      id: t.id,
      title: t.title,
      status: t.status,
      startsAt: t.starts_at,
      total: t.question_ids.length,
      index: t.current_index,
      questionStartedAt: t.question_started_at,
      serverNow: new Date().toISOString(),
      current,
      answeredCurrent,
      leaderboard,
      prizes: t.result?.prizes ?? [],
      isHost: me.role === 'university' && me.university_id === t.university_id,
      meId: me.id,
    };
  });
}
