-- The phase-1 trigger only handled INSERT of transplant logs. Editing or
-- deleting a transplant must also resync grows.current_pot_volume_l, so
-- replace it with a full recompute from the latest remaining transplant.

drop trigger if exists logs_apply_transplant_volume on public.logs;
drop function if exists public.apply_transplant_volume();

create or replace function public.recompute_pot_volume(gid uuid)
returns void
language sql
as $$
  update public.grows g
  set current_pot_volume_l = coalesce(
    (
      select (l.data->>'new_volume_l')::numeric
      from public.logs l
      where l.grow_id = gid and l.type = 'transplant'
      order by l.log_date desc, l.created_at desc
      limit 1
    ),
    g.initial_pot_volume_l
  )
  where g.id = gid;
$$;

create or replace function public.sync_pot_volume_on_log_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.type = 'transplant' then
    if new.data->>'new_volume_l' is null then
      raise exception 'transplant log requires data.new_volume_l';
    end if;
  end if;

  if tg_op = 'DELETE' then
    if old.type = 'transplant' then
      perform public.recompute_pot_volume(old.grow_id);
    end if;
    return old;
  end if;

  if new.type = 'transplant' or (tg_op = 'UPDATE' and old.type = 'transplant') then
    perform public.recompute_pot_volume(new.grow_id);
  end if;

  return new;
end;
$$;

create trigger logs_sync_pot_volume
  after insert or update or delete on public.logs
  for each row
  execute function public.sync_pot_volume_on_log_change();
