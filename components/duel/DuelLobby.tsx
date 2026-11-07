'use client';
// Duel lobby: location sharing, nearby players, automatic "X is nearby" prompts, invitations (owner: Claude 2).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';
import { POLITO_CAMPUS, simulateNear, startLocationWatch, LOCATION_PUSH_INTERVAL_MS, type LocationError } from '@/lib/geo';
import { subscribeInvites } from '@/lib/realtime';
import { INVITE_TTL_MS, type DuelSize } from '@/lib/duel';
import { PageTitle } from '@/components/ui';
import { api, POLL_MS } from './api';

type Lobby = {
  me: { id: number; name: string };
  sharing: boolean;
  nearby: { id: number; name: string; elo: number; xp: number; distanceM: number }[];
  incoming: { id: number; from: string; fromId: number; size: DuelSize; createdAt: string }[];
  outgoing: { id: number; to: string; size: DuelSize; createdAt: string }[];
  activeDuelId: number | null;
};

type Mode = 'off' | 'gps' | 'demo';

const locationErrorText: Record<LocationError, string> = {
  unsupported: 'This browser cannot share location. Use demo mode.',
  denied: 'Location permission was denied. Allow it in the browser, or use demo mode.',
  unavailable: 'Location is unavailable right now.',
  timeout: 'Getting your location took too long.',
};

const secondsLeft = (createdAt: string) =>
  Math.max(0, Math.ceil((INVITE_TTL_MS - (Date.now() - new Date(createdAt).getTime())) / 1000));

