"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import type { PublicQuestion } from "@/lib/types";
import { submitAnswer, type AnswerResult } from "../../actions";

export function Quiz({ sessionId, questions, answeredIds }: { sessionId: number; questions: PublicQuestion[]; answeredIds: number[] }) {
  const router = useRouter();
  const remaining = questions.filter((q) => !answeredIds.includes(q.id));
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shownAt = useRef(0);

  const q = remaining[i];
  useEffect(() => { shownAt.current = performance.now(); }, [q?.id]);

  if (!q) return <Card>All questions answered. <button className="underline" onClick={() => router.refresh()}>See result</button></Card>;

  // event.timeStamp shares performance.now()'s clock
  const answer = (idx: number, clickedAt: number) => {
    const timeMs = clickedAt - shownAt.current;
    setChosen(idx);
    setError(null);
    start(async () => {
      try {
        setResult(await submitAnswer(sessionId, q.id, idx, timeMs));
      } catch (e) {
        setChosen(null);
        setError(e instanceof Error ? e.message : "Could not save the answer");
      }
    });
  };

  const next = () => {
    if (result?.finished) return router.refresh();
    setI(i + 1);
    setChosen(null);
    setResult(null);
  };

  const done = answeredIds.length + i;
  return (
    <Card>
      <div className="mb-4 h-2 rounded bg-zinc-100">
        <div className="h-2 rounded bg-indigo-500" style={{ width: `${(done / questions.length) * 100}%` }} />
      </div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="font-semibold">Question {done + 1} / {questions.length}</span>
        <Badge tone={q.difficulty}>{q.difficulty}</Badge>
        <Badge>{q.topic}</Badge>
      </div>
      <p className="mb-4 text-lg">{q.prompt}</p>
      <div className="grid gap-2">
        {q.choices.map((c, idx) => {
          const state = !result ? "" : idx === result.correctIndex ? "border-emerald-500 bg-emerald-50" : idx === chosen ? "border-rose-500 bg-rose-50" : "opacity-60";
          return (
            <button
              key={idx}
              disabled={chosen !== null}
              onClick={(e) => answer(idx, e.timeStamp)}
              className={`rounded-lg border border-zinc-300 px-4 py-3 text-left hover:bg-zinc-50 disabled:cursor-default ${state}`}
            >
              <span className="mr-2 font-semibold">{"ABCD"[idx]}.</span>{c}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      {result && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-4">
          <p className={`font-semibold ${result.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
            {result.isCorrect ? `Correct! +${result.xp} XP` : "Not quite."}
          </p>
          <p className="mt-1 text-sm text-zinc-700">{result.explanation}</p>
          <Button className="mt-3" onClick={next}>{result.finished ? "See result" : "Next question"}</Button>
        </div>
      )}
      {pending && !result && <p className="mt-3 text-sm text-zinc-500">Saving…</p>}
    </Card>
  );
}
