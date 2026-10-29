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
      <p className="text-slate-600 dark:text-slate-300">
        Tu usuario no tiene una persona vinculada.
      </p>
    );
  }

  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, proyecto_id, vigencia")
    .eq("persona_id", personaId);

  const proyectosIds = [
    ...new Set((asignaciones ?? []).filter((a) => vigenteHoy(a.vigencia)).map((a) => a.proyecto_id)),
  ];

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
        <p className="text-slate-600 dark:text-slate-300">
          No tienes anteproyectos asignados con vigencia hoy.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {proyectos.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <Link
                href={`/dashboard/evaluador/proyectos/${p.id}`}
                className="font-medium text-brand-600 dark:text-brand-400"
              >
                {p.titulo}
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {etiquetaPeriodo(p.periodo)}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
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
