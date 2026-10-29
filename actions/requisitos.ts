"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { DocumentoRequisito, RequisitoVista } from "@/lib/types/requisitos";
import {
  registrarDocumentoRequisitoSchema,
  verificarRequisitoSchema,
} from "@/lib/validations/requisito";

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Requisitos de la modalidad del proyecto con su estado de cumplimiento. */
export async function listarRequisitosProyecto(
  proyectoId: number,
): Promise<ActionResult<RequisitoVista[]>> {
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) {
    return { data: null, error: { message: "Proyecto invalido" } };
  }

  const supabase = await createClient();
  const { data: prs, error } = await supabase
    .from("proyecto_requisito")
    .select(
      "id, modalidad_requisito_id, estado_cumplimiento_id, observacion",
    )
    .eq("proyecto_id", proyectoId);
  if (error) return { data: null, error: { message: error.message } };
  if (!prs || prs.length === 0) return { data: [], error: null };

  const mrIds = [...new Set(prs.map((p) => p.modalidad_requisito_id))];
  const ecIds = [...new Set(prs.map((p) => p.estado_cumplimiento_id))];
  const prIds = prs.map((p) => p.id);

  const [{ data: mrs }, { data: estados }, { data: documentos }] =
    await Promise.all([
      supabase
        .from("modalidad_requisito")
        .select("id, requisito_id, etapa_id, obligatorio, orden")
        .in("id", mrIds),
      supabase
        .from("estado_cumplimiento")
        .select("id, codigo, nombre")
        .in("id", ecIds),
      supabase
        .from("documentos")
        .select(
          "id, nombre_original, mime_type, tamano_bytes, version, hash_sha256, proyecto_requisito_id",
        )
        .in("proyecto_requisito_id", prIds)
        .order("version", { ascending: true }),
    ]);

  const reqIds = [...new Set((mrs ?? []).map((m) => m.requisito_id))];
  const etapaIds = [...new Set((mrs ?? []).map((m) => m.etapa_id))];
  const [{ data: requisitos }, { data: etapas }] = await Promise.all([
    supabase.from("requisito").select("id, codigo, nombre").in("id", reqIds),
    supabase.from("etapa").select("id, nombre, orden").in("id", etapaIds),
  ]);

  const mrPorId = new Map((mrs ?? []).map((m) => [m.id, m]));
  const requisitoPorId = new Map((requisitos ?? []).map((r) => [r.id, r]));
  const etapaPorId = new Map((etapas ?? []).map((e) => [e.id, e]));
  const estadoPorId = new Map((estados ?? []).map((e) => [e.id, e]));
  const ordenEtapa = new Map((etapas ?? []).map((e) => [e.id, e.orden]));

  const docsPorRequisito = new Map<number, DocumentoRequisito[]>();
  for (const d of documentos ?? []) {
    const prId = d.proyecto_requisito_id;
    if (prId === null) continue;
    const lista = docsPorRequisito.get(prId) ?? [];
    lista.push({
      id: d.id,
      nombre_original: d.nombre_original,
      mime_type: d.mime_type,
      tamano_bytes: d.tamano_bytes,
      version: d.version,
      hash_sha256: d.hash_sha256,
    });
    docsPorRequisito.set(prId, lista);
  }

  const ordenadas = [...prs].sort((a, b) => {
    const ma = mrPorId.get(a.modalidad_requisito_id);
    const mb = mrPorId.get(b.modalidad_requisito_id);
    const ea = ma ? (ordenEtapa.get(ma.etapa_id) ?? 0) : 0;
    const eb = mb ? (ordenEtapa.get(mb.etapa_id) ?? 0) : 0;
    if (ea !== eb) return ea - eb;
    return (ma?.orden ?? 0) - (mb?.orden ?? 0);
  });

  const vistas: RequisitoVista[] = ordenadas.map((pr) => {
    const mr = mrPorId.get(pr.modalidad_requisito_id);
    const requisito = mr ? requisitoPorId.get(mr.requisito_id) : undefined;
    const etapa = mr ? etapaPorId.get(mr.etapa_id) : undefined;
    const estado = estadoPorId.get(pr.estado_cumplimiento_id);
    return {
      proyecto_requisito_id: pr.id,
      requisito_codigo: requisito?.codigo ?? "",
      requisito_nombre: requisito?.nombre ?? "",
      etapa: etapa?.nombre ?? "",
      obligatorio: mr?.obligatorio ?? true,
      estado_codigo: estado?.codigo ?? "",
      estado_nombre: estado?.nombre ?? "",
      observacion: pr.observacion,
      documentos: docsPorRequisito.get(pr.id) ?? [],
    };
  });

  return { data: vistas, error: null };
}

