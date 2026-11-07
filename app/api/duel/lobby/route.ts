// GET — everything the duel lobby needs: nearby players, incoming invites, my pending invite, active duel.
import { db, dbNow, must, requireUser, route, userNames, type Duel } from '@/lib/duelServer';
import { NEARBY_RADIUS_M } from '@/lib/geo';
import { INVITE_TTL_MS } from '@/lib/duel';

type Nearby = { user_id: number; name: string; elo: number; xp: number; distance_m: number };

export async function GET() {
  return route(async () => {
    // Independent queries run in parallel: this route is polled every POLL_MS.
    const [me, expired] = await Promise.all([requireUser(), db().rpc('expire_stale_invites')]);
    must(expired);

    const [now, nearbyRes, mineRes, locRes] = await Promise.all([
      dbNow(),
      db().rpc('nearby_users', { p_user: me.id, p_radius_m: NEARBY_RADIUS_M }),
      db()
        .from('duels')
        .select('*')
        .or(`challenger_id.eq.${me.id},opponent_id.eq.${me.id}`)
        .in('status', ['invited', 'active'])
        .order('created_at', { ascending: false }),
      db().from('locations').select('sharing').eq('user_id', me.id).maybeSingle(),
    ]);
    const nearby = must<Nearby[]>(nearbyRes);
    const mine = must<Duel[]>(mineRes);
    const loc = locRes.data as { sharing: boolean } | null;

    const names = await userNames([...new Set(mine.flatMap((d) => [d.challenger_id, d.opponent_id]))]);
    const nameOf = (id: number) => names.get(id)?.name ?? `User ${id}`;
    // Countdown computed on the database clock; the browser only counts down from this value.
    const expiresInMs = (createdAt: string) => Math.max(0, INVITE_TTL_MS - (now - new Date(createdAt).getTime()));

    const incoming = mine
      .filter((d) => d.status === 'invited' && d.opponent_id === me.id)
      .map((d) => ({ id: d.id, from: nameOf(d.challenger_id), fromId: d.challenger_id, size: d.n_questions, expiresInMs: expiresInMs(d.created_at) }));
    const outgoing = mine
      .filter((d) => d.status === 'invited' && d.challenger_id === me.id)
      .map((d) => ({ id: d.id, to: nameOf(d.opponent_id), size: d.n_questions, expiresInMs: expiresInMs(d.created_at) }));
    const active = mine.find((d) => d.status === 'active');

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
