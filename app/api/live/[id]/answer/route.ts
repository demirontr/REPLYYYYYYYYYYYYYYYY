// POST { questionId, chosenIndex: number | null } — answer the current live question.
// Answer time is measured on the server from when the host showed the question.
import {
  assertSameUniversity,
  db,
  must,
  getOrCreateSession,
  getTournament,
  HttpError,
  readJson,
  recordAnswer,
  requireUser,
  route,
  syncEntry,
  toInt,
} from '@/lib/duelServer';
import { QUESTION_TIME_LIMIT_MS, type Difficulty } from '@/lib/duel';

const GRACE_MS = 1500; // network delay allowance

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const me = await requireUser();
    if (me.role !== 'student') throw new HttpError(403, 'Only students can play');
    const t = await getTournament(toInt((await ctx.params).id));
    assertSameUniversity(t, me);
    if (t.status !== 'live' || !t.question_started_at) throw new HttpError(409, 'No question is open');

    const body = await readJson<{ questionId?: number; chosenIndex?: number | null }>(req);
    const qid = t.question_ids[t.current_index];
    if (body.questionId !== qid) throw new HttpError(409, 'That question is closed');

    const { difficulty } = must<{ difficulty: Difficulty }>(
      await db().from('questions').select('difficulty').eq('id', qid).single(),
    );
    const elapsed = Date.now() - new Date(t.question_started_at).getTime();
    if (elapsed > QUESTION_TIME_LIMIT_MS[difficulty] + GRACE_MS) throw new HttpError(409, 'Time is up');

    const session = await getOrCreateSession(me.id, 'tournament', t.id, t.course_id, t.question_ids);
    const chosen = Number.isInteger(body.chosenIndex) ? (body.chosenIndex as number) : null;
    const res = await recordAnswer(session, qid, chosen, elapsed);
    await syncEntry(t.id, session);
    return res;
  });
}
