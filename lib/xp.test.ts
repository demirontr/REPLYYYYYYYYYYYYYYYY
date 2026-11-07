// Run: node --experimental-strip-types lib/xp.test.ts
import assert from "node:assert/strict";
import { xpForAnswer } from "./xp.ts";

assert.equal(xpForAnswer("easy", false, 1000), 0);
assert.equal(xpForAnswer("easy", true, 25_000), 10);
assert.equal(xpForAnswer("easy", true, 5_000), 13); // 12.5 rounds up
assert.equal(xpForAnswer("medium", true, 39_999), 25);
assert.equal(xpForAnswer("medium", true, 40_000), 20); // must be strictly faster
assert.equal(xpForAnswer("hard", true, 10_000), 50);
assert.equal(xpForAnswer("hard", true, 90_000), 40);
console.log("xp ok");
