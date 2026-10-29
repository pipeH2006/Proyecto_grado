import { z } from "zod";

export const asignarRolSchema = z.object({
  persona_id: z.string().uuid("Persona invalida"),
  rol_codigo: z.string().min(1, "Rol requerido").max(30),
});

export const quitarRolSchema = asignarRolSchema;

export const alternarPermisoSchema = z.object({
  rol_codigo: z.string().min(1, "Rol requerido").max(30),
  permiso_codigo: z.string().min(1, "Permiso requerido").max(60),
  activo: z.boolean(),
});

export const asignarParticipacionSchema = z.object({
  proyecto_id: z.number().int().positive(),
  persona_id: z.string().uuid("Persona invalida"),
  rol_participacion_id: z.number().int().positive(),
});
