import { z } from "zod";

export const MAX_PALABRAS_RESUMEN = 250;

export function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export const proyectoBaseSchema = z.object({
  titulo: z.string().min(5, "Minimo 5 caracteres").max(300),
  resumen: z
    .string()
    .min(20, "Minimo 20 caracteres")
    .max(5000)
    .refine((texto) => contarPalabras(texto) <= MAX_PALABRAS_RESUMEN, {
      message: `Maximo ${MAX_PALABRAS_RESUMEN} palabras`,
    })
    .optional(),
  programa_id: z.number().int().positive(),
  sede_id: z.number().int().positive("Selecciona una sede"),
  palabras_clave: z.array(z.string().min(2).max(50)).max(20).optional(),
  modalidad_id: z.number().int().positive("Selecciona una modalidad"),
  periodo_id: z.number().int().positive("Selecciona un periodo"),
  fecha_sustentacion: z.string().date().optional(),
  fecha_finalizacion: z.string().date().optional(),
});

export const crearProyectoSchema = proyectoBaseSchema;

export const actualizarProyectoSchema = proyectoBaseSchema.partial().extend({
  id: z.number().int().positive(),
});

// Anteproyecto (RF-01): PDF principal del proyecto. El archivo se sube directo a
// Storage desde el navegador; el servidor solo valida los metadatos y que la ruta
// pertenezca al proyecto.
export const TIPOS_ANTEPROYECTO = ["application/pdf"] as const;
export const MAX_ANTEPROYECTO_BYTES = 20 * 1024 * 1024;

export const documentoAnteproyectoSchema = z.object({
  proyecto_id: z.number().int().positive(),
  storage_path: z.string().min(1).max(1024),
  nombre_original: z.string().min(1).max(255),
  mime_type: z.string().max(150).nullable(),
  tamano_bytes: z
    .number()
    .int()
    .nonnegative()
    .max(MAX_ANTEPROYECTO_BYTES)
    .nullable(),
  hash_sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/, "Hash SHA-256 invalido")
    .nullable()
    .optional(),
});

export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>;
export type ActualizarProyectoInput = z.infer<typeof actualizarProyectoSchema>;
export type DocumentoAnteproyectoInput = z.infer<
  typeof documentoAnteproyectoSchema
>;
