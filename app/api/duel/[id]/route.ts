// GET — duel state for one of its two players. Correct answers are never sent before answering.
import {
  assertParticipant,
  findSession,
  getDuel,
  publicQuestions,
  requireDuelUser,
  route,
  sessionScore,
  toInt,
  userNames,
} from '@/lib/duelServer';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const me = await requireDuelUser();
    const duel = await getDuel(toInt((await ctx.params).id));
    assertParticipant(duel, me.id);

    const opponentId = duel.challenger_id === me.id ? duel.opponent_id : duel.challenger_id;
    const names = await userNames([me.id, opponentId]);

    const progress = async (uid: number) => {
      const s = await findSession(uid, 'duel', duel.id);
      return s ? sessionScore(s.id) : { answered: 0, answeredIds: [] as number[], correct: 0, timeMs: 0 };
    };
    const mine = await progress(me.id);
    const theirs = await progress(opponentId);

    return {
      id: duel.id,
      status: duel.status,
      size: duel.n_questions,
      createdAt: duel.created_at,
      me: { id: me.id, name: names.get(me.id)?.name ?? 'You', elo: names.get(me.id)?.elo ?? 1200 },
      opponent: { id: opponentId, name: names.get(opponentId)?.name ?? 'Opponent', elo: names.get(opponentId)?.elo ?? 1200 },
      questions: duel.status === 'active' || duel.status === 'finished' ? await publicQuestions(duel.question_ids) : [],
      myProgress: { answered: mine.answered, answeredIds: mine.answeredIds, correct: mine.correct, timeMs: mine.timeMs },
      opponentProgress: { answered: theirs.answered, correct: duel.status === 'finished' ? theirs.correct : null },
      winnerId: duel.winner_id,
      result: duel.result,
    };
  });
}
