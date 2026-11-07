"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { runStudyPlanner } from "@/lib/ai/studyPlanner";

export async function generateStudyPlan(courseId: number) {
  const me = await getCurrentUser();
  if (me.role !== "student") throw new Error("Only students have a study plan.");
  if (!Number.isInteger(courseId) || courseId <= 0) throw new Error("Invalid course");
  await runStudyPlanner(me, courseId);
  revalidatePath("/study-plan");
}
