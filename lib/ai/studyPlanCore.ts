// Pure parts of the study planner: validation and the rule-based fallback plan.
// Tests: node --experimental-strip-types lib/ai/studyPlanCore.test.ts

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Day = (typeof DAYS)[number];
export const ACTIVITIES = ["daily test", "retry test", "review notes", "practice problems"] as const;
export type Activity = (typeof ACTIVITIES)[number];

export interface PlanTask { topic: string; minutes: number; activity: Activity; note: string }
export interface PlanDay { day: Day; tasks: PlanTask[] }
export interface StudyPlan { focus: string; days: PlanDay[] }

const MAX_DAY_MINUTES = 150;

/** Checks the model's plan: real weekdays, course topics only, sensible minutes. Throws if unusable. */
export function validatePlan(raw: unknown, topics: string[]): StudyPlan {
  const r = (raw ?? {}) as { focus?: unknown; days?: unknown };
  if (!Array.isArray(r.days)) throw new Error("days missing");
  const known = new Set(topics);
  const days: PlanDay[] = [];
  const seen = new Set<string>();
  for (const d of r.days as { day?: unknown; tasks?: unknown }[]) {
    const day = DAYS.find((x) => x === d?.day);
    if (!day || seen.has(day)) continue;
    seen.add(day);
    const tasks: PlanTask[] = [];
    let total = 0;
    for (const t of Array.isArray(d.tasks) ? (d.tasks as Record<string, unknown>[]) : []) {
      const topic = typeof t?.topic === "string" ? t.topic : "";
      const activity = ACTIVITIES.find((a) => a === t?.activity);
      const minutes = Math.round(Number(t?.minutes));
      if (!activity) continue;
      if (activity !== "daily test" && !known.has(topic)) continue; // only real course topics
      if (!Number.isFinite(minutes) || minutes < 10 || minutes > 120 || total + minutes > MAX_DAY_MINUTES) continue;
      total += minutes;
      tasks.push({ topic: known.has(topic) ? topic : "all topics", minutes, activity, note: typeof t.note === "string" ? t.note.slice(0, 200) : "" });
    }
    days.push({ day, tasks });
  }
  if (days.filter((d) => d.tasks.length).length < 3) throw new Error("plan needs at least 3 days with valid tasks (use only the given topics and activities)");
  days.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
  const focus = typeof r.focus === "string" && r.focus.trim() ? r.focus.trim().slice(0, 300) : "Weekly plan";
  return { focus, days };
}

/** Rule-based plan: daily test every weekday, weak topics twice, a lighter weekend. */
export function fallbackPlan(topics: string[], weakTopics: string[]): StudyPlan {
  const weak = weakTopics.filter((t) => topics.includes(t));
  const rest = topics.filter((t) => !weak.includes(t));
  // each weak topic twice, then the other topics; extra days cycle through the other topics only
  const queue = [...weak, ...weak, ...rest];
  const filler = rest.length ? rest : topics;
  const days: PlanDay[] = DAYS.map((day, i) => {
    const tasks: PlanTask[] = [];
    if (i < 5) tasks.push({ topic: "all topics", minutes: 15, activity: "daily test", note: "Today's 10-question test." });
    const topic = i < queue.length ? queue[i] : filler[(i - queue.length) % Math.max(filler.length, 1)];
    if (topic) {
      const isWeak = weak.includes(topic);
      tasks.push({ topic, minutes: isWeak ? 40 : 25, activity: isWeak ? "review notes" : "practice problems", note: isWeak ? "Re-read the method, then redo one example by hand." : "Keep this topic fresh." });
      if (isWeak) tasks.push({ topic, minutes: 20, activity: "retry test", note: "Practise with questions similar to the ones you missed." });
    }
    return { day, tasks };
  });
  const focus = weak.length ? `Focus on ${weak.join(", ")}; keep the other topics fresh.` : "Balanced review of all topics.";
  return { focus, days };
}
