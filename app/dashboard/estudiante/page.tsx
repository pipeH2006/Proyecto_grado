import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { estadoLabel } from "@/lib/estados";
import { etiquetaPeriodo } from "@/lib/periodo";
import { requerirRol } from "@/lib/auth";

export default async function EstudiantePage() {
  await requerirRol(["ESTUDIANTE"]);
  const supabase = await createClient();
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, titulo, estado:estado!inner(codigo), periodo:periodo_academico(anio, semestre)")
    .order("creado_en", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Mis anteproyectos</h1>
        <Link href="/dashboard/estudiante/nuevo" className={cn(buttonVariants())}>
          Nuevo anteproyecto
        </Link>
      </div>

      {!proyectos || proyectos.length === 0 ? (
        <p className="text-muted-foreground">
          Aun no has registrado anteproyectos.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {proyectos.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link
                  href={`/dashboard/estudiante/${p.id}`}
                  className="font-medium text-primary"
                >
                  {p.titulo}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {etiquetaPeriodo(p.periodo)}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                {estadoLabel(p.estado.codigo)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
