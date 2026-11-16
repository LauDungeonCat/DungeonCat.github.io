CREATE OR REPLACE FUNCTION public.actualizar_evento_comunidad(
  p_evento_id uuid,
  p_titulo text,
  p_descripcion text,
  p_imagen_url text,
  p_fecha date,
  p_hora_inicio time without time zone,
  p_hora_fin time without time zone,
  p_ubicacion text,
  p_modalidad text,
  p_mesas_max integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_es_admin boolean;
  v_mesas_actuales integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_es_admin;
  IF auth.uid() IS NULL OR NOT v_es_admin THEN
    RAISE EXCEPTION 'Solo los administradores pueden gestionar eventos.' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.eventos_comunidad
  WHERE id = p_evento_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe.' USING ERRCODE = 'P0002';
  END IF;
  IF p_modalidad NOT IN ('abierto', 'cerrado') THEN
    RAISE EXCEPTION 'El tipo de evento no es válido.' USING ERRCODE = '22023';
  END IF;
  IF p_fecha < current_date OR p_hora_inicio >= p_hora_fin THEN
    RAISE EXCEPTION 'La fecha o el horario del evento no son válidos.' USING ERRCODE = '22023';
  END IF;
  IF p_mesas_max IS NOT NULL AND p_mesas_max < 1 THEN
    RAISE EXCEPTION 'El límite de mesas debe ser mayor que cero.' USING ERRCODE = '22023';
  END IF;
  IF char_length(trim(coalesce(p_titulo, ''))) NOT BETWEEN 3 AND 100 THEN
    RAISE EXCEPTION 'El nombre del evento debe tener entre 3 y 100 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF char_length(coalesce(p_descripcion, '')) > 2000
    OR char_length(coalesce(p_imagen_url, '')) > 500
    OR char_length(trim(coalesce(p_ubicacion, ''))) NOT BETWEEN 1 AND 250 THEN
    RAISE EXCEPTION 'La descripción, imagen o ubicación excede el límite permitido.' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO v_mesas_actuales
  FROM public.sesiones
  WHERE evento_comunidad_id = p_evento_id;
  IF p_mesas_max IS NOT NULL AND v_mesas_actuales > p_mesas_max THEN
    RAISE EXCEPTION 'El límite de mesas no puede ser inferior a las mesas ya asignadas.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.eventos_comunidad
  SET titulo = trim(p_titulo),
      descripcion = coalesce(p_descripcion, ''),
      imagen_url = nullif(trim(coalesce(p_imagen_url, '')), ''),
      fecha = p_fecha,
      hora_inicio = p_hora_inicio,
      hora_fin = p_hora_fin,
      ubicacion = trim(p_ubicacion),
      modalidad = p_modalidad,
      mesas_max = p_mesas_max
  WHERE id = p_evento_id;

  UPDATE public.sesiones
  SET fecha = p_fecha,
      franja = CASE WHEN p_hora_inicio < time '14:00' THEN 'manana' ELSE 'tarde' END,
      hora_inicio = p_hora_inicio,
      hora_fin = p_hora_fin
  WHERE evento_comunidad_id = p_evento_id;
END;
$$;

ALTER FUNCTION public.actualizar_evento_comunidad(uuid, text, text, text, date, time without time zone, time without time zone, text, text, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.actualizar_evento_comunidad(uuid, text, text, text, date, time without time zone, time without time zone, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_evento_comunidad(uuid, text, text, text, date, time without time zone, time without time zone, text, text, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