/** Documenta un requisito: registra la version del archivo y marca ENTREGADO. */
export async function registrarDocumentoRequisito(
  input: unknown,
): Promise<ActionResult<DocumentoRequisito>> {
  const parsed = registrarDocumentoRequisitoSchema.safeParse(input);
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
    supabase.rpc("tiene_permiso", { p_codigo: "requisito.verificar" }),
  ]);
  if (!esAutor && !esGestor) {
    return {
      data: null,
      error: { message: "Solo el autor del proyecto puede cargar requisitos" },
    };
  }

  const { data: pr } = await supabase
    .from("proyecto_requisito")
    .select("id, proyecto_id")
    .eq("id", parsed.data.proyecto_requisito_id)
    .maybeSingle();
  if (!pr || pr.proyecto_id !== parsed.data.proyecto_id) {
    return { data: null, error: { message: "Requisito invalido para el proyecto" } };
  }

  const prefijo = `proyectos/${parsed.data.proyecto_id}/requisitos/`;
  if (!parsed.data.storage_path.startsWith(prefijo)) {
    return {
      data: null,
      error: { message: "Documento invalido: la ruta no pertenece al proyecto" },
    };
  }

  const { data: ultima } = await supabase
    .from("documentos")
    .select("version")
    .eq("proyecto_requisito_id", pr.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (ultima?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      proyecto_id: parsed.data.proyecto_id,
      tipo: "evidencia",
      storage_bucket: "documentos",
      storage_path: parsed.data.storage_path,
      nombre_original: parsed.data.nombre_original,
      mime_type: parsed.data.mime_type,
      tamano_bytes: parsed.data.tamano_bytes,
      hash_sha256: parsed.data.hash_sha256,
      version,
      proyecto_requisito_id: pr.id,
      subido_por: personaId,
    })
    .select(
      "id, nombre_original, mime_type, tamano_bytes, version, hash_sha256",
    )
    .single();
  if (error) return { data: null, error: { message: error.message } };

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
        fecha_cumplimiento: hoy(),
      })
      .eq("id", pr.id);
  }

  return { data, error: null };
}

/** Verifica (aprueba o rechaza) un requisito. Solo coordinador/administrador. */
export async function verificarRequisito(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = verificarRequisitoSchema.safeParse(input);
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
  const { data: gestor } = await supabase.rpc("tiene_permiso", {
    p_codigo: "requisito.verificar",
  });
  if (!gestor) {
    return {
      data: null,
      error: { message: "Solo coordinadores o administradores" },
    };
  }

  const { data: estado } = await supabase
    .from("estado_cumplimiento")
    .select("id")
    .eq("codigo", parsed.data.estado_codigo)
    .single();
  if (!estado) return { data: null, error: { message: "Estado inexistente" } };

  const { data: personaId } = await supabase.rpc("persona_actual");

  const { error } = await supabase
    .from("proyecto_requisito")
    .update({
      estado_cumplimiento_id: estado.id,
      verificado_por: personaId,
      fecha_cumplimiento: hoy(),
      observacion: parsed.data.observacion ?? null,
    })
    .eq("id", parsed.data.proyecto_requisito_id);
  if (error) return { data: null, error: { message: error.message } };
  return { data: null, error: null };
}
