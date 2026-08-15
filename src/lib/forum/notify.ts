import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/notify-user";
import {
  extractMentionCandidates,
  resolveMentions,
} from "@/lib/forum/mentions";

// Avisos del foro. Se notifica a dos tipos de destinatario:
//   - el autor del tema, cada vez que alguien le responde;
//   - cualquiera mencionado con @alias en el cuerpo (tanto al abrir un tema
//     como al responder).
// Quien escribe nunca se autonotifica, y si alguien cae por los dos motivos
// recibe un solo aviso.
//
// Todo esto es fire-and-forget: la publicación ya está guardada, así que un
// fallo del aviso solo se loguea (ver notifyUser).

const FORUM_PUSH: Parameters<typeof notifyUser>[2] = {
  // Una respuesta del foro no es tan urgente como un MP, pero sí pierde
  // sentido con los días: una semana de TTL y prioridad normal.
  urgency: "normal",
  ttlSeconds: 60 * 60 * 24 * 7,
};

// Recorta el texto para la línea del aviso. El cuerpo puede traer BBCode y
// tener 8000 caracteres; en una notificación entra una frase.
function preview(body: string, max = 120): string {
  const plain = body
    .replace(/\[\/?[a-z]+(?:=[^\]\n]+)?\]/gi, "") // etiquetas de formato
    .replace(/\[@([^\]\n]+)\]/g, "@$1") // menciones → forma legible
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

// Traduce los alias mencionados en el texto a user_ids. Devuelve un Map de
// user_id → alias, sin el propio autor.
//
// Necesita el admin client: user_settings tiene RLS de "solo lo propio", así
// que con el cliente del usuario no se puede resolver el alias de otro.
async function resolveMentionedUsers(
  body: string,
  authorId: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const candidates = extractMentionCandidates(body);
  if (candidates.length === 0) return result;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[forum-push] sin service role no hay menciones:", e);
    return result;
  }

  // Una sola consulta para todos los candidatos: ilike(any) compara sin
  // distinguir mayúsculas, igual que el índice único del alias. Cada valor va
  // entre comillas porque un alias puede tener espacios; que no pueda tener
  // comillas ni comas lo garantiza isPossibleAlias, por el que ya pasaron
  // todos los candidatos.
  const list = `{${candidates.map((c) => `"${c}"`).join(",")}}`;
  const { data, error } = await admin
    .from("user_settings")
    .select("user_id, forum_alias")
    .filter("forum_alias", "ilike(any)", list);

  if (error) {
    console.error("[forum-push] no se pudieron resolver los alias:", error);
    return result;
  }

  const rows = (data ?? []).filter(
    (r): r is { user_id: string; forum_alias: string } => !!r.forum_alias
  );
  const mentioned = resolveMentions(
    body,
    rows.map((r) => r.forum_alias)
  );
  const byLowerAlias = new Map(
    rows.map((r) => [r.forum_alias.toLowerCase(), r.user_id])
  );

  for (const alias of mentioned) {
    const userId = byLowerAlias.get(alias.toLowerCase());
    if (userId && userId !== authorId) result.set(userId, alias);
  }
  return result;
}

// Avisa por un tema recién creado: solo a los mencionados (todavía no hay
// nadie más involucrado).
export async function notifyNewThread(opts: {
  threadId: string;
  title: string;
  body: string;
  authorId: string;
  authorAlias: string;
}): Promise<void> {
  const mentioned = await resolveMentionedUsers(opts.body, opts.authorId);
  const url = `/dashboard/comunidad/${opts.threadId}`;

  for (const userId of mentioned.keys()) {
    await notifyUser(
      userId,
      {
        title: "💬 Te mencionaron en la comunidad",
        body: `${opts.authorAlias} te nombró en "${preview(opts.title, 60)}".`,
        url,
      },
      FORUM_PUSH,
      "forum-push"
    );
  }
}

// Avisa por una respuesta: al autor del tema y a los mencionados.
export async function notifyNewPost(opts: {
  threadId: string;
  body: string;
  authorId: string;
  authorAlias: string;
}): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[forum-push] sin service role no hay avisos del foro:", e);
    return;
  }

  const { data: thread, error } = await admin
    .from("forum_threads")
    .select("title, author_id")
    .eq("id", opts.threadId)
    .maybeSingle();

  if (error) {
    console.error("[forum-push] no se pudo leer el tema:", error);
    return;
  }
  if (!thread) return;

  const mentioned = await resolveMentionedUsers(opts.body, opts.authorId);
  const url = `/dashboard/comunidad/${opts.threadId}`;
  const title = preview(thread.title, 60);

  // Una mención gana sobre "te respondieron": es más específica. Por eso el
  // autor del tema recibe el aviso de respuesta solo si no está mencionado.
  for (const userId of mentioned.keys()) {
    await notifyUser(
      userId,
      {
        title: "💬 Te mencionaron en la comunidad",
        body: `${opts.authorAlias} te nombró en "${title}": ${preview(opts.body, 80)}`,
        url,
      },
      FORUM_PUSH,
      "forum-push"
    );
  }

  // author_id es null si quien abrió el tema borró su cuenta: el tema sigue
  // publicado bajo su alias, pero ya no hay a quién avisarle.
  const threadAuthorId = thread.author_id;
  if (
    threadAuthorId &&
    threadAuthorId !== opts.authorId &&
    !mentioned.has(threadAuthorId)
  ) {
    await notifyUser(
      threadAuthorId,
      {
        title: "💬 Respondieron tu tema",
        body: `${opts.authorAlias} respondió en "${title}": ${preview(opts.body, 80)}`,
        url,
      },
      FORUM_PUSH,
      "forum-push"
    );
  }
}
