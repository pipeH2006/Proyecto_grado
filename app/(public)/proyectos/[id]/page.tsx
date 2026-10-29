import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { etiquetaPeriodo } from "@/lib/periodo";

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyectoId = Number(id);
  if (!Number.isInteger(proyectoId) || proyectoId <= 0) notFound();

  const supabase = await createClient();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select(
      "id, titulo, resumen, palabras_clave, periodo:periodo_academico(anio, semestre), fecha_finalizacion, programa_id",
    )
    .eq("id", proyectoId)
    .maybeSingle();

  if (!proyecto) notFound();

  const { data: programa } = await supabase
    .from("programas")
    .select("nombre, facultad")
    .eq("id", proyecto.programa_id)
    .maybeSingle();

  const { data: autores } = await supabase
    .from("proyecto_autores")
    .select("persona_id, orden")
    .eq("proyecto_id", proyectoId)
    .order("orden");

  let personas: { id: string; nombres: string; apellidos: string }[] = [];
  const ids = (autores ?? []).map((a) => a.persona_id);
  if (ids.length > 0) {
    const { data } = await supabase
      .from("persona")
      .select("id, nombres, apellidos")
      .in("id", ids);
    personas = data ?? [];
  }
  const nombrePorId = new Map(
    personas.map((p) => [p.id, `${p.nombres} ${p.apellidos}`.trim()]),
  );

  const { data: documentos } = await supabase
    .from("documentos")
    .select("id, nombre_original, tipo")
    .eq("proyecto_id", proyectoId);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-16">
      <Link href="/" className="text-sm text-brand-600 dark:text-brand-400">
        ← Volver a la busqueda
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{proyecto.titulo}</h1>
        <p className="text-sm text-slate-500">
          {programa?.nombre ?? "Programa"}
          {programa?.facultad ? ` · ${programa.facultad}` : ""} ·{" "}
          {etiquetaPeriodo(proyecto.periodo)}
        </p>
      </header>

      {proyecto.resumen ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <p className="whitespace-pre-line text-slate-700 dark:text-slate-200">
            {proyecto.resumen}
          </p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Autores</h2>
        {personas.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-300">Sin registro.</p>
        ) : (
          <ul className="list-inside list-disc text-slate-700 dark:text-slate-200">
            {(autores ?? []).map((a) => (
              <li key={a.persona_id}>{nombrePorId.get(a.persona_id) ?? "—"}</li>
            ))}
          </ul>
        )}
      </section>

      {proyecto.palabras_clave.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Palabras clave</h2>
          <div className="flex flex-wrap gap-2">
            {proyecto.palabras_clave.map((p) => (
              <span
                key={p}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800"
              >
                {p}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {documentos && documentos.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Documentos</h2>
          <ul className="list-inside list-disc text-slate-700 dark:text-slate-200">
            {documentos.map((d) => (
              <li key={d.id}>
                {d.nombre_original}{" "}
                <span className="text-xs text-slate-500">({d.tipo})</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
