-- Mensajes privados 1:1 entre miembros. Se inician SIEMPRE desde un post/hilo
-- del foro (no hay directorio de usuarios): solo podés escribirle a alguien
-- cuyo alias viste publicar algo. Privacy-first: cada usuario puede apagar la
-- recepción de MP (forum_dms_enabled). Alias ↔ alias, nunca el email.
-- Idempotente: se corre a mano en el SQL Editor.

alter table public.user_settings
  add column if not exists forum_dms_enabled boolean not null default true;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  sender_alias text not null,
  recipient_alias text not null,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists direct_messages_pair_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index if not exists direct_messages_recipient_unread_idx
  on public.direct_messages (recipient_id, created_at desc);

-- SECURITY DEFINER: corre como owner para poder leer user_settings de AMBAS
-- partes (RLS normal bloquea leer settings ajenos). Solo escribe los alias
-- denormalizados y valida el consentimiento del receptor; no expone nada más.
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

  select forum_alias, forum_dms_enabled into r, r_enabled
  from public.user_settings where user_id = new.recipient_id;
  if r is null or char_length(trim(r)) = 0 then
    raise exception 'recipient_no_alias';
  end if;
  if r_enabled is distinct from true then
    raise exception 'recipient_dms_disabled';
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

-- Inmutabilidad: sender y receptor comparten la MISMA fila. Una vez enviado, el
-- cuerpo y las partes no cambian; lo único editable es read_at (marcar leído).
-- Evita que el receptor reescriba lo que dijo el otro.
create or replace function public.guard_dm_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.body <> old.body
     or new.sender_id <> old.sender_id
     or new.recipient_id <> old.recipient_id
     or new.sender_alias <> old.sender_alias
     or new.recipient_alias <> old.recipient_alias
     or new.created_at <> old.created_at then
    raise exception 'direct_messages: solo read_at es editable';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_messages_guard_immutable on public.direct_messages;
create trigger direct_messages_guard_immutable
  before update on public.direct_messages
  for each row execute function public.guard_dm_immutable();

alter table public.direct_messages enable row level security;

-- Lectura: solo las dos partes de la conversación.
drop policy if exists "dm_select_participant" on public.direct_messages;
create policy "dm_select_participant" on public.direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "dm_insert_sender" on public.direct_messages;
create policy "dm_insert_sender" on public.direct_messages
  for insert with check (auth.uid() = sender_id);

-- Solo el receptor toca la fila (marcar leído); el guard de arriba impide que
-- modifique cualquier cosa que no sea read_at.
drop policy if exists "dm_update_recipient" on public.direct_messages;
create policy "dm_update_recipient" on public.direct_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
