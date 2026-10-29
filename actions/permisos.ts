"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { Permiso, RolConPermisos } from "@/lib/types/roles";
import { alternarPermisoSchema } from "@/lib/validations/rol";

export async function listarPermisos(): Promise<ActionResult<Permiso[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permiso")
    .select("id, codigo, nombre, descripcion, grupo, orden")
    .order("grupo")
    .order("orden");
  if (error) return { data: null, error: { message: error.message } };
  return { data: data ?? [], error: null };
}

/** Matriz rol x permiso: cada rol con los codigos de permiso que tiene. */
export async function listarMatrizPermisos(): Promise<
  ActionResult<RolConPermisos[]>
> {
  const supabase = await createClient();
  const [{ data: roles, error: rolesError }, { data: enlaces, error: enlacesError }] =
    await Promise.all([
      supabase.from("rol").select("id, codigo, nombre").order("id"),
      supabase.from("rol_permiso").select("rol_id, permiso_id"),
    ]);
  if (rolesError) return { data: null, error: { message: rolesError.message } };
  if (enlacesError) {
    return { data: null, error: { message: enlacesError.message } };
  }

  const { data: permisos, error: permisosError } = await supabase
    .from("permiso")
    .select("id, codigo");
  if (permisosError) {
    return { data: null, error: { message: permisosError.message } };
  }

  const codigoPorId = new Map((permisos ?? []).map((p) => [p.id, p.codigo]));
  const permisosPorRol = new Map<number, string[]>();
  for (const enlace of enlaces ?? []) {
    const codigo = codigoPorId.get(enlace.permiso_id);
    if (!codigo) continue;
    permisosPorRol.set(enlace.rol_id, [
      ...(permisosPorRol.get(enlace.rol_id) ?? []),
      codigo,
    ]);
  }

  return {
    data: (roles ?? []).map((rol) => ({
      ...rol,
      permisos: permisosPorRol.get(rol.id) ?? [],
    })),
    error: null,
  };
}

/**
 * Activa o desactiva un permiso para un rol. El ADMINISTRADOR no se toca: su
 * bypass es lo que evita dejar el sistema sin forma de restaurar la matriz.
 */
export async function alternarPermiso(input: unknown): Promise<ActionResult<null>> {
  const parsed = alternarPermisoSchema.safeParse(input);
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
  const [{ data: gestor }, { data: permitido }] = await Promise.all([
    supabase.rpc("es_gestor"),
    supabase.rpc("tiene_permiso", { p_codigo: "permiso.gestionar" }),
  ]);
  if (!gestor || !permitido) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  if (parsed.data.rol_codigo === "ADMINISTRADOR") {
    return {
      data: null,
      error: {
        message: "El rol administrador conserva siempre todos los permisos",
      },
    };
  }

  const [{ data: rol }, { data: permiso }] = await Promise.all([
    supabase
      .from("rol")
      .select("id")
      .eq("codigo", parsed.data.rol_codigo)
      .maybeSingle(),
    supabase
      .from("permiso")
      .select("id")
      .eq("codigo", parsed.data.permiso_codigo)
      .maybeSingle(),
  ]);
  if (!rol) return { data: null, error: { message: "Rol inexistente" } };
  if (!permiso) return { data: null, error: { message: "Permiso inexistente" } };

  if (parsed.data.activo) {
    const { error } = await supabase
      .from("rol_permiso")
      .insert({ rol_id: rol.id, permiso_id: permiso.id });
    // 23505 = ya lo tenia: no es un error para el usuario.
    if (error && error.code !== "23505") {
      return { data: null, error: { message: error.message } };
    }
  } else {
    const { error } = await supabase
      .from("rol_permiso")
      .delete()
      .eq("rol_id", rol.id)
      .eq("permiso_id", permiso.id);
    if (error) return { data: null, error: { message: error.message } };
  }

  return { data: null, error: null };
}
