-- Cosecha como 8º tipo de log: cierra el ciclo con el resultado real del
-- cultivo (peso seco, peso en fresco opcional y notas de curado). Se guarda
-- en logs.data como { dry_weight_g, wet_weight_g?, notes? }. Idempotente.

alter type public.log_type add value if not exists 'cosecha';
