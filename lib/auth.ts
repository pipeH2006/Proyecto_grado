import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CODIGOS_GESTOR = ["COORDINADOR", "ADMINISTRADOR"];

/** Paneles por rol de usuario, en orden de aparicion en la navegacion. */
export const PANELES: { codigo: string; href: string; etiqueta: string }[] = [
  { codigo: "ESTUDIANTE", href: "/dashboard/estudiante", etiqueta: "Estudiante" },
  { codigo: "DOCENTE", href: "/dashboard/evaluador", etiqueta: "Evaluador" },
  {
    codigo: "COORDINADOR",
    href: "/dashboard/coordinador",
    etiqueta: "Coordinador",
  },
];

/**
 * Codigos de rol del usuario actual, leidos de persona_rol. `cache` evita
 * repetir la consulta cuando el layout y la pagina la piden en el mismo render.
 */
export const rolesActuales = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data: personaId } = await supabase.rpc("persona_actual");
  if (!personaId) return [];

  const { data: enlaces } = await supabase
    .from("persona_rol")
    .select("rol_id")
    .eq("persona_id", personaId);
  if (!enlaces || enlaces.length === 0) return [];

  const ids = [...new Set(enlaces.map((e) => e.rol_id))];
  const { data: roles } = await supabase.from("rol").select("codigo").in("id", ids);
  return (roles ?? []).map((r) => r.codigo);
});

export function esGestor(roles: string[]): boolean {
  return roles.some((r) => CODIGOS_GESTOR.includes(r));
}

/**
 * Codigos de permiso del usuario actual, resueltos por la DB. ADMINISTRADOR
 * recibe todos. `cache` evita repetir el RPC en el mismo render.
 */
export const permisosActuales = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mis_permisos");
  return data ?? [];
});

export function tienePermiso(permisos: string[], codigo: string): boolean {
  return permisos.includes(codigo);
}

/** Panel de aterrizaje segun el rol de mayor privilegio; null si no tiene rol. */
export function panelPorRol(roles: string[]): string | null {
  if (esGestor(roles)) return "/dashboard/coordinador";
  if (roles.includes("DOCENTE")) return "/dashboard/evaluador";
  if (roles.includes("ESTUDIANTE")) return "/dashboard/estudiante";
  return null;
}

/** Guard de pagina: deja pasar a gestores o a cualquiera de los codigos dados. */
export async function requerirRol(codigos: string[]): Promise<string[]> {
  const roles = await rolesActuales();
  const permitido = esGestor(roles) || codigos.some((c) => roles.includes(c));
  if (!permitido) redirect(panelPorRol(roles) ?? "/login");
  return roles;
}

/** Guard de pagina: solo COORDINADOR o ADMINISTRADOR. */
export async function requerirGestor(): Promise<string[]> {
  const roles = await rolesActuales();
  if (!esGestor(roles)) redirect(panelPorRol(roles) ?? "/login");
  return roles;
}

/** Guard de pagina por permiso; redirige al panel del rol si falta. */
export async function requerirPermiso(codigo: string): Promise<string[]> {
  const [roles, permisos] = await Promise.all([
    rolesActuales(),
    permisosActuales(),
  ]);
  if (!tienePermiso(permisos, codigo)) redirect(panelPorRol(roles) ?? "/login");
  return permisos;
}
