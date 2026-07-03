-- Espacios de cultivo (carpas/indoors) que pueden agrupar varios cultivos.
-- Permite calcular densidad (plantas/m²) y alertar por sobrepoblación.

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  width_cm numeric not null check (width_cm > 0),
  depth_cm numeric not null check (depth_cm > 0),
  height_cm numeric check (height_cm is null or height_cm > 0),
  created_at timestamptz not null default now()
);

create index spaces_user_id_idx on public.spaces (user_id);

-- Un cultivo puede pertenecer a un espacio (indoor compartido) o quedar suelto.
-- Borrar el espacio no borra los cultivos: solo los desasigna.
alter table public.grows
  add column space_id uuid references public.spaces (id) on delete set null;

create index grows_space_id_idx on public.grows (space_id);

-- Defensa en profundidad: el espacio asignado a un cultivo debe ser del mismo
-- usuario (RLS ya impide leer espacios ajenos, esto impide asignarlos).
create or replace function public.check_grow_space_ownership()
returns trigger
language plpgsql
as $$
declare
  space_owner uuid;
begin
  if new.space_id is not null then
    select user_id into space_owner from public.spaces where id = new.space_id;
    if space_owner is null then
      raise exception 'space % does not exist', new.space_id;
    end if;
    if space_owner != new.user_id then
      raise exception 'space must belong to the same user';
    end if;
  end if;
  return new;
end;
$$;

create trigger grows_check_space_ownership
  before insert or update on public.grows
  for each row
  execute function public.check_grow_space_ownership();

alter table public.spaces enable row level security;

create policy "spaces_select_own" on public.spaces
  for select using (auth.uid() = user_id);

create policy "spaces_insert_own" on public.spaces
  for insert with check (auth.uid() = user_id);

create policy "spaces_update_own" on public.spaces
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "spaces_delete_own" on public.spaces
  for delete using (auth.uid() = user_id);
