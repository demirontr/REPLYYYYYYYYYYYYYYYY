// POST { accept: boolean } — the invited player accepts or declines.
import { db, dbNow, getDuel, HttpError, must, readJson, requireUser, route, toInt } from '@/lib/duelServer';
import { isInviteExpired } from '@/lib/duel';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const me = await requireUser();
    const duel = await getDuel(toInt((await ctx.params).id));
    if (duel.opponent_id !== me.id) throw new HttpError(403, 'This invitation is not for you');
    if (duel.status !== 'invited') throw new HttpError(409, `Invitation is ${duel.status}`);

    const { accept } = await readJson<{ accept?: boolean }>(req);
    // created_at is database time, so compare against the database clock.
    const status = isInviteExpired(duel.created_at, await dbNow()) ? 'expired' : accept ? 'active' : 'declined';

    const updated = must<{ id: number }[]>(
      await db().from('duels').update({ status }).eq('id', duel.id).eq('status', 'invited').select('id'),
    );
    if (updated.length === 0) throw new HttpError(409, 'Invitation changed, try again');
    if (status === 'expired') throw new HttpError(410, 'Invitation expired');
    return { id: duel.id, status };
  });
}
