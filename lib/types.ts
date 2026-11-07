// Row types for supabase/schema.sql (owned by Claude 1).

export type Role = "student" | "company" | "university";
export type Difficulty = "easy" | "medium" | "hard";
export type SessionKind = "daily" | "retry" | "duel" | "tournament";

export interface University { id: number; name: string; country: string; city: string }

export interface User {
  id: number;
  name: string;
  role: Role;
  university_id: number | null;
  company_id: number | null;
  department: string | null;
  year: number | null;
  interests: string[];
  academic_status: string | null;
  gpa: number | null;
  xp: number;
  elo: number;
  created_at: string;
}

export interface Course { id: number; university_id: number; code: string; name: string; year: number | null }

export interface Question {
  id: number;
  course_id: number;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  source: string | null;
  parent_question_id: number | null;
  status: "approved" | "pending_review";
}

/** What the client may see before answering: no correct_index, no explanation. */
export type PublicQuestion = Pick<Question, "id" | "topic" | "difficulty" | "prompt" | "choices">;

export interface TestSession {
  id: number;
  user_id: number;
  course_id: number;
  kind: SessionKind;
  ref_id: number | null;
  question_ids: number[];
  date: string;
  started_at: string;
  finished_at: string | null;
  total_xp: number;
}

export interface Answer {
  id: number;
  session_id: number;
  user_id: number;
  question_id: number;
  chosen_index: number | null; // null = time ran out (duel / live)
  is_correct: boolean;
  time_ms: number;
  xp_awarded: number;
  created_at: string;
}

export interface Location { user_id: number; lat: number; lng: number; updated_at: string; sharing: boolean }

export interface Duel {
  id: number;
  challenger_id: number;
  opponent_id: number;
  course_id: number;
  n_questions: 5 | 10;
  status: "invited" | "active" | "finished" | "declined" | "expired";
  question_ids: number[];
  winner_id: number | null;
  created_at: string;
  finished_at: string | null;
  result: Record<string, unknown> | null;
}

export interface Tournament {
  id: number;
  university_id: number;
  course_id: number;
  title: string;
  starts_at: string;
  status: "scheduled" | "live" | "finished";
  question_ids: number[];
  current_index: number;
  question_started_at: string | null;
  result: Record<string, unknown> | null;
}

export interface TournamentEntry { tournament_id: number; user_id: number; correct: number; time_ms: number }

export interface Company {
  id: number;
  name: string;
  sector: string | null;
  description: string | null;
  logo_url: string | null;
  fields: string[];
  website: string | null;
}

export interface Follow { user_id: number; company_id: number; created_at: string }

export interface JobPost {
  id: number;
  company_id: number;
  title: string;
  kind: "internship" | "job";
  field: string | null;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface Club { id: number; university_id: number; name: string; field: string | null; description: string | null; contact: string | null }
export interface Event { id: number; name: string; field: string | null; city: string | null; country: string | null; starts_on: string | null; url: string | null }
export interface MasterProgram {
  id: number;
  university_name: string;
  country: string | null;
  program: string;
  field: string | null;
  language: string | null;
  requirements: string | null;
}

export interface AnalysisReport { id: number; user_id: number; payload: Record<string, unknown>; summary: string | null; created_at: string }

export type RecommendationKind = "field" | "event" | "club" | "company" | "master" | "study_plan";
export interface Recommendation {
  id: number;
  user_id: number;
  kind: RecommendationKind;
  item_id: number | null;
  payload: Record<string, unknown>;
  reason: string | null;
  created_at: string;
}
export interface RecommendationFeedback { id: number; recommendation_id: number; user_id: number; rating: number; comment: string | null; created_at: string }

export interface UserExternalInfo { id: number; user_id: number; kind: "notes" | "event" | "other"; text: string; created_at: string }

export type ConsentScope = "xp" | "courses" | "answers" | "interests" | "recommendations";
export interface Consent {
  id: number;
  student_id: number;
  viewer_type: "company" | "university";
  viewer_id: number;
  scopes: ConsentScope[];
  created_at: string;
}
