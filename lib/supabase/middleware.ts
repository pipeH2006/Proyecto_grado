import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const esRutaProtegida =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (!user && esRutaProtegida) {
    return redirigir(request, response, "/login");
  }

  if (user && pathname === "/login") {
    return redirigir(request, response, "/dashboard");
  }

  return response;
}

// Conserva las cookies (sesion refrescada) al redirigir; perderlas romperia el
// login en el siguiente request.
function redirigir(
  request: NextRequest,
  response: NextResponse,
  destino: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";

  const redireccion = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  return redireccion;
}
