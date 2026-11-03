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
import { RondasPanel } from "@/components/domain/rondas-panel";
import { SustentacionPanel } from "@/components/domain/sustentacion-panel";
import { createClient } from "@/lib/supabase/server";
import { estadoLabel } from "@/lib/estados";
import { etiquetaPeriodo } from "@/lib/periodo";
import { vigenteHoy } from "@/lib/utils";
import { requerirRol } from "@/lib/auth";
import { destinosEstadoPermitidos } from "@/lib/transiciones-estado";
import { modeloRolesProyectoDisponible } from "@/lib/schema-features";

export default async function EvaluadorProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyectoId = Number(id);
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) notFound();

  const rolesUsuario = await requerirRol(["DOCENTE"]);
  const supabase = await createClient();
  const { data: personaId } = await supabase.rpc("persona_actual");
  if (!personaId) notFound();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select(
      "id, titulo, resumen, estado:estado!inner(codigo), periodo:periodo_academico(anio, semestre)",
    )
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) notFound();

  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from("asignaciones")
    .select("id, vigencia, rol_participacion_id")
    .eq("proyecto_id", proyectoId)
    .eq("persona_id", personaId);
  if (errorAsignaciones) throw new Error(errorAsignaciones.message);

  const asignacionesActivas = (asignaciones ?? []).filter((asignacion) =>
    vigenteHoy(asignacion.vigencia),
  );
  if (asignacionesActivas.length === 0) notFound();

  const rolIds = [
    ...new Set(asignacionesActivas.map((asignacion) => asignacion.rol_participacion_id)),
  ];
  const { data: rolesParticipacion, error: errorRoles } = await supabase
    .from("rol_participacion")
    .select("id, codigo, nombre")
    .in("id", rolIds);
  if (errorRoles) throw new Error(errorRoles.message);

  const rolPorId = new Map(
    (rolesParticipacion ?? []).map((rol) => [rol.id, rol]),
  );
  const rolesActivos = asignacionesActivas.flatMap((asignacion) => {
    const rol = rolPorId.get(asignacion.rol_participacion_id);
    return rol ? [{ ...asignacion, rol }] : [];
  });

  const [resultadoSolicitud, rondaResult] = await Promise.all([
    listarSolicitudSustentacion(proyectoId),
    proyecto.estado.codigo === "SUSTENTADO"
      ? supabase
          .from("rondas")
          .select("id, numero")
          .eq("proyecto_id", proyectoId)
          .is("cerrada_en", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (rondaResult.error) throw new Error(rondaResult.error.message);
  const ronda = rondaResult.data;

  const [resultadoHilo, resultadoDocumentos, resultadoRequisitos] =
    await Promise.all([
      listarHilo(proyectoId),
      listarDocumentosProyecto(proyectoId),
      listarRequisitosProyecto(proyectoId),
    ]);

  const contexto = ronda ? { rondaId: ronda.id } : undefined;
  const modeloRoles = await modeloRolesProyectoDisponible();
  const rolesObservacionPorEstado: Record<string, string[]> = {
    EN_REVISION: ["EVALUADOR"],
    EN_DESARROLLO: [
      "DIRECTOR",
      "CODIRECTOR",
      "DIRECTOR_DISCIPLINAR",
      "DIRECTOR_METODOLOGICO",
    ],
    SUSTENTADO: ["JURADO"],
  };
  const asignacionesObservacion = rolesActivos.flatMap((asignacion) =>
    rolesObservacionPorEstado[proyecto.estado.codigo]?.includes(
      asignacion.rol.codigo,
    ) &&
    (asignacion.rol.codigo !== "JURADO" || ronda)
      ? [{
          id: asignacion.id,
          rol_codigo: asignacion.rol.codigo,
          rol_nombre: asignacion.rol.nombre,
        }]
      : [],
  );
  const codigosParticipacion = rolesActivos.map(
    (asignacion) => asignacion.rol.codigo,
  );
  const destinosEstado = destinosEstadoPermitidos(
    proyecto.estado.codigo,
    rolesUsuario,
  );
  const solicitud = resultadoSolicitud.data;
  const esDirector = rolesActivos.some(
    (asignacion) => asignacion.rol.codigo === "DIRECTOR",
  );

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/evaluador"
        className="text-sm text-primary"
      >
        ← Mis evaluaciones
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{proyecto.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {etiquetaPeriodo(proyecto.periodo)} ·{" "}
          {estadoLabel(proyecto.estado.codigo)}
          {ronda ? ` · Intento ${ronda.numero} abierto` : ""}
        </p>
      </header>

      {rolesActivos.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Tus roles en este proyecto:{" "}
          {rolesActivos.map((asignacion) => asignacion.rol.nombre).join(", ")}.
        </p>
      ) : null}

      <EstadoProyectoPanel
        proyectoId={proyectoId}
        destinos={destinosEstado}
        modeloRolesDisponible={modeloRoles.disponible}
        errorModelo={modeloRoles.error}
      />

      {esDirector ? (
        <SustentacionPanel
          proyectoId={proyectoId}
          proyectoEstado={proyecto.estado.codigo}
          esAutor={false}
          esDirector
          solicitudInicial={solicitud}
          requisitosObligatoriosAprobados={false}
        />
      ) : null}
      {codigosParticipacion.includes("JURADO") ? (
        <RondasPanel
          proyectoId={proyectoId}
          solicitudEstado={solicitud?.estado ?? null}
        />
      ) : null}
      {resultadoSolicitud.error ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudo consultar la solicitud de sustentacion:{" "}
          {resultadoSolicitud.error.message}
        </p>
      ) : null}

      {proyecto.resumen ? (
        <p className="whitespace-pre-line text-foreground">
          {proyecto.resumen}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documento del anteproyecto</h2>
        {resultadoDocumentos.error ? (
          <p role="alert" className="text-sm text-destructive">
            No se pudieron cargar los documentos: {resultadoDocumentos.error.message}
          </p>
        ) : null}
        <AnteproyectoDocumento
          proyectoId={proyectoId}
          documentosIniciales={resultadoDocumentos.data ?? []}
          puedeEditar={false}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Requisitos de la modalidad</h2>
        {resultadoRequisitos.error ? (
          <p role="alert" className="text-sm text-destructive">
            No se pudieron cargar los requisitos: {resultadoRequisitos.error.message}
          </p>
        ) : null}
        <RequisitosPanel
          proyectoId={proyectoId}
          rol="consulta"
          requisitosIniciales={resultadoRequisitos.data ?? []}
          observaciones={{
            rol: "docente",
            iniciales: resultadoHilo.data ?? [],
            contexto,
            rolesParticipacion: codigosParticipacion,
            asignaciones: asignacionesObservacion,
            modeloRolesDisponible: modeloRoles.disponible,
          }}
        />
      </section>

      {asignacionesObservacion.length === 0 ? (
        <p className="rounded-md border border-udec-warning/50 bg-udec-warning/10 p-3 text-sm text-udec-accent">
          No tienes una asignacion vigente habilitada para registrar
          observaciones durante esta etapa.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Observaciones generales anteriores</h2>
        {resultadoHilo.error ? (
          <p role="alert" className="text-sm text-destructive">
            No se pudieron cargar las observaciones: {resultadoHilo.error.message}
          </p>
        ) : null}
        <ObservacionesPanel
          proyectoId={proyectoId}
          rol="docente"
          observacionesIniciales={resultadoHilo.data ?? []}
          contexto={contexto}
          proyectoRequisitoId={null}
          rolesParticipacion={codigosParticipacion}
          asignaciones={asignacionesObservacion}
          modeloRolesDisponible={modeloRoles.disponible}
        />
      </section>
    </div>
  );
}
