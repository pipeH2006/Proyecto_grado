import Link from "next/link";
import { notFound } from "next/navigation";
import { listarHilo } from "@/actions/observaciones";
import { listarDocumentosProyecto } from "@/actions/proyectos";
import { listarRequisitosProyecto } from "@/actions/requisitos";
import { AnteproyectoDocumento } from "@/components/domain/anteproyecto-documento";
import { ObservacionesPanel } from "@/components/domain/observaciones-panel";
import { RequisitosPanel } from "@/components/domain/requisitos-panel";
import { createClient } from "@/lib/supabase/server";
import { estadoLabel } from "@/lib/estados";
import { etiquetaPeriodo } from "@/lib/periodo";
import { requerirRol } from "@/lib/auth";

export default async function EstudianteProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyectoId = Number(id);
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) notFound();

  await requerirRol(["ESTUDIANTE"]);
  const supabase = await createClient();

  // RLS (proyectos_lectura_implicados) solo devuelve el proyecto si soy autor,
  // evaluador vigente o gestor.
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select(
      "id, titulo, resumen, estado:estado!inner(codigo), periodo:periodo_academico(anio, semestre)",
    )
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) notFound();

  const { data: observaciones } = await listarHilo(proyectoId);
  const { data: documentos } = await listarDocumentosProyecto(proyectoId);
  const { data: requisitos } = await listarRequisitosProyecto(proyectoId);
  const { data: esAutor } = await supabase.rpc("es_autor", {
    p_proyecto: proyectoId,
  });

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/estudiante"
        className="text-sm text-brand-600 dark:text-brand-400"
      >
        ← Mis anteproyectos
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{proyecto.titulo}</h1>
        <p className="text-sm text-slate-500">
          {etiquetaPeriodo(proyecto.periodo)} ·{" "}
          {estadoLabel(proyecto.estado.codigo)}
        </p>
      </header>

      {proyecto.resumen ? (
        <p className="whitespace-pre-line text-slate-700 dark:text-slate-200">
          {proyecto.resumen}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documento del anteproyecto</h2>
        <AnteproyectoDocumento
          proyectoId={proyectoId}
          documentosIniciales={documentos ?? []}
          puedeEditar={Boolean(esAutor)}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Requisitos de la modalidad</h2>
        <RequisitosPanel
          proyectoId={proyectoId}
          rol="estudiante"
          requisitosIniciales={requisitos ?? []}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Observaciones</h2>
        <ObservacionesPanel
          proyectoId={proyectoId}
          rol="estudiante"
          observacionesIniciales={observaciones ?? []}
        />
      </section>
    </div>
  );
}
