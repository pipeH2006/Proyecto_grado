import { LoginButtons } from "./login-buttons";
import { LoginPassword } from "./login-password";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Iniciar sesion</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Usa tu cuenta institucional.
        </p>
      </div>

      <LoginPassword />

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        o
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <LoginButtons />
    </main>
  );
}
