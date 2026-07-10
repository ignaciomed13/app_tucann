import Link from "next/link";
import type { LogData, LogType } from "@/lib/supabase/database.types";
import { deleteLog } from "@/lib/logs/actions";
import { LOG_TYPE_LABELS } from "@/lib/logs/validation";
import { formatLogData } from "@/components/logs/log-fields";

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
    <ul className="flex flex-col gap-2">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 shadow-sm"
        >
          <div>
            <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-green-700">
              <span>
                {LOG_TYPE_LABELS[log.type]} · {log.log_date}
              </span>
              {log.plant_id && plantLabels[log.plant_id] && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] normal-case text-green-800">
                  🌱 {plantLabels[log.plant_id]}
                </span>
              )}
            </p>
            <p className="text-sm text-[color:var(--ink)]">
              {formatLogData(log.type, log.data)}
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
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`/dashboard/grows/${growId}/logs/${log.id}/edit`}
              className="text-xs font-medium text-green-700 hover:underline"
            >
              Editar
            </Link>
            <form action={deleteLog}>
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="grow_id" value={growId} />
              <button
                type="submit"
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Borrar
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
