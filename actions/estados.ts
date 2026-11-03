"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import { modeloRolesProyectoDisponible } from "@/lib/schema-features";
import { z } from "zod";

const transicionarEstadoSchema = z.object({
  proyecto_id: z.number().int().positive(),
  estado_destino: z.string().min(1).max(30),
  observacion: z.string().max(2000).optional(),
});

export async function transicionarEstadoProyecto(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = transicionarEstadoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: "Datos invalidos",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const modeloDisponible = await modeloRolesProyectoDisponible();
  if (modeloDisponible.error) {
    return {
      data: null,
      error: { message: `No se pudo validar la base de datos: ${modeloDisponible.error}` },
    };
  }
  if (!modeloDisponible.disponible) {
    return {
      data: null,
      error: {
        message:
          "El flujo esta bloqueado hasta respaldar la base de datos y aplicar la migracion de roles por proyecto.",
      },
    };
  }

  const supabase = await createClient();
  const { data: estado, error: errorEstado } = await supabase
    .from("estado")
    .select("id")
    .eq("codigo", parsed.data.estado_destino)
    .maybeSingle();

  if (errorEstado) return { data: null, error: { message: errorEstado.message } };
  if (!estado) {
    return { data: null, error: { message: "El estado solicitado no existe" } };
  }

  const { error } = await supabase.from("proyecto_estado_hist").insert({
    proyecto_id: parsed.data.proyecto_id,
    estado_id: estado.id,
    observacion: parsed.data.observacion?.trim() || null,
  });

  if (error) return { data: null, error: { message: error.message } };
  return { data: null, error: null };
}
