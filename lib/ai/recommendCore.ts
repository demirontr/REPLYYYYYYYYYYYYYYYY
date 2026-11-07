// Pure parts of the recommender: feedback rules, id validation, rule-based fallback.
// Tests: node --experimental-strip-types lib/ai/recommendCore.test.ts

import { FIELDS, isField, toField, type Field } from "./fields.ts";

export const ITEM_KINDS = ["event", "club", "company", "master"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
/** JSON key used for each kind in the model's answer. */
export const LIST_KEY: Record<ItemKind, string> = { event: "events", club: "clubs", company: "companies", master: "masters" };
/** How many items of each kind one recommendation run returns. */
export const PER_KIND = 2;

export interface Candidate { id: number; name: string; field: string | null; detail: string }
export type Candidates = Record<ItemKind, Candidate[]>;

export interface Profile { department: string | null; year: number | null; interests: string[]; academic_status: string | null }

/** A previous recommendation together with the student's rating of it. */
export interface Rated { kind: ItemKind | "field"; item_id: number | null; field: string | null; rating: number; comment: string | null }

export interface FeedbackPolicy {
  /** items rated 1-2: never recommend them again */
  excluded: Record<ItemKind, Set<number>>;
  /** fields rated 1-2 */
  rejectedFields: Set<string>;
  /** kinds whose average rating is 2.5 or less: the agent must change its approach for them */
  lowKinds: (ItemKind | "field")[];
  avgByKind: Partial<Record<ItemKind | "field", number>>;
}

export function feedbackPolicy(rated: Rated[]): FeedbackPolicy {
  const excluded = { event: new Set<number>(), club: new Set<number>(), company: new Set<number>(), master: new Set<number>() };
  const rejectedFields = new Set<string>();
  const sums = new Map<ItemKind | "field", { s: number; n: number }>();
  for (const r of rated) {
    const g = sums.get(r.kind) ?? { s: 0, n: 0 };
    g.s += r.rating; g.n++;
    sums.set(r.kind, g);
    if (r.rating > 2) continue;
    if (r.kind === "field") { if (r.field) rejectedFields.add(r.field); }
    else if (r.item_id != null) excluded[r.kind].add(r.item_id);
  }
  const avgByKind: FeedbackPolicy["avgByKind"] = {};
  for (const [k, g] of sums) avgByKind[k] = Math.round((g.s / g.n) * 10) / 10;
  const lowKinds = [...sums.keys()].filter((k) => (avgByKind[k] ?? 5) <= 2.5);
  return { excluded, rejectedFields, lowKinds, avgByKind };
}

export function filterCandidates(c: Candidates, p: FeedbackPolicy): Candidates {
  return {
    event: c.event.filter((x) => !p.excluded.event.has(x.id)),
    club: c.club.filter((x) => !p.excluded.club.has(x.id)),
    company: c.company.filter((x) => !p.excluded.company.has(x.id)),
    master: c.master.filter((x) => !p.excluded.master.has(x.id)),
  };
}

export interface Pick { kind: ItemKind; id: number; reason: string }
export interface Picks { field: Field; field_reason: string; items: Pick[] }

/**
 * Validates the model's answer: the field must be in FIELDS and not rejected, and every id
 * must exist in the (already filtered) candidate lists. Unknown ids are dropped, not trusted.
 * Throws if the result is unusable, so generateJson retries once.
 */
export function validatePicks(raw: unknown, c: Candidates, p: FeedbackPolicy): Picks {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!isField(r.field)) throw new Error(`field must be one of: ${FIELDS.join(", ")}`);
  if (p.rejectedFields.has(r.field)) throw new Error(`field "${r.field}" was rated low by the student, choose another`);
  const fieldReason = typeof r.field_reason === "string" ? r.field_reason.trim() : "";
  if (fieldReason.length < 10) throw new Error("field_reason missing");

  const items: Pick[] = [];
  const dropped: string[] = [];
  for (const kind of ITEM_KINDS) {
    const value = r[LIST_KEY[kind]];
    const list = Array.isArray(value) ? (value as unknown[]) : [];
    const ids = new Set(c[kind].map((x) => x.id));
    const used = new Set<number>();
    for (const it of list) {
      const o = (it ?? {}) as { id?: unknown; reason?: unknown };
      const id = Number(o.id);
      if (!ids.has(id)) { dropped.push(`${kind} ${String(o.id)}`); continue; }
      if (used.has(id) || used.size >= PER_KIND) continue;
      const reason = typeof o.reason === "string" ? o.reason.trim().slice(0, 300) : "";
      if (reason.length < 5) { dropped.push(`${kind} ${id} without reason`); continue; }
      used.add(id);
      items.push({ kind, id, reason });
    }
  }
  if (items.length === 0) throw new Error(`no valid ids chosen${dropped.length ? ` (invalid: ${dropped.slice(0, 4).join(", ")})` : ""}`);
  return { field: r.field, field_reason: fieldReason.slice(0, 400), items };
}

const DEPARTMENT_FIELD: [RegExp, Field][] = [
  [/aero|space/i, "aerospace"], [/mechatron|robot/i, "robotics"], [/electron/i, "electronics"],
  [/energy|electrical/i, "energy"], [/automotive/i, "automotive"], [/mechanic/i, "mechanical engineering"],
  [/informatic|data/i, "data science"], [/computer|software/i, "software"], [/physic/i, "physics"],
];

/** Picks a field from interests, then department, skipping rejected fields. */
export function fallbackField(profile: Profile, p: FeedbackPolicy): Field {
  const options: Field[] = [];
  for (const i of profile.interests) { const f = toField(i); if (f) options.push(f); }
  for (const [re, f] of DEPARTMENT_FIELD) if (profile.department && re.test(profile.department)) options.push(f);
  options.push(...FIELDS);
  return options.find((f) => !p.rejectedFields.has(f)) ?? options[0];
}

/** Rule-based recommendations when Gemini is unavailable: same field first, then the student's other interests. */
export function fallbackPicks(profile: Profile, c: Candidates, p: FeedbackPolicy): Picks {
  const field = fallbackField(profile, p);
  const related = new Set<string>([field, ...profile.interests.map(toField).filter((f): f is Field => !!f)]);
  const score = (x: Candidate) => (x.field === field ? 2 : x.field && related.has(x.field) ? 1 : 0);
  const items: Pick[] = [];
  for (const kind of ITEM_KINDS) {
    const best = [...c[kind]].filter((x) => score(x) > 0).sort((a, b) => score(b) - score(a)).slice(0, PER_KIND);
    for (const x of best) {
      items.push({ kind, id: x.id, reason: x.field === field ? `Matches your suggested field (${field}).` : `Matches your interest in ${x.field}.` });
    }
  }
  const why = profile.interests.length ? `your interests (${profile.interests.join(", ")})` : `your department (${profile.department ?? "not set"})`;
  return { field, field_reason: `Suggested from ${why}. Rule-based suggestion: the AI agent was not available.`, items };
}
