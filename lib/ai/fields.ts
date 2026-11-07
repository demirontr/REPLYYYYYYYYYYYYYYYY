// Career fields the recommender may choose from. Must match the `field` values in supabase/seed_careers.sql.
export const FIELDS = [
  "ai",
  "data science",
  "robotics",
  "aerospace",
  "electronics",
  "energy",
  "automotive",
  "software",
  "mechanical engineering",
  "physics",
] as const;
export type Field = (typeof FIELDS)[number];

export const isField = (s: unknown): s is Field => typeof s === "string" && (FIELDS as readonly string[]).includes(s);

/** Interests in the seed use a few synonyms; map them onto FIELDS. */
const SYNONYMS: Record<string, Field> = { space: "aerospace", "machine learning": "ai", ml: "ai", cars: "automotive", mechatronics: "robotics" };
export function toField(s: string): Field | null {
  const k = s.trim().toLowerCase();
  return isField(k) ? k : SYNONYMS[k] ?? null;
}
