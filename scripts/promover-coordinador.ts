import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Uso: npm run dev:promover -- correo@udec.edu.co");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Da el rol COORDINADOR a la persona con ese correo (debe haber entrado una vez). */
async function main() {
  const { data: persona, error: personaErr } = await supabase
    .from("persona")
    .select("id, nombres, apellidos")
    .eq("email", email)
    .maybeSingle();
  if (personaErr) throw personaErr;
  if (!persona) {
    throw new Error(
      `No existe una persona con el correo ${email}. Debe iniciar sesion una vez.`,
    );
  }

  const { data: rol, error: rolErr } = await supabase
    .from("rol")
    .select("id")
    .eq("codigo", "COORDINADOR")
    .single();
  if (rolErr) throw rolErr;

  const { error } = await supabase
    .from("persona_rol")
    .upsert(
      { persona_id: persona.id, rol_id: rol.id },
      { onConflict: "persona_id,rol_id" },
    );
  if (error) throw error;

  console.log(
    `Listo: ${persona.nombres} ${persona.apellidos} (${email}) ahora es COORDINADOR.`,
  );
}

main().catch((error) => {
  console.error("Fallo la promocion:", error);
  process.exit(1);
});
