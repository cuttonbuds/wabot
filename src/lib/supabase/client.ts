import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/public-env";

/**
 * Browser Supabase client. Reads URL and anon key from the runtime config
 * injected by the root layout (see src/lib/public-env.ts), so the values set
 * on the server at deploy time are used without rebuilding the bundle.
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
