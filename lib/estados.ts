export const ESTADO_PROYECTO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  RADICADO: "Radicado",
  EN_REVISION: "En revision",
  APROBADO: "Aprobado",
  EN_DESARROLLO: "En desarrollo",
  SUSTENTADO: "Sustentado",
  FINALIZADO: "Finalizado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
};

export function estadoLabel(codigo: string): string {
  return ESTADO_PROYECTO_LABEL[codigo] ?? codigo;
}
