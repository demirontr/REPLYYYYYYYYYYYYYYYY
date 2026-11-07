import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { SESSION_COOKIE } from "@/lib/session";

// Presentation build: every new visitor gets their own guest student, so visitors never share an account.
export async function proxy(request: NextRequest) {
  if (process.env.DEMO_MODE !== "1" || request.cookies.has(SESSION_COOKIE) || request.method !== "GET") return NextResponse.next();

  const name = `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
  const { data, error } = await supabaseAdmin().from("users")
    .insert({ name, role: "student", university_id: 1, department: "Visitor", year: 1 })
    .select("id").single();
  if (error) return NextResponse.next(); // fall back to the default demo student

  const uid = String(data.id);
  request.cookies.set(SESSION_COOKIE, uid); // this request already renders as the guest
  const res = NextResponse.next({ request });
  res.cookies.set(SESSION_COOKIE, uid, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export const config = {
  // pages only: skip API routes, Next internals and files with an extension
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
