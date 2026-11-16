BEGIN;

DROP FUNCTION IF EXISTS public.marcar_partida_evento(uuid, boolean);
DROP FUNCTION IF EXISTS public.listar_partidas();
ALTER TABLE public.partidas DROP COLUMN IF EXISTS es_evento;

CREATE TABLE IF NOT EXISTS public.eventos_comunidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 3 AND 100),
  descripcion text NOT NULL DEFAULT '',
  imagen_url text,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  ubicacion text NOT NULL CHECK (char_length(trim(ubicacion)) BETWEEN 1 AND 250),
  modalidad text NOT NULL CHECK (modalidad IN ('abierto', 'cerrado')),
  mesas_max integer CHECK (mesas_max IS NULL OR mesas_max > 0),
  creado_por uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_comunidad_horario_check CHECK (hora_inicio < hora_fin)
);

ALTER TABLE public.eventos_comunidad ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eventos_comunidad_public_read ON public.eventos_comunidad;
CREATE POLICY eventos_comunidad_public_read
  ON public.eventos_comunidad FOR SELECT
  USING (true);

REVOKE ALL ON TABLE public.eventos_comunidad FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.eventos_comunidad TO anon, authenticated;

ALTER TABLE public.sesiones
  ADD COLUMN IF NOT EXISTS evento_comunidad_id uuid
    REFERENCES public.eventos_comunidad(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS hora_inicio time without time zone,
  ADD COLUMN IF NOT EXISTS hora_fin time without time zone;

CREATE INDEX IF NOT EXISTS sesiones_evento_comunidad_idx
  ON public.sesiones(evento_comunidad_id)
  WHERE evento_comunidad_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sesiones_evento_partida_unica
  ON public.sesiones(evento_comunidad_id, partida_id)
  WHERE evento_comunidad_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.agregar_partida_evento_interno(
  p_evento_id uuid,
  p_partida_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_evento public.eventos_comunidad%ROWTYPE;
  v_partida public.partidas%ROWTYPE;
  v_es_admin boolean;
  v_mesas_actuales integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para añadir una partida.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_evento
  FROM public.eventos_comunidad
  WHERE id = p_evento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe.' USING ERRCODE = 'P0002';
  END IF;
  IF v_evento.fecha < current_date THEN
    RAISE EXCEPTION 'No se pueden añadir partidas a un evento pasado.' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_es_admin;

  SELECT * INTO v_partida
  FROM public.partidas
  WHERE id = p_partida_id;

  IF NOT FOUND OR v_partida.estado = 'finalizada' THEN
    RAISE EXCEPTION 'La partida no existe o ya ha finalizado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_evento.modalidad = 'abierto' THEN
    IF v_partida.dm_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'En un evento abierto solo puedes añadir una partida que diriges.' USING ERRCODE = '42501';
    END IF;
  ELSIF NOT v_es_admin THEN
    RAISE EXCEPTION 'En un evento cerrado solo los administradores pueden elegir partidas.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sesiones
    WHERE evento_comunidad_id = p_evento_id AND partida_id = p_partida_id
  ) THEN
    RETURN;
  END IF;

  SELECT count(*)::integer INTO v_mesas_actuales
  FROM public.sesiones
  WHERE evento_comunidad_id = p_evento_id;

  IF v_evento.mesas_max IS NOT NULL AND v_mesas_actuales >= v_evento.mesas_max THEN
    RAISE EXCEPTION 'El evento ya ha alcanzado el límite de mesas.' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.sesiones (
      partida_id,
      fecha,
      franja,
      evento_comunidad_id,
      hora_inicio,
      hora_fin
    )
    VALUES (
      p_partida_id,
      v_evento.fecha,
      CASE WHEN v_evento.hora_inicio < time '14:00' THEN 'manana' ELSE 'tarde' END,
      p_evento_id,
      v_evento.hora_inicio,
      v_evento.hora_fin
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta partida ya tiene una sesión en esa fecha y franja. Elimina o cambia la sesión antes de añadirla al evento.'
      USING ERRCODE = '23505';
  END;
END;
$$;

ALTER FUNCTION public.agregar_partida_evento_interno(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.agregar_partida_evento_interno(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.listar_eventos_comunidad()
RETURNS TABLE (
  id uuid,
  titulo text,
  descripcion text,
  imagen_url text,
  fecha date,
  hora_inicio text,
  hora_fin text,
  ubicacion text,
  modalidad text,
  mesas_max integer,
  mesas_actuales integer,
  partidas jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    evento.id,
    evento.titulo,
    evento.descripcion,
    evento.imagen_url,
    evento.fecha,
    to_char(evento.hora_inicio, 'HH24:MI:SS'),
    to_char(evento.hora_fin, 'HH24:MI:SS'),
    evento.ubicacion,
    evento.modalidad,
    evento.mesas_max,
    mesas.cantidad,
    mesas.partidas
  FROM public.eventos_comunidad evento
  CROSS JOIN LATERAL (
    SELECT
      count(sesion.id)::integer AS cantidad,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'sesion_id', sesion.id,
            'partida_id', partida.id,
            'titulo', partida.titulo,
            'sistema', partida.sistema,
            'imagen_url', partida.imagen_url,
            'dm_id', coalesce(partida.dm_id::text, ''),
            'dm_username', coalesce(perfil.username, 'DM'),
            'es_mia', coalesce(partida.dm_id = auth.uid(), false),
            'estado', partida.estado,
            'participantes_max', partida.participantes_max,
            'participantes_count', (
              SELECT count(*)::integer
              FROM public.partida_participantes participante
              WHERE participante.partida_id = partida.id
                AND lower(trim(coalesce(participante.estado, ''))) = 'aceptado'
            ),
            'viewer_is_participant', coalesce((
              SELECT lower(trim(coalesce(participante.estado, ''))) = 'aceptado'
              FROM public.partida_participantes participante
              WHERE participante.partida_id = partida.id
                AND participante.user_id = auth.uid()
              LIMIT 1
            ), false)
          )
          ORDER BY sesion.created_at, partida.titulo
        ) FILTER (WHERE sesion.id IS NOT NULL),
        '[]'::jsonb
      ) AS partidas
    FROM public.sesiones sesion
    JOIN public.partidas partida ON partida.id = sesion.partida_id
    LEFT JOIN public.profiles perfil ON perfil.id = partida.dm_id
    WHERE sesion.evento_comunidad_id = evento.id
  ) mesas
  WHERE evento.fecha >= current_date
  ORDER BY evento.fecha, evento.hora_inicio, evento.created_at;
$$;

ALTER FUNCTION public.listar_eventos_comunidad() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.listar_eventos_comunidad() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_eventos_comunidad() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.crear_evento_comunidad(
  p_titulo text,
  p_descripcion text,
  p_imagen_url text,
  p_fecha date,
  p_hora_inicio time without time zone,
  p_hora_fin time without time zone,
  p_ubicacion text,
  p_modalidad text,
  p_mesas_max integer,
  p_partida_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_evento_id uuid;
  v_partida_id uuid;
  v_es_admin boolean;
  v_partidas_unicas integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_es_admin;

  IF auth.uid() IS NULL OR NOT v_es_admin THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear eventos.' USING ERRCODE = '42501';
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

  SELECT count(DISTINCT ids.id)::integer INTO v_partidas_unicas
  FROM unnest(coalesce(p_partida_ids, ARRAY[]::uuid[])) AS ids(id);
  IF p_modalidad = 'abierto' AND v_partidas_unicas > 0 THEN
    RAISE EXCEPTION 'Los eventos abiertos permiten que cada DM añada su propia partida después de crearlos.' USING ERRCODE = '22023';
  END IF;
  IF p_mesas_max IS NOT NULL AND v_partidas_unicas > p_mesas_max THEN
    RAISE EXCEPTION 'Las partidas seleccionadas superan el límite de mesas.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.eventos_comunidad (
    titulo, descripcion, imagen_url, fecha, hora_inicio, hora_fin,
    ubicacion, modalidad, mesas_max, creado_por
  )
  VALUES (
    trim(p_titulo), coalesce(p_descripcion, ''), nullif(trim(coalesce(p_imagen_url, '')), ''),
    p_fecha, p_hora_inicio, p_hora_fin, trim(p_ubicacion), p_modalidad,
    p_mesas_max, auth.uid()
  )
  RETURNING id INTO v_evento_id;

  IF p_modalidad = 'cerrado' THEN
    FOR v_partida_id IN
      SELECT DISTINCT ids.id
      FROM unnest(coalesce(p_partida_ids, ARRAY[]::uuid[])) AS ids(id)
    LOOP
      PERFORM public.agregar_partida_evento_interno(v_evento_id, v_partida_id);
    END LOOP;
  END IF;

  RETURN v_evento_id;
END;
$$;

ALTER FUNCTION public.crear_evento_comunidad(text, text, text, date, time without time zone, time without time zone, text, text, integer, uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.crear_evento_comunidad(text, text, text, date, time without time zone, time without time zone, text, text, integer, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_evento_comunidad(text, text, text, date, time without time zone, time without time zone, text, text, integer, uuid[]) TO authenticated, service_role;

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
  v_evento public.eventos_comunidad%ROWTYPE;
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

  SELECT * INTO v_evento
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

CREATE OR REPLACE FUNCTION public.agregar_partida_evento(
  p_evento_id uuid,
  p_partida_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.agregar_partida_evento_interno(p_evento_id, p_partida_id);
END;
$$;

ALTER FUNCTION public.agregar_partida_evento(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.agregar_partida_evento(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agregar_partida_evento(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.quitar_partida_evento(
  p_evento_id uuid,
  p_partida_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_modalidad text;
  v_dm_id uuid;
  v_es_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para quitar una partida.' USING ERRCODE = '42501';
  END IF;

  SELECT modalidad INTO v_modalidad
  FROM public.eventos_comunidad
  WHERE id = p_evento_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe.' USING ERRCODE = 'P0002';
  END IF;

  SELECT dm_id INTO v_dm_id FROM public.partidas WHERE id = p_partida_id;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_es_admin;

  IF NOT v_es_admin AND (v_modalidad <> 'abierto' OR v_dm_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para quitar esta partida del evento.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.sesiones
  WHERE evento_comunidad_id = p_evento_id AND partida_id = p_partida_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La partida no está asignada a este evento.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

ALTER FUNCTION public.quitar_partida_evento(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.quitar_partida_evento(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quitar_partida_evento(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.eliminar_evento_comunidad(p_evento_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar eventos.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.eventos_comunidad WHERE id = p_evento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El evento no existe.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

ALTER FUNCTION public.eliminar_evento_comunidad(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.eliminar_evento_comunidad(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_evento_comunidad(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.unirse_partida_evento(p_sesion_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_partida_id uuid;
  v_evento_id uuid;
  v_fecha date;
  v_hora_fin time without time zone;
  v_participantes_max integer;
  v_dm_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para reservar un sitio.' USING ERRCODE = '42501';
  END IF;

  SELECT sesion.partida_id, evento.id, evento.fecha, evento.hora_fin,
         partida.participantes_max, partida.dm_id
  INTO v_partida_id, v_evento_id, v_fecha, v_hora_fin,
       v_participantes_max, v_dm_id
  FROM public.sesiones sesion
  JOIN public.eventos_comunidad evento ON evento.id = sesion.evento_comunidad_id
  JOIN public.partidas partida ON partida.id = sesion.partida_id
  WHERE sesion.id = p_sesion_id
  FOR UPDATE OF evento, partida;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La mesa no pertenece a un evento disponible.' USING ERRCODE = 'P0002';
  END IF;
  IF v_user_id = v_dm_id THEN
    RAISE EXCEPTION 'El DM no puede reservar sitio en su propia mesa.' USING ERRCODE = '22023';
  END IF;
  IF v_fecha < (now() AT TIME ZONE 'Europe/Madrid')::date
    OR (v_fecha + v_hora_fin) AT TIME ZONE 'Europe/Madrid' <= now() THEN
    RAISE EXCEPTION 'Este evento ya ha terminado.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.partidas
    WHERE id = v_partida_id AND estado = 'abierta'
  ) THEN
    RAISE EXCEPTION 'La mesa no está abierta para nuevas reservas.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.partida_participantes
    WHERE partida_id = v_partida_id
      AND user_id = v_user_id
      AND lower(trim(coalesce(estado, ''))) = 'aceptado'
  ) THEN
    RETURN;
  END IF;
  IF (
    SELECT count(*) FROM public.partida_participantes
    WHERE partida_id = v_partida_id
      AND lower(trim(coalesce(estado, ''))) = 'aceptado'
  ) >= v_participantes_max THEN
    RAISE EXCEPTION 'La mesa está completa.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.partida_participantes
    WHERE partida_id = v_partida_id AND user_id = v_user_id
  ) THEN
    UPDATE public.partida_participantes
    SET estado = 'aceptado'
    WHERE partida_id = v_partida_id AND user_id = v_user_id;
  ELSE
    INSERT INTO public.partida_participantes (partida_id, user_id, estado)
    VALUES (v_partida_id, v_user_id, 'aceptado');
  END IF;
END;
$$;

ALTER FUNCTION public.unirse_partida_evento(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.unirse_partida_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unirse_partida_evento(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.listar_sesiones_usuario();
CREATE FUNCTION public.listar_sesiones_usuario()
RETURNS TABLE (
  id uuid,
  partida_id uuid,
  fecha date,
  franja text,
  created_at timestamptz,
  titulo_partida text,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  evento_comunidad_id uuid,
  evento_ubicacion text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    sesion.id,
    sesion.partida_id,
    sesion.fecha,
    sesion.franja,
    sesion.created_at,
    partida.titulo,
    sesion.hora_inicio,
    sesion.hora_fin,
    sesion.evento_comunidad_id,
    evento.ubicacion
  FROM public.sesiones sesion
  JOIN public.partidas partida ON partida.id = sesion.partida_id
  LEFT JOIN public.eventos_comunidad evento ON evento.id = sesion.evento_comunidad_id
  WHERE EXISTS (
    SELECT 1 FROM public.partida_participantes pp
    WHERE pp.partida_id = sesion.partida_id
      AND pp.user_id = auth.uid()
      AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
  ) OR partida.dm_id = auth.uid()
  ORDER BY sesion.fecha, coalesce(sesion.hora_inicio, CASE WHEN sesion.franja = 'manana' THEN time '09:00' ELSE time '15:00' END);
$$;

ALTER FUNCTION public.listar_sesiones_usuario() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.listar_sesiones_usuario() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_sesiones_usuario() TO authenticated, service_role;

CREATE FUNCTION public.listar_partidas()
RETURNS TABLE (
  id uuid,
  titulo text,
  sistema text,
  descripcion text,
  imagen_url text,
  dm_id uuid,
  participantes_max integer,
  sesiones_al_mes integer,
  duracion_estimada text,
  proxima_sesion timestamptz,
  ubicacion_aproximada text,
  ubicacion_exacta text,
  estado text,
  created_at timestamptz,
  proxima_sesion_franja text,
  dm_username text,
  dm_avatar_url text,
  dm_avatar_position text,
  participantes_count integer,
  viewer_is_participant boolean,
  viewer_has_requested boolean,
  es_privada boolean,
  fecha_fin timestamptz,
  amigos_pueden_unirse boolean,
  viewer_es_amigo boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    partida.id,
    partida.titulo,
    partida.sistema,
    partida.descripcion,
    partida.imagen_url,
    partida.dm_id,
    partida.participantes_max,
    partida.sesiones_al_mes,
    partida.duracion_estimada,
    CASE
      WHEN siguiente.fecha IS NULL THEN NULL
      ELSE (siguiente.fecha + coalesce(
        siguiente.hora_inicio,
        CASE WHEN siguiente.franja = 'manana' THEN time '09:00' ELSE time '15:00' END
      )) AT TIME ZONE 'Europe/Madrid'
    END,
    partida.ubicacion_aproximada,
    CASE WHEN autorizacion.puede_ver THEN partida.ubicacion_exacta ELSE NULL END,
    partida.estado,
    partida.created_at,
    siguiente.franja,
    coalesce(dm.username, 'DM'),
    dm.avatar_url,
    dm.avatar_position,
    (
      SELECT count(*)::integer
      FROM public.partida_participantes pp_count
      WHERE pp_count.partida_id = partida.id
        AND lower(trim(coalesce(pp_count.estado, ''))) = 'aceptado'
    ),
    coalesce(existe_participante.value, false),
    coalesce(existe_solicitud.value, false),
    partida.es_privada,
    partida.fecha_fin,
    partida.amigos_pueden_unirse,
    coalesce(amigo_del_dm.value, false)
  FROM public.partidas partida
  LEFT JOIN public.profiles dm ON dm.id = partida.dm_id
  LEFT JOIN LATERAL (
    SELECT sesion.fecha, sesion.franja, sesion.hora_inicio
    FROM public.sesiones sesion
    WHERE sesion.partida_id = partida.id
      AND sesion.fecha >= current_date
    ORDER BY sesion.fecha, coalesce(sesion.hora_inicio, CASE WHEN sesion.franja = 'manana' THEN time '09:00' ELSE time '15:00' END)
    LIMIT 1
  ) siguiente ON true
  LEFT JOIN LATERAL (
    SELECT (
      auth.uid() = partida.dm_id
      OR EXISTS (
        SELECT 1 FROM public.profiles perfil
        WHERE perfil.id = auth.uid() AND perfil.role = 'admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.partida_participantes pp
        WHERE pp.partida_id = partida.id
          AND pp.user_id = auth.uid()
          AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
      )
    ) AS puede_ver
  ) autorizacion ON true
  LEFT JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1 FROM public.partida_participantes pp
      WHERE pp.partida_id = partida.id
        AND pp.user_id = auth.uid()
        AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
    ) AS value
  ) existe_participante ON true
  LEFT JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1 FROM public.partida_participantes pp
      WHERE pp.partida_id = partida.id
        AND pp.user_id = auth.uid()
        AND lower(trim(coalesce(pp.estado, ''))) = 'solicitado'
    ) AS value
  ) existe_solicitud ON true
  LEFT JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1
      FROM public.amistades a
      WHERE a.estado = 'aceptada'
        AND auth.uid() IS NOT NULL
        AND (
          (a.solicitante_id = auth.uid() AND a.destinatario_id = partida.dm_id)
          OR (a.destinatario_id = auth.uid() AND a.solicitante_id = partida.dm_id)
        )
    ) AS value
  ) amigo_del_dm ON true
  ORDER BY partida.created_at DESC;
$$;

ALTER FUNCTION public.listar_partidas() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.listar_partidas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_partidas() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_notif_sesiones_nuevas()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.crear_notificacion(
    pp.user_id,
    'Nueva sesión agendada',
    format('El DM ha agendado %s nueva(s) sesión(es) para "%s".', grupo.total, partida.titulo)
      || CASE
        WHEN evento.id IS NULL THEN ''
        ELSE format(
          ' Evento: "%s", %s de %s a %s en %s.',
          evento.titulo,
          to_char(evento.fecha, 'DD/MM/YYYY'),
          to_char(evento.hora_inicio, 'HH24:MI'),
          to_char(evento.hora_fin, 'HH24:MI'),
          evento.ubicacion
        )
      END
  )
  FROM (
    SELECT partida_id, evento_comunidad_id, count(*) AS total
    FROM nuevas
    GROUP BY partida_id, evento_comunidad_id
  ) grupo
  JOIN public.partidas partida ON partida.id = grupo.partida_id
  JOIN public.partida_participantes pp
    ON pp.partida_id = grupo.partida_id AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
  LEFT JOIN public.eventos_comunidad evento ON evento.id = grupo.evento_comunidad_id
  WHERE pp.user_id IS DISTINCT FROM auth.uid();

  RETURN NULL;
END;
$$;

ALTER FUNCTION public.trg_notif_sesiones_nuevas() OWNER TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'eventos_comunidad'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_comunidad;
  END IF;
END;
$$;

COMMIT;
