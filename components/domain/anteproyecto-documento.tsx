"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  listarDocumentosProyecto,
  registrarDocumentoAnteproyecto,
} from "@/actions/proyectos";
import { DocumentoBoton } from "@/components/domain/documento-boton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hashArchivo } from "@/lib/hash";
import { queryKeys } from "@/lib/queryKeys";
import { createClient } from "@/lib/supabase/client";
import type { DocumentoVista } from "@/lib/types/observaciones";
import {
  MAX_ANTEPROYECTO_BYTES,
  TIPOS_ANTEPROYECTO,
} from "@/lib/validations/proyecto";

const MAX_MB = Math.round(MAX_ANTEPROYECTO_BYTES / (1024 * 1024));

export function AnteproyectoDocumento({
  proyectoId,
  documentosIniciales,
  puedeEditar,
}: {
  proyectoId: number;
  documentosIniciales: DocumentoVista[];
  puedeEditar: boolean;
}) {
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  // Remontar el input es la forma de limpiar el archivo ya enviado.
  const [inputKey, setInputKey] = useState(0);

  const { data: documentos } = useQuery({
    queryKey: queryKeys.documentos.porProyecto(proyectoId),
    queryFn: async () => {
      const result = await listarDocumentosProyecto(proyectoId);
      return result.data ?? [];
    },
    initialData: documentosIniciales,
  });

  const mutation = useMutation({
    mutationFn: async (seleccionado: File) => {
      // Subida directa al Storage desde el navegador: los PDFs no pasan por la
      // Server Action (que topa con el limite de tamano del cuerpo de request).
      const supabase = createClient();
      const ruta = `proyectos/${proyectoId}/anteproyecto/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage
        .from("documentos")
        .upload(ruta, seleccionado, {
          contentType: seleccionado.type || "application/pdf",
          upsert: false,
        });
      if (error) {
        throw new Error(`No se pudo subir ${seleccionado.name}: ${error.message}`);
      }

      const hash = await hashArchivo(seleccionado);

      return registrarDocumentoAnteproyecto({
        proyecto_id: proyectoId,
        storage_path: ruta,
        nombre_original: seleccionado.name,
        mime_type: seleccionado.type || "application/pdf",
        tamano_bytes: seleccionado.size,
        hash_sha256: hash,
      });
    },
    onSuccess: (result) => {
      if (result.error) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documentos.porProyecto(proyectoId),
      });
      setArchivo(null);
      setErrorArchivo(null);
      setInputKey((clave) => clave + 1);
    },
  });

  function onArchivoSeleccionado(event: ChangeEvent<HTMLInputElement>) {
    const seleccionado = event.target.files?.[0] ?? null;

    if (
      seleccionado &&
      !(TIPOS_ANTEPROYECTO as readonly string[]).includes(seleccionado.type)
    ) {
      setErrorArchivo("Solo se aceptan archivos PDF.");
      setArchivo(null);
      return;
    }

    if (seleccionado && seleccionado.size > MAX_ANTEPROYECTO_BYTES) {
      setErrorArchivo(`El archivo debe pesar menos de ${MAX_MB} MB.`);
      setArchivo(null);
      return;
    }

    setErrorArchivo(null);
    setArchivo(seleccionado);
  }

  const error = mutation.error?.message ?? mutation.data?.error?.message;

  return (
    <div className="space-y-3">
      {documentos.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {documentos.map((documento) => (
            <li key={documento.id}>
              <DocumentoBoton documento={documento} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Aun no has cargado el documento del anteproyecto.
        </p>
      )}

      {puedeEditar ? (
        <div className="space-y-2">
          <Label htmlFor="anteproyecto-pdf">
            {documentos.length > 0 ? "Adjuntar otra version (PDF)" : "Documento (PDF)"}
          </Label>
          <Input
            key={inputKey}
            id="anteproyecto-pdf"
            type="file"
            accept="application/pdf"
            onChange={onArchivoSeleccionado}
          />
          {errorArchivo ? (
            <p className="text-sm text-red-600">{errorArchivo}</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            type="button"
            size="sm"
            disabled={!archivo || mutation.isPending}
            onClick={() => archivo && mutation.mutate(archivo)}
          >
            {mutation.isPending ? "Subiendo..." : "Subir documento"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
