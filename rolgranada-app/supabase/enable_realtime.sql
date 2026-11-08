DO $$
DECLARE
  table_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'Publication supabase_realtime does not exist.';
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'partidas',
    'partida_participantes',
    'sesiones',
    'disponibilidades',
    'profiles'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Table public.% does not exist.', table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END
$$;
