import { supabaseAdmin } from "@/lib/supabase";

/** Questions the user got wrong and never got right in this course (used for the retry test). */
export async function wrongQuestionIds(userId: number, courseId: number): Promise<number[]> {
  const { data, error } = await supabaseAdmin()
    .from("answers").select("question_id,is_correct,questions!inner(course_id)")
    .eq("user_id", userId).eq("questions.course_id", courseId);
  if (error) throw error;
  const right = new Set(data.filter((a) => a.is_correct).map((a) => a.question_id as number));
  return [...new Set(data.filter((a) => !a.is_correct).map((a) => a.question_id as number))].filter((id) => !right.has(id));
}
