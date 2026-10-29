import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { etiquetaPeriodo } from "@/lib/periodo";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  programa?: string;
  periodo?: string;
};

type Resultado = {
  id: number;
  titulo: string;
  resumen: string | null;
  palabras_clave: string[];
  programa_id: number;
  periodo: string | null;
  fecha_finalizacion: string | null;
  score: number | null;
};

export default async function PublicHomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const consulta = (sp.q ?? "").trim();
  const programaId = sp.programa ? Number(sp.programa) : null;
  const periodo = sp.periodo ?? "";

  const configurado = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!configurado) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight">
          Repositorio de proyectos de grado
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Falta configurar Supabase. Copia <code>.env.example</code> a{" "}
          <code>.env.local</code> y define las credenciales.
        </p>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: finalizadoId } = await supabase.rpc("estado_id", {
    p_codigo: "FINALIZADO",
  });

  const [{ data: programas }, { data: periodosRaw }] = await Promise.all([
    supabase
      .from("programas")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("proyectos")
      .select("periodo:periodo_academico!inner(anio, semestre)")
      .eq("estado_actual_id", finalizadoId!),
  ]);

  const periodos = Array.from(
    new Set((periodosRaw ?? []).map((p) => etiquetaPeriodo(p.periodo))),
  ).sort((a, b) => b.localeCompare(a));

  const nombrePrograma = new Map(
    (programas ?? []).map((p) => [p.id, p.nombre]),
  );

  let resultados: Resultado[] = [];
  if (consulta) {
    const { data } = await supabase.rpc("buscar_antecedentes", {
      consulta,
      p_programa: programaId ?? undefined,
      limite: 20,
      p_periodo: periodo || undefined,
    });
    resultados = data ?? [];
  } else {
    const { data } = await supabase
      .from("proyectos")
      .select(
        "id, titulo, resumen, palabras_clave, programa_id, fecha_finalizacion, periodo:periodo_academico(anio, semestre)",
      )
      .eq("estado_actual_id", finalizadoId!)
      .order("fecha_finalizacion", { ascending: false })
      .limit(20);
    resultados = (data ?? []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      resumen: p.resumen,
      palabras_clave: p.palabras_clave,
      programa_id: p.programa_id,
      periodo: etiquetaPeriodo(p.periodo),
      fecha_finalizacion: p.fecha_finalizacion,
      score: null,
    }));
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-16">
      <header className="space-y-2">
        <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
          Universidad Â· Proyectos de grado
        </span>
        <h1 className="text-3xl font-bold tracking-tight">
          Buscar antecedentes
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Consulta el historico de proyectos de grado por palabras clave,
          programa y periodo.
        </p>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <Input
          name="q"
          defaultValue={consulta}
          placeholder="Palabras clave, titulo o tema..."
          className="sm:flex-1"
        />
        <Select name="programa" defaultValue={sp.programa ?? ""} className="sm:w-56">
          <option value="">Todos los programas</option>
          {(programas ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
        <Select name="periodo" defaultValue={periodo} className="sm:w-36">
          <option value="">Todo periodo</option>
          {periodos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Button type="submit">Buscar</Button>
      </form>

      <section className="space-y-3">
        <p className="text-sm text-slate-500">
          {consulta
            ? `${resultados.length} resultado(s) para "${consulta}"`
            : "Ultimos proyectos finalizados"}
        </p>

        {resultados.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-300">
            Sin resultados.
          </p>
        ) : (
          <ul className="space-y-3">
            {resultados.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/proyectos/${r.id}`}
                  className="block rounded-md border border-slate-200 p-4 transition-colors hover:border-brand-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <h2 className="font-semibold">{r.titulo}</h2>
                  {r.resumen ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                      {r.resumen}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {nombrePrograma.get(r.programa_id) ?? "Programa"} Â·{" "}
                    {r.periodo ?? "Sin periodo"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

