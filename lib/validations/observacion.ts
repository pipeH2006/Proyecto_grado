import { z } from "zod";

export const severidades = ["baja", "media", "alta"] as const;

export const estadosObservacion = [
  "pendiente",
  "en_correccion",
  "solucionada",
  "no_aplica",
] as const;

export const crearObservacionSchema = z.object({
  proyecto_id: z.number().int().positive(),
  ronda_id: z.number().int().positive(),
  asignacion_id: z.number().int().positive(),
  texto: z.string().min(10, "Minimo 10 caracteres").max(5000),
  severidad: z.enum(severidades).default("media"),
});

// Evidencia (RF-07): solo PDFs y con un tope que quepa en una subida normal.
export const TIPOS_EVIDENCIA = ["application/pdf"] as const;
export const MAX_EVIDENCIA_BYTES = 20 * 1024 * 1024;
export const MAX_EVIDENCIAS = 10;

// El archivo ya subido a Storage; el servidor valida estos datos y comprueba
// ademas que storage_path pertenece al proyecto de la observacion.
export const documentoEvidenciaSchema = z.object({
  storage_path: z.string().min(1).max(1024),
  nombre_original: z.string().min(1).max(255),
  mime_type: z.string().max(150).nullable(),
  tamano_bytes: z.number().int().nonnegative().max(MAX_EVIDENCIA_BYTES).nullable(),
});

export const responderObservacionSchema = z.object({
  observacion_id: z.number().int().positive(),
  texto: z.string().min(10, "Minimo 10 caracteres").max(5000),
  documentos: z.array(documentoEvidenciaSchema).max(MAX_EVIDENCIAS).default([]),
});

export const cambiarEstadoObservacionSchema = z.object({
  observacion_id: z.number().int().positive(),
  estado: z.enum(estadosObservacion),
});

export type CrearObservacionInput = z.infer<typeof crearObservacionSchema>;
export type ResponderObservacionInput = z.infer<
  typeof responderObservacionSchema
>;
export type CambiarEstadoObservacionInput = z.infer<
  typeof cambiarEstadoObservacionSchema
>;
