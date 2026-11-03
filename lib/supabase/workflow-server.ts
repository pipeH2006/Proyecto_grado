import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { WorkflowDatabase } from "@/lib/types/workflow-database";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createWorkflowClient(): Promise<
  SupabaseClient<WorkflowDatabase>
> {
  const cookieStore = await cookies();

  return createServerClient<WorkflowDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Middleware refreshes the session when called from a Server Component.
          }
        },
      },
    },
  );
}
