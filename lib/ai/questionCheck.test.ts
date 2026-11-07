// Run: node --experimental-strip-types lib/ai/questionCheck.test.ts
import assert from "node:assert/strict";
import { checkGeneratedQuestion, normalizeText, shuffleChoices, type ParentInfo } from "./questionCheck.ts";

const parents = new Map<number, ParentInfo>([[3, { id: 3, topic: "limits", difficulty: "medium" }]]);
const good = {
  parent_id: 3,
  prompt: "Compute lim_{x→0} (1 − cos 2x)/x².",
  choices: ["0", "1", "2", "4"],
  correct_index: 2,
  final_answer: "2",
  explanation: "1 − cos 2x ≈ (2x)²/2 = 2x² near 0, so the ratio tends to 2.",
};

// a valid question passes; topic and difficulty come from the parent
const r = checkGeneratedQuestion({ ...good, topic: "integrals" } as typeof good, parents, new Set());
assert.ok(r.ok);
if (r.ok) {
  assert.equal(r.question.topic, "limits");
  assert.equal(r.question.difficulty, "medium");
}

const fails = (patch: Record<string, unknown>, seen = new Set<string>()) => {
  const res = checkGeneratedQuestion({ ...good, ...patch }, parents, seen);
  assert.equal(res.ok, false, JSON.stringify(patch));
};
fails({ parent_id: 99 });                               // parent not requested
fails({ choices: ["0", "1", "2"] });                    // 3 choices
fails({ choices: ["0", "1", "2", " 2 "] });             // duplicate after trimming
fails({ correct_index: 4 });                            // out of range
fails({ correct_index: 1.5 });                          // not an integer
fails({ final_answer: "4" });                           // model's answer disagrees with its index
fails({ explanation: "" });                             // no explanation
fails({ prompt: "x" });                                 // too short
fails({}, new Set([normalizeText(good.prompt)]));       // duplicate of an existing question

// the same prompt twice in one batch: second one is rejected
const seen = new Set<string>();
assert.ok(checkGeneratedQuestion(good, parents, seen).ok);
assert.equal(checkGeneratedQuestion(good, parents, seen).ok, false);

// shuffling keeps the correct answer
for (let i = 0; i < 50; i++) {
  const s = shuffleChoices({ choices: ["a", "b", "c", "d"], correct_index: 2 });
  assert.equal(s.choices[s.correct_index], "c");
  assert.deepEqual([...s.choices].sort(), ["a", "b", "c", "d"]);
}

console.log("questionCheck ok");

// brand-new questions (question generator): topic must be a course topic, difficulty must be valid
import { checkNewQuestion } from "./questionCheck.ts";
const topics = ["limits", "integrals"];
assert.ok(checkNewQuestion({ ...good, prompt: "Compute lim_{x→0} sin(3x)/x.", choices: ["0", "1", "3", "1/3"], correct_index: 2, final_answer: "3", topic: "limits", difficulty: "easy" }, topics, new Set()).ok);
assert.equal(checkNewQuestion({ ...good, topic: "cooking", difficulty: "easy" }, topics, new Set()).ok, false);
assert.equal(checkNewQuestion({ ...good, topic: "limits", difficulty: "extreme" }, topics, new Set()).ok, false);
assert.equal(checkNewQuestion({ ...good, topic: "limits", difficulty: "hard", final_answer: "0" }, topics, new Set()).ok, false);
console.log("checkNewQuestion ok");
