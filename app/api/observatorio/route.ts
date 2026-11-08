import { NextResponse } from "next/server";
import { leerObservatorio } from "@/lib/observatorio/lectura";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const datos = await leerObservatorio();
    return NextResponse.json(datos, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Observatorio: no se pudo leer Supabase", error);
    return NextResponse.json({ error: "No se pudieron leer los proyectos" }, { status: 503 });
  }
}
