import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function need(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

let admin: SupabaseClient | undefined;
let browser: SupabaseClient | undefined;

/** Server only (Route Handlers, Server Actions, Server Components). Bypasses RLS. */
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(
    need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    need("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false } },
  );
  return admin;
}

/** Client components (Realtime). Uses the public anon key. */
export function supabaseBrowser(): SupabaseClient {
  browser ??= createClient(
    need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    need("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
  return browser;
}
