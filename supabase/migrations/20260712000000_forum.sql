-- Foro de la comunidad: espacio COMPARTIDO entre miembros (a diferencia del
-- resto del esquema, que es por-tenant). Todos los miembros autenticados leen;
-- cada uno solo edita/borra lo suyo. Nada de datos privados del cultivo llega
-- acá: las tablas del foro guardan únicamente un alias autoelegido + texto.
-- Idempotente: se corre a mano en el SQL Editor.

-- Alias público del foro (seudónimo). Vive en user_settings (una fila por
-- usuario). Único case-insensitive para evitar suplantaciones.
alter table public.user_settings
  add column if not exists forum_alias text;

create unique index if not exists user_settings_forum_alias_unique
  on public.user_settings (lower(forum_alias));

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_alias text not null,
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_threads_created_at_idx
  on public.forum_threads (created_at desc);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_alias text not null,
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_posts_thread_id_idx
  on public.forum_posts (thread_id, created_at);

-- Defensa en profundidad (mismo criterio que check_log_grow_ownership): el
-- author_alias NUNCA lo elige quien postea en el momento; lo fuerza este
-- trigger desde user_settings.forum_alias del autor. Así nadie puede postear
-- sin alias ni suplantar el alias de otro miembro.
create or replace function public.set_forum_author_alias()
returns trigger
language plpgsql
as $$
declare
  a text;
begin
  select forum_alias into a
  from public.user_settings
  where user_id = new.author_id;

  if a is null or char_length(trim(a)) = 0 then
    raise exception 'forum_alias_required';
  end if;

  new.author_alias := a;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists forum_threads_set_alias on public.forum_threads;
create trigger forum_threads_set_alias
  before insert or update on public.forum_threads
  for each row execute function public.set_forum_author_alias();

drop trigger if exists forum_posts_set_alias on public.forum_posts;
create trigger forum_posts_set_alias
  before insert or update on public.forum_posts
  for each row execute function public.set_forum_author_alias();

alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;

-- Lectura: cualquier miembro autenticado ve todo el foro. Escritura/borrado:
-- solo lo propio.
drop policy if exists "forum_threads_select_members" on public.forum_threads;
create policy "forum_threads_select_members" on public.forum_threads
  for select using (auth.uid() is not null);

drop policy if exists "forum_threads_insert_own" on public.forum_threads;
create policy "forum_threads_insert_own" on public.forum_threads
  for insert with check (auth.uid() = author_id);

drop policy if exists "forum_threads_update_own" on public.forum_threads;
create policy "forum_threads_update_own" on public.forum_threads
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "forum_threads_delete_own" on public.forum_threads;
create policy "forum_threads_delete_own" on public.forum_threads
  for delete using (auth.uid() = author_id);

drop policy if exists "forum_posts_select_members" on public.forum_posts;
create policy "forum_posts_select_members" on public.forum_posts
  for select using (auth.uid() is not null);

drop policy if exists "forum_posts_insert_own" on public.forum_posts;
create policy "forum_posts_insert_own" on public.forum_posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "forum_posts_update_own" on public.forum_posts;
create policy "forum_posts_update_own" on public.forum_posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "forum_posts_delete_own" on public.forum_posts;
create policy "forum_posts_delete_own" on public.forum_posts
  for delete using (auth.uid() = author_id);
