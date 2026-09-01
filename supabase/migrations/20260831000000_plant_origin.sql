-- Origen de la planta: de semilla o de esqueje (clon).
--
-- Hasta ahora todo cultivo se asumía nacido de semilla, y el ciclo arrancaba
-- en germinación. Un esqueje no germina: enraíza (7-14 días bajo cúpula) y ya
-- llega con tejido adulto, así que entra antes en vegetativo y su ciclo es más
-- corto. Además hereda la edad de la madre, por eso NO se clonan las
-- autoflorecientes: el clon florece con el reloj de la madre y no rinde.

create type public.plant_origin as enum ('semilla', 'esqueje');

alter table public.grows
  add column origin public.plant_origin not null default 'semilla';

-- Un esqueje siempre es fotoperiódico (clonar una auto no tiene sentido).
alter table public.grows
  add constraint grows_esqueje_solo_fotoperiodica
  check (origin = 'semilla' or plant_type = 'fotoperiodica');
