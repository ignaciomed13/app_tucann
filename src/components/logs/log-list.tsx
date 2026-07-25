import Link from "next/link";
import type { LogData, LogType } from "@/lib/supabase/database.types";
import { deleteLog } from "@/lib/logs/actions";
import { LOG_TYPE_LABELS } from "@/lib/logs/validation";
import { LOG_APPEARANCE } from "@/lib/logs/appearance";
import { formatLogData } from "@/lib/logs/format";

// "2026-06-18" → "18 jun", sin depender del huso del servidor.
function shortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

export interface LogRow {
  id: string;
  type: LogType;
  log_date: string;
  data: LogData;
  plant_id?: string | null;
}

export function LogList({
  growId,
  logs,
  photoUrls = {},
  plantLabels = {},
}: {
  growId: string;
  logs: LogRow[];
  photoUrls?: Record<string, string>;
  plantLabels?: Record<string, string>;
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl bg-white/60 px-4 py-6 text-center text-sm text-[color:var(--muted)]">
        Todavía no hay logs para este cultivo.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {logs.map((log) => {
        const { emoji, accent } = LOG_APPEARANCE[log.type];
        return (
        <li
          key={log.id}
          style={{ borderLeftColor: accent }}
          className="flex items-start justify-between gap-3 rounded-2xl border border-l-4 border-[color:var(--border)] bg-white px-3.5 py-3 shadow-sm"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <span aria-hidden className="text-xl leading-none">
              {emoji}
            </span>
            <div className="min-w-0">
            <p className="text-sm font-bold text-[color:var(--ink)]">
              {formatLogData(log.type, log.data)}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--faint)]">
              <span>{LOG_TYPE_LABELS[log.type]}</span>
              {log.plant_id && plantLabels[log.plant_id] && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-800">
                  🌱 {plantLabels[log.plant_id]}
                </span>
              )}
            </p>
            {(() => {
              const paths =
                (log.data as { photos?: string[] } | null)?.photos ?? [];
              if (paths.length === 0) return null;
              return (
                <div className="mt-2 flex flex-wrap gap-2">
                  {paths.map((path) =>
                    photoUrls[path] ? (
                      <a
                        key={path}
                        href={photoUrls[path]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrls[path]}
                          alt="foto del log"
                          className="h-16 w-16 rounded-lg border border-[color:var(--border)] object-cover"
                        />
                      </a>
                    ) : null
                  )}
                </div>
              );
            })()}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs text-[color:var(--faint)]">
              {shortDate(log.log_date)}
            </span>
            <div className="flex items-center gap-2.5">
              <Link
                href={`/dashboard/grows/${growId}/logs/${log.id}/edit`}
                className="text-[11px] font-medium text-green-700 hover:underline"
              >
                Editar
              </Link>
              <form action={deleteLog}>
                <input type="hidden" name="log_id" value={log.id} />
                <input type="hidden" name="grow_id" value={growId} />
                <button
                  type="submit"
                  className="text-[11px] font-medium text-red-600 hover:underline"
                >
                  Borrar
                </button>
              </form>
            </div>
          </div>
        </li>
        );
      })}
    </ul>
  );
}
