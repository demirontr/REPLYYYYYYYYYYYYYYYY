// POST { questionId, chosenIndex: number | null, timeMs } — answer the next duel question.
import {
  assertParticipant,
  finalizeDuelIfDone,
  getDuel,
  getOrCreateSession,
  HttpError,
  readJson,
  recordAnswer,
  requireUser,
  route,
  sessionScore,
  toInt,
} from '@/lib/duelServer';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const me = await requireUser();
    const duel = await getDuel(toInt((await ctx.params).id));
    assertParticipant(duel, me.id);
    if (duel.status !== 'active') throw new HttpError(409, `Duel is ${duel.status}`);

    const body = await readJson<{ questionId?: number; chosenIndex?: number | null; timeMs?: number }>(req);
    const session = await getOrCreateSession(me.id, 'duel', duel.id, duel.course_id, duel.question_ids);

    // Questions must be answered in order.
    const { answered } = await sessionScore(session.id);
    const expected = duel.question_ids[answered];
    if (expected === undefined) throw new HttpError(409, 'All questions answered');
    if (body.questionId !== expected) throw new HttpError(409, 'Out of order answer');

    const chosen = Number.isInteger(body.chosenIndex) ? (body.chosenIndex as number) : null;
    const res = await recordAnswer(session, expected, chosen, body.timeMs ?? null);

    if (answered + 1 === duel.n_questions) await finalizeDuelIfDone(duel.id);
    return res;
  });
}
