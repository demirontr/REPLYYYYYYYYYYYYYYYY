'use client';
// Running duel: timed questions, opponent's live progress, final result (owner: Claude 2).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';
import { joinDuelRoom, subscribeDuel, type DuelProgress } from '@/lib/realtime';
import { QUESTION_TIME_LIMIT_MS } from '@/lib/duel';
import { api, fmtSeconds } from './api';
import { QuestionCard, type AnswerFeedback, type CardQuestion } from './QuestionCard';

type State = {
  id: number;
  status: 'invited' | 'active' | 'finished' | 'declined' | 'expired';
  size: number;
  me: { id: number; name: string; elo: number };
  opponent: { id: number; name: string; elo: number };
  questions: CardQuestion[];
  myProgress: { answered: number; answeredIds: number[]; correct: number; timeMs: number };
  opponentProgress: { answered: number; correct: number | null };
  winnerId: number | null;
  result: {
    scores: Record<string, { correct: number; timeMs: number }>;
    winnerId: number | null;
    eloChange: Record<string, number>;
    bonusXp: number;
  } | null;
};

export function DuelPlay({ duelId }: { duelId: number }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(0);
  const mine = useRef({ answered: 0, correct: 0, timeMs: 0 });
  const room = useRef<ReturnType<typeof joinDuelRoom> | null>(null);

  // State is only set inside promise callbacks (react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      api<State>(`/api/duel/${duelId}`).then(
        (s) => {
          setState(s);
          setOpponentAnswered((n) => Math.max(n, s.opponentProgress.answered));
          setIndex((i) => (i === null ? s.myProgress.answered : i));
          mine.current = { answered: s.myProgress.answered, correct: s.myProgress.correct, timeMs: s.myProgress.timeMs };
        },
        (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the duel'),
      ),
    [duelId],
  );

  useEffect(() => {
    void load();
    const unsubRow = subscribeDuel(supabase, duelId, () => void load());
    room.current = joinDuelRoom(supabase, duelId, (p: DuelProgress) => {
      setOpponentAnswered((n) => Math.max(n, p.answered));
    });
    // Fallback polling in case realtime is not available.
    const t = setInterval(load, 3000);
    return () => {
      clearInterval(t);
      unsubRow();
      room.current?.leave();
    };
  }, [load, supabase, duelId]);

  async function answer(q: CardQuestion, chosenIndex: number | null, timeMs: number): Promise<AnswerFeedback> {
    const fb = await api<AnswerFeedback>(`/api/duel/${duelId}/answer`, { questionId: q.id, chosenIndex, timeMs });
    const m = mine.current;
    mine.current = { answered: m.answered + 1, correct: m.correct + (fb.isCorrect ? 1 : 0), timeMs: m.timeMs + timeMs };
    void room.current?.send({ userId: state!.me.id, ...mine.current, done: mine.current.answered === state!.size });
    return fb;
  }

  if (error) return <Shell><p className="text-pen">{error}</p></Shell>;
  if (!state || index === null) return <Shell><p className="text-graphite/60">Loading duel…</p></Shell>;

  const header = (
    <div className="mb-4 grid grid-cols-2 gap-3">
      <Player name={`${state.me.name} (you)`} elo={state.me.elo} answered={Math.min(index, state.size)} total={state.size} />
      <Player name={state.opponent.name} elo={state.opponent.elo} answered={opponentAnswered} total={state.size} />
    </div>
  );

  if (state.status === 'invited')
    return <Shell>{header}<p className="text-graphite/70">Waiting for {state.opponent.name} to accept…</p></Shell>;
  if (state.status === 'declined' || state.status === 'expired')
    return (
      <Shell>
        <p className="mb-3 text-graphite/80">This duel was {state.status}.</p>
        <Link href="/duel" className="text-indigo-700 underline">Back to the lobby</Link>
      </Shell>
    );

  if (state.status === 'finished' && state.result) return <Shell>{header}<Result s={state} /></Shell>;

  if (index < state.questions.length) {
    const q = state.questions[index];
    return (
      <Shell>
        {header}
        <QuestionCard
          key={q.id}
          question={q}
          index={index}
          total={state.size}
          limitMs={QUESTION_TIME_LIMIT_MS[q.difficulty]}
          onAnswer={(c, t) => answer(q, c, t)}
          onNext={() => setIndex(index + 1)}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {header}
      <p className="text-graphite/70">You are done. Waiting for {state.opponent.name} to finish…</p>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl p-4">{children}</div>;
}

function Player({ name, elo, answered, total }: { name: string; elo: number; answered: number; total: number }) {
  return (
    <div className="rounded-md border border-grid bg-white p-3">
      <p className="truncate font-medium text-graphite">{name}</p>
      <p className="mb-2 text-xs text-graphite/60">Elo {elo}</p>
      <div className="h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(answered / total) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-graphite/60">{answered} / {total}</p>
    </div>
  );
}

function Result({ s }: { s: State }) {
  const r = s.result!;
  const my = r.scores[String(s.me.id)];
  const their = r.scores[String(s.opponent.id)];
  const won = r.winnerId === s.me.id;
  const draw = r.winnerId === null;
  return (
    <div className="space-y-4 rounded-md border border-grid bg-white p-5 text-center">
      <p className="text-3xl font-bold text-graphite">{draw ? 'Draw!' : won ? 'You won! 🎉' : `${s.opponent.name} won`}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Score label="You" correct={my?.correct ?? 0} timeMs={my?.timeMs ?? 0} total={s.size} />
        <Score label={s.opponent.name} correct={their?.correct ?? 0} timeMs={their?.timeMs ?? 0} total={s.size} />
      </div>
      {!draw && my && their && my.correct === their.correct && (
        <p className="text-sm text-graphite/60">Same number of correct answers — decided by total time.</p>
      )}
      <p className="text-sm text-graphite/80">
        {(() => {
          const d = r.eloChange[String(s.me.id)] ?? 0;
          const elo = `${d >= 0 ? '+' : '−'}${Math.abs(d)} Elo`;
          if (!won) return elo;
          return `${elo} · +${r.bonusXp} bonus XP${r.bonusXp > 20 ? ' (you beat a stronger player!)' : ''}`;
        })()}
      </p>
      <Link href="/duel" className="inline-block rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-indigo-700">
        Back to the lobby
      </Link>
    </div>
  );
}

function Score({ label, correct, timeMs, total }: { label: string; correct: number; timeMs: number; total: number }) {
  return (
    <div className="rounded-md bg-paper p-3">
      <p className="truncate font-medium text-graphite">{label}</p>
      <p className="font-math text-3xl text-graphite"><span className="marker">{correct}</span> / {total}</p>
      <p className="text-graphite/60">{fmtSeconds(timeMs)}</p>
    </div>
  );
}
