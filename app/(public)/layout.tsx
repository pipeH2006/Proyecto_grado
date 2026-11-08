import Link from "next/link";
import type { ReactNode } from "react";
import { MarcaUdec } from "@/components/domain/marca-udec";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/"
            aria-label="Anteproyectos UdeC, inicio"
            className="shrink-0 rounded-lg"
          >
            <MarcaUdec className="h-12 w-auto" />
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            <a href="/observatorio" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-udec-accent transition-colors hover:bg-secondary">
              Observatorio
            </a>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-lg border border-input px-4 text-sm font-medium text-udec-accent transition-colors hover:bg-secondary"
            >
              Acceso institucional
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
