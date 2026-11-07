'use client';
// One timed multiple-choice question, shared by duels and live competitions (owner: Claude 2).
// The explanation is only shown after the player has answered — never before.

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';

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
    <Card>
      <div className="mb-3 flex items-center justify-between text-sm text-graphite/60">
        <span>
          Question {index + 1} / {total} · {question.topic}
        </span>
        <Badge tone={question.difficulty}>{question.difficulty}</Badge>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-paper">
        <div
          className={`h-full transition-[width] duration-100 ${remaining < 5000 ? 'bg-pen' : 'bg-indigo-500'}`}
          style={{ width: `${(remaining / limitMs) * 100}%` }}
        />
      </div>

      <p className="mb-4 whitespace-pre-wrap font-math text-xl text-graphite">{question.prompt}</p>

      <div className="grid gap-2">
        {question.choices.map((c, i) => {
          let cls = 'border-grid hover:border-ink hover:bg-paper';
          if (feedback) {
            if (i === feedback.correctIndex) cls = 'border-tick/50 bg-tick/5';
            else if (i === chosen) cls = 'border-pen bg-pen/5';
            else cls = 'border-grid opacity-60';
          } else if (i === chosen) cls = 'border-indigo-500 bg-indigo-50';
          return (
            <button
              key={i}
              type="button"
              disabled={locked || sending}
              onClick={() => submit(i)}
              className={`rounded-md border-2 px-4 py-3 text-left transition ${cls}`}
            >
              <span className="mr-2 font-semibold text-graphite/40">{String.fromCharCode(65 + i)}</span>
              {c}
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-6 text-sm">
        {!feedback && !error && <span className="text-graphite/60">{Math.ceil(remaining / 1000)} s left</span>}
        {error && <span className="text-pen">{error}</span>}
        {feedback && (
          <div className="space-y-2">
            <p className={feedback.isCorrect ? 'font-semibold text-tick' : 'font-semibold text-pen'}>
              {feedback.isCorrect ? 'Correct!' : chosen === null ? 'Time is up.' : 'Not quite.'}
            </p>
            {feedback.explanation && <p className="text-graphite/70">{feedback.explanation}</p>}
            {onNext && (
              <Button type="button" onClick={onNext}>
                {index + 1 < total ? 'Next question' : 'See result'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
