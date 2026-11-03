"use server";

import { createWorkflowClient } from "@/lib/supabase/workflow-server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type {
  DocumentoVista,
  ObservacionVista,
  RespuestaVista,
} from "@/lib/types/observaciones";
import {
  cambiarEstadoObservacionSchema,
  crearObservacionSchema,
  responderObservacionSchema,
} from "@/lib/validations/observacion";
import { AMBITO_POR_ROL_PARTICIPACION } from "@/lib/roles-participacion";
import { rolesActuales } from "@/lib/auth";
import { vigenteHoy } from "@/lib/utils";
import { modeloRolesProyectoDisponible } from "@/lib/schema-features";
import { estadoLabel } from "@/lib/estados";

export type { ObservacionVista, RespuestaVista } from "@/lib/types/observaciones";

const COLUMNAS_OBSERVACION =
  "id, proyecto_id, proyecto_requisito_id, ronda_id, asignacion_id, estado_proyecto_id, ambito, texto, severidad, estado, creada_en";
const COLUMNAS_RESPUESTA = "id, observacion_id, autor_id, texto, creada_en";
const COLUMNAS_DOCUMENTO =
  "id, respuesta_id, nombre_original, mime_type, tamano_bytes";

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

/**
 * Hilo completo de un proyecto: observaciones con sus respuestas y la evidencia
 * adjunta. Son tres consultas planas (sin embeds) porque los tipos generados son
 * provisionales; el ensamblado se hace aqui, no en cada pagina.
 */
export async function listarHilo(
  proyectoId: number,
): Promise<ActionResult<ObservacionVista[]>> {
  const supabase = await createWorkflowClient();

  const { data: observaciones, error: errorObservaciones } = await supabase
    .from("observaciones")
    .select(COLUMNAS_OBSERVACION)
    .eq("proyecto_id", proyectoId)
    .order("creada_en", { ascending: true });

  if (errorObservaciones) {
    return { data: null, error: { message: errorObservaciones.message } };
  }

  const ids = (observaciones ?? []).map((observacion) => observacion.id);

  let respuestas: {
    id: number;
    observacion_id: number;
    autor_id: string;
    texto: string;
    creada_en: string;
  }[] = [];

  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("respuestas_observacion")
      .select(COLUMNAS_RESPUESTA)
      .in("observacion_id", ids)
      .order("creada_en", { ascending: true });

    if (error) return { data: null, error: { message: error.message } };
    respuestas = data ?? [];
  }

  const { data: documentos, error: errorDocumentos } = await supabase
    .from("documentos")
    .select(COLUMNAS_DOCUMENTO)
    .eq("proyecto_id", proyectoId)
    .order("creado_en", { ascending: true });

  if (errorDocumentos) {
    return { data: null, error: { message: errorDocumentos.message } };
  }

  const documentosPorRespuesta = new Map<number, DocumentoVista[]>();
  for (const documento of documentos ?? []) {
    if (documento.respuesta_id === null) continue;
    const lista = documentosPorRespuesta.get(documento.respuesta_id) ?? [];
    lista.push(aDocumentoVista(documento));
    documentosPorRespuesta.set(documento.respuesta_id, lista);
  }

  const etapaPorEstado = new Map<number, { codigo: string; etiqueta: string }>();
  if (ids.length > 0) {
    const estadoIds = [
      ...new Set(
        (observaciones ?? []).map(
          (observacion) => observacion.estado_proyecto_id,
        ),
      ),
    ];
    const { data: estados, error: errorEstados } = await supabase
      .from("estado")
      .select("id, codigo")
      .in("id", estadoIds);
    if (errorEstados) {
      return { data: null, error: { message: errorEstados.message } };
    }
    for (const estado of estados ?? []) {
      etapaPorEstado.set(estado.id, {
        codigo: estado.codigo,
        etiqueta: estadoLabel(estado.codigo),
      });
    }
  }

  const respuestasPorObservacion = new Map<number, RespuestaVista[]>();
  for (const respuesta of respuestas) {
    const lista = respuestasPorObservacion.get(respuesta.observacion_id) ?? [];
    lista.push({
      id: respuesta.id,
      autor_id: respuesta.autor_id,
      texto: respuesta.texto,
      creada_en: respuesta.creada_en,
      documentos: documentosPorRespuesta.get(respuesta.id) ?? [],
    });
    respuestasPorObservacion.set(respuesta.observacion_id, lista);
  }

  const data: ObservacionVista[] = (observaciones ?? []).map((observacion) => {
    return {
      ...observacion,
      etapaCodigo:
        etapaPorEstado.get(observacion.estado_proyecto_id)?.codigo ??
        "DESCONOCIDA",
      etapa:
        etapaPorEstado.get(observacion.estado_proyecto_id)?.etiqueta ??
        "Etapa desconocida",
      respuestas: respuestasPorObservacion.get(observacion.id) ?? [],
    };
  });

  return { data, error: null };
}

