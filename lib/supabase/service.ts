import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Cliente con service_role: omite RLS. Usar SOLO en Server Actions de
// coordinador o admin, nunca en Client Components.
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
