export type PeriodoAcademico = { anio: number; semestre: number };

/** Etiqueta del periodo tal como se muestra en la app: "2024-2". */
export function etiquetaPeriodo(periodo: PeriodoAcademico): string {
  return `${periodo.anio}-${periodo.semestre}`;
}
