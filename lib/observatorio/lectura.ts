import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import reglasJson from "./reglas.json";

// Lectura de los proyectos finalizados para el observatorio publico.
// Solo hace SELECT, con la key publica y sin sesion: todos los visitantes ven lo
// mismo y la RLS sigue mandando. Autores y directores solo llegan si la RLS los
// permite para `anon`; si no, el resultado se marca como `parcial`.

const roles = {
  disciplinar: ["DIRECTOR", "DIRECTOR_DISCIPLINAR", "CODIRECTOR"],
  metodologico: ["DIRECTOR_METODOLOGICO"],
};

const reglas = reglasJson.reglas.map((r) => ({ ...r, re: new RegExp(r.p) }));
const lugares = reglasJson.lugares.map((l) => ({ ...l, re: new RegExp(l.p) }));

export type TrabajoObservatorio = {
  id: number;
  titulo: string;
  mod: string;
  modNombre: string;
  anio: number;
  sem: number;
  est: number;
  dir: number;
  met: boolean;
  tec: string[];
  sec: string[];
  lug: string[];
  dd: string[];
  dm: string[];
};

export type DatosObservatorio =
  | { configurado: false }
  | {
      configurado: true;
      parcial: boolean;
      trabajos: TrabajoObservatorio[];
      docentes: { c: string; n: string }[];
    };

// Mismo criterio que normalizar() en los patrones: mayusculas y sin tildes.
function normalizar(texto: string): string {
  const con = 'áéíóúÁÉÍÓÚñÑüÜ\n\r\t“”"';
  const sin = "aeiouAEIOUnNuU      ";
  return [...texto]
    .map((c) => {
      const i = con.indexOf(c);
      return i < 0 ? c : sin[i];
    })
    .join("")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function partes<T>(lista: T[], tamano: number): T[][] {
  const salida: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) {
    salida.push(lista.slice(i, i + tamano));
  }
  return salida;
}

export async function leerObservatorio(): Promise<DatosObservatorio> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { configurado: false };

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [estado, programa, sedes] = await Promise.all([
    supabase.from("estado").select("id").eq("codigo", "FINALIZADO").maybeSingle(),
    supabase.from("programas").select("id").eq("codigo", "ISC").maybeSingle(),
    supabase.from("sede").select("id, codigo"),
  ]);
  const errorCatalogo = estado.error ?? programa.error ?? sedes.error;
  if (errorCatalogo) throw new Error(errorCatalogo.message);
  if (!estado.data || !programa.data) {
    return { configurado: true, parcial: false, trabajos: [], docentes: [] };
  }

  const { data: filas, error } = await supabase
    .from("proyectos")
    .select(
      "id, titulo, sede_id, modalidad(codigo, nombre), periodo_academico(anio, semestre)",
    )
    .eq("estado_actual_id", estado.data.id)
    .eq("programa_id", programa.data.id)
    .order("id")
    .limit(5000);
  if (error) throw new Error(error.message);

  const fusagasuga = (sedes.data ?? []).find((s) => s.codigo === "FUSAGASUGA");
  const proyectos = (filas ?? []).filter(
    (p) => !fusagasuga || p.sede_id === null || p.sede_id === fusagasuga.id,
  );
  const ids = proyectos.map((p) => p.id);

  const autoresPorProyecto = new Map<number, number>();
  const asignaciones: {
    proyecto_id: number;
    persona_id: string;
    rol: string | undefined;
    nombre: string;
  }[] = [];
  let parcial = false;

  for (const grupo of partes(ids, 100)) {
    const [autores, asignadas] = await Promise.all([
      supabase.from("proyecto_autores").select("proyecto_id").in("proyecto_id", grupo),
      supabase
        .from("asignaciones")
        .select(
          "proyecto_id, persona_id, rol_participacion(codigo), persona!asignaciones_persona_id_fkey(nombres, apellidos)",
        )
        .in("proyecto_id", grupo),
    ]);
    if (autores.error || asignadas.error) parcial = true;
    for (const a of autores.data ?? []) {
      autoresPorProyecto.set(a.proyecto_id, (autoresPorProyecto.get(a.proyecto_id) ?? 0) + 1);
    }
    for (const a of asignadas.data ?? []) {
      if (!a.persona) continue;
      asignaciones.push({
        proyecto_id: a.proyecto_id,
        persona_id: a.persona_id,
        rol: a.rol_participacion?.codigo,
        nombre: `${a.persona.nombres} ${a.persona.apellidos}`.trim(),
      });
    }
  }
  // La RLS puede responder vacio en vez de error.
  if (ids.length > 0 && autoresPorProyecto.size === 0) parcial = true;

  const docentes = new Map<string, string>();
  const directores = (proyectoId: number, codigos: string[]) => {
    const ids = new Set<string>();
    for (const a of asignaciones) {
      if (a.proyecto_id === proyectoId && a.rol && codigos.includes(a.rol)) {
        docentes.set(a.persona_id, a.nombre);
        ids.add(a.persona_id);
      }
    }
    return [...ids];
  };

  const trabajos: TrabajoObservatorio[] = [];
  for (const p of proyectos) {
    if (!p.modalidad || !p.periodo_academico) continue;
    const titulo = normalizar(p.titulo);
    // El titulo del semestre avanzado es la especializacion: no se clasifica por tema.
    const semestreAvanzado = p.modalidad.codigo === "SEMESTRE_AVANZADO";
    const dd = directores(p.id, roles.disciplinar);
    const dm = directores(p.id, roles.metodologico);
    trabajos.push({
      id: p.id,
      titulo: p.titulo,
      mod: p.modalidad.codigo,
      modNombre: p.modalidad.nombre,
      anio: p.periodo_academico.anio,
      sem: p.periodo_academico.semestre,
      est: Math.max(1, autoresPorProyecto.get(p.id) ?? 0),
      dir: dd.length + dm.length,
      met: dm.length > 0,
      tec: semestreAvanzado
        ? []
        : reglas.filter((r) => r.dim === "tecnologia" && r.re.test(titulo)).map((r) => r.n),
      sec: semestreAvanzado
        ? []
        : reglas.filter((r) => r.dim === "sector" && r.re.test(titulo)).map((r) => r.n),
      lug: lugares.filter((l) => l.re.test(titulo)).map((l) => l.c),
      dd,
      dm,
    });
  }

  return {
    configurado: true,
    parcial,
    trabajos,
    docentes: [...docentes].map(([c, n]) => ({ c, n })),
  };
}
