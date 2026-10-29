import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../lib/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROGRAMAS: TablesInsert<"programas">[] = [
  {
    codigo: "ISC",
    nombre: "Ingeniería de Sistemas y Computación",
    facultad: "Ingeniería",
  },
  {
    codigo: "IAS",
    nombre: "Ingeniería Ambiental",
    facultad: "Ciencias Agropecuarias",
  },
  {
    codigo: "ADM",
    nombre: "Administración de Empresas",
    facultad: "Ciencias Administrativas, Económicas y Contables",
  },
];

const TESAURO: { codigo: string; termino: string; sinonimos: string[] }[] = [
  { codigo: "ISC", termino: "Inteligencia artificial", sinonimos: ["IA", "machine learning"] },
  { codigo: "ISC", termino: "Internet de las cosas", sinonimos: ["IoT", "sensores"] },
  { codigo: "ISC", termino: "Desarrollo web", sinonimos: ["frontend", "backend"] },
  { codigo: "IAS", termino: "Tratamiento de aguas", sinonimos: ["potabilizacion"] },
  { codigo: "ADM", termino: "Gestion organizacional", sinonimos: ["procesos"] },
];

const PROYECTOS_DEMO: {
  codigo: string;
  titulo: string;
  resumen: string;
  palabras_clave: string[];
  periodo: string;
  fecha_finalizacion: string;
  autor: { nombres: string; apellidos: string; email: string };
}[] = [
  {
    codigo: "ISC",
    titulo: "Red neuronal para deteccion de antecedentes",
    resumen:
      "Deteccion de similitud entre anteproyectos de grado combinando full-text y embeddings.",
    palabras_clave: ["ia", "antecedentes", "nlp"],
    periodo: "2024-2",
    fecha_finalizacion: "2024-11-30",
    autor: { nombres: "Ana", apellidos: "Gomez", email: "ana.gomez@udec.edu.co" },
  },
  {
    codigo: "ISC",
    titulo: "Sistema de riego automatizado con IoT",
    resumen:
      "Control automatico de riego con sensores de humedad de suelo y actuadores de bajo consumo.",
    palabras_clave: ["iot", "riego", "agricultura"],
    periodo: "2024-1",
    fecha_finalizacion: "2024-06-15",
    autor: { nombres: "Luis", apellidos: "Perez", email: "luis.perez@udec.edu.co" },
  },
  {
    codigo: "IAS",
    titulo: "Potabilizacion de aguas residuales por filtracion",
    resumen:
      "Evaluacion de un sistema de filtracion para el tratamiento de aguas residuales domesticas.",
    palabras_clave: ["aguas", "filtracion", "sostenibilidad"],
    periodo: "2023-2",
    fecha_finalizacion: "2023-12-01",
    autor: { nombres: "Marta", apellidos: "Rios", email: "marta.rios@udec.edu.co" },
  },
];

const EVALUADOR = {
  nombres: "Eva",
  apellidos: "Murillo",
  email: "eva.murillo@udec.edu.co",
};

const PROYECTO_EN_EVALUACION: {
  codigo: string;
  titulo: string;
  resumen: string;
  palabras_clave: string[];
  periodo: string;
  autor: { nombres: string; apellidos: string; email: string };
} = {
  codigo: "ISC",
  titulo: "Analitica de datos para la desercion estudiantil",
  resumen:
    "Anteproyecto en evaluacion: modelo de analitica para predecir desercion a partir de historicos academicos.",
  palabras_clave: ["analitica", "datos", "desercion"],
  periodo: "2025-1",
  autor: {
    nombres: "Carlos",
    apellidos: "Nunez",
    email: "carlos.nunez@udec.edu.co",
  },
};

const OBSERVACIONES_DEMO: {
  texto: string;
  severidad: "baja" | "media" | "alta";
  estado: "pendiente" | "en_correccion" | "solucionada" | "no_aplica";
}[] = [
  {
    texto:
      "Delimitar el alcance del objetivo general: el segundo objetivo especifico es demasiado amplio para el tiempo disponible.",
    severidad: "alta",
    estado: "pendiente",
  },
  {
    texto:
      "Incluir la referencia bibliografica de la metodologia de validacion propuesta.",
    severidad: "media",
    estado: "en_correccion",
  },
  {
    texto: "Ajustar el formato de las tablas en la seccion de resultados esperados.",
    severidad: "baja",
    estado: "solucionada",
  },
];

