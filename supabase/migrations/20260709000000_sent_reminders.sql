-- Registro de recordatorios push enviados por el cron, para no repetir el
-- mismo aviso (ej. riego pendiente) en corridas sucesivas. Escribe solo el
-- cron con service role: RLS habilitado sin políticas deja la tabla
-- inaccesible para los usuarios.

create table public.sent_reminders (
  id uuid primary key default gen_random_uuid(),
  grow_id uuid not null references public.grows (id) on delete cascade,
  kind text not null,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  unique (grow_id, kind, dedupe_key)
);

create index sent_reminders_grow_id_idx on public.sent_reminders (grow_id);

alter table public.sent_reminders enable row level security;
