-- Cifrado de extremo a extremo para los mensajes privados.
--
-- El servidor deja de poder leerlos: la tabla guarda solo ciphertext + iv. Las
-- claves privadas viven envueltas (la base guarda sobres cerrados) y solo se
-- abren en el browser, con la contraseña del usuario o su frase de
-- recuperación. Ni el service role ni el dueño del proyecto pueden descifrar.
--
-- LIMITACIÓN ACEPTADA (2026-07-26): NO hay secreto hacia adelante. Quien
-- obtenga la contraseña de alguien desenvuelve su clave y lee TODO su
-- historial, no solo lo nuevo. Un ratchet tipo Signal quedó fuera de alcance.
-- Tampoco protege contra un deploy malicioso: el browser ejecuta JS que
-- servimos nosotros. Está escrito así en /privacidad.
--
-- Los alias siguen en claro a propósito: son seudónimos, y el trigger los
-- necesita para validar quién le puede escribir a quién.
--
-- Idempotente: se corre a mano en el SQL Editor.

-- Clave pública de cada usuario. Cualquier miembro la necesita para poder
-- cifrarle, así que la lee todo el mundo autenticado. No es secreta.
create table if not exists public.user_public_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  public_key text not null,
  created_at timestamptz not null default now()
);

alter table public.user_public_keys enable row level security;

drop policy if exists "public_keys_select_members" on public.user_public_keys;
create policy "public_keys_select_members" on public.user_public_keys
  for select using (auth.uid() is not null);

drop policy if exists "public_keys_insert_own" on public.user_public_keys;
create policy "public_keys_insert_own" on public.user_public_keys
  for insert with check (auth.uid() = user_id);

-- Sin política de update ni de delete a propósito: rotar la clave pública
-- dejaría ilegible todo el historial del otro lado de cada conversación.

-- La bóveda: los sobres cerrados. Solo el dueño los ve, y sin su contraseña o
-- su frase de recuperación no sirven para nada — son bytes al azar.
-- public_key está duplicada acá a propósito. La pública no se puede recalcular
-- a partir de la privada con WebCrypto, así que si la app muriera entre los dos
-- inserts (bóveda y clave pública) el usuario quedaría con una identidad
-- imposible de reparar. Guardándola acá, el arreglo es re-insertar la fila que
-- falta en user_public_keys.
create table if not exists public.user_key_vault (
  user_id uuid primary key references auth.users (id) on delete cascade,
  public_key text not null,
  wrapped_private_key text not null,
  wrapped_private_key_iv text not null,
  password_salt text not null,
  password_wrapped_mk text not null,
  password_wrapped_mk_iv text not null,
  recovery_salt text not null,
  recovery_wrapped_mk text not null,
  recovery_wrapped_mk_iv text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_key_vault enable row level security;

drop policy if exists "key_vault_select_own" on public.user_key_vault;
create policy "key_vault_select_own" on public.user_key_vault
  for select using (auth.uid() = user_id);

drop policy if exists "key_vault_insert_own" on public.user_key_vault;
create policy "key_vault_insert_own" on public.user_key_vault
  for insert with check (auth.uid() = user_id);

-- Update: hace falta para re-envolver la clave maestra cuando el usuario
-- cambia la contraseña (la desenvuelve con su frase de recuperación).
drop policy if exists "key_vault_update_own" on public.user_key_vault;
create policy "key_vault_update_own" on public.user_key_vault
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- El contenido pasa a ser ciphertext + iv.
alter table public.direct_messages
  add column if not exists ciphertext text,
  add column if not exists iv text;

-- Los mensajes viejos son texto plano y no hay forma de convertirlos (nadie
-- tiene todavía claves con las cuales cifrarlos). Se borran. El filtro por
-- ciphertext null hace que re-correr esto NO toque los mensajes ya cifrados.
delete from public.direct_messages where ciphertext is null;

alter table public.direct_messages drop column if exists body;

alter table public.direct_messages
  alter column ciphertext set not null,
  alter column iv set not null;

-- Inmutabilidad: mismo criterio que antes, pero ahora el contenido que no
-- puede cambiar es ciphertext + iv. Cada parte sigue tocando solo lo suyo.
create or replace function public.guard_dm_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.ciphertext <> old.ciphertext
     or new.iv <> old.iv
     or new.sender_id <> old.sender_id
     or new.recipient_id <> old.recipient_id
     or new.sender_alias <> old.sender_alias
     or new.recipient_alias <> old.recipient_alias
     or new.created_at <> old.created_at then
    raise exception 'direct_messages: solo read_at y el borrado propio son editables';
  end if;

  if auth.uid() = new.sender_id then
    if new.read_at is distinct from old.read_at
       or new.deleted_by_recipient_at is distinct from old.deleted_by_recipient_at then
      raise exception 'direct_messages: el remitente solo puede borrar su copia';
    end if;
  elsif auth.uid() = new.recipient_id then
    if new.deleted_by_sender_at is distinct from old.deleted_by_sender_at then
      raise exception 'direct_messages: el receptor solo puede borrar su copia';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists direct_messages_guard_immutable on public.direct_messages;
create trigger direct_messages_guard_immutable
  before update on public.direct_messages
  for each row execute function public.guard_dm_immutable();

-- Al validar el envío ahora también exigimos que las DOS partes tengan clave
-- pública publicada: sin eso el mensaje sería ilegible para alguien.
-- SECURITY DEFINER, así que puede leer user_settings y user_public_keys de
-- ambas partes (la RLS normal se lo bloquearía al usuario común).
create or replace function public.set_dm_aliases()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
  r text;
  r_enabled boolean;
begin
  select forum_alias into s
  from public.user_settings where user_id = new.sender_id;
  if s is null or char_length(trim(s)) = 0 then
    raise exception 'sender_no_alias';
  end if;

  if not exists (
    select 1 from public.user_public_keys where user_id = new.sender_id
  ) then
    raise exception 'sender_no_keys';
  end if;

  select forum_alias, forum_dms_enabled into r, r_enabled
  from public.user_settings where user_id = new.recipient_id;
  if r is null or char_length(trim(r)) = 0 then
    raise exception 'recipient_no_alias';
  end if;
  if r_enabled is distinct from true then
    raise exception 'recipient_dms_disabled';
  end if;

  if not exists (
    select 1 from public.user_public_keys where user_id = new.recipient_id
  ) then
    raise exception 'recipient_no_keys';
  end if;

  new.sender_alias := s;
  new.recipient_alias := r;
  return new;
end;
$$;

drop trigger if exists direct_messages_set_aliases on public.direct_messages;
create trigger direct_messages_set_aliases
  before insert on public.direct_messages
  for each row execute function public.set_dm_aliases();
