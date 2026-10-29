"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alternarPermiso, listarMatrizPermisos } from "@/actions/permisos";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { Permiso, RolConPermisos } from "@/lib/types/roles";

type AlternarInput = {
  rol_codigo: string;
  permiso_codigo: string;
  activo: boolean;
};

export function PermisosMatriz({
  permisos,
  matrizInicial,
}: {
  permisos: Permiso[];
  matrizInicial: RolConPermisos[];
}) {
  const queryClient = useQueryClient();

  const { data: matriz = matrizInicial } = useQuery({
    queryKey: queryKeys.permisos.matriz,
    queryFn: async () => (await listarMatrizPermisos()).data ?? [],
    placeholderData: matrizInicial,
  });

  const alternar = useMutation({
    mutationFn: async (input: AlternarInput) => {
      const resultado = await alternarPermiso(input);
      if (resultado.error) throw new Error(resultado.error.message);
      return resultado;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.permisos.matriz });
      const previo = queryClient.getQueryData<RolConPermisos[]>(
        queryKeys.permisos.matriz,
      );
      queryClient.setQueryData<RolConPermisos[]>(
        queryKeys.permisos.matriz,
        (actual) =>
          (actual ?? []).map((rol) =>
            rol.codigo !== input.rol_codigo
              ? rol
              : {
                  ...rol,
                  permisos: input.activo
                    ? [...new Set([...rol.permisos, input.permiso_codigo])]
                    : rol.permisos.filter((c) => c !== input.permiso_codigo),
                },
          ),
      );
      return { previo };
    },
    onError: (_error, _input, contexto) => {
      if (contexto?.previo) {
        queryClient.setQueryData(queryKeys.permisos.matriz, contexto.previo);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.permisos.all }),
  });

  const grupos = [
    ...permisos
      .reduce((mapa, permiso) => {
        const lista = mapa.get(permiso.grupo) ?? [];
        lista.push(permiso);
        mapa.set(permiso.grupo, lista);
        return mapa;
      }, new Map<string, Permiso[]>())
      .entries(),
  ].map(([grupo, items]) => ({ grupo, items }));

  function alternarCelda(rol: RolConPermisos, permiso: Permiso) {
    if (rol.codigo === "ADMINISTRADOR") return;

    const activo = rol.permisos.includes(permiso.codigo);
    if (
      activo &&
      rol.codigo === "COORDINADOR" &&
      permiso.codigo === "permiso.gestionar" &&
      !window.confirm(
        "Quitar este permiso deja a los coordinadores sin acceso a esta matriz. ¿Continuar?",
      )
    ) {
      return;
    }

    alternar.mutate({
      rol_codigo: rol.codigo,
      permiso_codigo: permiso.codigo,
      activo: !activo,
    });
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Permisos por rol</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Activa o desactiva capacidades por rol. El administrador siempre
          conserva todos los permisos.
        </p>
      </div>

      {alternar.error ? (
        <p className="text-sm text-red-600">{alternar.error.message}</p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3 text-left font-semibold">Permiso</th>
              {matriz.map((rol) => (
                <th
                  key={rol.codigo}
                  className="px-3 py-3 text-center font-semibold"
                >
                  {rol.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map(({ grupo, items }) => (
              <GrupoPermisos
                key={grupo}
                grupo={grupo}
                items={items}
                roles={matriz}
                ocupado={alternar.isPending}
                onAlternar={alternarCelda}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GrupoPermisos({
  grupo,
  items,
  roles,
  ocupado,
  onAlternar,
}: {
  grupo: string;
  items: Permiso[];
  roles: RolConPermisos[];
  ocupado: boolean;
  onAlternar: (rol: RolConPermisos, permiso: Permiso) => void;
}) {
  return (
    <>
      <tr className="bg-slate-100/70 dark:bg-slate-900/60">
        <td
          colSpan={roles.length + 1}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          {grupo}
        </td>
      </tr>
      {items.map((permiso) => (
        <tr
          key={permiso.codigo}
          className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
        >
          <td className="px-4 py-3">
            <p className="font-medium">{permiso.nombre}</p>
            {permiso.descripcion ? (
              <p className="text-xs text-slate-500">{permiso.descripcion}</p>
            ) : null}
          </td>
          {roles.map((rol) => {
            const activo = rol.permisos.includes(permiso.codigo);
            const bloqueado = rol.codigo === "ADMINISTRADOR" || ocupado;
            return (
              <td key={rol.codigo} className="px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={rol.codigo === "ADMINISTRADOR" ? true : activo}
                  disabled={bloqueado}
                  onChange={() => onAlternar(rol, permiso)}
                  aria-label={`${permiso.nombre} para ${rol.nombre}`}
                  className={cn(
                    "h-4 w-4 rounded border-slate-300 accent-slate-900 dark:border-slate-700 dark:accent-slate-100",
                    bloqueado && "cursor-not-allowed opacity-60",
                  )}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
