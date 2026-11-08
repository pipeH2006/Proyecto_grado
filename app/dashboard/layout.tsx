import Link from "next/link";
import type { ReactNode } from "react";
import { MarcaUdec } from "@/components/domain/marca-udec";
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
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <Link
          href="/dashboard"
          aria-label="Inicio del panel de Anteproyectos UdeC"
          className="shrink-0 rounded-lg"
        >
          <MarcaUdec className="h-10 w-auto" />
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          {enlaces.map((enlace) => (
            <Link key={enlace.href} href={enlace.href}>
              {enlace.etiqueta}
            </Link>
          ))}
          <a href="/observatorio">Observatorio</a>
          <SalirBoton />
        </nav>
      </header>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