export async function crearObservacion(
  input: unknown,
): Promise<ActionResult<ObservacionVista>> {
  const parsed = crearObservacionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: "Datos invalidos",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const supabase = await createWorkflowClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "No autenticado" } };

  const { data: personaId } = await supabase.rpc("persona_actual");
  if (!personaId) {
    return { data: null, error: { message: "No existe persona para el usuario" } };
  }

  const rolesUsuario = await rolesActuales();
  if (!rolesUsuario.includes("DOCENTE")) {
    return {
      data: null,
      error: { message: "Solo los docentes asignados pueden registrar observaciones" },
    };
  }

  const [{ data: asignacion, error: errorAsignacion }, { data: proyecto, error: errorProyecto }] =
    await Promise.all([
      supabase
        .from("asignaciones")
        .select("id, vigencia, rol_participacion_id")
        .eq("id", parsed.data.asignacion_id)
        .eq("proyecto_id", parsed.data.proyecto_id)
        .eq("persona_id", personaId)
        .maybeSingle(),
      supabase
        .from("proyectos")
        .select("id, estado:estado!inner(codigo)")
        .eq("id", parsed.data.proyecto_id)
        .maybeSingle(),
    ]);

  if (errorAsignacion || errorProyecto) {
    return {
      data: null,
      error: {
        message:
          errorAsignacion?.message ??
          errorProyecto?.message ??
          "No se pudo validar la asignacion y el proyecto",
      },
    };
  }

  if (!asignacion || !vigenteHoy(asignacion.vigencia) || !proyecto) {
    return {
      data: null,
      error: { message: "La asignacion no esta vigente o el proyecto no existe" },
    };
  }

  const { data: rolParticipacion, error: errorRol } = await supabase
    .from("rol_participacion")
    .select("codigo")
    .eq("id", asignacion.rol_participacion_id)
    .maybeSingle();
  if (errorRol) return { data: null, error: { message: errorRol.message } };

  if (
    !rolParticipacion ||
    !AMBITO_POR_ROL_PARTICIPACION[rolParticipacion.codigo]
  ) {
    return {
      data: null,
      error: { message: "El rol asignado no puede registrar observaciones" },
    };
  }

  const { data: requisito, error: errorRequisito } = await supabase
    .from("proyecto_requisito")
    .select("id, estado_cumplimiento_id")
    .eq("id", parsed.data.proyecto_requisito_id)
    .eq("proyecto_id", parsed.data.proyecto_id)
    .maybeSingle();
  if (errorRequisito) {
    return { data: null, error: { message: errorRequisito.message } };
  }
  if (!requisito) {
    return {
      data: null,
      error: { message: "El requisito no pertenece a este proyecto" },
    };
  }

  const [{ data: estadoRequisito, error: errorEstadoRequisito }, { count, error: errorDocumentos }] =
    await Promise.all([
      supabase
        .from("estado_cumplimiento")
        .select("codigo")
        .eq("id", requisito.estado_cumplimiento_id)
        .maybeSingle(),
      supabase
        .from("documentos")
        .select("id", { count: "exact", head: true })
        .eq("proyecto_requisito_id", requisito.id),
    ]);
  if (errorEstadoRequisito || errorDocumentos) {
    return {
      data: null,
      error: {
        message:
          errorEstadoRequisito?.message ??
          errorDocumentos?.message ??
          "No se pudo validar el documento y estado del requisito",
      },
    };
  }
  if (
    !count ||
    !estadoRequisito ||
    !["ENTREGADO", "RECHAZADO"].includes(estadoRequisito.codigo)
  ) {
    return {
      data: null,
      error: {
        message:
          "Solo puedes observar requisitos con documentos en estado Entregado o Rechazado",
      },
    };
  }

  const rolesPorEstado: Record<string, string[]> = {
    EN_REVISION: ["EVALUADOR"],
    EN_DESARROLLO: [
      "DIRECTOR",
      "CODIRECTOR",
      "DIRECTOR_DISCIPLINAR",
      "DIRECTOR_METODOLOGICO",
    ],
    SUSTENTADO: ["JURADO"],
  };
  if (!rolesPorEstado[proyecto.estado.codigo]?.includes(rolParticipacion.codigo)) {
    return {
      data: null,
      error: {
        message: "Este rol no puede registrar observaciones durante esta etapa",
      },
    };
  }

  const rondaId = parsed.data.ronda_id ?? null;
  if (rolParticipacion.codigo === "JURADO") {
    if (rondaId === null) {
      return {
        data: null,
        error: { message: "La observacion del jurado requiere un intento abierto" },
      };
    }
    const { data: ronda, error: errorRonda } = await supabase
      .from("rondas")
      .select("id")
      .eq("id", rondaId)
      .eq("proyecto_id", parsed.data.proyecto_id)
      .is("cerrada_en", null)
      .maybeSingle();
    if (errorRonda) return { data: null, error: { message: errorRonda.message } };
    if (!ronda) {
      return { data: null, error: { message: "El intento de sustentacion no esta abierto" } };
    }
  } else if (rondaId !== null) {
    return {
      data: null,
      error: { message: "Las observaciones de acompanamiento no pertenecen a una ronda" },
    };
  }

  const { data, error } = await supabase
    .from("observaciones")
    .insert({
      proyecto_id: parsed.data.proyecto_id,
      proyecto_requisito_id: parsed.data.proyecto_requisito_id,
      ambito: parsed.data.ambito,
      ronda_id: rondaId,
      asignacion_id: parsed.data.asignacion_id,
      texto: parsed.data.texto,
      severidad: parsed.data.severidad,
      creada_por: personaId,
    })
    .select(COLUMNAS_OBSERVACION)
    .single();

  if (error) return { data: null, error: { message: error.message } };
  return {
    data: {
      ...data,
      ambito: parsed.data.ambito,
      etapaCodigo: proyecto.estado.codigo,
      etapa: estadoLabel(proyecto.estado.codigo),
      respuestas: [],
    },
    error: null,
  };
}

