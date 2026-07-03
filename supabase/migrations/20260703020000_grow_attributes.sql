-- Atributos de cultivo que cambian el consejo agronómico: sustrato (riego y
-- nutrición difieren mucho entre tierra/coco/hidro), ambiente (interior vs
-- exterior) e iluminación (fotoperíodo y tipo de luz).

create type public.substrate_type as enum ('tierra', 'coco', 'hidroponia', 'mix');
create type public.grow_environment as enum ('interior', 'exterior', 'invernadero');
create type public.light_type as enum ('led', 'hps', 'cfl', 'natural', 'otro');

alter table public.grows
  add column substrate public.substrate_type not null default 'tierra',
  add column environment public.grow_environment not null default 'interior',
  add column light_type public.light_type,
  add column light_schedule text;
