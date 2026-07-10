-- Historial de análisis IA (Tucu): cada fila guarda una respuesta generada
-- para un cultivo. Permite ver el último análisis al volver a entrar, evitar
-- llamadas repetidas a Gemini el mismo día (cooldown) y que Tucu lo
-- referencie en sus consejos. Idempotente: se corre a mano en el SQL Editor.

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grow_id uuid not null references public.grows (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists analyses_grow_created_idx
  on public.analyses (grow_id, created_at desc);

create index if not exists analyses_user_id_idx
  on public.analyses (user_id);

alter table public.analyses enable row level security;

drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own" on public.analyses
  for select using (auth.uid() = user_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own" on public.analyses
  for insert with check (auth.uid() = user_id);

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own" on public.analyses
  for delete using (auth.uid() = user_id);
