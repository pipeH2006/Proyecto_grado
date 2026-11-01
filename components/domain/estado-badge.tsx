import type { EstadoObservacion, Severidad } from "@/lib/types/observaciones";
import { cn } from "@/lib/utils";

export type { EstadoObservacion, Severidad };

const ESTADO_LABEL: Record<EstadoObservacion, string> = {
  pendiente: "Pendiente",
  en_correccion: "En corrección",
  solucionada: "Solucionada",
  no_aplica: "No aplica",
};

const ESTADO_ESTILO: Record<EstadoObservacion, string> = {
  pendiente: "bg-udec-warning/20 text-udec-accent",
  en_correccion: "bg-udec-info/10 text-udec-accent",
  solucionada: "bg-udec-success/10 text-udec-accent",
  no_aplica: "bg-secondary text-foreground",
};

const SEVERIDAD_LABEL: Record<Severidad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

const SEVERIDAD_ESTILO: Record<Severidad, string> = {
  baja: "bg-secondary text-muted-foreground",
  media: "bg-secondary text-udec-accent",
  alta: "bg-destructive/10 text-destructive",
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
