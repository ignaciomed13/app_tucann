-- Distinguir autofloreciente vs fotoperiódica: el consejo agronómico difiere
-- (las automáticas NO se trasplantan; van en maceta definitiva desde el inicio).

create type public.plant_type as enum ('autofloreciente', 'fotoperiodica');

alter table public.grows
  add column plant_type public.plant_type not null default 'fotoperiodica';
