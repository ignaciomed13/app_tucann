-- Cannabis grow journal: core schema + RLS
-- Multi-tenant: every row is scoped to auth.uid() via RLS policies.

create extension if not exists "pgcrypto";

create type public.log_type as enum (
  'environmental',
  'watering',
  'nutrition',
  'observation',
  'transplant'
);

create table public.grows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  genetics text not null,
  start_date date not null,
  initial_pot_volume_l numeric not null check (initial_pot_volume_l > 0),
  current_pot_volume_l numeric not null check (current_pot_volume_l > 0),
  created_at timestamptz not null default now()
);

create index grows_user_id_idx on public.grows (user_id);

-- current_pot_volume_l starts out equal to initial_pot_volume_l unless
-- explicitly provided; it is later kept in sync by the transplant trigger below.
create or replace function public.set_initial_pot_volume()
returns trigger
language plpgsql
as $$
begin
  if new.current_pot_volume_l is null then
    new.current_pot_volume_l := new.initial_pot_volume_l;
  end if;
  return new;
end;
$$;

create trigger grows_set_initial_pot_volume
  before insert on public.grows
  for each row
  execute function public.set_initial_pot_volume();

create table public.logs (
  id uuid primary key default gen_random_uuid(),
  grow_id uuid not null references public.grows (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.log_type not null,
  log_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index logs_grow_id_idx on public.logs (grow_id);
create index logs_user_id_idx on public.logs (user_id);
create index logs_grow_id_log_date_idx on public.logs (grow_id, log_date);

-- Defense in depth beyond RLS: a log's user_id must match the owner of the
-- grow it points to, so a user can never attach a log to someone else's grow
-- even though RLS already blocks user_id from being spoofed to another user.
create or replace function public.check_log_grow_ownership()
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
    raise exception 'log user_id must match the owning grow''s user_id';
  end if;

  return new;
end;
$$;

create trigger logs_check_grow_ownership
  before insert or update on public.logs
  for each row
  execute function public.check_log_grow_ownership();

-- A transplant log updates the grow's current pot volume everywhere it's read.
create or replace function public.apply_transplant_volume()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'transplant' then
    if new.data->>'new_volume_l' is null then
      raise exception 'transplant log requires data.new_volume_l';
    end if;

    update public.grows
    set current_pot_volume_l = (new.data->>'new_volume_l')::numeric
    where id = new.grow_id;
  end if;

  return new;
end;
$$;

create trigger logs_apply_transplant_volume
  after insert on public.logs
  for each row
  execute function public.apply_transplant_volume();

alter table public.grows enable row level security;
alter table public.logs enable row level security;

create policy "grows_select_own" on public.grows
  for select using (auth.uid() = user_id);

create policy "grows_insert_own" on public.grows
  for insert with check (auth.uid() = user_id);

create policy "grows_update_own" on public.grows
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "grows_delete_own" on public.grows
  for delete using (auth.uid() = user_id);

create policy "logs_select_own" on public.logs
  for select using (auth.uid() = user_id);

create policy "logs_insert_own" on public.logs
  for insert with check (auth.uid() = user_id);

create policy "logs_update_own" on public.logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "logs_delete_own" on public.logs
  for delete using (auth.uid() = user_id);
