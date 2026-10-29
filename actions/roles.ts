"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { PersonaConRoles, Rol } from "@/lib/types/roles";
import { asignarRolSchema, quitarRolSchema } from "@/lib/validations/rol";

export async function listarRoles(): Promise<ActionResult<Rol[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rol")
    .select("id, codigo, nombre")
    .order("id");
  if (error) return { data: null, error: { message: error.message } };
  return { data: data ?? [], error: null };
}

/**
 * Personas con sus roles, para el panel del coordinador. Sin consulta devuelve
 * las ultimas 20; con consulta filtra por correo o nombre. La RLS de `persona`
 * ya limita la lectura a gestores o al propio registro.
 */
export async function buscarPersonas(
  consulta: string,
): Promise<ActionResult<PersonaConRoles[]>> {
  const supabase = await createClient();
  const { data: gestor } = await supabase.rpc("tiene_permiso", {
    p_codigo: "rol.gestionar",
  });
  if (!gestor) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  const termino = consulta.trim().replace(/[,()%]/g, " ");

  let query = supabase
    .from("persona")
    .select("id, nombres, apellidos, email")
    .order("apellidos")
    .order("nombres")
    .limit(20);
  if (termino) {
    query = query.or(
      `email.ilike.%${termino}%,nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%`,
    );
  }

  const { data: personas, error } = await query;
  if (error) return { data: null, error: { message: error.message } };
  if (!personas || personas.length === 0) return { data: [], error: null };

  const ids = personas.map((p) => p.id);
  const [{ data: enlaces }, { data: roles }] = await Promise.all([
    supabase.from("persona_rol").select("persona_id, rol_id").in("persona_id", ids),
    supabase.from("rol").select("id, codigo"),
  ]);

  const codigoPorId = new Map((roles ?? []).map((r) => [r.id, r.codigo]));
  const rolesPorPersona = new Map<string, string[]>();
  for (const enlace of enlaces ?? []) {
    const codigo = codigoPorId.get(enlace.rol_id);
    if (!codigo) continue;
    rolesPorPersona.set(enlace.persona_id, [
      ...(rolesPorPersona.get(enlace.persona_id) ?? []),
      codigo,
    ]);
  }

  return {
    data: personas.map((p) => ({
      ...p,
      roles: rolesPorPersona.get(p.id) ?? [],
    })),
    error: null,
  };
}

export async function asignarRol(input: unknown): Promise<ActionResult<null>> {
  const parsed = asignarRolSchema.safeParse(input);
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
    p_codigo: "rol.gestionar",
  });
  if (!gestor) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  const { data: rol } = await supabase
    .from("rol")
    .select("id")
    .eq("codigo", parsed.data.rol_codigo)
    .maybeSingle();
  if (!rol) return { data: null, error: { message: "Rol inexistente" } };

  const { error } = await supabase
    .from("persona_rol")
    .insert({ persona_id: parsed.data.persona_id, rol_id: rol.id });
  // 23505 = la persona ya tiene ese rol: no es un error para el usuario.
  if (error && error.code !== "23505") {
    return { data: null, error: { message: error.message } };
  }
  return { data: null, error: null };
}

export async function quitarRol(input: unknown): Promise<ActionResult<null>> {
  const parsed = quitarRolSchema.safeParse(input);
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
    p_codigo: "rol.gestionar",
  });
  if (!gestor) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  const esRolGestor =
    parsed.data.rol_codigo === "COORDINADOR" ||
    parsed.data.rol_codigo === "ADMINISTRADOR";
  if (esRolGestor) {
    const { data: personaId } = await supabase.rpc("persona_actual");
    if (personaId === parsed.data.persona_id) {
      return {
        data: null,
        error: { message: "No puedes quitarte tu propio rol de gestor" },
      };
    }
  }

  const { data: rol } = await supabase
    .from("rol")
    .select("id")
    .eq("codigo", parsed.data.rol_codigo)
    .maybeSingle();
  if (!rol) return { data: null, error: { message: "Rol inexistente" } };

  const { error } = await supabase
    .from("persona_rol")
    .delete()
    .eq("persona_id", parsed.data.persona_id)
    .eq("rol_id", rol.id);
  if (error) return { data: null, error: { message: error.message } };
  return { data: null, error: null };
}
