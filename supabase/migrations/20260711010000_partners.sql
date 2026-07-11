-- Socios (Fase A): directorio curado a mano de growshops y afines.
-- Sin alta self-serve ni pagos: las filas las carga el admin por SQL (el rol
-- postgres del SQL Editor saltea RLS). Los usuarios logueados solo leen.
-- Idempotente: se corre a mano en el SQL Editor.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'growshop',
  description text,
  city text,
  province text,
  url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.partners enable row level security;

-- Lectura para cualquier usuario autenticado; sin políticas de escritura:
-- insert/update/delete solo por el admin fuera de RLS.
drop policy if exists "partners_select_authenticated" on public.partners;
create policy "partners_select_authenticated" on public.partners
  for select to authenticated using (true);

-- Ejemplo de alta (editar y descomentar):
-- insert into public.partners (name, category, description, city, province, url, sort_order)
-- values ('Growshop Ejemplo', 'growshop', 'Todo para tu cultivo indoor.', 'Córdoba', 'Córdoba', 'https://ejemplo.com', 1);
