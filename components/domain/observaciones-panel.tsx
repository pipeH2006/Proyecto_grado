"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cambiarEstadoObservacion,
  listarHilo,
} from "@/actions/observaciones";
import type { EstadoObservacion } from "@/components/domain/estado-badge";
import { ObservacionCard } from "@/components/domain/observacion-card";
import { ObservacionForm } from "@/components/domain/observacion-form";
import { RespuestaForm } from "@/components/domain/respuesta-form";
import { queryKeys } from "@/lib/queryKeys";
import type { ObservacionVista } from "@/lib/types/observaciones";
import {
  AMBITO_POR_ROL_PARTICIPACION,
  ROLES_QUE_REABREN_OBSERVACIONES,
  ROLES_QUE_RESUELVEN_OBSERVACIONES,
} from "@/lib/roles-participacion";
import type { AsignacionObservacion } from "@/components/domain/observacion-form";

export type RolObservaciones = "estudiante" | "docente" | "gestor";

const TRANSICIONES: Record<EstadoObservacion, EstadoObservacion[]> = {
  pendiente: ["en_correccion"],
  en_correccion: ["solucionada", "no_aplica"],
  solucionada: ["pendiente"],
  no_aplica: [],
};

const ETIQUETA_ACCION: Record<EstadoObservacion, string> = {
  pendiente: "Reabrir",
  en_correccion: "Iniciar correccion",
  solucionada: "Marcar solucionada",
  no_aplica: "Marcar no aplica",
};

function accionesPermitidas(
  estado: EstadoObservacion,
  rol: RolObservaciones,
  rolesParticipacion: string[],
  etapaCodigo: string,
): EstadoObservacion[] {
  const destinos = TRANSICIONES[estado];
  if (rol === "gestor") return destinos;
  if (rol === "docente") {
    const rolesParaEtapa: Record<string, string[]> = {
      EN_DESARROLLO: ["DIRECTOR", "CODIRECTOR"],
      EN_REVISION: ["EVALUADOR"],
      SUSTENTADO: ["JURADO"],
    };
    const puedeResolver = rolesParticipacion.some(
      (codigo) =>
        rolesParaEtapa[etapaCodigo]?.includes(codigo) &&
        ROLES_QUE_RESUELVEN_OBSERVACIONES.has(codigo),
    );
    const puedeReabrir = rolesParticipacion.some((codigo) =>
      ROLES_QUE_REABREN_OBSERVACIONES.has(codigo),
    );
    return destinos.filter((destino) => {
      if (destino === "solucionada" || destino === "no_aplica") {
        return puedeResolver;
      }
      if (destino === "pendiente") return puedeReabrir;
      return false;
    });
  }
  return destinos.filter((d) => d === "en_correccion");
}

export function ObservacionesPanel({
  proyectoId,
  rol,
  observacionesIniciales,
  contexto,
  proyectoRequisitoId,
  requisitoNombre,
  rolesParticipacion = [],
  asignaciones = [],
  modeloRolesDisponible = true,
}: {
  proyectoId: number;
  rol: RolObservaciones;
  observacionesIniciales: ObservacionVista[];
  contexto?: { rondaId: number };
  proyectoRequisitoId?: number | null;
  requisitoNombre?: string;
  rolesParticipacion?: string[];
  asignaciones?: AsignacionObservacion[];
  modeloRolesDisponible?: boolean;
}) {
  const queryClient = useQueryClient();

  const { data: observaciones } = useQuery({
    queryKey: queryKeys.observaciones.porProyecto(proyectoId),
    queryFn: async () => {
      const result = await listarHilo(proyectoId);
      return result.data ?? [];
    },
    initialData: observacionesIniciales,
  });

  const cambio = useMutation({
    mutationFn: (values: { observacion_id: number; estado: EstadoObservacion }) =>
      cambiarEstadoObservacion(values),
    onSuccess: (result) => {
      if (result.error) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.observaciones.porProyecto(proyectoId),
      });
    },
  });
  const observacionesFiltradas =
    proyectoRequisitoId === undefined
      ? observaciones
      : observaciones.filter(
          (observacion) =>
            observacion.proyecto_requisito_id === proyectoRequisitoId,
        );

  return (
    <div className="space-y-4">
      {rol === "docente" &&
      proyectoRequisitoId !== undefined &&
      proyectoRequisitoId !== null &&
      requisitoNombre &&
      asignaciones.some(
        (asignacion) =>
          AMBITO_POR_ROL_PARTICIPACION[asignacion.rol_codigo] !== undefined,
      ) ? (
        <ObservacionForm
          proyectoId={proyectoId}
          proyectoRequisitoId={proyectoRequisitoId}
          requisitoNombre={requisitoNombre}
          rondaId={contexto?.rondaId}
          asignaciones={asignaciones.filter(
            (asignacion) =>
              AMBITO_POR_ROL_PARTICIPACION[asignacion.rol_codigo] !== undefined,
          )}
        />
      ) : null}

      {cambio.data?.error ? (
        <p className="text-sm text-destructive">{cambio.data.error.message}</p>
      ) : null}
      {rol === "docente" && !modeloRolesDisponible ? (
        <p role="status" className="rounded-md border border-udec-warning/50 bg-udec-warning/10 p-3 text-sm text-udec-accent">
          Resolver observaciones esta bloqueado hasta crear un respaldo y
          aplicar la migracion de roles por proyecto.
        </p>
      ) : null}

      {observacionesFiltradas.length === 0 ? (
        <p className="text-muted-foreground">Sin observaciones.</p>
      ) : (
        <ul className="space-y-3">
          {observacionesFiltradas.map((observacion) => {
            const destinos =
              rol === "docente" && !modeloRolesDisponible
                ? []
                : accionesPermitidas(
                    observacion.estado,
                    rol,
                    rolesParticipacion,
                    observacion.etapaCodigo,
                  );
            const puedeResponder =
              rol === "estudiante" &&
              (observacion.estado === "pendiente" ||
                observacion.estado === "en_correccion");
            return (
              <li key={observacion.id}>
                <ObservacionCard
                  observacion={observacion}
                  respuestaForm={
                    puedeResponder ? (
                      <RespuestaForm
                        proyectoId={proyectoId}
                        observacionId={observacion.id}
                      />
                    ) : undefined
                  }
                  acciones={destinos.map((destino) => (
                    <button
                      key={destino}
                      type="button"
                      disabled={cambio.isPending}
                      onClick={() =>
                        cambio.mutate({
                          observacion_id: observacion.id,
                          estado: destino,
                        })
                      }
                      className="rounded-md border border-input px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
                    >
                      {ETIQUETA_ACCION[destino]}
                    </button>
                  ))}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
