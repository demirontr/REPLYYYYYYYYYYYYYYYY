// Supabase Realtime wiring for duels and live tournaments (owner: Claude 2).
// Takes the client as a parameter so it does not depend on how lib/supabase.ts builds it.
// Requires the tables to be in the `supabase_realtime` publication (see migrations/20_duel_live.sql).

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;
type Unsubscribe = () => void;

function close(client: SupabaseClient, ch: RealtimeChannel): Unsubscribe {
  return () => {
    void client.removeChannel(ch);
  };
}

/** New duel invitations addressed to `userId` (INSERT on duels where opponent_id = userId). */
export function subscribeInvites(
  client: SupabaseClient,
  userId: string,
  onInvite: (duel: Row) => void,
): Unsubscribe {
  const ch = client
    .channel(`invites:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'duels', filter: `opponent_id=eq.${userId}` },
      (p) => onInvite(p.new as Row),
    )
    .subscribe();
  return close(client, ch);
}

/** Status changes of one duel (accepted, declined, expired, finished). */
export function subscribeDuel(
  client: SupabaseClient,
  duelId: number,
  onChange: (duel: Row) => void,
): Unsubscribe {
  const ch = client
    .channel(`duel-row:${duelId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duelId}` },
      (p) => onChange(p.new as Row),
    )
    .subscribe();
  return close(client, ch);
}

export type DuelProgress = {
  userId: string;
  answered: number;
  correct: number;
  timeMs: number;
  done: boolean;
};

/**
 * Live room for a running duel: each player broadcasts progress after every answer,
 * so both screens show the opponent's progress bar. Scores are saved to the DB separately.
 */
export function joinDuelRoom(
  client: SupabaseClient,
  duelId: number,
  onProgress: (p: DuelProgress) => void,
): { send: (p: DuelProgress) => Promise<unknown>; leave: Unsubscribe } {
  const ch = client
    .channel(`duel-room:${duelId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'progress' }, ({ payload }) => onProgress(payload as DuelProgress))
    .subscribe();
  return {
    send: (p) => ch.send({ type: 'broadcast', event: 'progress', payload: p }),
    leave: close(client, ch),
  };
}

/** Live tournament: tournament row changes (status, current question) and entry score changes. */
export function subscribeTournament(
  client: SupabaseClient,
  tournamentId: number,
  handlers: { onTournament?: (t: Row) => void; onEntry?: (e: Row) => void },
): Unsubscribe {
  const ch = client
    .channel(`tournament:${tournamentId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` },
      (p) => handlers.onTournament?.(p.new as Row),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tournament_entries', filter: `tournament_id=eq.${tournamentId}` },
      (p) => handlers.onEntry?.(p.new as Row),
    )
    .subscribe();
  return close(client, ch);
}

/** Someone's position changed — used to raise the automatic "X is nearby" prompt quickly. */
export function subscribeLocations(
  client: SupabaseClient,
  onLocation: (loc: Row) => void,
): Unsubscribe {
  const ch = client
    .channel('locations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, (p) =>
      onLocation(p.new as Row),
    )
    .subscribe();
  return close(client, ch);
}
