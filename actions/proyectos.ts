"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { Tables } from "@/lib/types/database";
import type { DocumentoVista } from "@/lib/types/observaciones";
import {
  crearProyectoSchema,
  documentoAnteproyectoSchema,
} from "@/lib/validations/proyecto";

const COLUMNAS_DOCUMENTO_PROYECTO =
  "id, nombre_original, mime_type, tamano_bytes";

function aDocumentoVista(documento: {
  id: number;
  nombre_original: string;
  mime_type: string | null;
  tamano_bytes: number | null;
}): DocumentoVista {
  return {
    id: documento.id,
    nombre_original: documento.nombre_original,
    mime_type: documento.mime_type,
    tamano_bytes: documento.tamano_bytes,
  };
}

export async function crearProyecto(
  input: unknown,
): Promise<ActionResult<Tables<"proyectos">>> {
  const parsed = crearProyectoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: "Datos invalidos",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "No autenticado" } };
  }

  const { data: personaId } = await supabase.rpc("persona_actual");
  if (!personaId) {
    return { data: null, error: { message: "No existe persona para el usuario" } };
  }

  const { data: oferta } = await supabase
    .from("programa_sede")
    .select("programa_id")
    .eq("programa_id", parsed.data.programa_id)
    .eq("sede_id", parsed.data.sede_id)
    .eq("activa", true)
    .maybeSingle();
  if (!oferta) {
    return {
      data: null,
      error: { message: "El programa no se ofrece en la sede seleccionada" },
    };
  }

  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      titulo: parsed.data.titulo,
      resumen: parsed.data.resumen ?? null,
      programa_id: parsed.data.programa_id,
      sede_id: parsed.data.sede_id,
      palabras_clave: parsed.data.palabras_clave ?? [],
      modalidad_id: parsed.data.modalidad_id,
      periodo_id: parsed.data.periodo_id,
      fecha_sustentacion: parsed.data.fecha_sustentacion ?? null,
      fecha_finalizacion: parsed.data.fecha_finalizacion ?? null,
      creado_por: personaId,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data, error: null };
}

/**
 * Documento principal (tipo 'anteproyecto') de un proyecto, ordenado por fecha.
 * La RLS de documentos solo devuelve lo que el usuario puede ver.
 */
export async function listarDocumentosProyecto(
  proyectoId: number,
): Promise<ActionResult<DocumentoVista[]>> {
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) {
    return { data: null, error: { message: "Proyecto invalido" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select(COLUMNAS_DOCUMENTO_PROYECTO)
    .eq("proyecto_id", proyectoId)
    .eq("tipo", "anteproyecto")
    .order("creado_en", { ascending: true });

  if (error) return { data: null, error: { message: error.message } };
  return { data: (data ?? []).map(aDocumentoVista), error: null };
}

/**
 * RF-01. Registra los metadatos del PDF del anteproyecto ya subido al Storage
 * por el navegador. La ruta debe vivir bajo el prefijo del proyecto para no
 * registrar rutas de otros proyectos (o de nadie).
 */
export async function registrarDocumentoAnteproyecto(
  input: unknown,
): Promise<ActionResult<DocumentoVista>> {
  const parsed = documentoAnteproyectoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: "Datos invalidos",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "No autenticado" } };

  const { data: personaId } = await supabase.rpc("persona_actual");
  if (!personaId) {
    return { data: null, error: { message: "No existe persona para el usuario" } };
  }

  const [{ data: esAutor }, { data: esGestor }] = await Promise.all([
    supabase.rpc("es_autor", { p_proyecto: parsed.data.proyecto_id }),
    supabase.rpc("tiene_permiso", { p_codigo: "documento.gestionar" }),
  ]);
  if (!esAutor && !esGestor) {
    return {
      data: null,
      error: { message: "Solo el autor del anteproyecto puede cargarlo" },
    };
  }

  const prefijo = `proyectos/${parsed.data.proyecto_id}/anteproyecto/`;
  if (!parsed.data.storage_path.startsWith(prefijo)) {
    return {
      data: null,
      error: { message: "Documento invalido: la ruta no pertenece al proyecto" },
    };
  }

  const { data: requisitoId } = await supabase.rpc(
    "proyecto_requisito_anteproyecto",
    { p_proyecto: parsed.data.proyecto_id },
  );

  let version = 1;
  if (requisitoId) {
    const { data: ultima } = await supabase
      .from("documentos")
      .select("version")
      .eq("proyecto_requisito_id", requisitoId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    version = (ultima?.version ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      proyecto_id: parsed.data.proyecto_id,
      tipo: "anteproyecto",
      storage_bucket: "documentos",
      storage_path: parsed.data.storage_path,
      nombre_original: parsed.data.nombre_original,
      mime_type: parsed.data.mime_type,
      tamano_bytes: parsed.data.tamano_bytes,
      hash_sha256: parsed.data.hash_sha256 ?? null,
      version,
      proyecto_requisito_id: requisitoId ?? null,
      subido_por: personaId,
    })
    .select(COLUMNAS_DOCUMENTO_PROYECTO)
    .single();

  if (error) return { data: null, error: { message: error.message } };

  if (requisitoId) {
    const { data: entregado } = await supabase
      .from("estado_cumplimiento")
      .select("id")
      .eq("codigo", "ENTREGADO")
      .single();
    if (entregado) {
      await supabase
        .from("proyecto_requisito")
        .update({
          estado_cumplimiento_id: entregado.id,
          fecha_cumplimiento: new Date().toISOString().slice(0, 10),
        })
        .eq("id", requisitoId);
    }
  }

  return { data: aDocumentoVista(data), error: null };
}
