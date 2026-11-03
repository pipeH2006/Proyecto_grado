import Link from "next/link";
import { notFound } from "next/navigation";
import { listarHilo } from "@/actions/observaciones";
import { listarDocumentosProyecto } from "@/actions/proyectos";
import { listarRequisitosProyecto } from "@/actions/requisitos";
import { listarSolicitudSustentacion } from "@/actions/sustentacion";
import { AnteproyectoDocumento } from "@/components/domain/anteproyecto-documento";
import { EstadoProyectoPanel } from "@/components/domain/estado-proyecto-panel";
import { ObservacionesPanel } from "@/components/domain/observaciones-panel";
import { RequisitosPanel } from "@/components/domain/requisitos-panel";
import { SustentacionPanel } from "@/components/domain/sustentacion-panel";
import { createClient } from "@/lib/supabase/server";
import { estadoLabel } from "@/lib/estados";
import { etiquetaPeriodo } from "@/lib/periodo";
import { requerirRol } from "@/lib/auth";
import { destinosEstadoPermitidos } from "@/lib/transiciones-estado";
import { modeloRolesProyectoDisponible } from "@/lib/schema-features";

export default async function EstudianteProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyectoId = Number(id);
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) notFound();

  const rolesUsuario = await requerirRol(["ESTUDIANTE"]);
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

  const [
    { data: observaciones },
    { data: documentos },
    resultadoRequisitos,
    resultadoSolicitud,
  ] = await Promise.all([
    listarHilo(proyectoId),
    listarDocumentosProyecto(proyectoId),
    listarRequisitosProyecto(proyectoId),
    listarSolicitudSustentacion(proyectoId),
  ]);
  const requisitos = resultadoRequisitos.data;
  const { data: esAutor } = await supabase.rpc("es_autor", {
    p_proyecto: proyectoId,
  });
  const modeloRoles = await modeloRolesProyectoDisponible();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/estudiante"
        className="text-sm text-primary"
      >
        ← Mis anteproyectos
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{proyecto.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {etiquetaPeriodo(proyecto.periodo)} ·{" "}
          {estadoLabel(proyecto.estado.codigo)}
        </p>
      </header>

      {proyecto.resumen ? (
        <p className="whitespace-pre-line text-foreground">
          {proyecto.resumen}
        </p>
      ) : null}

      {esAutor ? (
        <EstadoProyectoPanel
          proyectoId={proyectoId}
          destinos={destinosEstadoPermitidos(
            proyecto.estado.codigo,
            rolesUsuario,
            true,
          )}
          modeloRolesDisponible={modeloRoles.disponible}
          errorModelo={modeloRoles.error}
        />
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
          observaciones={{
            rol: "estudiante",
            iniciales: observaciones ?? [],
          }}
        />
      </section>

      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Historial general anterior (sin módulo asociado)
        </summary>
        <div className="mt-3">
          <ObservacionesPanel
            proyectoId={proyectoId}
            rol="estudiante"
            observacionesIniciales={observaciones ?? []}
            proyectoRequisitoId={null}
          />
        </div>
      </details>

      {esAutor ? (
        <SustentacionPanel
          proyectoId={proyectoId}
          proyectoEstado={proyecto.estado.codigo}
          esAutor
          esDirector={false}
          solicitudInicial={resultadoSolicitud.data}
          requisitosObligatoriosAprobados={Boolean(
            requisitos?.some((requisito) => requisito.obligatorio) &&
              requisitos
                .filter((requisito) => requisito.obligatorio)
                .every((requisito) => requisito.estado_codigo === "APROBADO"),
          )}
        />
      ) : null}
      {resultadoRequisitos.error ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron validar los requisitos:{" "}
          {resultadoRequisitos.error.message}
        </p>
      ) : null}
      {esAutor && resultadoSolicitud.error ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudo consultar la solicitud de sustentacion:{" "}
          {resultadoSolicitud.error.message}
        </p>
      ) : null}
    </div>
  );
}
