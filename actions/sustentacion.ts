"use server";

import { z } from "zod";
import { createWorkflowClient } from "@/lib/supabase/workflow-server";
import type { ActionResult } from "@/lib/types/actions";

export type SolicitudSustentacionVista = {
  id: number;
  proyecto_id: number;
  solicitada_en: string;
  estado:
    | "PENDIENTE_DIRECTOR"
    | "PENDIENTE_JURADO"
    | "APROBADA"
    | "REQUIERE_AJUSTES";
  confirmada_en: string | null;
};

const proyectoIdSchema = z.number().int().positive();
const solicitudIdSchema = z.number().int().positive();

export async function listarSolicitudSustentacion(
  proyectoId: number,
): Promise<ActionResult<SolicitudSustentacionVista | null>> {
  if (!proyectoIdSchema.safeParse(proyectoId).success) {
    return { data: null, error: { message: "Proyecto invalido" } };
  }

  const supabase = await createWorkflowClient();
  const { data, error } = await supabase
    .from("solicitudes_sustentacion")
    .select("id, proyecto_id, solicitada_en, estado, confirmada_en")
    .eq("proyecto_id", proyectoId)
    .order("solicitada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

export async function solicitarSustentacion(
  proyectoId: number,
): Promise<ActionResult<number>> {
  if (!proyectoIdSchema.safeParse(proyectoId).success) {
    return { data: null, error: { message: "Proyecto invalido" } };
  }

  const supabase = await createWorkflowClient();
  const { data, error } = await supabase.rpc("solicitar_sustentacion", {
    p_proyecto: proyectoId,
  });
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

export async function confirmarSolicitudSustentacion(
  solicitudId: number,
): Promise<ActionResult<null>> {
  if (!solicitudIdSchema.safeParse(solicitudId).success) {
    return { data: null, error: { message: "Solicitud invalida" } };
  }

  const supabase = await createWorkflowClient();
  const { error } = await supabase.rpc("confirmar_solicitud_sustentacion", {
    p_solicitud: solicitudId,
  });
  if (error) return { data: null, error: { message: error.message } };
  return { data: null, error: null };
}
