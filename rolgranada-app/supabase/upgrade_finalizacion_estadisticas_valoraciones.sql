BEGIN;

ALTER TABLE public.partidas
  ADD COLUMN IF NOT EXISTS fecha_fin timestamptz;

GRANT SELECT (fecha_fin) ON TABLE public.partidas TO authenticated;
REVOKE UPDATE (estado) ON TABLE public.partidas FROM authenticated;

CREATE OR REPLACE FUNCTION public.validar_finalizacion_partida()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM 'finalizada'
     AND NEW.fecha_fin IS DISTINCT FROM OLD.fecha_fin THEN
    RAISE EXCEPTION 'Solo se asigna una fecha al finalizar la partida.' USING ERRCODE = '22023';
  END IF;
  IF NEW.estado = 'finalizada' AND OLD.estado IS DISTINCT FROM 'finalizada' THEN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM OLD.dm_id THEN
      RAISE EXCEPTION 'Solo el DM puede finalizar esta partida.' USING ERRCODE = '42501';
    END IF;
    NEW.fecha_fin := now();
  ELSIF OLD.estado = 'finalizada' AND NEW.estado IS DISTINCT FROM 'finalizada' THEN
    RAISE EXCEPTION 'Una partida finalizada no puede reabrirse.' USING ERRCODE = '22023';
  ELSIF OLD.estado = 'finalizada' AND NEW.fecha_fin IS DISTINCT FROM OLD.fecha_fin THEN
    RAISE EXCEPTION 'No se puede modificar la fecha de finalización.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_finalizacion_partida() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS partidas_validar_finalizacion ON public.partidas;
CREATE TRIGGER partidas_validar_finalizacion
  BEFORE UPDATE OF estado, fecha_fin ON public.partidas
  FOR EACH ROW EXECUTE FUNCTION public.validar_finalizacion_partida();

CREATE OR REPLACE FUNCTION public.bloquear_eliminacion_partida_finalizada()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.estado = 'finalizada' THEN
    RAISE EXCEPTION 'No se puede eliminar una partida finalizada; su historial debe conservarse.' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_eliminacion_partida_finalizada() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS partidas_bloquear_eliminacion_finalizada ON public.partidas;
CREATE TRIGGER partidas_bloquear_eliminacion_finalizada
  BEFORE DELETE ON public.partidas
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_eliminacion_partida_finalizada();

