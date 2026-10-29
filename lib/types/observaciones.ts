import type { estadosObservacion, severidades } from "@/lib/validations/observacion";

export type Severidad = (typeof severidades)[number];
export type EstadoObservacion = (typeof estadosObservacion)[number];

export type DocumentoVista = {
  id: number;
  nombre_original: string;
  mime_type: string | null;
  tamano_bytes: number | null;
};

export type RespuestaVista = {
  id: number;
  autor_id: string;
  texto: string;
  creada_en: string;
  documentos: DocumentoVista[];
};

export type ObservacionVista = {
  id: number;
  proyecto_id: number;
  ronda_id: number;
  texto: string;
  severidad: Severidad;
  estado: EstadoObservacion;
  creada_en: string;
  respuestas: RespuestaVista[];
};
