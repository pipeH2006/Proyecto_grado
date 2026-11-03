"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { abrirRonda, cerrarRonda, listarRondasProyecto } from "@/actions/rondas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/queryKeys";

function fechaCorta(valor: string): string {
  return valor.slice(0, 10);
}

export function RondasPanel({
  proyectoId,
  solicitudEstado,
}: {
  proyectoId: number;
  solicitudEstado: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = queryKeys.rondas.porProyecto(proyectoId);
  const [observacion, setObservacion] = useState("");

  const rondas = useQuery({
    queryKey: key,
    queryFn: async () => {
      const resultado = await listarRondasProyecto(proyectoId);
      if (resultado.error) throw new Error(resultado.error.message);
      return resultado.data ?? [];
    },
  });

  const actualizar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.sustentacion.solicitud(proyectoId),
      }),
    ]);
    router.refresh();
  };

  const abrir = useMutation({
    mutationFn: () => abrirRonda(proyectoId),
    onSuccess: async (resultado) => {
      if (!resultado.error) await actualizar();
    },
  });
  const cerrar = useMutation({
    mutationFn: (input: {
      rondaId: number;
      dictamen: "APROBADO" | "REQUIERE_AJUSTES";
    }) =>
      cerrarRonda({
        proyecto_id: proyectoId,
        ronda_id: input.rondaId,
        dictamen: input.dictamen,
        observacion,
      }),
    onSuccess: async (resultado) => {
      if (resultado.error) return;
      setObservacion("");
      await actualizar();
    },
  });

  const error =
    rondas.error?.message ??
    abrir.data?.error?.message ??
    cerrar.data?.error?.message;
  const rondaAbierta = rondas.data?.find((ronda) => ronda.cerrada_en === null);

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-lg font-semibold">Intento de sustentacion</h2>
        <p className="text-sm text-muted-foreground">
          El jurado abre el intento despues de la confirmacion del director y lo
          cierra registrando el dictamen.
        </p>
      </div>

      {rondas.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando intentos…</p>
      ) : null}
      {rondas.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aun no hay intentos.</p>
      ) : null}

      {rondas.data && rondas.data.length > 0 ? (
        <ul className="space-y-2">
          {rondas.data.map((ronda) => {
            const abierta = ronda.cerrada_en === null;
            return (
              <li
                key={ronda.id}
                className="space-y-3 rounded-md border border-border px-3 py-2"
              >
                <p className="text-sm">
                  Intento {ronda.numero} · {abierta ? "Abierto" : "Cerrado"} ·{" "}
                  {fechaCorta(ronda.abierta_en)}
                  {ronda.dictamen ? ` · Dictamen: ${ronda.dictamen}` : ""}
                </p>
                {ronda.observacion_dictamen ? (
                  <p className="text-sm text-muted-foreground">
                    {ronda.observacion_dictamen}
                  </p>
                ) : null}
                {abierta ? (
                  <div className="space-y-3">
                    <Textarea
                      aria-label="Observacion del dictamen"
                      maxLength={2000}
                      rows={2}
                      placeholder="Observaciones del jurado (opcional)"
                      value={observacion}
                      onChange={(event) => setObservacion(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={cerrar.isPending}
                        onClick={() =>
                          cerrar.mutate({
                            rondaId: ronda.id,
                            dictamen: "APROBADO",
                          })
                        }
                      >
                        Aprobar y finalizar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cerrar.isPending}
                        onClick={() =>
                          cerrar.mutate({
                            rondaId: ronda.id,
                            dictamen: "REQUIERE_AJUSTES",
                          })
                        }
                      >
                        Requiere ajustes
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!rondaAbierta && solicitudEstado === "PENDIENTE_JURADO" ? (
        <Button
          type="button"
          disabled={rondas.isPending || abrir.isPending}
          onClick={() => abrir.mutate()}
        >
          {abrir.isPending ? "Abriendo…" : "Abrir intento"}
        </Button>
      ) : null}
      {!rondaAbierta && solicitudEstado !== "PENDIENTE_JURADO" ? (
        <p className="text-sm text-muted-foreground">
          Se requiere una solicitud del estudiante confirmada por el director.
        </p>
      ) : null}
    </section>
  );
}
