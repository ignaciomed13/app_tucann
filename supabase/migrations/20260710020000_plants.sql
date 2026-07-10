-- Plantas individuales dentro de un cultivo (fenotipos livianos).
-- El cultivo sigue siendo un lote agregado: nombrar plantas es OPCIONAL y
-- sirve para seguir comportamientos distintos entre individuos (fenohunting).
-- Un log puede apuntar a una planta puntual (logs.plant_id) o al lote (null).
-- Idempotente: se corre a mano en el SQL Editor.

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  grow_id uuid not null references public.grows (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists plants_grow_id_idx on public.plants (grow_id);
create index if not exists plants_user_id_idx on public.plants (user_id);

-- Defensa en profundidad: la planta debe pertenecer al mismo usuario dueño
-- del cultivo (RLS ya impide crear plantas en cultivos ajenos, esto lo refuerza).
create or replace function public.check_plant_grow_ownership()
returns trigger
language plpgsql
as $$
declare
  grow_owner uuid;
begin
  select user_id into grow_owner from public.grows where id = new.grow_id;
  if grow_owner is null then
    raise exception 'grow % does not exist', new.grow_id;
  end if;
  if grow_owner != new.user_id then
    raise exception 'plant user_id must match the owning grow''s user_id';
  end if;
  return new;
end;
$$;

drop trigger if exists plants_check_grow_ownership on public.plants;
create trigger plants_check_grow_ownership
  before insert or update on public.plants
  for each row
  execute function public.check_plant_grow_ownership();

-- Un log puede referenciar una planta del mismo cultivo (o el lote, si null).
-- ON DELETE SET NULL: borrar una planta no borra sus logs, los desasigna.
alter table public.logs
  add column if not exists plant_id uuid references public.plants (id) on delete set null;

create index if not exists logs_plant_id_idx on public.logs (plant_id);

-- La planta referida por un log debe ser del mismo cultivo que el log.
create or replace function public.check_log_plant()
returns trigger
language plpgsql
as $$
declare
  plant_grow uuid;
begin
  if new.plant_id is not null then
    select grow_id into plant_grow from public.plants where id = new.plant_id;
    if plant_grow is null then
      raise exception 'plant % does not exist', new.plant_id;
    end if;
    if plant_grow != new.grow_id then
      raise exception 'plant must belong to the same grow as the log';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists logs_check_plant on public.logs;
create trigger logs_check_plant
  before insert or update on public.logs
  for each row
  execute function public.check_log_plant();

alter table public.plants enable row level security;

drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own" on public.plants
  for select using (auth.uid() = user_id);

drop policy if exists "plants_insert_own" on public.plants;
create policy "plants_insert_own" on public.plants
  for insert with check (auth.uid() = user_id);

drop policy if exists "plants_update_own" on public.plants;
create policy "plants_update_own" on public.plants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plants_delete_own" on public.plants;
create policy "plants_delete_own" on public.plants
  for delete using (auth.uid() = user_id);
