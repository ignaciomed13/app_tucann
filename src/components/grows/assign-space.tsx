import Link from "next/link";
import { assignGrowToSpace } from "@/lib/spaces/actions";

// Control simple (server action) para asignar el cultivo a un espacio.
export function AssignSpace({
  growId,
  currentSpaceId,
  spaces,
}: {
  growId: string;
  currentSpaceId: string | null;
  spaces: { id: string; name: string }[];
}) {
  if (spaces.length === 0) {
    return (
      <p className="text-xs text-[color:var(--muted)]">
        Sin espacios creados.{" "}
        <Link href="/dashboard/spaces" className="font-medium text-green-700 underline">
          Creá una carpa/indoor
        </Link>{" "}
        para asignarle este cultivo.
      </p>
    );
  }

  return (
    <form action={assignGrowToSpace} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="grow_id" value={growId} />
      <label className="text-[color:var(--muted)]">Espacio:</label>
      <select
        name="space_id"
        defaultValue={currentSpaceId ?? ""}
        className="rounded-lg border border-[color:var(--border)] px-2 py-1"
      >
        <option value="">Ninguno</option>
        {spaces.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-green-800"
      >
        Guardar
      </button>
    </form>
  );
}
