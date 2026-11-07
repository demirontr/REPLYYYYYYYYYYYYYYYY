# UniR

**Reply Student Tech Clash 2026 · challenge "AI on Campus"**

University students practise a course a little every day, compete with classmates they actually meet on campus, and get AI guidance that points them to the next step without thinking for them.

Demo course: **Politecnico di Torino · Mathematical Analysis I (Analisi Matematica I)**, with 40 hand-checked questions across 8 topics.

## The problem

First-year analysis courses are where many engineering students fall behind. Practice is either one big exam or nothing at all, feedback arrives too late, and general-purpose chatbots hand out the answer instead of the reasoning.

## What it does

| | |
|---|---|
| **Daily test** | One test per course per day: 10 questions ordered easy to hard (3 easy, 4 medium, 3 hard). Solve time is measured per question. The explanation appears only after you answer. |
| **XP and leaderboards** | Easy 10, medium 20, hard 40 XP, with +25% for a correct answer faster than the target time (20, 40 or 60 s). Two rankings: your university and global. |
| **Retry mistakes** | A test built from the questions you got wrong. An agent writes new questions on the same concept, and seed questions fill any gap. |
| **"Why was I wrong?"** | Explains the reasoning error behind *your* answer instead of repeating the solution. Refuses to run before you answer. |
| **Campus duel** | Students within 50 m of each other (Haversine distance, location shared only with consent) duel on 5 or 10 questions. The winner is decided by correct answers, then by total time. Elo rating (K = 32) and a winner bonus that is larger against stronger opponents. |
| **Live competition** | The university account runs a Kahoot-style event: everyone sees the same question at the same time, with a live ranking. The top 3 get XP. |
| **Analysis → recommendations** | An analysis bot turns your answers into weak topics, speed and trend. The recommender proposes a field, then events, clubs, companies and master's programs, **picked only from curated lists**. You rate each suggestion 1–5 and the next run changes accordingly. |
| **Study plan** | A weekly plan (day → topic → minutes → activity) built from your weak topics. |
| **Companies and consent** | Students follow companies and get notified of new internships. Companies and universities see a student's data **only within the scopes the student granted**. |
| **Question generator** | The university pastes course notes and the agent drafts questions. Nothing reaches students until the university approves it. |

## Agents and boundaries

Full architecture (inputs, knowledge, actions, outputs per agent): **[lib/ai/README.md](lib/ai/README.md)**

- **Model:** Google Gemini via REST (`lib/ai/llm.ts`). The model name comes from `GEMINI_MODEL` (default `gemini-3.8-flash`).
- **Responses:** Every call uses a JSON response schema. Output is validated in code, with one retry that feeds the validation error back.
- **Logging:** Every call is logged to the server console and to the `ai_logs` table, as evidence and for debugging.
- **Code decides, Gemini writes:** Numbers and decisions are made in code. Gemini only writes text or picks ids from lists the code supplies, and the code checks every id.
- **Fallbacks:** Every agent has a rule-based fallback, so the demo works without Gemini quota or internet.

**Boundary rules are enforced in code, not only in prompts:**
- The quiz page never receives `correct_index` or `explanation` before an answer is stored. They come back only from `submitAnswer()` (`app/tests/actions.ts`).
- `explainMistake()` throws `BoundaryError` unless the database already has your answer to that question.
- AI-generated questions start as `pending_review` and enter daily tests only after university approval.

## Run it

Requirements: Node.js 20+ and a Supabase project (the free tier is enough).

1. **Database:** in Supabase **SQL Editor**, run in this order:
   1. `supabase/schema.sql`
   2. `supabase/seed.sql`
   3. `supabase/migrations/20_duel_live.sql`
   4. `supabase/migrations/30_ai_careers.sql`
   5. `supabase/seed_careers.sql`
2. **Environment:** copy `.env.example` to `.env.local` and fill it in. Supabase keys are under *Project Settings → API keys*. A Gemini key is free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. **Start:**
   ```bash
   npm install
   npm run dev          # http://localhost:3000
   ```
4. **Checks:**
   ```bash
   npx tsc --noEmit && npm run lint && npm run build
   npm test                                                   # XP rules
   node --experimental-strip-types lib/ai/questionCheck.test.ts   # also: stats, recommendCore, studyPlanCore
   ```

There is no login: pick a demo account from **Switch user** at the top right. The choice is kept in a cookie.

| id | Account | Use it for |
|---|---|---|
| 1 | Sofia Marchetti (PoliTo, Computer Eng.) | Main student. Duel pair with 2. |
| 2 | Davide Romano (PoliTo, Mechanical Eng.) | Duel opponent |
| 3 | Leyla Aydın (PoliTo, Aerospace) | Shares data with Mole Aerospace and PoliTo |
| 4 | Matteo Greco (PoliTo, Electronic Eng.) | Struggling student |
| 5, 6 | Jonas Weber (TUM), Elīna Kalniņa (RTU) | Global leaderboard |
| 7–9 | Company accounts | Post jobs, see consenting students |
| 10 | PoliTo Student Office | Live competitions, question review, aggregate statistics |

**Two users in one browser:** the user choice is a cookie, so open the second player on a different host, for example `http://localhost:3000` for player one and `http://sofia.localhost:3000` for player two. Then press **Simulate location (demo)** on both.

## Stack

Next.js 16 (App Router, Server Actions, Route Handlers), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + Realtime) via `@supabase/supabase-js`, and Google Gemini over REST, with no SDK. Fonts are Titillium Web and STIX Two, self-hosted with `@fontsource`. No other runtime dependencies.

## Project structure

| Path | What |
|---|---|
| `app/tests`, `app/leaderboard`, `app/dashboard`, `lib/xp.ts`, `lib/session.ts`, `components/ui` | Daily test, retry, XP, rankings, shared UI |
| `app/duel`, `app/live`, `app/api/duel`, `app/api/live`, `lib/geo.ts`, `lib/elo.ts`, `lib/duel*.ts`, `lib/realtime.ts` | Location, duels, live competitions |
| `lib/ai`, `app/careers`, `app/study-plan`, `app/companies`, `app/notifications`, `app/settings`, `app/org`, `app/onboarding` | Agents, careers, companies, notifications, consent, organisation panels |
| `supabase/` | Schema, seed data, migrations |

## Known limits

- **Demo login:** no real authentication, and Row Level Security is off. Not for real student data as is.
- **Live updates:** they use Supabase Realtime and fall back to polling every few seconds if the websocket is blocked.
- **Seed data:** the career data mixes real clubs, events and programs (dates simplified) with clearly fictional demo companies.
