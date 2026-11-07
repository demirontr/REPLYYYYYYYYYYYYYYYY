// Run: node --experimental-strip-types lib/ai/stats.test.ts
import assert from "node:assert/strict";
import { computeStats, fallbackSummary, type AnswerRow } from "./stats.ts";

const now = new Date("2026-11-07T12:00:00Z");
const row = (topic: string, ok: boolean, ms: number, day: string, difficulty: AnswerRow["difficulty"] = "medium"): AnswerRow =>
  ({ topic, is_correct: ok, time_ms: ms, created_at: `${day}T10:00:00Z`, difficulty });

const rows: AnswerRow[] = [
  row("limits", false, 3_000, "2026-11-02"), row("limits", false, 5_000, "2026-11-02"), row("limits", true, 30_000, "2026-11-06"),
  row("integrals", false, 70_000, "2026-11-03"), row("integrals", false, 80_000, "2026-11-03"),
  row("series", true, 10_000, "2026-11-06", "easy"), row("series", true, 12_000, "2026-11-07", "easy"),
];
const s = computeStats(rows, now);
assert.equal(s.total, 7);
assert.equal(s.correct, 3);
assert.equal(s.byTopic[0].topic, "integrals");              // weakest first
assert.deepEqual(s.weakTopics, ["integrals", "limits"]);
assert.deepEqual(s.strongTopics, ["series"]);
assert.equal(s.mistakes.rushed, 2);                           // 3 s and 5 s on a 40 s medium target
assert.equal(s.mistakes.stuck, 2);                            // 70 s and 80 s
assert.equal(s.trend, "improving");                           // 0% early in the week, 100% at the end
assert.deepEqual(s.byDifficulty.map((d) => d.difficulty), ["easy", "medium"]);
assert.equal(s.byDifficulty[0].avgSeconds, 11);

assert.equal(computeStats([], now).trend, "not enough data");
assert.match(fallbackSummary(computeStats([], now)), /No answers yet/);
assert.match(fallbackSummary(s), /integrals, limits/);
console.log("stats ok");
