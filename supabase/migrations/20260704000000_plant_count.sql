-- Un cultivo puede representar un lote de N plantas iguales (ej. SOG),
-- en vez de forzar un cultivo por planta.

alter table public.grows
  add column plant_count integer not null default 1 check (plant_count > 0);
