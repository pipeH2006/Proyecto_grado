"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ES_LOCAL =
  SUPABASE_URL.includes("127.0.0.1") || SUPABASE_URL.includes("localhost");

export function LoginButtons() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "enviado" | "error">(
    "idle",
  );

  function signIn(provider: Provider) {
    const supabase = createClient();
    void supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function enviarEnlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstado("enviando");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setEstado(error ? "error" : "enviado");
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => signIn("google")}
        className="min-h-12 rounded-lg border border-input bg-white px-4 py-2 text-sm font-medium text-udec-accent transition-colors hover:bg-secondary"
      >
        Continuar con Google
      </button>
      <button
        type="button"
        onClick={() => signIn("azure")}
        className="min-h-12 rounded-lg border border-input bg-white px-4 py-2 text-sm font-medium text-udec-accent transition-colors hover:bg-secondary"
      >
        Continuar con Microsoft 365
      </button>

      {ES_LOCAL && (
        <div className="mt-2 space-y-3 border-t border-dashed border-input pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Solo entorno local
          </p>
          <form onSubmit={enviarEnlace} className="flex flex-col gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu-correo@ejemplo.com"
              className="rounded-md border border-input bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={estado === "enviando"}
              className="rounded-md bg-udec-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-udec-accent/90 disabled:opacity-60"
            >
              {estado === "enviando" ? "Enviando…" : "Enviar enlace mágico"}
            </button>
          </form>
          {estado === "enviado" && (
            <p className="text-xs text-udec-accent">
              Enlace enviado. Ábrelo en Inbucket:{" "}
              <span className="font-mono">http://127.0.0.1:54424</span>
            </p>
          )}
          {estado === "error" && (
            <p className="text-xs text-destructive">
              No se pudo enviar el enlace. Revisa el correo e intenta de nuevo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
