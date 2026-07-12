-- Secciones del foro: cada tema pertenece a una sección fija (estilo
-- CannabisCafe, reducido a la escena argentina). La lista canónica vive en
-- src/lib/forum/categories.ts; acá se replica en un CHECK como defensa en
-- profundidad para que nadie inserte un slug que la app no conoce.
-- Los temas ya existentes caen en 'general' (La ronda).
-- Idempotente: se corre a mano en el SQL Editor.

alter table public.forum_threads
  add column if not exists category text not null default 'general';

alter table public.forum_threads
  drop constraint if exists forum_threads_category_check;

alter table public.forum_threads
  add constraint forum_threads_category_check check (category in (
    'interior',
    'exterior',
    'geneticas',
    'plagas',
    'cosecha',
    'reprocann',
    'general'
  ));

create index if not exists forum_threads_category_created_at_idx
  on public.forum_threads (category, created_at desc);
