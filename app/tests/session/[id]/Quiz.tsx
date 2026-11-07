"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import type { PublicQuestion } from "@/lib/types";
import { explainAnswer, submitAnswer, type AnswerResult } from "../../actions";

// hand-drawn pen marks, animated once via .pen-stroke (see globals.css)
const Circle = () => (
  <svg viewBox="0 0 40 40" className="pointer-events-none absolute -inset-2 size-[calc(100%+1rem)] text-ink" aria-hidden>
    <path className="pen-stroke" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      d="M30 7C22 1 7 4 4.5 17 2 30 14 38 25 34.5 36 31 39 17 31 8.5 28.5 6 25 4.5 21 5" />
  </svg>
);
const Tick = () => (
  <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-tick" aria-hidden>
    <path className="pen-stroke" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="M4 13.5 9.5 19 20 5.5" />
  </svg>
);
const Strike = () => (
  <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-1/2 h-3 w-full -translate-y-1/2 text-pen" aria-hidden>
    <path className="pen-stroke" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" d="M1 6C30 3.5 65 5.5 99 3" />
  </svg>
);

export function Quiz({ sessionId, questions, answeredIds }: { sessionId: number; questions: PublicQuestion[]; answeredIds: number[] }) {
  const router = useRouter();
  const remaining = questions.filter((q) => !answeredIds.includes(q.id));
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [explaining, startExplain] = useTransition();
  const [pending, start] = useTransition();
  const shownAt = useRef(0);

  const q = remaining[i];
  useEffect(() => { shownAt.current = performance.now(); }, [q?.id]);

  if (!q) return <Card>All questions are answered. <button className="font-semibold text-ink underline" onClick={() => router.refresh()}>See your result</button></Card>;

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
        setError(e instanceof Error ? e.message : "The answer was not saved. Try again.");
      }
    });
  };

  const next = () => {
    if (result?.finished) return router.refresh();
    setI(i + 1);
    setChosen(null);
    setResult(null);
    setWhy(null);
  };

  const explain = () => startExplain(async () => {
    try {
      setWhy((await explainAnswer(sessionId, q.id)).text);
    } catch {
      setWhy("The explanation could not be loaded. Use the explanation above.");
    }
  });

  const done = answeredIds.length + i;
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="font-semibold">Question {done + 1} of {questions.length}</span>
        {/* one square per question, like the notebook grid */}
        <div className="flex gap-0.5" aria-hidden>
          {questions.map((_, k) => (
            <span key={k} className={`size-3.5 border ${k < done ? "border-ink bg-ink" : k === done ? "border-ink bg-white" : "border-grid bg-white"}`} />
          ))}
        </div>
        <span className="ml-auto flex gap-2"><Badge tone={q.difficulty}>{q.difficulty}</Badge><Badge>{q.topic}</Badge></span>
      </div>

      <p className="mb-8 max-w-[60ch] font-math text-2xl leading-snug">{q.prompt}</p>

      <ol className="grid gap-3">
        {q.choices.map((c, idx) => {
          const isChosen = idx === chosen;
          const isRight = result && idx === result.correctIndex;
          const isWrongPick = result && isChosen && !result.isCorrect;
          return (
            <li key={idx}>
              <button
                disabled={chosen !== null}
                onClick={(e) => answer(idx, e.timeStamp)}
                className={`flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left transition-colors enabled:hover:border-ink enabled:hover:bg-indigo-50 ${isChosen ? "border-ink" : "border-[#d3dce6]"} ${result && !isChosen && !isRight ? "opacity-50" : ""}`}
              >
                <span className="relative grid size-8 shrink-0 place-items-center font-semibold text-ink">
                  {"ABCD"[idx]}
                  {isChosen && <Circle />}
                </span>
                <span className="relative font-math text-xl">
                  {c}
                  {isWrongPick && <Strike />}
                </span>
                {isRight && <span className="ml-auto"><Tick /></span>}
              </button>
            </li>
          );
        })}
      </ol>

      {error && <p role="alert" className="mt-4 text-pen">{error}</p>}
      {pending && !result && <p className="mt-4 text-graphite/60">Checking…</p>}
      {result && (
        <div className="mt-6 border-l-4 pl-4" style={{ borderColor: result.isCorrect ? "var(--color-tick)" : "var(--color-pen)" }} aria-live="polite">
          <p className={`text-lg font-semibold ${result.isCorrect ? "text-tick" : "text-pen"}`}>
            {result.isCorrect ? <>Correct. <span className="marker font-math text-graphite">+{result.xp} XP</span></> : "Not this one. Here is why:"}
          </p>
          <p className="mt-1 max-w-[65ch] font-math text-lg leading-relaxed">{result.explanation}</p>
          {!result.isCorrect && (
            why ? (
              <p className="mt-3 max-w-[65ch] rounded-md bg-indigo-50 p-3 font-math text-lg leading-relaxed">{why}</p>
            ) : (
              <Button variant="ghost" className="mt-3 mr-2" onClick={explain} disabled={explaining}>
                {explaining ? "Looking at your answer…" : "Why was I wrong?"}
              </Button>
            )
          )}
          <Button className="mt-4" onClick={next}>{result.finished ? "See your result" : "Next question"}</Button>
        </div>
      )}
    </Card>
  );
}
