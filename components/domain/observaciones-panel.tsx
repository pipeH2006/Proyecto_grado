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

export type RolObservaciones = "estudiante" | "evaluador" | "gestor";

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
): EstadoObservacion[] {
  const destinos = TRANSICIONES[estado];
  if (rol === "gestor") return destinos;
  if (rol === "evaluador") return destinos.filter((d) => d !== "en_correccion");
  return destinos.filter((d) => d === "en_correccion");
}

export function ObservacionesPanel({
  proyectoId,
  rol,
  observacionesIniciales,
  contexto,
}: {
  proyectoId: number;
  rol: RolObservaciones;
  observacionesIniciales: ObservacionVista[];
  contexto?: { rondaId: number; asignacionId: number };
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

  return (
    <div className="space-y-4">
      {contexto ? (
        <ObservacionForm
          proyectoId={proyectoId}
          rondaId={contexto.rondaId}
          asignacionId={contexto.asignacionId}
        />
      ) : null}

      {cambio.data?.error ? (
        <p className="text-sm text-red-600">{cambio.data.error.message}</p>
      ) : null}

      {observaciones.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-300">Sin observaciones.</p>
      ) : (
        <ul className="space-y-3">
          {observaciones.map((observacion) => {
            const destinos = accionesPermitidas(observacion.estado, rol);
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
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
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
