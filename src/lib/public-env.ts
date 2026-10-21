/**
 * Runtime public configuration.
 *
 * `NEXT_PUBLIC_*` variables are frozen into the browser bundle at `next build`.
 * On platforms that build once and inject env at container start (Easypanel,
 * Docker images promoted across environments), the bundle never sees them.
 *
 * Instead, the root layout reads these values on the server at request time
 * and injects them as `window.__PUBLIC_ENV__` before hydration. Client code
 * reads from there first and falls back to `process.env` for local dev.
 */

export interface PublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Placeholder values used only when the real env vars are absent. Middleware
 * and the login page treat any URL containing "placeholder" as "not configured".
 */
export const SUPABASE_PLACEHOLDER_URL = "https://placeholder.supabase.co";
export const SUPABASE_PLACEHOLDER_ANON_KEY = "placeholder-anon-key";

declare global {
  interface Window {
    __PUBLIC_ENV__?: PublicEnv;
  }
}

/**
 * Reads public config from process.env. Only meaningful on the server at
 * request time, or in local dev where .env is present at build.
 */
export function readPublicEnvFromProcess(): PublicEnv {
  return {
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      SUPABASE_PLACEHOLDER_URL,
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      SUPABASE_PLACEHOLDER_ANON_KEY,
  };
}

/**
 * Returns the public config: injected runtime values in the browser,
 * process.env on the server.
 */
export function getPublicEnv(): PublicEnv {
  if (typeof window !== "undefined" && window.__PUBLIC_ENV__) {
    return window.__PUBLIC_ENV__;
  }
  return readPublicEnvFromProcess();
}

export function isSupabaseConfigured(env: PublicEnv = getPublicEnv()): boolean {
  const url = env.supabaseUrl || "";
  return (
    url.length > 0 &&
    (env.supabaseAnonKey || "").length > 20 &&
    !url.includes("placeholder") &&
    !url.includes("your-project-id")
  );
}

/**
 * Serializes the config for an inline <script>. Escapes "<" so a value can
 * never close the script tag.
 */
export function serializePublicEnvScript(env: PublicEnv): string {
  const json = JSON.stringify(env).replace(/</g, "\\u003c");
  return `window.__PUBLIC_ENV__=${json};`;
}