DROP FUNCTION IF EXISTS public.listar_partidas();
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
  fecha_fin timestamptz
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
      ELSE (siguiente.fecha + CASE WHEN siguiente.franja = 'manana' THEN time '09:00' ELSE time '15:00' END)
        AT TIME ZONE 'Europe/Madrid'
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
    partida.fecha_fin
  FROM public.partidas partida
  LEFT JOIN public.profiles dm ON dm.id = partida.dm_id
  LEFT JOIN LATERAL (
    SELECT sesion.fecha, sesion.franja
    FROM public.sesiones sesion
    WHERE sesion.partida_id = partida.id
      AND sesion.fecha >= current_date
    ORDER BY sesion.fecha, CASE WHEN sesion.franja = 'manana' THEN 0 ELSE 1 END
    LIMIT 1
  ) siguiente ON true
  LEFT JOIN LATERAL (
    SELECT
      (
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
  ORDER BY partida.created_at DESC;
$$;

ALTER FUNCTION public.listar_partidas() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.listar_partidas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_partidas() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.finalizar_partida(p_partida_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_titulo text;
  v_dm_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para finalizar una partida.' USING ERRCODE = '42501';
  END IF;

  SELECT partida.titulo, partida.dm_id
  INTO v_titulo, v_dm_id
  FROM public.partidas partida
  WHERE partida.id = p_partida_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La partida no existe.' USING ERRCODE = 'P0002';
  END IF;
  IF v_dm_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Solo el DM puede finalizar esta partida.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.partidas
  SET estado = 'finalizada', fecha_fin = now()
  WHERE id = p_partida_id AND estado IS DISTINCT FROM 'finalizada';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La partida ya está finalizada.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.notificaciones (user_id, titulo, mensaje)
  SELECT
    pp.user_id,
    'Partida finalizada',
    format('La partida «%s» ha finalizado. Ya puedes valorar a tu DM desde Mis Partidas.', v_titulo)
  FROM public.partida_participantes pp
  WHERE pp.partida_id = p_partida_id
    AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
    AND pp.user_id <> auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.finalizar_partida(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_partida(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bloquear_sesiones_partidas_finalizadas()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado text;
BEGIN
  SELECT partida.estado INTO v_estado
  FROM public.partidas partida
  WHERE partida.id = NEW.partida_id
  FOR UPDATE;
  IF v_estado = 'finalizada' THEN
    RAISE EXCEPTION 'No se pueden crear sesiones en una partida finalizada.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_sesiones_partidas_finalizadas() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sesiones_bloquear_partida_finalizada ON public.sesiones;
CREATE TRIGGER sesiones_bloquear_partida_finalizada
  BEFORE INSERT OR UPDATE OF partida_id ON public.sesiones
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_sesiones_partidas_finalizadas();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS apoyo_kofi boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seguidor_youtube boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creador_jdr boolean NOT NULL DEFAULT false;

GRANT SELECT (apoyo_kofi, seguidor_youtube, creador_jdr) ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.proteger_insignia_apoyo_kofi()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.apoyo_kofi IS DISTINCT FROM OLD.apoyo_kofi
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles admin
       WHERE admin.id = auth.uid() AND admin.role = 'admin'
     ) THEN
    RAISE EXCEPTION 'Solo un administrador puede asignar o retirar la insignia Ko-fi.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_insignia_apoyo_kofi() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_proteger_apoyo_kofi ON public.profiles;
CREATE TRIGGER profiles_proteger_apoyo_kofi
  BEFORE UPDATE OF apoyo_kofi ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_insignia_apoyo_kofi();

CREATE OR REPLACE FUNCTION public.actualizar_insignias_perfil(
  p_seguidor_youtube boolean,
  p_creador_jdr boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para actualizar tu perfil.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles
  SET seguidor_youtube = coalesce(p_seguidor_youtube, false),
      creador_jdr = coalesce(p_creador_jdr, false)
  WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_insignias_perfil(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_insignias_perfil(boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.marcar_apoyo_kofi(p_user_id uuid, p_apoyado boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles admin
    WHERE admin.id = auth.uid() AND admin.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo un administrador puede asignar esta insignia.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles
  SET apoyo_kofi = coalesce(p_apoyado, false)
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_apoyo_kofi(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_apoyo_kofi(uuid, boolean) TO authenticated;

CREATE TABLE IF NOT EXISTS public.dm_valoraciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  dm_id uuid NOT NULL REFERENCES public.profiles(id),
  autor_id uuid NOT NULL REFERENCES public.profiles(id),
  puntuacion smallint NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  etiquetas text[] NOT NULL DEFAULT '{}',
  comentario text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_valoraciones_unica UNIQUE (partida_id, autor_id),
  CONSTRAINT dm_valoraciones_comentario_max CHECK (char_length(comentario) <= 500),
  CONSTRAINT dm_valoraciones_etiquetas_check CHECK (
    cardinality(etiquetas) <= 3
    AND etiquetas <@ ARRAY[
      'Narrativa inmersiva',
      'Interpretación',
      'Combate emocionante',
      'Preparación',
      'Comunicación',
      'Flexibilidad',
      'Imparcialidad',
      'Inclusividad'
    ]::text[]
  )
);

ALTER TABLE public.dm_valoraciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dm_valoraciones_lectura_autenticada ON public.dm_valoraciones;
CREATE POLICY dm_valoraciones_lectura_autenticada
  ON public.dm_valoraciones FOR SELECT TO authenticated USING (true);

GRANT SELECT ON TABLE public.dm_valoraciones TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.dm_valoraciones FROM authenticated, anon;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'Publication supabase_realtime does not exist.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'dm_valoraciones'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_valoraciones';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.derivar_dm_valoracion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT partida.dm_id INTO NEW.dm_id
  FROM public.partidas partida
  WHERE partida.id = NEW.partida_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La partida no existe.' USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.derivar_dm_valoracion() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS dm_valoraciones_derivar_dm ON public.dm_valoraciones;
CREATE TRIGGER dm_valoraciones_derivar_dm
  BEFORE INSERT OR UPDATE OF partida_id ON public.dm_valoraciones
  FOR EACH ROW EXECUTE FUNCTION public.derivar_dm_valoracion();

CREATE OR REPLACE FUNCTION public.valorar_dm(
  p_partida_id uuid,
  p_puntuacion integer,
  p_etiquetas text[] DEFAULT '{}',
  p_comentario text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dm_id uuid;
  v_titulo text;
  v_id uuid;
  v_es_admin boolean;
  v_etiquetas_permitidas constant text[] := ARRAY[
    'Narrativa inmersiva',
    'Interpretación',
    'Combate emocionante',
    'Preparación',
    'Comunicación',
    'Flexibilidad',
    'Imparcialidad',
    'Inclusividad'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para valorar.' USING ERRCODE = '42501';
  END IF;
  IF p_puntuacion IS NULL OR p_puntuacion NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'La puntuación debe estar entre 1 y 5.' USING ERRCODE = '22023';
  END IF;
  IF cardinality(coalesce(p_etiquetas, '{}'::text[])) > 3
     OR NOT (coalesce(p_etiquetas, '{}'::text[]) <@ v_etiquetas_permitidas)
     OR EXISTS (
       SELECT 1
       FROM unnest(coalesce(p_etiquetas, '{}'::text[])) AS etiqueta_fila(etiqueta)
       GROUP BY etiqueta
       HAVING count(*) > 1
     ) THEN
    RAISE EXCEPTION 'Selecciona hasta 3 etiquetas válidas.' USING ERRCODE = '22023';
  END IF;
  IF char_length(coalesce(p_comentario, '')) > 500 THEN
    RAISE EXCEPTION 'El comentario no puede superar los 500 caracteres.' USING ERRCODE = '22023';
  END IF;

  SELECT partida.dm_id, partida.titulo
  INTO v_dm_id, v_titulo
  FROM public.partidas partida
  WHERE partida.id = p_partida_id
    AND partida.estado = 'finalizada';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo se pueden valorar partidas finalizadas.' USING ERRCODE = '22023';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles perfil
    WHERE perfil.id = auth.uid() AND perfil.role = 'admin'
  ) INTO v_es_admin;
  IF v_dm_id = auth.uid() THEN
    IF NOT v_es_admin THEN
      RAISE EXCEPTION 'No puedes valorar tu propia partida como DM.' USING ERRCODE = '42501';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.partida_participantes pp
    WHERE pp.partida_id = p_partida_id
      AND pp.user_id = auth.uid()
      AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
  ) THEN
    RAISE EXCEPTION 'Solo los jugadores aceptados pueden valorar esta partida.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.dm_valoraciones (partida_id, dm_id, autor_id, puntuacion, etiquetas, comentario)
  VALUES (
    p_partida_id,
    v_dm_id,
    auth.uid(),
    p_puntuacion,
    coalesce(p_etiquetas, '{}'::text[]),
    trim(coalesce(p_comentario, ''))
  )
  RETURNING id INTO v_id;

  INSERT INTO public.notificaciones (user_id, titulo, mensaje)
  VALUES (
    v_dm_id,
    'Nueva valoración',
    format('Un jugador ha valorado tu dirección en «%s».', v_titulo)
  );
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya has valorado esta partida.' USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION public.valorar_dm(uuid, integer, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.valorar_dm(uuid, integer, text[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_valoraciones_dm(p_dm_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH valoraciones AS (
    SELECT
      valoracion.id,
      valoracion.partida_id,
      partida.titulo AS partida_titulo,
      valoracion.puntuacion,
      valoracion.etiquetas,
      valoracion.comentario,
      valoracion.created_at,
      valoracion.autor_id,
      perfil.username AS autor_username,
      perfil.avatar_url AS autor_avatar_url,
      perfil.avatar_position AS autor_avatar_position
    FROM public.dm_valoraciones valoracion
    JOIN public.profiles perfil ON perfil.id = valoracion.autor_id
    JOIN public.partidas partida ON partida.id = valoracion.partida_id
    WHERE valoracion.dm_id = p_dm_id
  ),
  etiquetas AS (
    SELECT etiqueta, count(*)::integer AS total
    FROM valoraciones
    CROSS JOIN LATERAL unnest(valoraciones.etiquetas) AS etiquetas_fila(etiqueta)
    GROUP BY etiqueta
    ORDER BY total DESC, etiqueta
  )
  SELECT jsonb_build_object(
    'media', coalesce((SELECT avg(puntuacion)::numeric(3,2) FROM valoraciones), 0),
    'total', (SELECT count(*) FROM valoraciones),
    'etiquetas', coalesce(
      (SELECT jsonb_agg(jsonb_build_object('nombre', etiqueta, 'total', total) ORDER BY total DESC, etiqueta) FROM etiquetas),
      '[]'::jsonb
    ),
    'valoraciones', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', id,
            'partida_id', partida_id,
            'partida_titulo', partida_titulo,
            'puntuacion', puntuacion,
            'etiquetas', etiquetas,
            'comentario', comentario,
            'created_at', created_at,
            'autor_id', autor_id,
            'autor_username', autor_username,
            'autor_avatar_url', autor_avatar_url,
            'autor_avatar_position', autor_avatar_position
          )
          ORDER BY created_at DESC
        )
        FROM valoraciones
      ),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.listar_valoraciones_dm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_valoraciones_dm(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.partidas_pendientes_valoracion()
RETURNS TABLE (
  partida_id uuid,
  partida_titulo text,
  dm_id uuid,
  dm_username text,
  dm_avatar_url text,
  dm_avatar_position text,
  fecha_fin timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT partida.id, partida.titulo, partida.dm_id, perfil.username, perfil.avatar_url, perfil.avatar_position, partida.fecha_fin
  FROM public.partidas partida
  JOIN public.partida_participantes pp ON pp.partida_id = partida.id
  JOIN public.profiles perfil ON perfil.id = partida.dm_id
  WHERE auth.uid() IS NOT NULL
    AND pp.user_id = auth.uid()
    AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
    AND partida.estado = 'finalizada'
    AND partida.dm_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.dm_valoraciones valoracion
      WHERE valoracion.partida_id = partida.id
        AND valoracion.autor_id = auth.uid()
    )
  ORDER BY partida.fecha_fin DESC NULLS LAST, partida.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.partidas_pendientes_valoracion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partidas_pendientes_valoracion() TO authenticated;

CREATE OR REPLACE FUNCTION public.estadisticas_usuario(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH usuario AS (
    SELECT
      perfil.id,
      perfil.username,
      perfil.avatar_url,
      perfil.avatar_position,
      perfil.role,
      perfil.created_at,
      perfil.apoyo_kofi,
      perfil.seguidor_youtube,
      perfil.creador_jdr
    FROM public.profiles perfil
    WHERE perfil.id = p_user_id
  ),
  sesiones_usuario AS (
    SELECT sesion.id, sesion.partida_id, partida.dm_id, sesion.fecha, sesion.franja
    FROM public.sesiones sesion
    JOIN public.partidas partida ON partida.id = sesion.partida_id
    WHERE sesion.fecha < current_date
      AND (
        partida.dm_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.partida_participantes pp
          WHERE pp.partida_id = partida.id
            AND pp.user_id = p_user_id
            AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
        )
      )
  ),
  asistentes AS (
    SELECT sesion.id AS sesion_id, sesion.partida_id, partida.dm_id AS user_id
    FROM public.sesiones sesion
    JOIN public.partidas partida ON partida.id = sesion.partida_id
    WHERE sesion.fecha < current_date
    UNION
    SELECT sesion.id, sesion.partida_id, pp.user_id
    FROM public.sesiones sesion
    JOIN public.partida_participantes pp ON pp.partida_id = sesion.partida_id
    WHERE sesion.fecha < current_date
      AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
  ),
  companeros AS (
    SELECT asistente.user_id AS id, count(DISTINCT asistente.sesion_id)::integer AS sesiones_coincidentes
    FROM sesiones_usuario propia
    JOIN asistentes asistente ON asistente.sesion_id = propia.id
    WHERE asistente.user_id <> p_user_id
    GROUP BY asistente.user_id
  ),
  historial AS (
    SELECT
      partida.id AS partida_id,
      partida.titulo,
      partida.sistema,
      partida.estado,
      CASE WHEN partida.dm_id = p_user_id THEN 'DM' ELSE 'Jugador' END AS rol,
      count(sesion.id) FILTER (WHERE sesion.fecha < current_date)::integer AS sesiones_jugadas,
      max(sesion.fecha) FILTER (WHERE sesion.fecha < current_date) AS ultima_sesion
    FROM public.partidas partida
    LEFT JOIN public.sesiones sesion ON sesion.partida_id = partida.id
    WHERE partida.dm_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.partida_participantes pp
        WHERE pp.partida_id = partida.id
          AND pp.user_id = p_user_id
          AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
      )
    GROUP BY partida.id
  )
  SELECT jsonb_build_object(
    'perfil', (SELECT to_jsonb(usuario) FROM usuario),
    'partidas_dirigidas', (SELECT count(*) FROM public.partidas WHERE dm_id = p_user_id),
    'partidas_activas', (SELECT count(*) FROM public.partidas WHERE dm_id = p_user_id AND estado <> 'finalizada'),
    'partidas_finalizadas', (SELECT count(*) FROM public.partidas WHERE dm_id = p_user_id AND estado = 'finalizada'),
    'inscripciones_aceptadas', (
      SELECT count(DISTINCT pp.partida_id)
      FROM public.partida_participantes pp
      JOIN public.partidas partida ON partida.id = pp.partida_id
      WHERE pp.user_id = p_user_id AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
        AND partida.dm_id <> p_user_id
    ),
    'sesiones_dirigidas', (
      SELECT count(*) FROM sesiones_usuario propia
      JOIN public.partidas partida ON partida.id = propia.partida_id
      WHERE partida.dm_id = p_user_id
    ),
    'sesiones_jugadas', (
      SELECT count(*) FROM sesiones_usuario propia
      WHERE propia.dm_id <> p_user_id
    ),
    'valoraciones_realizadas', (
      SELECT count(*) FROM public.dm_valoraciones WHERE autor_id = p_user_id
    ),
    'top_companeros', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', perfil.id,
            'username', perfil.username,
            'avatar_url', perfil.avatar_url,
            'avatar_position', perfil.avatar_position,
            'sesiones_coincidentes', companeros.sesiones_coincidentes
          )
          ORDER BY companeros.sesiones_coincidentes DESC, perfil.username
        )
        FROM (SELECT * FROM companeros ORDER BY sesiones_coincidentes DESC, id LIMIT 3) companeros
        JOIN public.profiles perfil ON perfil.id = companeros.id
      ),
      '[]'::jsonb
    ),
    'historial', coalesce(
      (SELECT jsonb_agg(to_jsonb(historial) ORDER BY historial.ultima_sesion DESC NULLS LAST, historial.titulo) FROM historial),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.estadisticas_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estadisticas_usuario(uuid) TO anon, authenticated;

COMMIT;
