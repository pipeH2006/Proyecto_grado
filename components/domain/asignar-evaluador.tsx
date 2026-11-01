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
        <p className="text-sm text-muted-foreground">
          RF-04. Asignar cierra la vigencia anterior de esa persona en el proyecto
          y abre una nueva desde hoy.
        </p>
      </div>

      {sinDatos ? (
        <p className="rounded-md border border-udec-warning/50 bg-udec-warning/10 p-3 text-sm text-udec-accent">
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
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-white py-1 shadow-lg">
                {proyectosFiltrados.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    Sin resultados.
                  </li>
                ) : (
                  proyectosFiltrados.slice(0, 10).map((proyecto) => (
                    <li key={proyecto.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => seleccionarProyecto(proyecto)}
                        className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-secondary"
                      >
                        <span className="truncate font-medium">
                          {proyecto.titulo}
                        </span>
                        <span className="text-xs text-muted-foreground">
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
            className="rounded-md border border-input bg-white px-3 py-2 text-sm"
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
            className="rounded-md border border-input bg-white px-3 py-2 text-sm"
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
            className="rounded-md bg-udec-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-udec-accent/90 disabled:opacity-60"
          >
            {asignar.isPending ? "Asignando…" : "Asignar"}
          </button>
        </form>
      )}

      {asignar.data?.error ? (
        <p className="text-sm text-destructive">{asignar.data.error.message}</p>
      ) : null}

      {proyectoId !== "" ? (
        <div className="space-y-2">
          <Link
            href={`/dashboard/coordinador/proyectos/${proyectoId}`}
            className="text-sm text-primary"
          >
            Ver requisitos y documentos de este proyecto →
          </Link>
          {isFetching ? (
            <p className="text-xs text-muted-foreground">Cargando asignaciones…</p>
          ) : null}
          {asignaciones.length === 0 ? (
            <p className="text-muted-foreground">
              Sin asignaciones registradas.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {asignaciones.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span>
                    {a.persona.nombres} {a.persona.apellidos}
                    <span className="text-muted-foreground"> · {a.rol_participacion}</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      a.vigente
                        ? "bg-udec-success/10 text-udec-accent"
                        : "bg-secondary text-muted-foreground",
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
