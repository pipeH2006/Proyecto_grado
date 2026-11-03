import { estadoLabel } from "@/lib/estados";

const TRANSICIONES: Record<string, { destino: string; rol: string }[]> = {
  BORRADOR: [{ destino: "RADICADO", rol: "ESTUDIANTE" }],
  RADICADO: [{ destino: "EN_REVISION", rol: "COORDINADOR" }],
  EN_REVISION: [
    { destino: "APROBADO", rol: "COORDINADOR" },
    { destino: "RECHAZADO", rol: "COORDINADOR" },
  ],
  APROBADO: [{ destino: "EN_DESARROLLO", rol: "COORDINADOR" }],
  EN_DESARROLLO: [],
  SUSTENTADO: [],
};

export function destinosEstadoPermitidos(
  estado: string,
  rolesUsuario: string[],
  esAutor = false,
): { codigo: string; etiqueta: string }[] {
  const puedeCoordinar = rolesUsuario.some((rol) =>
    ["COORDINADOR", "ADMINISTRADOR"].includes(rol),
  );
  return (TRANSICIONES[estado] ?? [])
    .filter(({ rol }) => {
      if (rol === "ESTUDIANTE") {
        return esAutor && rolesUsuario.includes("ESTUDIANTE");
      }
      if (rol === "COORDINADOR") return puedeCoordinar;
      return false;
    })
    .map(({ destino }) => ({
      codigo: destino,
      etiqueta: estadoLabel(destino),
    }));
}
