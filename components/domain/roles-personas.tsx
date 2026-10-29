"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { asignarRol, buscarPersonas, quitarRol } from "@/actions/roles";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { PersonaConRoles, Rol } from "@/lib/types/roles";

export function RolesPersonas({
  roles,
  personasIniciales,
}: {
  roles: Rol[];
  personasIniciales: PersonaConRoles[];
}) {
  const queryClient = useQueryClient();
  const [borrador, setBorrador] = useState("");
  const [consulta, setConsulta] = useState("");

  const { data: personas = [], isFetching } = useQuery({
    queryKey: queryKeys.persona.busqueda(consulta),
    queryFn: async () => (await buscarPersonas(consulta)).data ?? [],
    placeholderData: (previos) => previos ?? personasIniciales,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.persona.all });

  const asignar = useMutation({ mutationFn: asignarRol, onSuccess: invalidar });
  const quitar = useMutation({ mutationFn: quitarRol, onSuccess: invalidar });

  const error = asignar.data?.error ?? quitar.data?.error;
  const ocupado = asignar.isPending || quitar.isPending;

  function alternar(persona: PersonaConRoles, rol: Rol) {
    const payload = { persona_id: persona.id, rol_codigo: rol.codigo };
    if (persona.roles.includes(rol.codigo)) quitar.mutate(payload);
    else asignar.mutate(payload);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Roles de personas</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Busca por correo o nombre y activa o desactiva los roles.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setConsulta(borrador.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={borrador}
          onChange={(event) => setBorrador(event.target.value)}
          placeholder="correo@udec.edu.co o nombre"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Buscar
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}
      {isFetching ? (
        <p className="text-xs text-slate-500">Buscando…</p>
      ) : null}

      {personas.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-300">Sin resultados.</p>
      ) : (
        <ul className="space-y-3">
          {personas.map((persona) => (
            <li
              key={persona.id}
              className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"
            >
              <div>
                <p className="font-medium">
                  {persona.nombres} {persona.apellidos}
                </p>
                <p className="text-xs text-slate-500">
                  {persona.email ?? "Sin correo"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {roles.map((rol) => {
                  const activo = persona.roles.includes(rol.codigo);
                  return (
                    <button
                      key={rol.codigo}
                      type="button"
                      disabled={ocupado}
                      onClick={() => alternar(persona, rol)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                        activo
                          ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                          : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                      )}
                    >
                      {rol.nombre}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
