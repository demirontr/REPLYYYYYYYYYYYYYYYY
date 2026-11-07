# Pitch and demo script

## 60-second pitch (problem → idea → impact)

**Problem (15 s).** Analysis I is where many first-year engineers fall behind. You practise for one big exam, feedback comes weeks too late, and when you finally ask a chatbot, it just gives you the answer. You learn to copy, not to think.

**Idea (30 s).** UniR turns the course into ten minutes a day.
- Every morning there is one short test, easy to hard. XP and a campus leaderboard make it a habit.
- Meet a classmate in the library and you can challenge them to a five-question duel on the spot.
- Behind it, AI agents look at *how* you answer: which topics, how fast, which mistakes. Get one wrong and the agent won't hand you the solution. It explains the error in *your* reasoning and builds a retry test with new questions on the same idea.
- Over time it suggests where your strengths could take you: a student team, an event, a company, a master's program. You rate every suggestion, and it learns from you.

**Impact (15 s).** Students get practice and feedback every day instead of once a semester. Professors get questions they approve and a live view of where the class struggles. Companies meet students only when the students choose to share. And the AI never thinks *for* the student: that rule is in the code, not just in a prompt.

## Answers to the jury's three questions

- **Is it new, or just faster?** The new part is the loop: daily practice → mistake analysis → new questions on the same concept → a study plan → career suggestions the student rates and the agent learns from. Physical-proximity duels bring studying back into real campus life.
- **Does it help students think, or think for them?** No answers or hints appear during a test. The correct answer only reaches the browser after your answer is saved. "Why was I wrong?" refuses to run until you answer, and then it explains your error instead of giving the solution.
- **Who benefits, and who is left out?**
  - Students who are falling behind benefit most: the analysis flags them early, and the study plan and retry tests target exactly their gaps.
  - Students who don't want to share location still have the daily test, the leaderboard and the live competitions.
  - Companies see nothing without explicit, per-scope consent.
  - Open risk: today the questions are in English only.

## Live demo (about 3 minutes)

Set up before the demo: two tabs, `http://localhost:3000` (Sofia) and `http://sofia.localhost:3000` (Davide), or the deployed URL in a normal window and an incognito window.

1. **Daily test (Sofia).** Go to *Tests* and *Start today's test*. Answer one question correctly: the pen circle, a green tick and +XP appear. Answer one wrong: a red strike-through and the explanation.
2. **Boundary.** Click **Why was I wrong?** The agent explains the mistake behind *her* choice. Say: *"It cannot run before she answers. That check is in the database, not the prompt."*
3. **Retry mistakes.** New AI-made questions on the same concept appear, mixed with seed questions on the same topics.
4. **Duel.** Press *Simulate location* in both tabs. *"Davide is nearby, challenge?"* appears. Play 5 questions. The result screen shows the winner, the Elo change and the bonus XP.
5. **Careers.** Click *Get suggestions*. Rate the field 2★ and an event 1★, then click *New suggestions using my ratings*: the agent changes direction and says why.
6. **Company and consent.** Switch to *Torino Robotics Lab (HR)*, open the company page and use *Post an opening* → *Publish and notify followers*: the followers' bell lights up. Open the *Organization panel*: only the data the student shared is visible.
7. **Leaderboard.** Show the *My university* and *Global* tabs.

Backup if the network fails: every agent has a rule-based fallback, so the demo still works without Gemini.
