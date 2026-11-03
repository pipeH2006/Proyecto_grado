import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { estadoLabel } from "@/lib/estados";
import { etiquetaPeriodo } from "@/lib/periodo";
import { vigenteHoy } from "@/lib/utils";
import { requerirRol } from "@/lib/auth";

export default async function EvaluadorPage() {
  await requerirRol(["DOCENTE"]);
  const supabase = await createClient();
  const { data: personaId } = await supabase.rpc("persona_actual");

  if (!personaId) {
    return (
      <p className="text-muted-foreground">
        Tu usuario no tiene una persona vinculada.
      </p>
    );
  }

  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from("asignaciones")
    .select("id, proyecto_id, vigencia, rol_participacion_id")
    .eq("persona_id", personaId);
  if (errorAsignaciones) throw new Error(errorAsignaciones.message);

  const asignacionesActivas = (asignaciones ?? []).filter((a) =>
    vigenteHoy(a.vigencia),
  );

  const proyectosIds = [
    ...new Set(asignacionesActivas.map((a) => a.proyecto_id)),
  ];
  const rolIds = [
    ...new Set(asignacionesActivas.map((a) => a.rol_participacion_id)),
  ];
  const { data: rolesParticipacion, error: errorRoles } =
    rolIds.length > 0
      ? await supabase
          .from("rol_participacion")
          .select("id, nombre")
          .in("id", rolIds)
      : { data: [], error: null };
  if (errorRoles) throw new Error(errorRoles.message);

  const nombreRolPorId = new Map(
    (rolesParticipacion ?? []).map((rol) => [rol.id, rol.nombre]),
  );
  const rolesPorProyecto = new Map<number, string[]>();
  for (const asignacion of asignacionesActivas) {
    const nombre = nombreRolPorId.get(asignacion.rol_participacion_id);
    if (!nombre) continue;
    const nombres = rolesPorProyecto.get(asignacion.proyecto_id) ?? [];
    if (!nombres.includes(nombre)) nombres.push(nombre);
    rolesPorProyecto.set(asignacion.proyecto_id, nombres);
  }

  let proyectos: {
    id: number;
    titulo: string;
    estado: { codigo: string };
    periodo: { anio: number; semestre: number };
  }[] = [];

  if (proyectosIds.length > 0) {
    const { data } = await supabase
      .from("proyectos")
      .select("id, titulo, estado:estado!inner(codigo), periodo:periodo_academico(anio, semestre)")
      .in("id", proyectosIds)
      .order("id", { ascending: false });
    proyectos = data ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mis evaluaciones</h1>

      {proyectos.length === 0 ? (
        <p className="text-muted-foreground">
          No tienes anteproyectos asignados con vigencia hoy.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {proyectos.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <Link
                href={`/dashboard/evaluador/proyectos/${p.id}`}
                className="space-y-1 font-medium text-primary"
              >
                <span className="block">{p.titulo}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Roles: {(rolesPorProyecto.get(p.id) ?? []).join(", ")}
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {etiquetaPeriodo(p.periodo)}
                </span>
                <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                  {estadoLabel(p.estado.codigo)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
