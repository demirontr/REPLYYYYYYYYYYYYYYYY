// Consent-gated student data for company and university panels (PLAN.md §1, §6).
// The ONLY way /org pages read student data. A scope that the student did not grant is never
// queried, so it cannot leak through a rendering bug.

import { supabaseAdmin } from "@/lib/supabase";
import type { ConsentScope, User } from "@/lib/types";
import { computeStats, type PerformanceStats } from "@/lib/ai/stats";
import { loadAnswerRows } from "@/lib/ai/analysisBot";

export const SCOPE_LABEL: Record<ConsentScope, string> = {
  xp: "XP, ranking and duel Elo",
  interests: "Department, interests and academic status",
  courses: "Results by topic (accuracy per topic)",
  answers: "Detailed answer stats (accuracy and time by difficulty, mistake pattern)",
  recommendations: "Career field and recommendations",
};
export const SCOPES = Object.keys(SCOPE_LABEL) as ConsentScope[];

export interface Viewer { type: "company" | "university"; id: number; name: string }

/** The organization the current account belongs to, or null for students. */
export async function viewerFor(me: User): Promise<Viewer | null> {
  const db = supabaseAdmin();
  if (me.role === "company" && me.company_id) {
    const { data } = await db.from("companies").select("name").eq("id", me.company_id).single();
    return { type: "company", id: me.company_id, name: (data?.name as string) ?? "Company" };
  }
  if (me.role === "university" && me.university_id) {
    const { data } = await db.from("universities").select("name").eq("id", me.university_id).single();
    return { type: "university", id: me.university_id, name: (data?.name as string) ?? "University" };
  }
  return null;
}

export interface ConsentingStudent { studentId: number; name: string; scopes: ConsentScope[] }

/** Students who shared at least one scope with this viewer. Name is shown so the viewer knows who consented. */
export async function consentingStudents(v: Viewer): Promise<ConsentingStudent[]> {
  const { data, error } = await supabaseAdmin().from("consents").select("student_id,scopes,users!consents_student_id_fkey(name)")
    .eq("viewer_type", v.type).eq("viewer_id", v.id);
  if (error) throw error;
  return ((data ?? []) as unknown as { student_id: number; scopes: ConsentScope[]; users: { name: string } | null }[])
    .filter((c) => c.scopes.length > 0)
    .map((c) => ({ studentId: c.student_id, name: c.users?.name ?? `Student ${c.student_id}`, scopes: c.scopes }));
}

export interface StudentView {
  name: string;
  scopes: ConsentScope[];
  xp?: { xp: number; elo: number; uniRank: number; globalRank: number };
  interests?: { department: string | null; year: number | null; interests: string[]; academic_status: string | null };
  courses?: { topic: string; accuracy: number; n: number }[];
  answers?: Pick<PerformanceStats, "total" | "accuracy" | "byDifficulty" | "mistakes" | "trend">;
  recommendations?: { field: string | null; items: { kind: string; title: string }[] };
}

/** Returns null when the student has not shared anything with this viewer. */
export async function studentView(v: Viewer, studentId: number): Promise<StudentView | null> {
  const db = supabaseAdmin();
  const { data: consent, error } = await db.from("consents").select("scopes")
    .eq("student_id", studentId).eq("viewer_type", v.type).eq("viewer_id", v.id).maybeSingle();
  if (error) throw error;
  const scopes = ((consent?.scopes ?? []) as ConsentScope[]);
  if (scopes.length === 0) return null;
  const has = (s: ConsentScope) => scopes.includes(s);

  const { data: u, error: uErr } = await db.from("users").select("*").eq("id", studentId).eq("role", "student").single();
  if (uErr) throw uErr;
  const student = u as User;
  const view: StudentView = { name: student.name, scopes };

  if (has("xp")) {
    const higher = (uni: boolean) => {
      let q = db.from("users").select("id", { count: "exact", head: true }).eq("role", "student").gt("xp", student.xp);
      if (uni) q = q.eq("university_id", student.university_id ?? -1);
      return q;
    };
    const [a, b] = await Promise.all([higher(true), higher(false)]);
    view.xp = { xp: student.xp, elo: student.elo, uniRank: (a.count ?? 0) + 1, globalRank: (b.count ?? 0) + 1 };
  }
  if (has("interests")) {
    view.interests = { department: student.department, year: student.year, interests: student.interests, academic_status: student.academic_status };
  }
  if (has("courses") || has("answers")) {
    const stats = computeStats(await loadAnswerRows(studentId));
    if (has("courses")) view.courses = stats.byTopic.map((t) => ({ topic: t.topic, accuracy: t.accuracy, n: t.n }));
    if (has("answers")) view.answers = { total: stats.total, accuracy: stats.accuracy, byDifficulty: stats.byDifficulty, mistakes: stats.mistakes, trend: stats.trend };
  }
  if (has("recommendations")) {
    const { data: recs } = await db.from("recommendations").select("kind,payload").eq("user_id", studentId)
      .neq("kind", "study_plan").order("created_at", { ascending: false }).limit(20);
    const list = (recs ?? []) as { kind: string; payload: { run: number; title: string } }[];
    const latest = list.filter((r) => r.payload.run === list[0]?.payload.run);
    view.recommendations = {
      field: latest.find((r) => r.kind === "field")?.payload.title ?? null,
      items: latest.filter((r) => r.kind !== "field").map((r) => ({ kind: r.kind, title: r.payload.title })),
    };
  }
  return view;
}

/** Aggregate numbers for a university about its own students. No individual rows are returned. */
export async function universityAggregate(universityId: number) {
  const db = supabaseAdmin();
  const { data: students, error } = await db.from("users").select("id,xp").eq("role", "student").eq("university_id", universityId);
  if (error) throw error;
  const list = (students ?? []) as { id: number; xp: number }[];
  const ids = list.map((s) => s.id);
  const rows = ids.length
    ? await db.from("answers").select("is_correct,time_ms,created_at,questions(topic,difficulty)").in("user_id", ids).limit(10000)
    : { data: [], error: null };
  if (rows.error) throw rows.error;
  type R = { is_correct: boolean; time_ms: number; created_at: string; questions: { topic: string; difficulty: "easy" | "medium" | "hard" } | null };
  const stats = computeStats(((rows.data ?? []) as unknown as R[]).filter((r) => r.questions)
    .map((r) => ({ is_correct: r.is_correct, time_ms: r.time_ms, created_at: r.created_at, topic: r.questions!.topic, difficulty: r.questions!.difficulty })));
  return {
    students: list.length,
    avgXp: list.length ? Math.round(list.reduce((s, x) => s + x.xp, 0) / list.length) : 0,
    stats,
  };
}
