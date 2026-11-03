import { createClient } from "@/lib/supabase/server";

export async function modeloRolesProyectoDisponible(): Promise<{
  disponible: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transicion_estado")
    .select("*")
    .limit(1);

  if (error) return { disponible: false, error: error.message };
  const primeraTransicion = data?.[0];

  return {
    disponible:
      primeraTransicion !== undefined &&
      "rol_participacion_autorizado_id" in primeraTransicion,
    error: null,
  };
}
