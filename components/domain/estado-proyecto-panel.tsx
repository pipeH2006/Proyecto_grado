"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transicionarEstadoProyecto } from "@/actions/estados";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";

export function EstadoProyectoPanel({
  proyectoId,
  destinos,
  modeloRolesDisponible,
  errorModelo,
}: {
  proyectoId: number;
  destinos: { codigo: string; etiqueta: string }[];
  modeloRolesDisponible: boolean;
  errorModelo: string | null;
}) {
  const router = useRouter();
  const [estadoDestino, setEstadoDestino] = useState(destinos[0]?.codigo ?? "");
  const [observacion, setObservacion] = useState("");

  const cambio = useMutation({
    mutationFn: () =>
      transicionarEstadoProyecto({
        proyecto_id: proyectoId,
        estado_destino: estadoDestino,
        observacion,
      }),
    onSuccess: (resultado) => {
      if (resultado.error) return;
      setObservacion("");
      router.refresh();
    },
  });

  if (!modeloRolesDisponible) {
    return (
      <p role="status" className="rounded-md border border-udec-warning/50 bg-udec-warning/10 p-3 text-sm text-udec-accent">
        {errorModelo
          ? `No se pudo verificar el esquema de estados: ${errorModelo}`
          : "Los cambios de estado estan bloqueados hasta crear un respaldo y aplicar la migracion de roles por proyecto."}
      </p>
    );
  }
  if (destinos.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-lg font-semibold">Avance del proyecto</h2>
      <div className="space-y-2">
        <Label htmlFor={`estado-destino-${proyectoId}`}>Siguiente estado</Label>
        <Select
          id={`estado-destino-${proyectoId}`}
          value={estadoDestino}
          onChange={(event) => setEstadoDestino(event.target.value)}
        >
          {destinos.map((destino) => (
            <option key={destino.codigo} value={destino.codigo}>
              {destino.etiqueta}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`estado-observacion-${proyectoId}`}>
          Nota del cambio (opcional)
        </Label>
        <Textarea
          id={`estado-observacion-${proyectoId}`}
          maxLength={2000}
          rows={2}
          value={observacion}
          onChange={(event) => setObservacion(event.target.value)}
        />
      </div>
      {cambio.data?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {cambio.data.error.message}
        </p>
      ) : null}
      {cambio.error ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudo registrar el cambio de estado: {cambio.error.message}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={cambio.isPending || !estadoDestino}
        onClick={() => cambio.mutate()}
      >
        {cambio.isPending ? "Guardando..." : "Actualizar estado"}
      </Button>
    </section>
  );
}
