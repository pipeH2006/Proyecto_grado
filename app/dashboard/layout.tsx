import Link from "next/link";
import type { ReactNode } from "react";
import { SalirBoton } from "@/components/domain/salir-boton";
import { esGestor, PANELES, rolesActuales } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const roles = await rolesActuales();
  const gestor = esGestor(roles);
  const enlaces = PANELES.filter((p) => gestor || roles.includes(p.codigo));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          Anteproyectos
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
          {enlaces.map((enlace) => (
            <Link key={enlace.href} href={enlace.href}>
              {enlace.etiqueta}
            </Link>
          ))}
          <SalirBoton />
        </nav>
      </header>
      {children}
    </div>
  );
}
