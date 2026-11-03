export const AMBITOS_OBSERVACION = [
  "GENERAL",
  "DISCIPLINAR",
  "METODOLOGICO",
] as const;

export type AmbitoObservacion = (typeof AMBITOS_OBSERVACION)[number];

export const AMBITO_POR_ROL_PARTICIPACION: Record<string, AmbitoObservacion> = {
  DIRECTOR: "GENERAL",
  CODIRECTOR: "GENERAL",
  EVALUADOR: "GENERAL",
  DIRECTOR_DISCIPLINAR: "DISCIPLINAR",
  DIRECTOR_METODOLOGICO: "METODOLOGICO",
  JURADO: "GENERAL",
};

export const ROLES_QUE_RESUELVEN_OBSERVACIONES: ReadonlySet<string> = new Set([
  "DIRECTOR",
  "CODIRECTOR",
  "EVALUADOR",
  "JURADO",
]);

export const ROLES_QUE_REABREN_OBSERVACIONES: ReadonlySet<string> = new Set([
  "EVALUADOR",
]);