export function DuelLobby({ meId }: { meId: number }) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [mode, setMode] = useState<Mode>('off');
  const [size, setSize] = useState<DuelSize>(5);
  const [message, setMessage] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<{ id: number; name: string }[]>([]);
  const seenNearby = useRef<Set<number>>(new Set());
  const [, tick] = useState(0);

  // State is only set inside promise callbacks, so calling this from an effect is fine
  // (react-hooks/set-state-in-effect).
  const refresh = useCallback(
    () =>
      api<Lobby>('/api/duel/lobby').then(
        (data) => {
          setLobby(data);
          if (data.activeDuelId) router.push(`/duel/${data.activeDuelId}`);

          // Automatic prompt for players who just came within range.
          const ids = new Set(data.nearby.map((n) => n.id));
          const fresh = data.nearby.filter((n) => !seenNearby.current.has(n.id));
          if (fresh.length) setPrompts((p) => [...p, ...fresh.map((n) => ({ id: n.id, name: n.name }))]);
          seenNearby.current = ids;
          setPrompts((p) => p.filter((x) => ids.has(x.id)));
        },
        (e: unknown) => setMessage(e instanceof Error ? e.message : 'Could not load the lobby'),
      ),
    [router],
  );

  // Poll (fallback) + realtime invitations (instant).
  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, POLL_MS);
    const unsub = subscribeInvites(supabase, meId, () => void refresh());
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(t);
      clearInterval(clock);
      unsub();
    };
  }, [refresh, supabase, meId]);

  // Location sharing.
  useEffect(() => {
    if (mode === 'off') return;
    const push = (lat: number, lng: number) =>
      api('/api/duel/location', { lat, lng, sharing: true })
        .then(() => refresh())
        .catch((e) => setMessage(e.message));

    if (mode === 'demo') {
      const p = simulateNear(POLITO_CAMPUS);
      void push(p.lat, p.lng);
      const t = setInterval(() => void push(p.lat, p.lng), LOCATION_PUSH_INTERVAL_MS);
      return () => clearInterval(t);
    }
    return startLocationWatch(
      (pos) => void push(pos.lat, pos.lng),
      (err) => {
        setMessage(locationErrorText[err]);
        setMode('off');
      },
    );
  }, [mode, refresh]);

  async function stopSharing() {
    setMode('off');
    await api('/api/duel/location', { sharing: false }).catch(() => {});
    void refresh();
  }

  async function challenge(opponentId: number) {
    setMessage(null);
    try {
      await api('/api/duel/invite', { opponentId, size });
      setPrompts((p) => p.filter((x) => x.id !== opponentId));
      void refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not send the invitation');
    }
  }

  async function respond(duelId: number, accept: boolean) {
    setMessage(null);
    try {
      await api(`/api/duel/${duelId}/respond`, { accept });
      if (accept) router.push(`/duel/${duelId}`);
      else void refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not answer the invitation');
      void refresh();
    }
  }

  const sharing = mode !== 'off';
  const pendingOutgoing = lobby?.outgoing[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <PageTitle sub="Meet another student in person, then race through 5 or 10 Analysis I questions. Most correct answers wins; on a tie, the faster player wins.">
        Campus Duel
      </PageTitle>

      {message && (
        <div className="rounded-md border border-marker bg-marker/30 px-4 py-2 text-sm text-graphite">{message}</div>
      )}

      {/* Automatic proximity prompts */}
      {prompts.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-md border border-indigo-300 bg-indigo-50 px-4 py-3">
          <span className="font-medium text-indigo-900">{p.name} is nearby — challenge?</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => challenge(p.id)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Challenge ({size})
            </button>
            <button type="button" onClick={() => setPrompts((x) => x.filter((y) => y.id !== p.id))} className="rounded-md px-3 py-1.5 text-sm text-indigo-800 hover:bg-paper">
              Later
            </button>
          </div>
        </div>
      ))}

      {/* Incoming invitations */}
      {lobby?.incoming.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between rounded-md border border-tick/50 bg-tick/5 px-4 py-3">
          <span className="text-tick">
            <strong>{inv.from}</strong> challenged you to a {inv.size}-question duel · <span className="font-math">{secondsLeft(inv.createdAt)}</span> s
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => respond(inv.id, true)} className="rounded-md bg-tick px-3 py-1.5 text-sm font-medium text-white hover:bg-tick/90">
              Accept
            </button>
            <button type="button" onClick={() => respond(inv.id, false)} className="rounded-md px-3 py-1.5 text-sm text-tick hover:bg-tick/10">
              Decline
            </button>
          </div>
        </div>
      ))}

      {pendingOutgoing && (
        <div className="rounded-md border border-grid bg-paper px-4 py-3 text-graphite/80">
          Waiting for <strong>{pendingOutgoing.to}</strong> to accept… <span className="font-math">{secondsLeft(pendingOutgoing.createdAt)}</span> s
        </div>
      )}

      {/* Location sharing */}
      <section className="rounded-md border border-grid bg-white p-4">
        <h2 className="mb-1 font-semibold text-graphite">Your location</h2>
        <p className="mb-3 text-sm text-graphite/70">
          Shared only while this page is open and only to find players within 50 m. Turn it off any time.
        </p>
        <div className="flex flex-wrap gap-2">
          {!sharing ? (
            <>
              <button type="button" onClick={() => setMode('gps')} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Share my location
              </button>
              <button type="button" onClick={() => setMode('demo')} className="rounded-md border border-grid px-4 py-2 text-sm font-medium text-graphite/80 hover:bg-paper">
                Simulate location (demo)
              </button>
            </>
          ) : (
            <>
              <span className="rounded-md bg-tick/10 px-3 py-2 text-sm text-tick">
                {mode === 'demo' ? 'Demo: placed at PoliTo main campus' : 'Sharing GPS location'}
              </span>
              <button type="button" onClick={stopSharing} className="rounded-md border border-grid px-4 py-2 text-sm text-graphite/80 hover:bg-paper">
                Stop sharing
              </button>
            </>
          )}
        </div>
      </section>

      {/* Nearby players */}
      <section className="rounded-md border border-grid bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-graphite">Nearby players</h2>
          <div className="flex rounded-md border border-grid p-0.5 text-sm">
            {([5, 10] as DuelSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded-md px-3 py-1 ${size === s ? 'bg-ink text-white' : 'text-graphite/80'}`}
              >
                {s} questions
              </button>
            ))}
          </div>
        </div>
        {!sharing && <p className="text-sm text-graphite/60">Share your location to see who is around.</p>}
        {sharing && lobby && lobby.nearby.length === 0 && (
          <p className="text-sm text-graphite/60">Nobody within 50 m yet. Open this page in a second tab as another demo student and use demo mode.</p>
        )}
        <ul className="divide-y divide-grid">
          {sharing &&
            lobby?.nearby.map((n) => (
              <li key={n.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-graphite">{n.name}</p>
                  <p className="text-xs text-graphite/60">
                    <span className="font-math">{n.distanceM}</span> m away · Elo <span className="font-math">{n.elo}</span> · <span className="font-math">{n.xp}</span> XP
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(pendingOutgoing)}
                  onClick={() => challenge(n.id)}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Challenge
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
