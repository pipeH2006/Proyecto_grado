"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  confirmarSolicitudSustentacion,
  listarSolicitudSustentacion,
  solicitarSustentacion,
  type SolicitudSustentacionVista,
} from "@/actions/sustentacion";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";

const ESTADO_SOLICITUD: Record<string, string> = {
  PENDIENTE_DIRECTOR: "Pendiente de confirmacion del director",
  PENDIENTE_JURADO: "Confirmada, pendiente de apertura por el jurado",
  APROBADA: "Aprobada por el jurado",
  REQUIERE_AJUSTES: "Requiere ajustes",
};

export function SustentacionPanel({
  proyectoId,
  proyectoEstado,
  esAutor,
  esDirector,
  solicitudInicial,
  requisitosObligatoriosAprobados,
}: {
  proyectoId: number;
  proyectoEstado: string;
  esAutor: boolean;
  esDirector: boolean;
  solicitudInicial: SolicitudSustentacionVista | null;
  requisitosObligatoriosAprobados: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const solicitudKey = queryKeys.sustentacion.solicitud(proyectoId);
  const solicitud = useQuery({
    queryKey: solicitudKey,
    queryFn: async () => {
      const resultado = await listarSolicitudSustentacion(proyectoId);
      if (resultado.error) throw new Error(resultado.error.message);
      return resultado.data;
    },
    initialData: solicitudInicial,
  });

  const actualizar = async () => {
    await queryClient.invalidateQueries({ queryKey: solicitudKey });
    router.refresh();
  };
  const solicitar = useMutation({
    mutationFn: () => solicitarSustentacion(proyectoId),
    onSuccess: async (resultado) => {
      if (!resultado.error) await actualizar();
    },
  });
  const confirmar = useMutation({
    mutationFn: (id: number) => confirmarSolicitudSustentacion(id),
    onSuccess: async (resultado) => {
      if (!resultado.error) await actualizar();
    },
  });

  const error =
    solicitud.error?.message ??
    solicitar.data?.error?.message ??
    confirmar.data?.error?.message;
  const solicitudPendienteDirector =
    solicitud.data?.estado === "PENDIENTE_DIRECTOR"
      ? solicitud.data
      : null;

  if (!esAutor && !esDirector) return null;

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-lg font-semibold">Solicitud de sustentacion</h2>
        <p className="text-sm text-muted-foreground">
          La solicitud se habilita al aprobarse todos los requisitos
          obligatorios. El director confirma y luego el jurado gestiona el
          intento.
        </p>
      </div>

      {solicitud.data ? (
        <p className="text-sm">
          Estado: {ESTADO_SOLICITUD[solicitud.data.estado] ?? solicitud.data.estado}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay una solicitud de sustentacion activa.
        </p>
      )}

      {esAutor &&
      proyectoEstado === "EN_DESARROLLO" &&
      solicitud.data?.estado !== "PENDIENTE_DIRECTOR" &&
      solicitud.data?.estado !== "PENDIENTE_JURADO" ? (
        requisitosObligatoriosAprobados ? (
          <Button
            type="button"
            disabled={solicitar.isPending}
            onClick={() => solicitar.mutate()}
          >
            {solicitar.isPending ? "Enviando…" : "Solicitar sustentacion"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aun faltan requisitos obligatorios por aprobar.
          </p>
        )
      ) : null}

      {esDirector && solicitudPendienteDirector ? (
        <Button
          type="button"
          disabled={confirmar.isPending}
          onClick={() => confirmar.mutate(solicitudPendienteDirector.id)}
        >
          {confirmar.isPending ? "Confirmando…" : "Confirmar preparacion"}
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
