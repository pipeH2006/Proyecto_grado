"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  asignarParticipacion,
  listarAsignacionesProyecto,
} from "@/actions/asignaciones";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { DocenteOpcion, OpcionProyecto, Rol } from "@/lib/types/roles";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function AsignarEvaluador({
  proyectos,
  docentes,
  rolesParticipacion,
}: {
  proyectos: OpcionProyecto[];
  docentes: DocenteOpcion[];
  rolesParticipacion: Rol[];
}) {
  const queryClient = useQueryClient();
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [proyectoId, setProyectoId] = useState<number | "">("");
  const [personaId, setPersonaId] = useState("");
  const [rolId, setRolId] = useState<number | "">(
    () =>
      rolesParticipacion.find((r) => r.codigo === "EVALUADOR")?.id ??
      rolesParticipacion[0]?.id ??
      "",
  );

  const proyectoSeleccionado = proyectoId === "" ? 0 : proyectoId;

  const { data: asignaciones = [], isFetching } = useQuery({
    queryKey: queryKeys.asignaciones.porProyecto(proyectoSeleccionado),
    queryFn: async () =>
      (await listarAsignacionesProyecto(proyectoSeleccionado)).data ?? [],
    enabled: proyectoId !== "",
  });

  const asignar = useMutation({
    mutationFn: asignarParticipacion,
    onSuccess: (result) => {
      if (result.error || proyectoId === "") return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.asignaciones.porProyecto(proyectoId),
      });
    },
  });

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (proyectoId === "" || !personaId || rolId === "") return;
    asignar.mutate({
      proyecto_id: proyectoId,
      persona_id: personaId,
      rol_participacion_id: rolId,
    });
  }

  const sinDatos = proyectos.length === 0 || docentes.length === 0;

  const proyectosFiltrados = useMemo(() => {
    const termino = normalizar(filtroProyecto.trim());
    if (!termino) return proyectos;
    return proyectos.filter((proyecto) =>
      normalizar(proyecto.titulo).includes(termino),
    );
  }, [filtroProyecto, proyectos]);

  function cambiarFiltro(event: React.ChangeEvent<HTMLInputElement>) {
    setFiltroProyecto(event.target.value);
    setProyectoId("");
    setMostrarResultados(true);
  }

  function seleccionarProyecto(proyecto: OpcionProyecto) {
    setProyectoId(proyecto.id);
    setFiltroProyecto(proyecto.titulo);
    setMostrarResultados(false);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Asignar participante</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          RF-04. Asignar cierra la vigencia anterior de esa persona en el proyecto
          y abre una nueva desde hoy.
        </p>
      </div>

      {sinDatos ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Necesitas al menos un proyecto y una persona con rol Docente.
        </p>
      ) : (
        <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-4">
          <div className="relative">
            <Input
              aria-label="Buscar proyecto"
              value={filtroProyecto}
              onChange={cambiarFiltro}
              onFocus={() => setMostrarResultados(true)}
              onBlur={() => setTimeout(() => setMostrarResultados(false), 150)}
              placeholder="Buscar proyecto…"
              autoComplete="off"
            />
            {mostrarResultados && filtroProyecto.trim() ? (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {proyectosFiltrados.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-500">
                    Sin resultados.
                  </li>
                ) : (
                  proyectosFiltrados.slice(0, 10).map((proyecto) => (
                    <li key={proyecto.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => seleccionarProyecto(proyecto)}
                        className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="truncate font-medium">
                          {proyecto.titulo}
                        </span>
                        <span className="text-xs text-slate-500">
                          {proyecto.estado}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <select
            value={personaId}
            onChange={(event) => setPersonaId(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Docente…</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.apellidos}, {d.nombres}
              </option>
            ))}
          </select>

          <select
            value={rolId}
            onChange={(event) =>
              setRolId(event.target.value === "" ? "" : Number(event.target.value))
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {rolesParticipacion.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={asignar.isPending || proyectoId === "" || !personaId}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {asignar.isPending ? "Asignando…" : "Asignar"}
          </button>
        </form>
      )}

      {asignar.data?.error ? (
        <p className="text-sm text-red-600">{asignar.data.error.message}</p>
      ) : null}

      {proyectoId !== "" ? (
        <div className="space-y-2">
          <Link
            href={`/dashboard/coordinador/proyectos/${proyectoId}`}
            className="text-sm text-brand-600 dark:text-brand-400"
          >
            Ver requisitos y documentos de este proyecto →
          </Link>
          {isFetching ? (
            <p className="text-xs text-slate-500">Cargando asignaciones…</p>
          ) : null}
          {asignaciones.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-300">
              Sin asignaciones registradas.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {asignaciones.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span>
                    {a.persona.nombres} {a.persona.apellidos}
                    <span className="text-slate-500"> · {a.rol_participacion}</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      a.vigente
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                    )}
                  >
                    {a.vigente ? "Vigente" : "Historica"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
