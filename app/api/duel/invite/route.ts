// POST { opponentId, size: 5 | 10 } — challenge a nearby player. Proximity is checked on the server.
import { db, DEMO_COURSE_ID, HttpError, must, pickQuestions, readJson, requireUser, route } from '@/lib/duelServer';
import { DUEL_SIZES, type DuelSize } from '@/lib/duel';
import { NEARBY_RADIUS_M } from '@/lib/geo';

export async function POST(req: Request) {
  return route(async () => {
    const me = await requireUser();
    if (me.role !== 'student') throw new HttpError(403, 'Only students can duel');
    const { opponentId, size } = await readJson<{ opponentId?: number; size?: number }>(req);
    if (!Number.isInteger(opponentId) || opponentId === me.id) throw new HttpError(400, 'Invalid opponent');
    if (!DUEL_SIZES.includes(size as DuelSize)) throw new HttpError(400, 'size must be 5 or 10');

    const nearby = must<{ user_id: number }[]>(
      await db().rpc('nearby_users', { p_user: me.id, p_radius_m: NEARBY_RADIUS_M }),
    );
    if (!nearby.some((n) => n.user_id === opponentId)) {
      throw new HttpError(409, 'That player is not within 50 m any more');
    }

    must(await db().rpc('expire_stale_invites'));
    const open = must<{ id: number }[]>(
      await db()
        .from('duels')
        .select('id')
        .in('status', ['invited', 'active'])
        .or(`challenger_id.in.(${me.id},${opponentId}),opponent_id.in.(${me.id},${opponentId})`),
    );
    if (open.length > 0) throw new HttpError(409, 'One of you already has an open duel');

    const questionIds = await pickQuestions(DEMO_COURSE_ID, size as DuelSize);
    const duel = must<{ id: number }>(
      await db()
        .from('duels')
        .insert({
          challenger_id: me.id,
          opponent_id: opponentId,
          course_id: DEMO_COURSE_ID,
          n_questions: size,
          status: 'invited',
          question_ids: questionIds,
        })
        .select('id')
        .single(),
    );
    return { id: duel.id };
  });
}
