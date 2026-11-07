'use client';
// One live competition: waiting room, synchronized questions, live leaderboard, host controls (owner: Claude 2).

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';
import { subscribeTournament } from '@/lib/realtime';
import { QUESTION_TIME_LIMIT_MS } from '@/lib/duel';
import { api, fmtSeconds } from './api';
import { QuestionCard, type AnswerFeedback, type CardQuestion } from './QuestionCard';

type State = {
  id: number;
  title: string;
  status: 'scheduled' | 'live' | 'finished';
  total: number;
  index: number;
  questionStartedAt: string | null;
  serverNow: string;
  current: CardQuestion | null;
  answeredCurrent: boolean;
  leaderboard: { userId: number; name: string; correct: number; timeMs: number; rank: number }[];
  prizes: { userId: number; xp: number }[];
  isHost: boolean;
  meId: number;
};

export function LivePlay({ tournamentId }: { tournamentId: number }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [s, setS] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clockOffset, setClockOffset] = useState(0); // local clock − server clock

  // State is only set inside promise callbacks (react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      api<State>(`/api/live/${tournamentId}`).then(
        (d) => {
          setClockOffset(Date.now() - new Date(d.serverNow).getTime());
          setS(d);
        },
        (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the competition'),
      ),
    [tournamentId],
  );

  useEffect(() => {
    void load();
    const unsub = subscribeTournament(supabase, tournamentId, {
      onTournament: () => void load(),
      onEntry: () => void load(),
    });
    const t = setInterval(load, 2500);
    return () => {
      clearInterval(t);
      unsub();
    };
  }, [load, supabase, tournamentId]);

  async function control(action: 'start' | 'next' | 'finish') {
    setBusy(true);
    try {
      await api(`/api/live/${tournamentId}/control`, { action });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  // Questions answered in this tab keep their feedback card; after a reload we show a short note instead.
  const [answeredHere, setAnsweredHere] = useState<Set<number>>(new Set());
  const answer = (q: CardQuestion, index: number) => async (chosenIndex: number | null): Promise<AnswerFeedback> => {
    setAnsweredHere((prev) => new Set(prev).add(index));
    return api<AnswerFeedback>(`/api/live/${tournamentId}/answer`, { questionId: q.id, chosenIndex });
  };

  if (error && !s) return <Wrap><p className="text-pen">{error}</p></Wrap>;
  if (!s) return <Wrap><p className="text-graphite/60">Loading…</p></Wrap>;

  const startedAtLocal = s.questionStartedAt ? new Date(s.questionStartedAt).getTime() + clockOffset : undefined;

  return (
    <Wrap>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/live" className="text-sm text-indigo-700 hover:underline">← All competitions</Link>
          <h1 className="text-3xl font-bold tracking-tight text-graphite">{s.title}</h1>
        </div>
        {s.status === 'live' && (
          <span className="rounded-full bg-pen/10 px-3 py-1 text-sm font-medium text-pen">
            ● LIVE · {s.index + 1}/{s.total}
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-pen">{error}</p>}

      {s.isHost && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-md border border-grid bg-paper p-3">
          <span className="mr-auto self-center text-sm font-medium text-graphite/80">Host controls</span>
          {s.status === 'scheduled' && (
            <button type="button" disabled={busy} onClick={() => control('start')} className="rounded-md bg-pen px-4 py-2 text-sm font-medium text-white hover:bg-pen/90 disabled:opacity-50">
              Start now
            </button>
          )}
          {s.status === 'live' && (
            <>
              <button type="button" disabled={busy} onClick={() => control('next')} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {s.index + 1 < s.total ? 'Next question' : 'Finish & award prizes'}
              </button>
              <button type="button" disabled={busy} onClick={() => control('finish')} className="rounded-md border border-grid px-4 py-2 text-sm text-graphite/80 hover:bg-white disabled:opacity-50">
                End early
              </button>
            </>
          )}
        </div>
      )}

      {s.status === 'scheduled' && (
        <p className="mb-4 rounded-md border border-grid bg-white p-4 text-graphite/70">
          Waiting room — the competition starts when the host presses start. Keep this page open.
        </p>
      )}

      {s.status === 'live' && s.current && (
        s.isHost ? (
          <div className="mb-4 rounded-md border border-grid bg-white p-5">
            <p className="mb-1 text-sm text-graphite/60">Question {s.index + 1} on students&apos; screens</p>
            <p className="whitespace-pre-wrap text-lg font-medium text-graphite">{s.current.prompt}</p>
            <p className="mt-2 text-sm text-graphite/60">{s.leaderboard.length} players · time limit {fmtSeconds(QUESTION_TIME_LIMIT_MS[s.current.difficulty])}</p>
          </div>
        ) : s.answeredCurrent && !answeredHere.has(s.index) ? (
          <p className="mb-4 rounded-md border border-grid bg-white p-4 text-graphite/70">Answer received — wait for the next question.</p>
        ) : (
          <div className="mb-4">
            <QuestionCard
              key={`${s.id}-${s.index}`}
              question={s.current}
              index={s.index}
              total={s.total}
              limitMs={QUESTION_TIME_LIMIT_MS[s.current.difficulty]}
              startedAt={startedAtLocal}
              onAnswer={answer(s.current, s.index)}
            />
          </div>
        )
      )}

      {s.status === 'finished' && (
        <div className="mb-4 rounded-md border border-tick/50 bg-tick/5 p-4">
          <p className="font-semibold text-tick">Competition finished!</p>
          {s.prizes.length > 0 && (
            <p className="text-sm text-tick">
              Prizes: {s.prizes.map((p) => `${s.leaderboard.find((l) => l.userId === p.userId)?.name ?? p.userId} +${p.xp} XP`).join(' · ')}
            </p>
          )}
        </div>
      )}

      <section className="rounded-md border border-grid bg-white p-4">
        <h2 className="mb-2 font-semibold text-graphite">Leaderboard</h2>
        {s.leaderboard.length === 0 && <p className="text-sm text-graphite/60">No answers yet.</p>}
        <ol className="divide-y divide-grid">
          {s.leaderboard.map((e) => (
            <li key={e.userId} className={`flex items-center justify-between py-2 ${e.userId === s.meId ? 'font-semibold' : ''}`}>
              <span className="text-graphite">
                <span className="mr-2 inline-block w-6 text-graphite/40">{e.rank}.</span>
                {e.name}
                {e.userId === s.meId && ' (you)'}
              </span>
              <span className="text-sm text-graphite/70">
                {e.correct} correct · {fmtSeconds(e.timeMs)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </Wrap>
  );
}

function Wrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl p-4">{children}</div>;
}
