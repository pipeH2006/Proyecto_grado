import Link from "next/link";
import { listarMatrizPermisos, listarPermisos } from "@/actions/permisos";
import { PermisosMatriz } from "@/components/domain/permisos-matriz";
import { requerirGestor, requerirPermiso } from "@/lib/auth";

export default async function PermisosPage() {
  await requerirGestor();
  await requerirPermiso("permiso.gestionar");

  const [permisos, matriz] = await Promise.all([
    listarPermisos(),
    listarMatrizPermisos(),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link
          href="/dashboard/coordinador"
          className="text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          ← Panel coordinador
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Roles y permisos</h1>
      </div>

      <PermisosMatriz
        permisos={permisos.data ?? []}
        matrizInicial={matriz.data ?? []}
      />
    </div>
  );
}
