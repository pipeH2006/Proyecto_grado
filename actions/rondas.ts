"use server";

import { z } from "zod";
import { createWorkflowClient } from "@/lib/supabase/workflow-server";
import type { ActionResult } from "@/lib/types/actions";

export type RondaVista = {
  id: number;
  numero: number;
  abierta_en: string;
  cerrada_en: string | null;
  dictamen: "APROBADO" | "REQUIERE_AJUSTES" | null;
  observacion_dictamen: string | null;
};

const proyectoIdSchema = z.number().int().positive();
const cerrarRondaSchema = z.object({
  proyecto_id: proyectoIdSchema,
  ronda_id: proyectoIdSchema,
  dictamen: z.enum(["APROBADO", "REQUIERE_AJUSTES"]),
  observacion: z.string().max(2000).optional(),
});

export async function listarRondasProyecto(
  proyectoId: number,
): Promise<ActionResult<RondaVista[]>> {
  if (!proyectoIdSchema.safeParse(proyectoId).success) {
    return { data: null, error: { message: "Proyecto invalido" } };
  }

  const supabase = await createWorkflowClient();
  const { data, error } = await supabase
    .from("rondas")
    .select(
      "id, numero, abierta_en, cerrada_en, dictamen, observacion_dictamen",
    )
    .eq("proyecto_id", proyectoId)
    .order("numero", { ascending: false });

  if (error) return { data: null, error: { message: error.message } };
  return { data: data ?? [], error: null };
}

export async function abrirRonda(
  proyectoId: number,
): Promise<ActionResult<number>> {
  if (!proyectoIdSchema.safeParse(proyectoId).success) {
    return { data: null, error: { message: "Proyecto invalido" } };
  }

  const supabase = await createWorkflowClient();
  const { data, error } = await supabase.rpc("abrir_ronda_sustentacion", {
    p_proyecto: proyectoId,
  });
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

export async function cerrarRonda(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = cerrarRondaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: "Datos invalidos",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const supabase = await createWorkflowClient();
  const { error } = await supabase.rpc("cerrar_ronda_sustentacion", {
    p_proyecto: parsed.data.proyecto_id,
    p_ronda: parsed.data.ronda_id,
    p_dictamen: parsed.data.dictamen,
    p_observacion: parsed.data.observacion?.trim() || null,
  });
  if (error) return { data: null, error: { message: error.message } };
  return { data: null, error: null };
}
