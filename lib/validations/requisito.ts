import { z } from "zod";
import { MAX_ANTEPROYECTO_BYTES } from "@/lib/validations/proyecto";

export const registrarDocumentoRequisitoSchema = z.object({
  proyecto_id: z.number().int().positive(),
  proyecto_requisito_id: z.number().int().positive(),
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
    .nullable(),
});

export const verificarRequisitoSchema = z.object({
  proyecto_requisito_id: z.number().int().positive(),
  estado_codigo: z.enum(["APROBADO", "RECHAZADO"]),
  observacion: z.string().max(2000).optional(),
});

export type RegistrarDocumentoRequisitoInput = z.infer<
  typeof registrarDocumentoRequisitoSchema
>;
export type VerificarRequisitoInput = z.infer<typeof verificarRequisitoSchema>;
