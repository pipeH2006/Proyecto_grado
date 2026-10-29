import { redirect } from "next/navigation";
import { panelPorRol, rolesActuales } from "@/lib/auth";

export default async function DashboardPage() {
  const roles = await rolesActuales();
  const destino = panelPorRol(roles);
  if (destino) redirect(destino);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
      <p className="text-slate-600 dark:text-slate-300">
        Tu usuario aun no tiene un rol asignado. Pidele al coordinador que te
        asigne uno.
      </p>
    </div>
  );
}
