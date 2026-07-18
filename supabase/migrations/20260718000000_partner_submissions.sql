-- Socios (Fase B): postulaciones self-serve de growshops/viveros.
-- El usuario carga una sugerencia (queda 'pending'); el admin la aprueba o
-- rechaza fuera de RLS (service role). Al aprobar, la fila se copia a
-- public.partners (el directorio público que lee /dashboard/socios).
-- Idempotente: se corre a mano en el SQL Editor.

create table if not exists public.partner_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'growshop',
  description text,
  city text,
  province text,
  url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists partner_submissions_user_idx
  on public.partner_submissions (user_id);
create index if not exists partner_submissions_status_idx
  on public.partner_submissions (status);

alter table public.partner_submissions enable row level security;

-- El usuario ve solo sus propias postulaciones.
drop policy if exists "partner_submissions_select_own" on public.partner_submissions;
create policy "partner_submissions_select_own" on public.partner_submissions
  for select to authenticated using (auth.uid() = user_id);

-- El usuario crea solo postulaciones propias y siempre en estado 'pending'
-- (no puede auto-aprobarse). La revisión la hace el admin fuera de RLS.
drop policy if exists "partner_submissions_insert_own" on public.partner_submissions;
create policy "partner_submissions_insert_own" on public.partner_submissions
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- Sin políticas de update/delete: la moderación pasa por el service role.
