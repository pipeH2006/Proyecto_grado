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
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-lg border border-input px-4 text-sm font-medium text-udec-accent transition-colors hover:bg-secondary"
          >
            Acceso institucional
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
