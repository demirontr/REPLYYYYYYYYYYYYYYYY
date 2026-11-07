// GET — everything the duel lobby needs: nearby players, incoming invites, my pending invite, active duel.
import { db, must, requireUser, route, userNames, type Duel } from '@/lib/duelServer';
import { NEARBY_RADIUS_M } from '@/lib/geo';

type Nearby = { user_id: number; name: string; elo: number; xp: number; distance_m: number };

export async function GET() {
  return route(async () => {
    const me = await requireUser();
    must(await db().rpc('expire_stale_invites'));

    const nearby = must<Nearby[]>(await db().rpc('nearby_users', { p_user: me.id, p_radius_m: NEARBY_RADIUS_M }));

    const mine = must<Duel[]>(
      await db()
        .from('duels')
        .select('*')
        .or(`challenger_id.eq.${me.id},opponent_id.eq.${me.id}`)
        .in('status', ['invited', 'active'])
        .order('created_at', { ascending: false }),
    );

    const names = await userNames([...new Set(mine.flatMap((d) => [d.challenger_id, d.opponent_id]))]);
    const nameOf = (id: number) => names.get(id)?.name ?? `User ${id}`;

    const incoming = mine
      .filter((d) => d.status === 'invited' && d.opponent_id === me.id)
      .map((d) => ({ id: d.id, from: nameOf(d.challenger_id), fromId: d.challenger_id, size: d.n_questions, createdAt: d.created_at }));
    const outgoing = mine
      .filter((d) => d.status === 'invited' && d.challenger_id === me.id)
      .map((d) => ({ id: d.id, to: nameOf(d.opponent_id), size: d.n_questions, createdAt: d.created_at }));
    const active = mine.find((d) => d.status === 'active');

    const { data: loc } = await db().from('locations').select('sharing').eq('user_id', me.id).maybeSingle();

    return {
      me: { id: me.id, name: me.name },
      sharing: Boolean(loc?.sharing),
      nearby: nearby.map((n) => ({ id: n.user_id, name: n.name, elo: n.elo, xp: n.xp, distanceM: Math.round(n.distance_m) })),
      incoming,
      outgoing,
      activeDuelId: active?.id ?? null,
    };
  });
}
