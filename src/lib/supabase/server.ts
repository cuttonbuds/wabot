import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Placeholder values used only when the real env vars are absent (for example
 * during `next build` on a CI/VPS without .env). Middleware treats any URL
 * containing "placeholder" as "Supabase not configured".
 */
const SUPABASE_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const SUPABASE_PLACEHOLDER_ANON_KEY = "placeholder-anon-key";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    SUPABASE_PLACEHOLDER_URL;

  // Never fall back to the service-role key here: this client is driven by
  // browser cookies and must only ever use the public anon key.
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    SUPABASE_PLACEHOLDER_ANON_KEY;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}
