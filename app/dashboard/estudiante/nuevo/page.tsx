import { createClient } from "@/lib/supabase/server";
import { ProyectoForm } from "@/components/domain/proyecto-form";
import { requerirRol } from "@/lib/auth";

export default async function NuevoProyectoPage() {
  await requerirRol(["ESTUDIANTE"]);
  const supabase = await createClient();

  const [
    { data: programas },
    { data: sedes },
    { data: programaSede },
    { data: modalidades },
    { data: periodos },
  ] = await Promise.all([
    supabase
      .from("programas")
      .select("id, nombre, facultad")
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("sede")
      .select("id, nombre")
      .eq("activa", true)
      .order("id"),
    supabase
      .from("programa_sede")
      .select("programa_id, sede_id")
      .eq("activa", true),
    supabase
      .from("modalidad")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre"),
    supabase
      .from("periodo_academico")
      .select("id, anio, semestre")
      .order("anio", { ascending: false })
      .order("semestre", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Nuevo anteproyecto</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Registra los metadatos. El documento PDF se carga despues.
        </p>
      </div>
      <ProyectoForm
        programas={programas ?? []}
        sedes={sedes ?? []}
        programaSede={programaSede ?? []}
        modalidades={modalidades ?? []}
        periodos={periodos ?? []}
      />
    </div>
  );
}
