"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { responderObservacion } from "@/actions/observaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/queryKeys";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_EVIDENCIA_BYTES,
  MAX_EVIDENCIAS,
  TIPOS_EVIDENCIA,
  responderObservacionSchema,
  type ResponderObservacionInput,
} from "@/lib/validations/observacion";

const MAX_MB = Math.round(MAX_EVIDENCIA_BYTES / (1024 * 1024));

export function RespuestaForm({
  proyectoId,
  observacionId,
}: {
  proyectoId: number;
  observacionId: number;
}) {
  const queryClient = useQueryClient();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);
  // Remontar el input es la forma de limpiar los archivos ya enviados.
  const [inputKey, setInputKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResponderObservacionInput>({
    resolver: zodResolver(responderObservacionSchema),
    defaultValues: {
      observacion_id: observacionId,
      texto: "",
      documentos: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ResponderObservacionInput) => {
      // Subida directa al Storage desde el navegador: los PDFs no pasan por la
      // Server Action (que topa con el limite de tamano del cuerpo de request).
      const supabase = createClient();
      const documentos: {
        storage_path: string;
        nombre_original: string;
        mime_type: string | null;
        tamano_bytes: number | null;
      }[] = [];

      for (const archivo of archivos) {
        const ruta = `proyectos/${proyectoId}/${observacionId}/${crypto.randomUUID()}.pdf`;
        const { error } = await supabase.storage
          .from("documentos")
          .upload(ruta, archivo, {
            contentType: archivo.type || "application/pdf",
            upsert: false,
          });
        if (error) {
          throw new Error(`No se pudo subir ${archivo.name}: ${error.message}`);
        }
        documentos.push({
          storage_path: ruta,
          nombre_original: archivo.name,
          mime_type: archivo.type || "application/pdf",
          tamano_bytes: archivo.size,
        });
      }

      return responderObservacion({ ...values, documentos });
    },
    onSuccess: (result) => {
      if (result.error) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.observaciones.porProyecto(proyectoId),
      });
      reset();
      setArchivos([]);
      setErrorArchivos(null);
      setInputKey((clave) => clave + 1);
    },
  });

  function onArchivosSeleccionados(event: ChangeEvent<HTMLInputElement>) {
    const seleccion = Array.from(event.target.files ?? []);

    const noPdf = seleccion.find(
      (archivo) => !(TIPOS_EVIDENCIA as readonly string[]).includes(archivo.type),
    );
    if (noPdf) {
      setErrorArchivos("Solo se aceptan archivos PDF.");
      setArchivos([]);
      return;
    }

    const muyGrande = seleccion.find(
      (archivo) => archivo.size > MAX_EVIDENCIA_BYTES,
    );
    if (muyGrande) {
      setErrorArchivos(`Cada archivo debe pesar menos de ${MAX_MB} MB.`);
      setArchivos([]);
      return;
    }

    setErrorArchivos(null);
    setArchivos(seleccion.slice(0, MAX_EVIDENCIAS));
  }

  const error = mutation.error?.message ?? mutation.data?.error?.message;

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <h3 className="text-sm font-semibold">Responder observacion</h3>

      <div className="space-y-2">
        <Label htmlFor={`respuesta-${observacionId}`}>Respuesta</Label>
        <Textarea
          id={`respuesta-${observacionId}`}
          rows={3}
          placeholder="Describe el cambio realizado..."
          {...register("texto")}
        />
        {errors.texto ? (
          <p className="text-sm text-red-600">{errors.texto.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`evidencia-${observacionId}`}>
          Evidencia (PDF, opcional)
        </Label>
        <Input
          key={inputKey}
          id={`evidencia-${observacionId}`}
          type="file"
          accept="application/pdf"
          multiple
          onChange={onArchivosSeleccionados}
        />
        {errorArchivos ? (
          <p className="text-sm text-red-600">{errorArchivos}</p>
        ) : null}
        {archivos.length > 0 ? (
          <ul className="text-xs text-slate-500">
            {archivos.map((archivo) => (
              <li key={archivo.name}>{archivo.name}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" size="sm" disabled={mutation.isPending}>
        {mutation.isPending ? "Enviando..." : "Enviar respuesta"}
      </Button>
    </form>
  );
}
