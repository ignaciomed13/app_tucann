import Link from "next/link";

// Botón para iniciar un MP con el autor. Solo aparece si no sos vos: nunca hay
// un directorio de usuarios, se escribe desde el mensaje de alguien.
export function DmLink({
  authorId,
  alias,
  myId,
}: {
  authorId: string;
  alias: string;
  myId: string;
}) {
  if (authorId === myId) return null;
  return (
    <Link
      href={`/dashboard/mensajes/${authorId}?alias=${encodeURIComponent(alias)}`}
      className="ml-2 rounded-full border border-green-700 px-2 py-0.5 text-[11px] font-bold text-green-800 transition hover:bg-green-50"
    >
      ✉️ Mensaje
    </Link>
  );
}
