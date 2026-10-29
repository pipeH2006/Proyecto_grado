import Link from "next/link";
import { notFound } from "next/navigation";
import { listarHilo } from "@/actions/observaciones";
import { ObservacionesPanel } from "@/components/domain/observaciones-panel";
import { createClient } from "@/lib/supabase/server";
import { etiquetaPeriodo } from "@/lib/periodo";
import { vigenteHoy } from "@/lib/utils";
import { requerirRol } from "@/lib/auth";

export default async function EvaluadorProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyectoId = Number(id);
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) notFound();

  await requerirRol(["DOCENTE"]);
  const supabase = await createClient();
  const { data: personaId } = await supabase.rpc("persona_actual");
  if (!personaId) notFound();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, titulo, resumen, periodo:periodo_academico(anio, semestre)")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) notFound();

  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, vigencia")
    .eq("proyecto_id", proyectoId)
    .eq("persona_id", personaId);
  const asignacion = (asignaciones ?? []).find((a) => vigenteHoy(a.vigencia));

  const { data: ronda } = await supabase
    .from("rondas")
    .select("id, numero")
    .eq("proyecto_id", proyectoId)
    .is("cerrada_en", null)
    .maybeSingle();

  const { data: observaciones } = await listarHilo(proyectoId);

  const contexto =
    asignacion && ronda
      ? { rondaId: ronda.id, asignacionId: asignacion.id }
      : undefined;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/evaluador"
        className="text-sm text-brand-600 dark:text-brand-400"
      >
        ← Mis evaluaciones
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{proyecto.titulo}</h1>
        <p className="text-sm text-slate-500">
          {etiquetaPeriodo(proyecto.periodo)} ·{" "}
          {ronda ? `Ronda ${ronda.numero} abierta` : "Sin ronda abierta"}
        </p>
      </header>

      {proyecto.resumen ? (
        <p className="whitespace-pre-line text-slate-700 dark:text-slate-200">
          {proyecto.resumen}
        </p>
      ) : null}

      {!contexto ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          No puedes registrar observaciones: falta una ronda abierta o una
          asignacion vigente.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Observaciones</h2>
        <ObservacionesPanel
          proyectoId={proyectoId}
          rol="evaluador"
          observacionesIniciales={observaciones ?? []}
          contexto={contexto}
        />
      </section>
    </div>
  );
}
