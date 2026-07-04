"use client";

import { deleteGrow } from "@/lib/grows/actions";

export function DeleteGrowButton({
  growId,
  growName,
}: {
  growId: string;
  growName: string;
}) {
  return (
    <form
      action={deleteGrow}
      onSubmit={(e) => {
        if (
          !confirm(
            `¿Borrar "${growName}" y todos sus logs? Esta acción no se puede deshacer.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="grow_id" value={growId} />
      <button
        type="submit"
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50"
      >
        Borrar cultivo
      </button>
    </form>
  );
}
