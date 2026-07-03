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
}

export function LogList({ growId, logs }: { growId: string; logs: LogRow[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Todavía no hay logs para este cultivo.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex items-start justify-between gap-3 rounded border border-neutral-200 px-3 py-2"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {LOG_TYPE_LABELS[log.type]} · {log.log_date}
            </p>
            <p className="text-sm">{formatLogData(log.type, log.data)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/dashboard/grows/${growId}/logs/${log.id}/edit`}
              className="text-xs underline"
            >
              Editar
            </Link>
            <form action={deleteLog}>
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="grow_id" value={growId} />
              <button type="submit" className="text-xs text-red-600 underline">
                Borrar
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
