-- Ajustes por usuario (hoy: fecha de vencimiento del REPROCANN, para
-- recordatorios de renovación). Una fila por usuario.
-- Idempotente: se corre a mano en el SQL Editor.

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  reprocann_expires_on date,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recordatorios a nivel USUARIO ya enviados (análogo a sent_reminders, que es
-- por cultivo). Escribe solo el cron con service role: RLS habilitado sin
-- políticas deja la tabla inaccesible para los usuarios.

create table if not exists public.sent_user_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, dedupe_key)
);

create index if not exists sent_user_reminders_user_id_idx
  on public.sent_user_reminders (user_id);

alter table public.sent_user_reminders enable row level security;
