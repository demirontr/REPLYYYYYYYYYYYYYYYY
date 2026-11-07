import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const me = await getCurrentUser();
  // company/university panels live under /org (Claude 3)
  redirect(me.role === "student" ? "/dashboard" : "/org");
}
