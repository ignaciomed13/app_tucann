import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Busca alias del foro para el autocompletado de menciones (@).
//
// Necesita el admin client: user_settings tiene RLS de "solo lo propio", así
// que ningún usuario puede leer el alias de otro con su propio cliente.
//
// Qué expone y por qué está acotado: los alias del foro ya son públicos entre
// miembros (aparecen firmando cada tema y cada respuesta), pero este endpoint
// además permitiría enumerar los de quienes nunca publicaron. Por eso pide
// sesión, exige al menos 2 caracteres de búsqueda y devuelve como mucho 8
// resultados: alcanza para completar un nombre, no para bajarse el padrón.
export const runtime = "nodejs";

const MIN_QUERY = 2;
const MAX_RESULTS = 8;

// Un alias a medio escribir: los mismos caracteres que un alias completo, sin
// el mínimo de largo. Lo que no entre acá no se busca.
const PARTIAL_ALIAS = /^[a-zA-Z0-9ñÑ._\- ]{1,24}$/;

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY) return NextResponse.json({ aliases: [] });

  if (!PARTIAL_ALIAS.test(q)) return NextResponse.json({ aliases: [] });

  // "_" es un comodín de LIKE (matchea cualquier carácter) y además es válido
  // dentro de un alias, así que hay que escaparlo: si no, buscar "__" listaría
  // alias cualesquiera en vez de los que empiezan con guión bajo.
  const prefix = q.replace(/[\\_]/g, "\\$&");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    // Sin service role no hay autocompletado; el editor lo trata como "sin
    // resultados" y se puede seguir escribiendo la mención a mano.
    return NextResponse.json({ aliases: [] });
  }

  const { data, error } = await admin
    .from("user_settings")
    .select("forum_alias")
    .ilike("forum_alias", `${prefix}%`)
    .neq("user_id", user.id)
    .order("forum_alias")
    .limit(MAX_RESULTS);

  if (error) {
    console.error("[forum-aliases] falló la búsqueda:", error);
    return NextResponse.json({ aliases: [] });
  }

  const aliases = (data ?? [])
    .map((r) => r.forum_alias)
    .filter((a): a is string => !!a);

  return NextResponse.json({ aliases });
}
