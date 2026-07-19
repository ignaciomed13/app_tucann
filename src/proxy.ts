import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup"];
// Abiertas para todos: no exigen sesión y tampoco expulsan al que la tiene
// (a diferencia de PUBLIC_ROUTES, que redirige a /dashboard si estás logueado).
const OPEN_ROUTES = ["/privacidad"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // La raíz "/" es el landing público. Se compara exacto: no se puede meter "/"
  // en PUBLIC_ROUTES porque startsWith("/") haría pública toda la app.
  const isPublicRoute =
    path === "/" || PUBLIC_ROUTES.some((route) => path.startsWith(route));
  const isOpenRoute = OPEN_ROUTES.some((route) => path.startsWith(route));

  if (isOpenRoute) {
    return response;
  }

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Excluimos los archivos de la PWA (manifest y service worker) para que el
  // navegador pueda leerlos sin sesión; si no, el auth los redirige a /login
  // y Chrome no puede leer los íconos del manifest (ícono de instalación roto).
  // .well-known/assetlinks.json debe ser público: Android lo lee para verificar
  // que la app TWA es dueña del dominio (si redirige, la app muestra barra de URL).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
