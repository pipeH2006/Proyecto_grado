import type { ReactNode } from "react";
import { DocumentoBoton } from "@/components/domain/documento-boton";
import {
  EstadoBadge,
  SeveridadBadge,
} from "@/components/domain/estado-badge";
import type { ObservacionVista } from "@/lib/types/observaciones";

export function ObservacionCard({
  observacion,
  acciones,
  respuestaForm,
}: {
  observacion: ObservacionVista;
  acciones?: ReactNode;
  respuestaForm?: ReactNode;
}) {
  // Fecha determinista (evita desajustes de hidratacion por locale/zona).
  const fecha = observacion.creada_en.slice(0, 10);

  return (
    <article className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <EstadoBadge estado={observacion.estado} />
        <SeveridadBadge severidad={observacion.severidad} />
        <span className="text-xs text-slate-500">{fecha}</span>
      </div>
      <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
        {observacion.texto}
      </p>

      {observacion.respuestas.length > 0 ? (
        <ul className="space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
          {observacion.respuestas.map((respuesta) => (
            <li key={respuesta.id} className="space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Respuesta · {respuesta.creada_en.slice(0, 10)}
              </span>
              <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
                {respuesta.texto}
              </p>
              {respuesta.documentos.length > 0 ? (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {respuesta.documentos.map((documento) => (
                    <li key={documento.id}>
                      <DocumentoBoton documento={documento} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {respuestaForm ? <div className="pt-1">{respuestaForm}</div> : null}

      {acciones ? (
        <div className="flex flex-wrap gap-2 pt-1">{acciones}</div>
      ) : null}
    </article>
  );
}
