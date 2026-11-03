import Link from "next/link";
import { MarcaUdec } from "@/components/domain/marca-udec";
import { LoginButtons } from "./login-buttons";
import { LoginPassword } from "./login-password";
import { LoginVisual } from "./login-visual";

export default function LoginPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-dvh bg-background p-3 sm:p-5 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-5"
    >
      <section className="flex min-h-[calc(100dvh-2rem)] flex-col px-2 py-4 sm:px-8 lg:min-h-[calc(100dvh-2.5rem)] lg:px-10 lg:py-2 xl:px-16">
        <Link
          href="/"
          aria-label="Volver al catálogo público"
          className="w-fit rounded-lg"
        >
          <MarcaUdec className="h-14 w-auto sm:h-16" />
        </Link>

        <div className="mx-auto my-auto w-full max-w-[650px] space-y-7 py-12">
          <header className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-udec-accent sm:text-4xl">
              Bienvenido
            </h1>
            <p className="text-lg text-udec-accent/80 sm:text-xl">
              Ingresa con tu cuenta institucional
            </p>
          </header>

          <LoginPassword />

          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            o continúa con
            <span className="h-px flex-1 bg-border" />
          </div>

          <LoginButtons />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>Derechos reservados {new Date().getFullYear()}</p>
          <a
            href="https://www.ucundinamarca.edu.co/aviso-de-privacidad/"
            target="_blank"
            rel="noreferrer"
            className="rounded-sm underline-offset-4 hover:text-primary hover:underline"
          >
            Políticas de privacidad
          </a>
        </footer>
      </section>

      <LoginVisual />
    </main>
  );
}
