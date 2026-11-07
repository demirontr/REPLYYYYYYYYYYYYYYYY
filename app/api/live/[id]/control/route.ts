// POST { action: 'start' | 'next' | 'finish' } — the hosting university moves the competition along.
import { assertHost, db, finishTournament, getTournament, HttpError, must, readJson, requireUser, route, toInt } from '@/lib/duelServer';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const me = await requireUser();
    const t = await getTournament(toInt((await ctx.params).id));
    assertHost(t, me);
    const { action } = await readJson<{ action?: string }>(req);
    const now = new Date().toISOString();

    if (action === 'start') {
      if (t.status !== 'scheduled') throw new HttpError(409, `Competition is ${t.status}`);
      must(
        await db()
          .from('tournaments')
          .update({ status: 'live', current_index: 0, question_started_at: now })
          .eq('id', t.id)
          .eq('status', 'scheduled')
          .select('id'),
      );
    } else if (action === 'next') {
      if (t.status !== 'live') throw new HttpError(409, `Competition is ${t.status}`);
      if (t.current_index + 1 >= t.question_ids.length) {
        await finishTournament(t);
      } else {
        must(
          await db()
            .from('tournaments')
            .update({ current_index: t.current_index + 1, question_started_at: now })
            .eq('id', t.id)
            .eq('current_index', t.current_index)
            .select('id'),
        );
      }
    } else if (action === 'finish') {
      if (t.status === 'finished') throw new HttpError(409, 'Already finished');
      await finishTournament(t);
    } else {
      throw new HttpError(400, 'Unknown action');
    }
    return { ok: true };
  });
}
