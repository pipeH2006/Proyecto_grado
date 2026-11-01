"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-5">
      <label className="space-y-1 text-sm">
        <span className="font-medium text-udec-accent">Correo electrónico</span>
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo@udec.edu.co"
          className="h-12 rounded-none border-0 border-b-2 border-input bg-transparent px-5 shadow-none placeholder:text-muted-foreground/60 focus-visible:border-udec-lima focus-visible:ring-0"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium text-udec-accent">Contraseña</span>
        <Input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="h-12 rounded-none border-0 border-b-2 border-input bg-transparent px-5 shadow-none placeholder:text-muted-foreground/60 focus-visible:border-udec-lima focus-visible:ring-0"
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        disabled={cargando}
        className="h-14 w-full rounded-lg bg-udec-lima font-semibold text-udec-accent hover:bg-udec-lima/90"
      >
        {cargando ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