async function upsertPersona(persona: {
  nombres: string;
  apellidos: string;
  email: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("persona")
    .upsert(persona, { onConflict: "email" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function estadoId(codigo: string): Promise<number> {
  const { data, error } = await supabase
    .from("estado")
    .select("id")
    .eq("codigo", codigo)
    .single();
  if (error) throw error;
  return data.id;
}

async function periodoId(etiqueta: string): Promise<number> {
  const [anio, semestre] = etiqueta.split("-").map(Number);
  const { data, error } = await supabase
    .from("periodo_academico")
    .select("id")
    .eq("anio", anio)
    .eq("semestre", semestre)
    .single();
  if (error) throw error;
  return data.id;
}

async function modalidadId(codigo: string): Promise<number> {
  const { data, error } = await supabase
    .from("modalidad")
    .select("id")
    .eq("codigo", codigo)
    .single();
  if (error) throw error;
  return data.id;
}

async function seedProgramas() {
  const { data, error } = await supabase
    .from("programas")
    .upsert(PROGRAMAS, { onConflict: "codigo" })
    .select("id, codigo");
  if (error) throw error;
  return new Map(data.map((p) => [p.codigo, p.id]));
}

async function seedTesauro(idPorCodigo: Map<string, number>) {
  const { data: existentes, error } = await supabase
    .from("tesauro")
    .select("termino, programa_id");
  if (error) throw error;

  const clave = (t: string, p: number | null) => `${p ?? "global"}::${t.toLowerCase()}`;
  const yaEstan = new Set(
    existentes.map((t) => clave(t.termino, t.programa_id)),
  );

  const filas: TablesInsert<"tesauro">[] = TESAURO.filter(
    (t) => !yaEstan.has(clave(t.termino, idPorCodigo.get(t.codigo) ?? null)),
  ).map((t) => ({
    programa_id: idPorCodigo.get(t.codigo) ?? null,
    termino: t.termino,
    sinonimos: t.sinonimos,
  }));

  if (filas.length > 0) {
    const { error: insertError } = await supabase.from("tesauro").insert(filas);
    if (insertError) throw insertError;
  }
  return filas.length;
}

async function seedProyectos(idPorCodigo: Map<string, number>) {
  const titulos = PROYECTOS_DEMO.map((p) => p.titulo);
  const { data: existentes, error } = await supabase
    .from("proyectos")
    .select("titulo")
    .in("titulo", titulos);
  if (error) throw error;
  const yaEstan = new Set(existentes.map((p) => p.titulo));

  const finalizadoId = await estadoId("FINALIZADO");
  const monografiaId = await modalidadId("MONOGRAFIA");
  let creados = 0;
  for (const demo of PROYECTOS_DEMO) {
    if (yaEstan.has(demo.titulo)) continue;

    const personaId = await upsertPersona(demo.autor);

    // El trigger trg_proyecto_autor_creador registra a creado_por como autor.
    const { error: proyErr } = await supabase.from("proyectos").insert({
      programa_id: idPorCodigo.get(demo.codigo)!,
      titulo: demo.titulo,
      resumen: demo.resumen,
      palabras_clave: demo.palabras_clave,
      estado_actual_id: finalizadoId,
      modalidad_id: monografiaId,
      periodo_id: await periodoId(demo.periodo),
      fecha_finalizacion: demo.fecha_finalizacion,
      creado_por: personaId,
    });
    if (proyErr) throw proyErr;
    creados += 1;
  }
  return creados;
}

/** Evaluadora con rol, para que RF-05/06 tengan un actor real asignado. */
async function seedEvaluador(): Promise<string> {
  const personaId = await upsertPersona(EVALUADOR);

  const { data: rolDocente, error: rolErr } = await supabase
    .from("rol")
    .select("id")
    .eq("codigo", "DOCENTE")
    .single();
  if (rolErr) throw rolErr;

  const { data: yaTieneRol, error } = await supabase
    .from("persona_rol")
    .select("persona_id")
    .eq("persona_id", personaId)
    .eq("rol_id", rolDocente.id)
    .maybeSingle();
  if (error) throw error;

  if (!yaTieneRol) {
    const { error: insertError } = await supabase
      .from("persona_rol")
      .insert({ persona_id: personaId, rol_id: rolDocente.id });
    if (insertError) throw insertError;
  }
  return personaId;
}

/**
 * Anteproyecto en evaluacion con ronda abierta, asignacion vigente al evaluador
 * y observaciones demo en distintos estados. Da material para RF-05/RF-06 sin
 * necesidad de RF-04 todavia.
 */
async function seedProyectoEnEvaluacion(
  idPorCodigo: Map<string, number>,
  evaluadorId: string,
): Promise<number> {
  const { data: existente, error: existErr } = await supabase
    .from("proyectos")
    .select("id")
    .eq("titulo", PROYECTO_EN_EVALUACION.titulo)
    .maybeSingle();
  if (existErr) throw existErr;
  if (existente) return 0;

  const autorId = await upsertPersona(PROYECTO_EN_EVALUACION.autor);
  const enRevisionId = await estadoId("EN_REVISION");

  const { data: proyecto, error: proyErr } = await supabase
    .from("proyectos")
    .insert({
      programa_id: idPorCodigo.get(PROYECTO_EN_EVALUACION.codigo)!,
      titulo: PROYECTO_EN_EVALUACION.titulo,
      resumen: PROYECTO_EN_EVALUACION.resumen,
      palabras_clave: PROYECTO_EN_EVALUACION.palabras_clave,
      estado_actual_id: enRevisionId,
      modalidad_id: await modalidadId("MONOGRAFIA"),
      periodo_id: await periodoId(PROYECTO_EN_EVALUACION.periodo),
      creado_por: autorId,
    })
    .select("id")
    .single();
  if (proyErr) throw proyErr;

  const { data: rolEvaluador, error: rolEvalErr } = await supabase
    .from("rol_participacion")
    .select("id")
    .eq("codigo", "EVALUADOR")
    .single();
  if (rolEvalErr) throw rolEvalErr;

  const { data: asignacion, error: asigErr } = await supabase
    .from("asignaciones")
    .insert({
      proyecto_id: proyecto.id,
      persona_id: evaluadorId,
      rol_participacion_id: rolEvaluador.id,
    })
    .select("id")
    .single();
  if (asigErr) throw asigErr;

  const { data: ronda, error: rondaErr } = await supabase
    .from("rondas")
    .insert({ proyecto_id: proyecto.id, numero: 1, abierta_por: evaluadorId })
    .select("id")
    .single();
  if (rondaErr) throw rondaErr;

  const ahora = new Date().toISOString();
  const filas: TablesInsert<"observaciones">[] = OBSERVACIONES_DEMO.map((o) => {
    const cerrada = o.estado === "solucionada" || o.estado === "no_aplica";
    return {
      proyecto_id: proyecto.id,
      ronda_id: ronda.id,
      asignacion_id: asignacion.id,
      texto: o.texto,
      severidad: o.severidad,
      estado: o.estado,
      creada_por: evaluadorId,
      cerrada_por: cerrada ? evaluadorId : null,
      cerrada_en: cerrada ? ahora : null,
    };
  });
  const { error: obsErr } = await supabase.from("observaciones").insert(filas);
  if (obsErr) throw obsErr;

  return 1;
}

async function main() {
  const idPorCodigo = await seedProgramas();
  const tesauroNuevos = await seedTesauro(idPorCodigo);
  const proyectosNuevos = await seedProyectos(idPorCodigo);
  const evaluadorId = await seedEvaluador();
  const enEvaluacion = await seedProyectoEnEvaluacion(idPorCodigo, evaluadorId);
  console.log(
    `Seed listo: ${idPorCodigo.size} programas, ${tesauroNuevos} terminos de tesauro, ` +
      `${proyectosNuevos} proyectos demo, ${enEvaluacion} anteproyecto en evaluacion ` +
      `(evaluador ${EVALUADOR.email}).`,
  );
}

main().catch((error) => {
  console.error("Seed fallo:", error);
  process.exit(1);
});
