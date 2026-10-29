import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Indica si una vigencia `daterange` (tal como la devuelve PostgREST) cubre hoy.
 * Ej: "[2026-10-15,)" o "[2026-10-15,2026-12-01)". El limite superior es
 * exclusivo, como corresponde al rango '[)' de la DB.
 */
export function vigenteHoy(vigencia: unknown): boolean {
  if (typeof vigencia !== "string") return false;
  const match = /^[[(]([^,]*),([^)\]]*)[\])]$/.exec(vigencia);
  if (!match) return false;

  const hoy = new Date().toISOString().slice(0, 10);
  const desde = match[1].replace(/"/g, "");
  const hasta = match[2].replace(/"/g, "");

  return (desde === "" || desde <= hoy) && (hasta === "" || hasta > hoy);
}
