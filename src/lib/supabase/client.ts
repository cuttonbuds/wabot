import { createBrowserClient } from "@supabase/ssr";

/**
 * Placeholder values used only when the real env vars are absent (for example
 * during `next build` on a CI/VPS without .env). Middleware and the login page
 * treat any URL containing "placeholder" as "Supabase not configured".
 */
export const SUPABASE_PLACEHOLDER_URL = "https://placeholder.supabase.co";
export const SUPABASE_PLACEHOLDER_ANON_KEY = "placeholder-anon-key";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    SUPABASE_PLACEHOLDER_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    SUPABASE_PLACEHOLDER_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
