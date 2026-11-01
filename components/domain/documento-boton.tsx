"use client";

import { useState } from "react";
import { urlDocumento } from "@/actions/observaciones";
import { Button } from "@/components/ui/button";
import type { DocumentoVista } from "@/lib/types/observaciones";

function formatearTamano(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentoBoton({ documento }: { documento: DocumentoVista }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setCargando(true);
    setError(null);

    // Se abre la pestana antes del await: abrirla despues la bloquearia el
    // navegador por no venir de un gesto del usuario.
    const ventana = window.open("about:blank", "_blank");
    if (ventana) ventana.opener = null;

    const result = await urlDocumento(documento.id);
    setCargando(false);

    if (result.error || !result.data) {
      ventana?.close();
      setError(result.error?.message ?? "No se pudo abrir la evidencia");
      return;
    }

    if (ventana) ventana.location.href = result.data.url;
    else window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  const tamano = formatearTamano(documento.tamano_bytes);

  if (documento.tamano_bytes === 0) {
    return (
      <span className="inline-flex flex-col gap-1">
        <span className="text-sm font-medium">
          {documento.nombre_original} ({tamano})
        </span>
        <span className="text-xs text-destructive">
          El archivo está vacío. Vuelve a subir el PDF con contenido.
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={cargando}
        onClick={() => void abrir()}
      >
        {cargando ? "Abriendo..." : documento.nombre_original}
        {tamano ? (
          <span className="text-xs text-muted-foreground">({tamano})</span>
        ) : null}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
