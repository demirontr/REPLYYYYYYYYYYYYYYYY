# AI agents (Claude 3)

All Gemini calls go through `lib/ai/llm.ts`: REST + `fetch`, JSON response schema, model from `GEMINI_MODEL`
(default `gemini-3.8-flash`), one retry with the validation error fed back, and every call (input, output,
success, time) logged to the server console and the `ai_logs` table. Every agent has a rule-based fallback,
so the demo works without Gemini or internet quota, and the UI says when the fallback was used.

Numbers and decisions that must be correct are made **in code**; Gemini only writes text or picks from lists the
code gives it, and the code checks what it picked.

| Agent | Input | Knowledge it uses | Actions / decisions | Output |
|---|---|---|---|---|
| **Question generator** `questionGenerator.ts` + `materials/analysis1.ts` | Course text for one topic (built-in notes or notes a university pastes in `/org/questions`) | Only that text, plus 2 approved questions as style examples | Writes tagged questions; same code checks as above plus topic/difficulty validation; saved as `pending_review` and **approved by university staff** before entering the daily pool | Rows in `questions` (`source='ai-generated'`) |
| **Similar questions** `similarQuestions.ts` | Questions the student got wrong | The real course questions (topic, method, explanation) | Writes new questions with the same concept and difficulty; code checks 4 distinct choices, one correct index, `final_answer == choices[correct_index]`, no duplicates; shuffles choices; reuses unanswered earlier ones | Rows in `questions` (`source='ai-similar'`, `status='pending_review'`, `parent_question_id`) used by the retry test |
| **Analysis bot** `analysisBot.ts` + `stats.ts` | All answers of the student | Topic, difficulty, solve time, date | Code computes accuracy per topic, time per difficulty vs. target, 7-day trend, mistake pattern (rushed vs. stuck), weak topics; Gemini writes a 3-4 sentence summary of those numbers only | Row in `analysis_reports` |
| **Recommender (main agent)** `recommender.ts` + `recommendCore.ts` | Profile, latest analysis report, student notes (`user_external_info`), ratings of earlier suggestions | Curated lists: events, own-university clubs, companies, master programs | Chooses 1 field + 2 of each list with a reason. Feedback loop: items rated 1-2 are removed from the lists, low-rated fields are forbidden, kinds with average ≤ 2.5 are flagged so the agent changes approach. Code rejects unknown ids | Rows in `recommendations` grouped by `payload.run` |
| **Study planner** `studyPlanner.ts` + `studyPlanCore.ts` | Latest analysis report | Course topic list | Weekly plan (day → topic → minutes → activity: daily test / retry test / review / practice); code keeps only real topics, 10-120 min tasks, ≤150 min per day | `recommendations` row with `kind='study_plan'` |
| **Explain** `explainMistake.ts` | Session, question, the student's answer | The question and its reference explanation | **Refuses before the student has answered** (checked in the database). Explains the likely reasoning error instead of repeating the answer | Short text |

## Boundary rules (enforced in code, not only in prompts)

- No answers or hints during a test: the quiz never receives `correct_index`/`explanation` before answering (Claude 1),
  and `explainMistake()` throws `BoundaryError` unless an `answers` row exists for that user, session and question.
- The recommender can only return ids that exist in the database lists; anything else is dropped.
- Student notes are passed as data, and the prompt tells the model to ignore instructions inside them.
- Companies and universities see student data only through `app/org/data.ts`, which queries a scope only if the
  student granted it in `consents`.

## Example interactions

> These describe the designed behaviour with demo accounts. Before submission, replace them with real transcripts
> from the `ai_logs` table (`select agent, input, output from ai_logs order by created_at desc`).

1. **Boundary: the student wants the answer before answering.** During a retry test Matteo calls Explain on
   question 12 before choosing an option. `explainMistake(4, session, 12)` finds no answer row and returns
   *"Answer the question first. Explanations are only available after you answer."* After he picks *0* for
   `lim_{x→0} (1 − cos x)/x²`, Explain says the usual mistake is substituting x = 0 directly (0/0) and suggests
   checking the expansion 1 − cos x ≈ x²/2 next time. It does not just print *1/2*.
2. **Feedback loop.** Sofia (Computer Engineering, interests ai + robotics) gets field *robotics*, the European
   Rover Challenge and Team DIANA. She rates the field 2★ ("I prefer software") and the rover challenge 1★.
   The next run shows *"Fields you rejected: robotics"*; the agent may not pick robotics again or the rover event,
   and the events section is flagged so it changes approach: it suggests *ai* with KTH Machine Learning and
   Kaggle competitions, and the reasons mention her rating.
3. **Struggling student.** Matteo's analysis: 35% accuracy, weak topics *integrals, taylor*, most wrong answers came
   in under a quarter of the target time (rushing). The summary tells him to slow down and review the method; the
   study plan gives integrals and Taylor two review + retry sessions; the recommender prefers a study group and a
   beginner-friendly event over an elite master's program and says why.

## Tests

```
node --experimental-strip-types lib/ai/questionCheck.test.ts
node --experimental-strip-types lib/ai/stats.test.ts
node --experimental-strip-types lib/ai/recommendCore.test.ts
node --experimental-strip-types lib/ai/studyPlanCore.test.ts
```

## Database

Run `supabase/migrations/30_ai_careers.sql` (adds `ai_logs`, indexes, a unique rating per recommendation and
`notify_followers(job_id)`), then `supabase/seed_careers.sql` (companies 4-9, clubs, events, master programs,
job posts, demo follows and consents).
