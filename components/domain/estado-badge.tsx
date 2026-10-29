import type { EstadoObservacion, Severidad } from "@/lib/types/observaciones";
import { cn } from "@/lib/utils";

export type { EstadoObservacion, Severidad };

const ESTADO_LABEL: Record<EstadoObservacion, string> = {
  pendiente: "Pendiente",
  en_correccion: "En correccion",
  solucionada: "Solucionada",
  no_aplica: "No aplica",
};

const ESTADO_ESTILO: Record<EstadoObservacion, string> = {
  pendiente:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  en_correccion:
    "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  solucionada:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  no_aplica: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const SEVERIDAD_LABEL: Record<Severidad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

const SEVERIDAD_ESTILO: Record<Severidad, string> = {
  baja: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  media: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  alta: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function EstadoBadge({
  estado,
  className,
}: {
  estado: EstadoObservacion;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-medium",
        ESTADO_ESTILO[estado],
        className,
      )}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}

export function SeveridadBadge({ severidad }: { severidad: Severidad }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-medium",
        SEVERIDAD_ESTILO[severidad],
      )}
    >
      {SEVERIDAD_LABEL[severidad]}
    </span>
  );
}
