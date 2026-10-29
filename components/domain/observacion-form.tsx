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
  crearObservacionSchema,
  severidades,
  type CrearObservacionInput,
} from "@/lib/validations/observacion";

const SEVERIDAD_LABEL: Record<(typeof severidades)[number], string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export function ObservacionForm({
  proyectoId,
  rondaId,
  asignacionId,
}: {
  proyectoId: number;
  rondaId: number;
  asignacionId: number;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearObservacionInput>({
    resolver: zodResolver(crearObservacionSchema),
    defaultValues: {
      proyecto_id: proyectoId,
      ronda_id: rondaId,
      asignacion_id: asignacionId,
      texto: "",
      severidad: "media",
    },
  });

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
      className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-800"
    >
      <h3 className="text-sm font-semibold">Nueva observacion</h3>

      <div className="space-y-2">
        <Label htmlFor="texto">Observacion</Label>
        <Textarea id="texto" rows={4} {...register("texto")} />
        {errors.texto ? (
          <p className="text-sm text-red-600">{errors.texto.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="severidad">Severidad</Label>
        <Select id="severidad" {...register("severidad")}>
          {severidades.map((s) => (
            <option key={s} value={s}>
              {SEVERIDAD_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {mutation.data?.error ? (
        <p className="text-sm text-red-600">{mutation.data.error.message}</p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : "Agregar observacion"}
      </Button>
    </form>
  );
}
