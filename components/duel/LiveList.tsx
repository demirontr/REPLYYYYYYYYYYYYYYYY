'use client';
// List of live competitions at my university + create form for the university account (owner: Claude 2).

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from './api';

type Item = { id: number; title: string; status: 'scheduled' | 'live' | 'finished'; startsAt: string; questions: number };

const statusStyle: Record<Item['status'], string> = {
  scheduled: 'bg-slate-100 text-slate-700',
  live: 'bg-rose-100 text-rose-700',
  finished: 'bg-emerald-100 text-emerald-700',
};

export function LiveList() {
  const [items, setItems] = useState<Item[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [title, setTitle] = useState('Analysis I Campus Clash');
  const [size, setSize] = useState<5 | 10>(10);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ isHost?: boolean; tournaments: Item[] }>('/api/live');
      setItems(d.tournaments);
      setIsHost(Boolean(d.isHost));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not load competitions');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
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
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Live Campus Competition</h1>
        <p className="text-slate-600">
          Everyone at your university answers the same questions at the same time. Most correct answers wins; ties go
          to the faster player. Top 3 earn 100 / 60 / 30 XP.
        </p>
      </header>

      {message && <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">{message}</div>}

      {isHost && (
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Create a competition</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Title"
          />
          <div className="flex items-center gap-3">
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value) as 5 | 10)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
            </select>
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700">
              Create
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {items.length === 0 && <li className="text-slate-500">No competitions yet.</li>}
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/live/${t.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-sky-400">
              <div>
                <p className="font-medium text-slate-900">{t.title}</p>
                <p className="text-xs text-slate-500">
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
