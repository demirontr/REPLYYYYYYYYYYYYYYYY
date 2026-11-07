// Run: node --experimental-strip-types lib/ai/recommendCore.test.ts
import assert from "node:assert/strict";
import { fallbackPicks, feedbackPolicy, filterCandidates, validatePicks, type Candidates } from "./recommendCore.ts";

const c: Candidates = {
  event: [{ id: 1, name: "Rover Challenge", field: "robotics", detail: "" }, { id: 2, name: "Kaggle", field: "data science", detail: "" }, { id: 3, name: "FS Italy", field: "automotive", detail: "" }],
  club: [{ id: 10, name: "Team DIANA", field: "robotics", detail: "" }, { id: 11, name: "AI group", field: "ai", detail: "" }],
  company: [{ id: 1, name: "Torino Robotics", field: "robotics", detail: "" }, { id: 2, name: "Alpine Data", field: "data science", detail: "" }],
  master: [{ id: 5, name: "Mechatronics", field: "robotics", detail: "" }, { id: 6, name: "ML", field: "ai", detail: "" }],
};

// feedback: item rated 1 is excluded, field rated 2 is forbidden, a kind with low average is flagged
const policy = feedbackPolicy([
  { kind: "event", item_id: 1, field: null, rating: 1, comment: "too far" },
  { kind: "event", item_id: 2, field: null, rating: 3, comment: null },
  { kind: "field", item_id: null, field: "ai", rating: 2, comment: "not for me" },
  { kind: "club", item_id: 10, field: null, rating: 5, comment: null },
]);
assert.ok(policy.excluded.event.has(1));
assert.ok(!policy.excluded.event.has(2));
assert.ok(policy.rejectedFields.has("ai"));
assert.deepEqual(policy.lowKinds.sort(), ["event", "field"]); // event avg 2.0, field avg 2.0
const f = filterCandidates(c, policy);
assert.deepEqual(f.event.map((x) => x.id), [2, 3]);

// validation: unknown or excluded ids are dropped, field must be allowed and not rejected
const ok = validatePicks({
  field: "robotics", field_reason: "You like robotics and your department fits.",
  events: [{ id: 1, reason: "excluded one" }, { id: 3, reason: "close to Torino" }, { id: 99, reason: "made up" }],
  clubs: [{ id: 10, reason: "rover team" }, { id: 10, reason: "duplicate" }],
  companies: [{ id: 1, reason: "robotics internships" }],
  masters: [],
}, f, policy);
assert.deepEqual(ok.items.map((i) => `${i.kind}:${i.id}`), ["event:3", "club:10", "company:1"]);
assert.throws(() => validatePicks({ field: "ai", field_reason: "because you said so" , events: [{ id: 3, reason: "x x x x" }] }, f, policy), /rated low/);
assert.throws(() => validatePicks({ field: "cooking", field_reason: "nope nope nope" }, f, policy), /field must be one of/);
assert.throws(() => validatePicks({ field: "robotics", field_reason: "valid reason here", events: [{ id: 99, reason: "fake" }] }, f, policy), /no valid ids/);

// fallback: interest "ai" is rejected, so it moves to the next interest (robotics)
const fb = fallbackPicks({ department: "Computer Engineering", year: 1, interests: ["ai", "robotics"], academic_status: null }, f, policy);
assert.equal(fb.field, "robotics");
assert.ok(fb.items.every((i) => !(i.kind === "event" && i.id === 1)));
assert.ok(fb.items.some((i) => i.kind === "master" && i.id === 5));
console.log("recommendCore ok");
