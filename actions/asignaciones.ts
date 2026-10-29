"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type {
  AsignacionVista,
  DocenteOpcion,
  OpcionProyecto,
  Rol,
} from "@/lib/types/roles";
import { vigenteHoy } from "@/lib/utils";
import { asignarParticipacionSchema } from "@/lib/validations/rol";

export async function listarProyectosAsignables(): Promise<
  ActionResult<OpcionProyecto[]>
> {
  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc("tiene_permiso", {
    p_codigo: "asignacion.gestionar",
  });
  if (!gestor) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  const { data, error } = await supabase
    .from("proyectos")
    .select("id, titulo, estado:estado!inner(codigo)")
    .order("id", { ascending: false })
    .limit(50);
  if (error) return { data: null, error: { message: error.message } };
  return {
    data: (data ?? []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      estado: p.estado.codigo,
    })),
    error: null,
  };
}

export async function listarDocentes(): Promise<ActionResult<DocenteOpcion[]>> {
  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc("tiene_permiso", {
    p_codigo: "asignacion.gestionar",
  });
  if (!gestor) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  const { data: rolDocente } = await supabase
    .from("rol")
    .select("id")
    .eq("codigo", "DOCENTE")
    .maybeSingle();
  if (!rolDocente) return { data: [], error: null };

  const { data: enlaces, error } = await supabase
    .from("persona_rol")
    .select("persona_id")
    .eq("rol_id", rolDocente.id);
  if (error) return { data: null, error: { message: error.message } };

  const ids = [...new Set((enlaces ?? []).map((e) => e.persona_id))];
  if (ids.length === 0) return { data: [], error: null };

  const { data, error: personasError } = await supabase
    .from("persona")
    .select("id, nombres, apellidos, email")
    .in("id", ids)
    .order("apellidos");
  if (personasError) {
    return { data: null, error: { message: personasError.message } };
  }
  return { data: data ?? [], error: null };
}

export async function listarRolesParticipacion(): Promise<ActionResult<Rol[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rol_participacion")
    .select("id, codigo, nombre")
    .order("id");
  if (error) return { data: null, error: { message: error.message } };
  return { data: data ?? [], error: null };
}

/** Asignaciones (vigentes e historicas) de un proyecto, con persona y rol. */
export async function listarAsignacionesProyecto(
  proyectoId: number,
): Promise<ActionResult<AsignacionVista[]>> {
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) {
    return { data: null, error: { message: "Proyecto invalido" } };
  }

  const supabase = await createClient();
  const { data: asignaciones, error } = await supabase
    .from("asignaciones")
    .select("id, persona_id, rol_participacion_id, vigencia, creada_en")
    .eq("proyecto_id", proyectoId)
    .order("id", { ascending: false });
  if (error) return { data: null, error: { message: error.message } };
  if (!asignaciones || asignaciones.length === 0) {
    return { data: [], error: null };
  }

  const personaIds = [...new Set(asignaciones.map((a) => a.persona_id))];
  const rolIds = [...new Set(asignaciones.map((a) => a.rol_participacion_id))];
  const [{ data: personas }, { data: roles }] = await Promise.all([
    supabase.from("persona").select("id, nombres, apellidos").in("id", personaIds),
    supabase
      .from("rol_participacion")
      .select("id, nombre")
      .in("id", rolIds),
  ]);
  const personaPorId = new Map((personas ?? []).map((p) => [p.id, p]));
  const rolPorId = new Map((roles ?? []).map((r) => [r.id, r.nombre]));

  return {
    data: asignaciones.map((a) => {
      const persona = personaPorId.get(a.persona_id);
      return {
        id: a.id,
        persona: {
          id: a.persona_id,
          nombres: persona?.nombres ?? "",
          apellidos: persona?.apellidos ?? "",
        },
        rol_participacion: rolPorId.get(a.rol_participacion_id) ?? "",
        vigencia: String(a.vigencia),
        vigente: vigenteHoy(a.vigencia),
        creada_en: a.creada_en,
      };
    }),
    error: null,
  };
}

/**
 * RF-04. Asigna (o cambia) un participante de un proyecto. La funcion SQL cierra
 * la vigencia anterior de esa persona y abre una nueva desde hoy.
 */
export async function asignarParticipacion(
  input: unknown,
): Promise<ActionResult<number>> {
  const parsed = asignarParticipacionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: "Datos invalidos",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc("tiene_permiso", {
    p_codigo: "asignacion.gestionar",
  });
  if (!gestor) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  const { data, error } = await supabase.rpc("asignar_participacion", {
    p_proyecto: parsed.data.proyecto_id,
    p_persona: parsed.data.persona_id,
    p_rol_participacion: parsed.data.rol_participacion_id,
  });
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}
