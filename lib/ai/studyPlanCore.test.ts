// Run: node --experimental-strip-types lib/ai/studyPlanCore.test.ts
import assert from "node:assert/strict";
import { fallbackPlan, validatePlan } from "./studyPlanCore.ts";

const topics = ["limits", "integrals", "series"];
const task = (topic: string, minutes: number, activity: string) => ({ topic, minutes, activity, note: "n" });

const plan = validatePlan({
  focus: "Integrals first",
  days: [
    { day: "Tuesday", tasks: [task("integrals", 40, "review notes"), task("integrals", 20, "retry test")] },
    { day: "Monday", tasks: [task("all topics", 15, "daily test"), task("cooking", 30, "review notes")] }, // unknown topic dropped
    { day: "Wednesday", tasks: [task("limits", 200, "practice problems"), task("limits", 30, "practice problems")] }, // too long dropped
    { day: "Funday", tasks: [task("limits", 30, "review notes")] }, // not a weekday
    { day: "Monday", tasks: [task("series", 30, "review notes")] }, // duplicate day dropped
  ],
}, topics);
assert.deepEqual(plan.days.map((d) => d.day), ["Monday", "Tuesday", "Wednesday"]);
assert.equal(plan.days[0].tasks.length, 1);
assert.equal(plan.days[2].tasks[0].minutes, 30);
assert.throws(() => validatePlan({ days: [{ day: "Monday", tasks: [task("x", 30, "review notes")] }] }, topics), /at least 3 days/);

const fb = fallbackPlan(topics, ["integrals"]);
assert.equal(fb.days.length, 7);
assert.ok(fb.days.slice(0, 5).every((d) => d.tasks[0].activity === "daily test"));
assert.equal(fb.days.flatMap((d) => d.tasks).filter((t) => t.topic === "integrals" && t.activity === "retry test").length, 2);
assert.ok(fb.days.every((d) => d.tasks.reduce((s, t) => s + t.minutes, 0) <= 150));
console.log("studyPlanCore ok");
