import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readPublicEnvFromProcess } from "@/lib/public-env";

export async function createClient() {
  const cookieStore = await cookies();

  // Read at request time on the server. Never fall back to the service-role
  // key here: this client is driven by browser cookies and must only ever use
  // the public anon key.
  const { supabaseUrl, supabaseAnonKey } = readPublicEnvFromProcess();

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
