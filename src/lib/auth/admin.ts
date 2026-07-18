import "server-only";

// El admin se identifica por su user_id de Supabase Auth, cargado en la env
// ADMIN_USER_ID (server-only, nunca NEXT_PUBLIC). Sin la env, no hay admin:
// isAdmin devuelve false y las funciones de moderación quedan bloqueadas.
export function isAdmin(userId: string | null | undefined): boolean {
  const adminId = process.env.ADMIN_USER_ID?.trim();
  if (!adminId || !userId) return false;
  return userId === adminId;
}
