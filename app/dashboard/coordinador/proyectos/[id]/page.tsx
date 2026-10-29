import Link from "next/link";
import { notFound } from "next/navigation";
import { listarRequisitosProyecto } from "@/actions/requisitos";
import { RequisitosPanel } from "@/components/domain/requisitos-panel";
import { createClient } from "@/lib/supabase/server";
import { estadoLabel } from "@/lib/estados";
import { etiquetaPeriodo } from "@/lib/periodo";
import { requerirGestor } from "@/lib/auth";

export default async function CoordinadorProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyectoId = Number(id);
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) notFound();

  await requerirGestor();
  const supabase = await createClient();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select(
      "id, titulo, estado:estado!inner(codigo), modalidad:modalidad(nombre), periodo:periodo_academico(anio, semestre)",
    )
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) notFound();

  const { data: requisitos } = await listarRequisitosProyecto(proyectoId);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/coordinador"
        className="text-sm text-brand-600 dark:text-brand-400"
      >
        ← Coordinacion
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{proyecto.titulo}</h1>
        <p className="text-sm text-slate-500">
          {proyecto.modalidad?.nombre ?? "Sin modalidad"} ·{" "}
          {etiquetaPeriodo(proyecto.periodo)} · {estadoLabel(proyecto.estado.codigo)}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Requisitos y verificacion</h2>
        <RequisitosPanel
          proyectoId={proyectoId}
          rol="gestor"
          requisitosIniciales={requisitos ?? []}
        />
      </section>
    </div>
  );
}
