-- Variedad de la planta: índica / sativa / híbrida con predominancia.
-- Afecta porte, estiramiento (relevante para el espacio) y duración de floración.
-- Opcional: puede no conocerse al iniciar el cultivo.

create type public.variety as enum (
  'indica',
  'sativa',
  'hibrida_sativa',
  'hibrida_indica'
);

alter table public.grows add column variety public.variety;
