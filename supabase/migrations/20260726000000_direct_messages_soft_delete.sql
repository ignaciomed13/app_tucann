-- Borrado de mensajes privados. Remitente y receptor comparten la MISMA fila,
-- así que un delete real le borraría la conversación al otro sin aviso (y le
-- permitiría a un acosador hacer desaparecer la evidencia del lado de la
-- víctima). En vez de eso, borrado unilateral: cada parte marca su propia
-- copia como borrada y deja de verla; la del otro queda intacta.
-- Idempotente: se corre a mano en el SQL Editor.

alter table public.direct_messages
  add column if not exists deleted_by_sender_at timestamptz,
  add column if not exists deleted_by_recipient_at timestamptz;

-- Inmutabilidad (actualiza el guard de 20260712010000). El cuerpo y las partes
-- siguen sin poder cambiar nunca. Además, cada quien toca SOLO lo suyo:
-- el remitente su borrado; el receptor, read_at y su borrado.
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

-- El receptor ya tenía update (marcar leído). Ahora el remitente también lo
-- necesita para borrar su copia; el guard de arriba le limita qué campo toca.
drop policy if exists "dm_update_sender" on public.direct_messages;
create policy "dm_update_sender" on public.direct_messages
  for update using (auth.uid() = sender_id) with check (auth.uid() = sender_id);
