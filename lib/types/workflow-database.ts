import type { Database } from "@/lib/types/database";

type PublicDatabase = Database["public"];
type ObservationTable = PublicDatabase["Tables"]["observaciones"];
type RoundTable = PublicDatabase["Tables"]["rondas"];
type WorkflowPublicDatabase = Omit<PublicDatabase, "Tables" | "Functions"> & {
  Tables: Omit<PublicDatabase["Tables"], "observaciones" | "rondas"> & {
    observaciones: Omit<ObservationTable, "Row" | "Insert" | "Update"> & {
      Row: Omit<
        ObservationTable["Row"],
        "ronda_id" | "proyecto_requisito_id" | "ambito"
      > & {
        ronda_id: number | null;
        estado_proyecto_id: number;
        proyecto_requisito_id: number | null;
        ambito: "GENERAL" | "DISCIPLINAR" | "METODOLOGICO";
      };
      Insert: Omit<
        ObservationTable["Insert"],
        | "ronda_id"
        | "proyecto_requisito_id"
        | "estado_proyecto_id"
        | "ambito"
      > & {
        ronda_id?: number | null;
        estado_proyecto_id?: number;
        proyecto_requisito_id?: number | null;
        ambito?: "GENERAL" | "DISCIPLINAR" | "METODOLOGICO";
      };
      Update: Omit<
        ObservationTable["Update"],
        | "ronda_id"
        | "proyecto_requisito_id"
        | "estado_proyecto_id"
        | "ambito"
      > & {
        ronda_id?: number | null;
        estado_proyecto_id?: number;
        proyecto_requisito_id?: number | null;
        ambito?: "GENERAL" | "DISCIPLINAR" | "METODOLOGICO";
      };
    };
    rondas: Omit<RoundTable, "Row" | "Insert" | "Update"> & {
      Row: RoundTable["Row"] & {
        cerrada_por: string | null;
        dictamen: "APROBADO" | "REQUIERE_AJUSTES" | null;
        observacion_dictamen: string | null;
      };
      Insert: RoundTable["Insert"] & {
        cerrada_por?: string | null;
        dictamen?: "APROBADO" | "REQUIERE_AJUSTES" | null;
        observacion_dictamen?: string | null;
      };
      Update: RoundTable["Update"] & {
        cerrada_por?: string | null;
        dictamen?: "APROBADO" | "REQUIERE_AJUSTES" | null;
        observacion_dictamen?: string | null;
      };
    };
    solicitudes_sustentacion: {
      Row: {
        id: number;
        proyecto_id: number;
        solicitada_por: string;
        solicitada_en: string;
        confirmada_por: string | null;
        confirmada_en: string | null;
        estado: "PENDIENTE_DIRECTOR" | "PENDIENTE_JURADO" | "APROBADA" | "REQUIERE_AJUSTES";
      };
      Insert: {
        id?: never;
        proyecto_id: number;
        solicitada_por?: string;
        solicitada_en?: string;
        confirmada_por?: string | null;
        confirmada_en?: string | null;
        estado?: "PENDIENTE_DIRECTOR" | "PENDIENTE_JURADO" | "APROBADA" | "REQUIERE_AJUSTES";
      };
      Update: {
        id?: never;
        proyecto_id?: number;
        solicitada_por?: string;
        solicitada_en?: string;
        confirmada_por?: string | null;
        confirmada_en?: string | null;
        estado?: "PENDIENTE_DIRECTOR" | "PENDIENTE_JURADO" | "APROBADA" | "REQUIERE_AJUSTES";
      };
      Relationships: [];
    };
  };
  Functions: Omit<PublicDatabase["Functions"], "cerrar_ronda_sustentacion"> & {
    solicitar_sustentacion: {
      Args: { p_proyecto: number };
      Returns: number;
    };
    confirmar_solicitud_sustentacion: {
      Args: { p_solicitud: number };
      Returns: undefined;
    };
    abrir_ronda_sustentacion: {
      Args: { p_proyecto: number };
      Returns: number;
    };
    cerrar_ronda_sustentacion: {
      Args: {
        p_dictamen: "APROBADO" | "REQUIERE_AJUSTES";
        p_observacion: string | null;
        p_proyecto: number;
        p_ronda: number;
      };
      Returns: undefined;
    };
  };
};

export type WorkflowDatabase = Omit<Database, "public"> & {
  public: WorkflowPublicDatabase;
};
