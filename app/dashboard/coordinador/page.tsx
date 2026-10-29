import Link from "next/link";
import {
  listarDocentes,
  listarProyectosAsignables,
  listarRolesParticipacion,
} from "@/actions/asignaciones";
import { buscarPersonas, listarRoles } from "@/actions/roles";
import { AsignarEvaluador } from "@/components/domain/asignar-evaluador";
import { RolesPersonas } from "@/components/domain/roles-personas";
import {
  permisosActuales,
  requerirGestor,
  tienePermiso,
} from "@/lib/auth";

export default async function CoordinadorPage() {
  await requerirGestor();
  const permisos = await permisosActuales();

  const [roles, personas, docentes, proyectos, rolesParticipacion] =
    await Promise.all([
      listarRoles(),
      buscarPersonas(""),
      listarDocentes(),
      listarProyectosAsignables(),
      listarRolesParticipacion(),
    ]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Panel coordinador</h1>
        {tienePermiso(permisos, "permiso.gestionar") ? (
          <Link
            href="/dashboard/coordinador/permisos"
            className="text-sm font-medium text-brand-600 dark:text-brand-400"
          >
            Roles y permisos
          </Link>
        ) : null}
      </div>

      <RolesPersonas
        roles={roles.data ?? []}
        personasIniciales={personas.data ?? []}
      />

      <AsignarEvaluador
        proyectos={proyectos.data ?? []}
        docentes={docentes.data ?? []}
        rolesParticipacion={rolesParticipacion.data ?? []}
      />
    </div>
  );
}
