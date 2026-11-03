"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { crearObservacion } from "@/actions/observaciones";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/queryKeys";
import {
  AMBITOS_OBSERVACION,
  AMBITO_POR_ROL_PARTICIPACION,
} from "@/lib/roles-participacion";
import {
  crearObservacionSchema,
  severidades,
  type CrearObservacionInput,
} from "@/lib/validations/observacion";

const SEVERIDAD_LABEL: Record<(typeof severidades)[number], string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

const AMBITO_LABEL = {
  GENERAL: "General",
  DISCIPLINAR: "Disciplinar",
  METODOLOGICO: "Metodológico",
} as const;

export type AsignacionObservacion = {
  id: number;
  rol_codigo: string;
  rol_nombre: string;
};

export function ObservacionForm({
  proyectoId,
  proyectoRequisitoId,
  requisitoNombre,
  rondaId,
  asignaciones,
}: {
  proyectoId: number;
  proyectoRequisitoId: number;
  requisitoNombre: string;
  rondaId?: number;
  asignaciones: AsignacionObservacion[];
}) {
  const queryClient = useQueryClient();
  const primeraAsignacion = asignaciones[0];
  const campoAmbito = `ambito-${proyectoRequisitoId}`;
  const campoTexto = `texto-${proyectoRequisitoId}`;
  const campoSeveridad = `severidad-${proyectoRequisitoId}`;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearObservacionInput>({
    resolver: zodResolver(crearObservacionSchema),
    defaultValues: {
      proyecto_id: proyectoId,
      proyecto_requisito_id: proyectoRequisitoId,
      ronda_id: rondaId ?? null,
      asignacion_id: primeraAsignacion?.id ?? 0,
      ambito:
        AMBITO_POR_ROL_PARTICIPACION[primeraAsignacion?.rol_codigo ?? ""] ??
        "GENERAL",
      texto: "",
      severidad: "media",
    },
  });
  const asignacionField = register("asignacion_id", { valueAsNumber: true });

  const mutation = useMutation({
    mutationFn: (values: CrearObservacionInput) => crearObservacion(values),
    onSuccess: (result) => {
      if (result.error) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.observaciones.porProyecto(proyectoId),
      });
      reset();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-3 rounded-md border border-border p-4"
    >
      <h3 className="text-sm font-semibold">
        Observacion para: {requisitoNombre}
      </h3>

      {asignaciones.length > 1 ? (
        <div className="space-y-2">
          <Label htmlFor="rol-participacion">Actuar como</Label>
          <Select
            id="rol-participacion"
            {...asignacionField}
          >
            {asignaciones.map((asignacion) => (
              <option key={asignacion.id} value={asignacion.id}>
                {asignacion.rol_nombre}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={campoAmbito}>Ámbito de la observación</Label>
        <Select id={campoAmbito} {...register("ambito")}>
          {AMBITOS_OBSERVACION.map((ambito) => (
            <option key={ambito} value={ambito}>
              {AMBITO_LABEL[ambito]}
            </option>
          ))}
        </Select>
        {errors.ambito ? (
          <p className="text-sm text-destructive">{errors.ambito.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={campoTexto}>Observacion</Label>
        <Textarea id={campoTexto} rows={4} {...register("texto")} />
        {errors.texto ? (
          <p className="text-sm text-destructive">{errors.texto.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={campoSeveridad}>Severidad</Label>
        <Select id={campoSeveridad} {...register("severidad")}>
          {severidades.map((s) => (
            <option key={s} value={s}>
              {SEVERIDAD_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {mutation.data?.error ? (
        <p className="text-sm text-destructive">{mutation.data.error.message}</p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : "Agregar observacion"}
      </Button>
    </form>
  );
}
