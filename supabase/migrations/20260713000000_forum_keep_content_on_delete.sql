-- Conservar el contenido del foro cuando un usuario borra su cuenta.
--
-- Decisión (2026-07-13): el contenido del foro es seudónimo (solo alias) y no
-- identifica a nadie, así que borrarlo no suma privacidad y la cascada
-- thread→posts arrastraba respuestas de OTROS usuarios, rompiendo hilos de la
-- comunidad. Ahora threads/posts quedan con author_id null y conservan el
-- author_alias denormalizado. Los MP siguen borrándose para ambas partes
-- (son privados 1:1, criterio distinto).
-- Idempotente: se corre a mano en el SQL Editor.

alter table public.forum_threads alter column author_id drop not null;
alter table public.forum_posts alter column author_id drop not null;

alter table public.forum_threads
  drop constraint if exists forum_threads_author_id_fkey;
alter table public.forum_threads
  add constraint forum_threads_author_id_fkey
  foreign key (author_id) references auth.users (id) on delete set null;

alter table public.forum_posts
  drop constraint if exists forum_posts_author_id_fkey;
alter table public.forum_posts
  add constraint forum_posts_author_id_fkey
  foreign key (author_id) references auth.users (id) on delete set null;

-- CRÍTICO: el SET NULL del borrado de cuenta es un UPDATE y dispara este
-- trigger. Sin el guard de author_id null, el trigger tiraría
-- 'forum_alias_required' (el autor ya no tiene user_settings) y el borrado de
-- cuenta fallaría entero. El guard deja pasar la fila tal cual: conserva el
-- alias y NO toca updated_at (así el mensaje no aparece como "editado").
-- Nadie más puede llegar acá con author_id null: la RLS de update exige
-- auth.uid() = author_id en la fila nueva.
create or replace function public.set_forum_author_alias()
returns trigger
language plpgsql
as $$
declare
  a text;
begin
  if new.author_id is null then
    return new;
  end if;

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

-- Alias retirados: como los mensajes de una cuenta borrada quedan publicados
-- bajo su alias, nadie puede volver a registrar ese alias (evita que un
-- usuario nuevo "herede" la autoría aparente de esos mensajes). La action de
-- borrado de cuenta inserta acá (service role) antes de borrar el usuario.
create table if not exists public.retired_aliases (
  alias_lower text primary key,
  retired_at timestamptz not null default now()
);

-- RLS sin políticas: solo el service role lee/escribe. Los usuarios comunes
-- pasan por el trigger de abajo (SECURITY DEFINER), nunca por la tabla.
alter table public.retired_aliases enable row level security;

-- SECURITY DEFINER (mismo criterio que set_dm_aliases): el trigger necesita
-- leer retired_aliases, que la RLS le bloquea al usuario común.
create or replace function public.guard_retired_alias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.forum_alias is not null and exists (
    select 1 from public.retired_aliases
    where alias_lower = lower(trim(new.forum_alias))
  ) then
    raise exception 'alias_retired';
  end if;
  return new;
end;
$$;

drop trigger if exists user_settings_guard_retired_alias on public.user_settings;
create trigger user_settings_guard_retired_alias
  before insert or update of forum_alias on public.user_settings
  for each row execute function public.guard_retired_alias();
