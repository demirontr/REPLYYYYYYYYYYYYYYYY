'use client';
// List of live competitions at my university + create form for the university account (owner: Claude 2).

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/ui';
import { api, poller, POLL_MS } from './api';

type Item = { id: number; title: string; status: 'scheduled' | 'live' | 'finished'; startsAt: string; questions: number };

const statusStyle: Record<Item['status'], string> = {
  scheduled: 'bg-paper text-graphite/80',
  live: 'bg-pen/10 text-pen',
  finished: 'bg-tick/10 text-tick',
};

export function LiveList() {
  const [items, setItems] = useState<Item[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [title, setTitle] = useState('Analysis I Campus Clash');
  const [size, setSize] = useState<5 | 10>(10);
  const [message, setMessage] = useState<string | null>(null);

  // State is only set inside promise callbacks (react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      api<{ isHost?: boolean; tournaments: Item[] }>('/api/live').then(
        (d) => {
          setItems(d.tournaments);
          setIsHost(Boolean(d.isHost));
        },
        (e: unknown) => setMessage(e instanceof Error ? e.message : 'Could not load competitions'),
      ),
    [],
  );

  useEffect(() => {
    const tick = poller(load);
    tick();
    const t = setInterval(tick, POLL_MS * 2);
    return () => clearInterval(t);
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api('/api/live', { title, size });
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not create');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <PageTitle sub="Everyone at your university answers the same questions at the same time. Most correct answers wins; ties go to the faster player. Top 3 earn 100 / 60 / 30 XP.">
        Live Campus Competition
      </PageTitle>

      {message && <div className="rounded-md border border-marker bg-marker/30 px-4 py-2 text-sm text-graphite">{message}</div>}

      {isHost && (
        <form onSubmit={create} className="space-y-3 rounded-md border border-grid bg-white p-4">
          <h2 className="font-semibold text-graphite">Create a competition</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-grid px-3 py-2"
            placeholder="Title"
          />
          <div className="flex items-center gap-3">
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value) as 5 | 10)}
              className="rounded-md border border-grid px-3 py-2"
            >
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
            </select>
            <button type="submit" className="rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-indigo-700">
              Create
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {items.length === 0 && <li className="text-graphite/60">No competitions yet.</li>}
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/live/${t.id}`} className="flex items-center justify-between rounded-md border border-grid bg-white px-4 py-3 hover:border-ink">
              <div>
                <p className="font-medium text-graphite">{t.title}</p>
                <p className="text-xs text-graphite/60">
                  {t.questions} questions · {new Date(t.startsAt).toLocaleString()}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[t.status]}`}>
                {t.status === 'live' ? '● LIVE' : t.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
