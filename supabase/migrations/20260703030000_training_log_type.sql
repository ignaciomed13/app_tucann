-- Podas y entrenamiento como 6º tipo de log (despunte, LST, defoliación,
-- SCROG, supercropping, etc.). Se guarda en logs.data como { technique, notes }.

alter type public.log_type add value if not exists 'training';
