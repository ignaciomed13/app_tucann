-- Ficha de la genética: lo que el banco dice de la cepa que se está cultivando.
--
-- Hasta ahora Tucu solo recibía el NOMBRE de la genética (ej. "Critical Mass")
-- y respondía con lo que el modelo recuerda de esa cepa: sin fuente, con corte
-- de entrenamiento y con riesgo de inventar números en cepas de bancos chicos.
-- Ahora el cultivador carga la ficha real —escrita a mano, o leída de una foto
-- del packaging o del PDF del banco— y esa ficha manda sobre lo que el modelo
-- crea recordar.
--
-- Se guarda ya normalizada a texto plano: la lectura de la imagen/PDF ocurre
-- una sola vez, al cargarla, y no en cada análisis.

alter table public.grows
  add column genetics_info text,
  -- Path del archivo original en el bucket grow-photos, con la convención
  -- {user_id}/genetics/{uuid}.{ext}, para poder volver a mirar la ficha.
  add column genetics_doc_path text;

-- Cota defensiva: la ficha viaja en cada prompt de análisis, así que no puede
-- crecer sin límite. El formulario ya corta antes; esto es el cinturón.
alter table public.grows
  add constraint grows_genetics_info_len
  check (genetics_info is null or char_length(genetics_info) <= 4000);
