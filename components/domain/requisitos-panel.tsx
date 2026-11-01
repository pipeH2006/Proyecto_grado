"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  listarRequisitosProyecto,
  registrarDocumentoRequisito,
  verificarRequisito,
} from "@/actions/requisitos";
import { DocumentoBoton } from "@/components/domain/documento-boton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hashArchivo } from "@/lib/hash";
import { queryKeys } from "@/lib/queryKeys";
import { createClient } from "@/lib/supabase/client";
import type { RequisitoVista } from "@/lib/types/requisitos";
import {
  MAX_ANTEPROYECTO_BYTES,
  TIPOS_ANTEPROYECTO,
} from "@/lib/validations/proyecto";

const MAX_MB = Math.round(MAX_ANTEPROYECTO_BYTES / (1024 * 1024));

const ESTADO_CLASES: Record<string, string> = {
  PENDIENTE: "bg-secondary text-foreground",
  ENTREGADO: "bg-udec-info/10 text-udec-accent",
  APROBADO: "bg-udec-success/10 text-udec-accent",
  RECHAZADO: "bg-destructive/10 text-destructive",
};

type Rol = "estudiante" | "gestor";

export function RequisitosPanel({
  proyectoId,
  rol,
  requisitosIniciales,
}: {
  proyectoId: number;
  rol: Rol;
  requisitosIniciales: RequisitoVista[];
}) {
  const queryClient = useQueryClient();

  const { data: requisitos } = useQuery({
    queryKey: queryKeys.requisitos.porProyecto(proyectoId),
    queryFn: async () => {
      const result = await listarRequisitosProyecto(proyectoId);
      return result.data ?? [];
    },
    initialData: requisitosIniciales,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.requisitos.porProyecto(proyectoId),
    });

  if (requisitos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este proyecto no tiene requisitos configurados para su modalidad.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {requisitos.map((requisito) => (
        <RequisitoItem
          key={requisito.proyecto_requisito_id}
          proyectoId={proyectoId}
          requisito={requisito}
          rol={rol}
          onChanged={() => void invalidar()}
        />
      ))}
    </ul>
  );
}

function RequisitoItem({
  proyectoId,
  requisito,
  rol,
  onChanged,
}: {
  proyectoId: number;
  requisito: RequisitoVista;
  rol: Rol;
  onChanged: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [observacion, setObservacion] = useState("");

  const subir = useMutation({
    mutationFn: async (seleccionado: File) => {
      const supabase = createClient();
      const ruta = `proyectos/${proyectoId}/requisitos/${crypto.randomUUID()}.pdf`;
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

      return registrarDocumentoRequisito({
        proyecto_id: proyectoId,
        proyecto_requisito_id: requisito.proyecto_requisito_id,
        storage_path: ruta,
        nombre_original: seleccionado.name,
        mime_type: seleccionado.type || "application/pdf",
        tamano_bytes: seleccionado.size,
        hash_sha256: hash,
      });
    },
    onSuccess: (result) => {
      if (result.error) return;
      onChanged();
      setArchivo(null);
      setErrorArchivo(null);
      setInputKey((clave) => clave + 1);
    },
  });

  const verificar = useMutation({
    mutationFn: (estado: "APROBADO" | "RECHAZADO") =>
      verificarRequisito({
        proyecto_requisito_id: requisito.proyecto_requisito_id,
        estado_codigo: estado,
        observacion: observacion.trim() || undefined,
      }),
    onSuccess: (result) => {
      if (result.error) return;
      onChanged();
      setObservacion("");
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
    if (seleccionado && seleccionado.size === 0) {
      setErrorArchivo("El archivo está vacío. Selecciona un PDF con contenido.");
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

  const errorSubida =
    subir.error?.message ?? subir.data?.error?.message ?? errorArchivo;
  const errorVerificacion =
    verificar.error?.message ?? verificar.data?.error?.message;
  const ultimaVersion = requisito.documentos.at(-1);

  return (
    <li className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {requisito.requisito_nombre}
            {requisito.obligatorio ? null : (
              <span className="ml-2 text-xs text-muted-foreground">(opcional)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{requisito.etapa}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            ESTADO_CLASES[requisito.estado_codigo] ?? ESTADO_CLASES.PENDIENTE
          }`}
        >
          {requisito.estado_nombre}
        </span>
      </div>

      {requisito.observacion ? (
        <p className="text-sm text-muted-foreground">
          {requisito.observacion}
        </p>
      ) : null}

      {requisito.documentos.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2">
          {requisito.documentos.map((documento) => (
            <li key={documento.id} className="flex items-center gap-1">
              <DocumentoBoton documento={documento} />
              <span
                className="text-xs text-muted-foreground"
                title={documento.hash_sha256 ?? "sin hash"}
              >
                v{documento.version}
                {documento.hash_sha256
                  ? ` · ${documento.hash_sha256.slice(0, 10)}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sin documentos cargados.</p>
      )}

      {rol === "estudiante" ? (
        <div className="space-y-2">
          <Label htmlFor={`pdf-${requisito.proyecto_requisito_id}`}>
            {requisito.documentos.length > 0
              ? "Cargar nueva version (PDF)"
              : "Documento (PDF)"}
          </Label>
          <Input
            key={inputKey}
            id={`pdf-${requisito.proyecto_requisito_id}`}
            type="file"
            accept="application/pdf"
            onChange={onArchivoSeleccionado}
          />
          {errorSubida ? (
            <p className="text-sm text-destructive">{errorSubida}</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!archivo || subir.isPending}
            onClick={() => archivo && subir.mutate(archivo)}
          >
            {subir.isPending ? "Subiendo..." : "Cargar documento"}
          </Button>
        </div>
      ) : null}

      {rol === "gestor" ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Observacion de la verificacion (opcional)"
            value={observacion}
            onChange={(event) => setObservacion(event.target.value)}
            rows={2}
          />
          {errorVerificacion ? (
            <p className="text-sm text-destructive">{errorVerificacion}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={verificar.isPending || !ultimaVersion}
              onClick={() => verificar.mutate("APROBADO")}
            >
              Aprobar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={verificar.isPending}
              onClick={() => verificar.mutate("RECHAZADO")}
            >
              Rechazar
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