export async function cambiarEstadoObservacion(
  input: unknown,
): Promise<ActionResult<ObservacionVista>> {
  const parsed = cambiarEstadoObservacionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: "Datos invalidos",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const rolesUsuario = await rolesActuales();
  const puedeResolverComoDocente =
    rolesUsuario.includes("DOCENTE") &&
    !rolesUsuario.some((rol) => ["COORDINADOR", "ADMINISTRADOR"].includes(rol)) &&
    parsed.data.estado !== "en_correccion";
  if (puedeResolverComoDocente) {
    const modeloDisponible = await modeloRolesProyectoDisponible();
    if (modeloDisponible.error) {
      return {
        data: null,
        error: {
          message: `No se pudo validar la base de datos: ${modeloDisponible.error}`,
        },
      };
    }
    if (!modeloDisponible.disponible) {
      return {
        data: null,
        error: {
          message:
            "La evaluacion por subroles esta bloqueada hasta respaldar la base de datos y aplicar la migracion correspondiente.",
        },
      };
    }
  }

  const supabase = await createWorkflowClient();

  // Las transiciones validas por rol las hace cumplir el trigger de la DB
  // (validar_transicion_observacion). Aqui solo se propaga el cambio.
  const { data, error } = await supabase
    .from("observaciones")
    .update({ estado: parsed.data.estado })
    .eq("id", parsed.data.observacion_id)
    .select(COLUMNAS_OBSERVACION)
    .single();

  if (error) return { data: null, error: { message: error.message } };
  const { data: estado, error: errorEstado } = await supabase
    .from("estado")
    .select("codigo")
    .eq("id", data.estado_proyecto_id)
    .single();
  if (errorEstado) return { data: null, error: { message: errorEstado.message } };
  return {
    data: {
      ...data,
      ambito: data.ambito,
      etapaCodigo: estado.codigo,
      etapa: estadoLabel(estado.codigo),
      respuestas: [],
    },
    error: null,
  };
}

/**
 * RF-07. La evidencia ya viaja al Storage desde el navegador (subida directa);
 * aqui solo se registran los metadatos. No es atomico: si falla el insert de
 * documentos tras guardar la respuesta, la respuesta queda sin evidencia y el
 * estudiante puede reintentar.
 */
