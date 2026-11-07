'use client';
// One timed multiple-choice question, shared by duels and live competitions (owner: Claude 2).
// The explanation is only shown after the player has answered — never before.

import { useEffect, useRef, useState } from 'react';

export type CardQuestion = {
  id: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  choices: string[];
};

export type AnswerFeedback = { isCorrect: boolean; correctIndex: number; explanation: string | null };

type Props = {
  question: CardQuestion;
  index: number;
  total: number;
  limitMs: number;
  /** Server-side start time (live competitions); defaults to when the card appears. */
  startedAt?: number;
  onAnswer: (chosenIndex: number | null, timeMs: number) => Promise<AnswerFeedback>;
  /** Called after the feedback; omit to keep the feedback on screen (live: host moves on). */
  onNext?: () => void;
};

const badge: Record<CardQuestion['difficulty'], string> = {
  easy: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  hard: 'bg-rose-100 text-rose-800',
};

export function QuestionCard({ question, index, total, limitMs, startedAt, onAnswer, onNext }: Props) {
  // Lazy initializers keep Date.now() out of render (react-hooks/purity).
  const [start] = useState(() => startedAt ?? Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [chosen, setChosen] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false); // guards double submits within one event loop turn
  const [locked, setLocked] = useState(false); // same flag, for rendering

  const remaining = Math.max(0, limitMs - (now - start));

  async function submit(choice: number | null) {
    if (done.current) return;
    done.current = true;
    setLocked(true);
    setChosen(choice);
    setSending(true);
    try {
      const fb = await onAnswer(choice, Math.min(Date.now() - start, limitMs));
      setFeedback(fb);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send answer');
    } finally {
      setSending(false);
    }
  }

  // Latest submit for the timer callback (refs are written in an effect, not during render).
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  // Clock tick; when time runs out, submit "no answer" from the timer callback (not synchronously in the effect).
  useEffect(() => {
    if (feedback || error) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n - start >= limitMs) void submitRef.current(null);
    }, 100);
    return () => clearInterval(t);
  }, [feedback, error, start, limitMs]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-500">
        <span>
          Question {index + 1} / {total} · {question.topic}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[question.difficulty]}`}>
          {question.difficulty}
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full transition-[width] duration-100 ${remaining < 5000 ? 'bg-rose-500' : 'bg-indigo-500'}`}
          style={{ width: `${(remaining / limitMs) * 100}%` }}
        />
      </div>

      <p className="mb-4 whitespace-pre-wrap text-lg font-medium text-zinc-900">{question.prompt}</p>

      <div className="grid gap-2">
        {question.choices.map((c, i) => {
          let cls = 'border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50';
          if (feedback) {
            if (i === feedback.correctIndex) cls = 'border-emerald-500 bg-emerald-50';
            else if (i === chosen) cls = 'border-rose-500 bg-rose-50';
            else cls = 'border-zinc-200 opacity-60';
          } else if (i === chosen) cls = 'border-indigo-500 bg-indigo-50';
          return (
            <button
              key={i}
              type="button"
              disabled={locked || sending}
              onClick={() => submit(i)}
              className={`rounded-xl border-2 px-4 py-3 text-left transition ${cls}`}
            >
              <span className="mr-2 font-semibold text-zinc-400">{String.fromCharCode(65 + i)}</span>
              {c}
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-6 text-sm">
        {!feedback && !error && <span className="text-zinc-500">{Math.ceil(remaining / 1000)} s left</span>}
        {error && <span className="text-rose-600">{error}</span>}
        {feedback && (
          <div className="space-y-2">
            <p className={feedback.isCorrect ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>
              {feedback.isCorrect ? 'Correct!' : chosen === null ? 'Time is up.' : 'Not quite.'}
            </p>
            {feedback.explanation && <p className="text-zinc-600">{feedback.explanation}</p>}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
              >
                {index + 1 < total ? 'Next question' : 'See result'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
