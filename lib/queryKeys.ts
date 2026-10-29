export const queryKeys = {
  proyectos: {
    all: ["proyectos"] as const,
    detail: (id: number) => ["proyectos", id] as const,
    busqueda: (consulta: string, programa: number | null) =>
      ["proyectos", "busqueda", consulta, programa] as const,
  },
  observaciones: {
    all: ["observaciones"] as const,
    porProyecto: (proyectoId: number) =>
      ["observaciones", { proyectoId }] as const,
  },
  documentos: {
    all: ["documentos"] as const,
    porProyecto: (proyectoId: number) =>
      ["documentos", { proyectoId }] as const,
  },
  rondas: {
    all: ["rondas"] as const,
    porProyecto: (proyectoId: number) => ["rondas", { proyectoId }] as const,
  },
  asignaciones: {
    all: ["asignaciones"] as const,
    porProyecto: (proyectoId: number) =>
      ["asignaciones", { proyectoId }] as const,
  },
  requisitos: {
    all: ["requisitos"] as const,
    porProyecto: (proyectoId: number) =>
      ["requisitos", { proyectoId }] as const,
  },
  persona: {
    all: ["persona"] as const,
    detail: (id: string) => ["persona", id] as const,
    busqueda: (consulta: string) => ["persona", "busqueda", consulta] as const,
  },
  permisos: {
    all: ["permisos"] as const,
    matriz: ["permisos", "matriz"] as const,
  },
  tesauro: {
    all: ["tesauro"] as const,
    porPrograma: (programaId: number | null) =>
      ["tesauro", { programaId }] as const,
  },
} as const;