export async function responderObservacion(
  input: unknown,
): Promise<ActionResult<RespuestaVista>> {
  const parsed = responderObservacionSchema.safeParse(input);
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

  const { data: observacion } = await supabase
    .from("observaciones")
    .select("id, proyecto_id, estado")
    .eq("id", parsed.data.observacion_id)
    .maybeSingle();

  if (!observacion) {
    return { data: null, error: { message: "Observacion no encontrada o sin acceso" } };
  }
  if (observacion.estado !== "pendiente" && observacion.estado !== "en_correccion") {
    return {
      data: null,
      error: { message: "La observacion no esta abierta para correccion" },
    };
  }

  const [{ data: esAutor }, { data: esGestor }] = await Promise.all([
    supabase.rpc("es_autor", { p_proyecto: observacion.proyecto_id }),
    supabase.rpc("tiene_permiso", { p_codigo: "observacion.gestionar" }),
  ]);
  if (!esAutor && !esGestor) {
    return {
      data: null,
      error: { message: "Solo el autor del anteproyecto puede responder" },
    };
  }

  // La evidencia debe vivir bajo el prefijo del proyecto: evita registrar rutas
  // de otros proyectos (o de nadie).
  const prefijo = `proyectos/${observacion.proyecto_id}/`;
  for (const documento of parsed.data.documentos) {
    if (!documento.storage_path.startsWith(prefijo)) {
      return {
        data: null,
        error: { message: "Evidencia invalida: la ruta no pertenece al proyecto" },
      };
    }
  }

  // Responder implica que la correccion empezo: pendiente -> en_correccion.
  if (observacion.estado === "pendiente") {
    const { error } = await supabase
      .from("observaciones")
      .update({ estado: "en_correccion" })
      .eq("id", observacion.id);
    if (error) return { data: null, error: { message: error.message } };
  }

  const { data: respuesta, error: errorRespuesta } = await supabase
    .from("respuestas_observacion")
    .insert({
      observacion_id: observacion.id,
      autor_id: personaId,
      texto: parsed.data.texto,
    })
    .select(COLUMNAS_RESPUESTA)
    .single();

  if (errorRespuesta || !respuesta) {
    return {
      data: null,
      error: { message: errorRespuesta?.message ?? "No se pudo registrar la respuesta" },
    };
  }

  let documentos: DocumentoVista[] = [];

  if (parsed.data.documentos.length > 0) {
    const { data, error } = await supabase
      .from("documentos")
      .insert(
        parsed.data.documentos.map((documento) => ({
          proyecto_id: observacion.proyecto_id,
          respuesta_id: respuesta.id,
          tipo: "evidencia" as const,
          storage_bucket: "documentos",
          storage_path: documento.storage_path,
          nombre_original: documento.nombre_original,
          mime_type: documento.mime_type,
          tamano_bytes: documento.tamano_bytes,
          subido_por: personaId,
        })),
      )
      .select(COLUMNAS_DOCUMENTO);

    if (error) return { data: null, error: { message: error.message } };
    documentos = (data ?? []).map(aDocumentoVista);
  }

  return {
    data: {
      id: respuesta.id,
      autor_id: respuesta.autor_id,
      texto: respuesta.texto,
      creada_en: respuesta.creada_en,
      documentos,
    },
    error: null,
  };
}

/**
 * URL firmada de corta vida para abrir evidencia (el bucket es privado).
 * La RLS de documentos limita que solo se firmen documentos del proyecto.
 */
export async function urlDocumento(
  documentoId: number,
): Promise<ActionResult<{ url: string }>> {
  if (!Number.isInteger(documentoId) || documentoId <= 0) {
    return { data: null, error: { message: "Documento invalido" } };
  }

  const supabase = await createClient();

  const { data: documento, error: errorDocumento } = await supabase
    .from("documentos")
    .select("storage_bucket, storage_path")
    .eq("id", documentoId)
    .maybeSingle();

  if (errorDocumento) {
    return { data: null, error: { message: errorDocumento.message } };
  }

  if (!documento) {
    return { data: null, error: { message: "Documento no encontrado o sin acceso" } };
  }

  const { data, error } = await supabase.storage
    .from(documento.storage_bucket)
    .createSignedUrl(documento.storage_path, 300);

  if (error || !data) {
    return { data: null, error: { message: error?.message ?? "No se pudo firmar la URL" } };
  }

  return { data: { url: data.signedUrl }, error: null };
}
