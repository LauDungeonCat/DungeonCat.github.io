BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_max_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_max_length CHECK (char_length(bio) <= 500);

CREATE TABLE IF NOT EXISTS public.amistades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amistades_no_auto CHECK (solicitante_id <> destinatario_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS amistades_par_unico
  ON public.amistades (LEAST(solicitante_id, destinatario_id), GREATEST(solicitante_id, destinatario_id));

ALTER TABLE public.amistades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.amistades FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.actualizar_bio_perfil(p_bio text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para editar tu biografía.' USING ERRCODE = '42501';
  END IF;
  IF char_length(coalesce(p_bio, '')) > 500 THEN
    RAISE EXCEPTION 'La biografía no puede superar los 500 caracteres.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.profiles
  SET bio = trim(coalesce(p_bio, ''))
  WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró tu perfil.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_amistad(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_solicitante uuid;
  v_estado text;
  v_nombre text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para solicitar amistad.' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes enviarte una solicitud de amistad.' USING ERRCODE = '22023';
  END IF;

  SELECT username INTO v_nombre FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró ese perfil.' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, solicitante_id, estado
  INTO v_id, v_solicitante, v_estado
  FROM public.amistades
  WHERE (solicitante_id = auth.uid() AND destinatario_id = p_user_id)
     OR (solicitante_id = p_user_id AND destinatario_id = auth.uid())
  FOR UPDATE;

  IF FOUND THEN
    IF v_estado = 'aceptada' THEN
      RAISE EXCEPTION 'Ya sois amigos.' USING ERRCODE = '23505';
    ELSIF v_solicitante = auth.uid() THEN
      RAISE EXCEPTION 'Ya has enviado una solicitud a esta persona.' USING ERRCODE = '23505';
    ELSE
      RAISE EXCEPTION 'Esta persona ya te ha enviado una solicitud; puedes aceptarla desde Amigos.' USING ERRCODE = '23505';
    END IF;
  END IF;

  INSERT INTO public.amistades (solicitante_id, destinatario_id)
  VALUES (auth.uid(), p_user_id)
  RETURNING id INTO v_id;

  INSERT INTO public.notificaciones (user_id, titulo, mensaje)
  VALUES (p_user_id, 'Solicitud de amistad', format('%s quiere añadirte como amistad.', coalesce(v_nombre, 'Una persona')));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.responder_solicitud_amistad(p_solicitud_id uuid, p_aceptar boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_solicitante uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para responder.' USING ERRCODE = '42501';
  END IF;
  SELECT solicitante_id INTO v_solicitante
  FROM public.amistades
  WHERE id = p_solicitud_id
    AND destinatario_id = auth.uid()
    AND estado = 'pendiente'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud ya no está disponible.' USING ERRCODE = 'P0002';
  END IF;

  IF p_aceptar THEN
    UPDATE public.amistades SET estado = 'aceptada' WHERE id = p_solicitud_id;
    INSERT INTO public.notificaciones (user_id, titulo, mensaje)
    VALUES (v_solicitante, 'Solicitud de amistad aceptada', 'Tu solicitud de amistad ha sido aceptada.');
  ELSE
    DELETE FROM public.amistades WHERE id = p_solicitud_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_solicitud_amistad(p_solicitud_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para cancelar una solicitud.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.amistades
  WHERE id = p_solicitud_id
    AND solicitante_id = auth.uid()
    AND estado = 'pendiente';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud ya no está disponible.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_amistad(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para gestionar tus amistades.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.amistades
  WHERE estado = 'aceptada'
    AND ((solicitante_id = auth.uid() AND destinatario_id = p_user_id)
      OR (solicitante_id = p_user_id AND destinatario_id = auth.uid()));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa amistad ya no existe.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_amistades(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amigos jsonb;
  v_recibidas jsonb := '[]'::jsonb;
  v_enviadas jsonb := '[]'::jsonb;
  v_relacion jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'El perfil solicitado no es válido.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'No se encontró ese perfil.' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', amistad.id,
    'user_id', perfil.id,
    'username', perfil.username,
    'avatar_url', perfil.avatar_url,
    'avatar_position', perfil.avatar_position
  ) ORDER BY perfil.username), '[]'::jsonb)
  INTO v_amigos
  FROM public.amistades amistad
  JOIN public.profiles perfil
    ON perfil.id = CASE WHEN amistad.solicitante_id = p_user_id THEN amistad.destinatario_id ELSE amistad.solicitante_id END
  WHERE amistad.estado = 'aceptada'
    AND p_user_id IN (amistad.solicitante_id, amistad.destinatario_id);

  IF auth.uid() = p_user_id THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', amistad.id, 'user_id', perfil.id, 'username', perfil.username,
      'avatar_url', perfil.avatar_url, 'avatar_position', perfil.avatar_position
    ) ORDER BY amistad.created_at), '[]'::jsonb)
    INTO v_recibidas
    FROM public.amistades amistad
    JOIN public.profiles perfil ON perfil.id = amistad.solicitante_id
    WHERE amistad.destinatario_id = p_user_id AND amistad.estado = 'pendiente';

    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', amistad.id, 'user_id', perfil.id, 'username', perfil.username,
      'avatar_url', perfil.avatar_url, 'avatar_position', perfil.avatar_position
    ) ORDER BY amistad.created_at), '[]'::jsonb)
    INTO v_enviadas
    FROM public.amistades amistad
    JOIN public.profiles perfil ON perfil.id = amistad.destinatario_id
    WHERE amistad.solicitante_id = p_user_id AND amistad.estado = 'pendiente';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    SELECT jsonb_build_object(
      'id', amistad.id,
      'estado', amistad.estado,
      'enviada_por_visor', amistad.solicitante_id = auth.uid()
    )
    INTO v_relacion
    FROM public.amistades amistad
    WHERE (amistad.solicitante_id = auth.uid() AND amistad.destinatario_id = p_user_id)
       OR (amistad.solicitante_id = p_user_id AND amistad.destinatario_id = auth.uid());
  END IF;

  RETURN jsonb_build_object(
    'amigos', v_amigos,
    'solicitudes_recibidas', v_recibidas,
    'solicitudes_enviadas', v_enviadas,
    'relacion', v_relacion
  );
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_bio_perfil(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.solicitar_amistad(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.responder_solicitud_amistad(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_solicitud_amistad(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eliminar_amistad(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_amistades(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_bio_perfil(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_amistad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.responder_solicitud_amistad(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_solicitud_amistad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_amistad(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_amistades(uuid) TO anon, authenticated;

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
  SELECT partida.titulo, partida.dm_id INTO v_titulo, v_dm_id
  FROM public.partidas partida WHERE partida.id = p_partida_id FOR UPDATE;
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
  SELECT pp.user_id, 'Partida finalizada',
    format('La partida «%s» ha finalizado. El historial de la partida se conserva en tu perfil.', v_titulo)
  FROM public.partida_participantes pp
  WHERE pp.partida_id = p_partida_id
    AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
    AND pp.user_id <> auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.finalizar_partida(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_partida(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.estadisticas_usuario(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH usuario AS (
    SELECT perfil.id, perfil.username, perfil.avatar_url, perfil.avatar_position,
      perfil.role, perfil.created_at, perfil.bio, perfil.apoyo_kofi,
      perfil.seguidor_youtube, perfil.creador_jdr
    FROM public.profiles perfil
    WHERE perfil.id = p_user_id
  ),
  sesiones_usuario AS (
    SELECT sesion.id, sesion.partida_id, partida.dm_id, sesion.fecha, sesion.franja
    FROM public.sesiones sesion
    JOIN public.partidas partida ON partida.id = sesion.partida_id
    WHERE sesion.fecha < current_date
      AND (partida.dm_id = p_user_id OR EXISTS (
        SELECT 1 FROM public.partida_participantes pp
        WHERE pp.partida_id = partida.id AND pp.user_id = p_user_id
          AND lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
      ))
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
    SELECT partida.id AS partida_id, partida.titulo, partida.sistema, partida.estado,
      CASE WHEN partida.dm_id = p_user_id THEN 'DM' ELSE 'Jugador' END AS rol,
      count(sesion.id) FILTER (WHERE sesion.fecha < current_date)::integer AS sesiones_jugadas,
      max(sesion.fecha) FILTER (WHERE sesion.fecha < current_date) AS ultima_sesion
    FROM public.partidas partida
    LEFT JOIN public.sesiones sesion ON sesion.partida_id = partida.id
    WHERE partida.dm_id = p_user_id OR EXISTS (
      SELECT 1 FROM public.partida_participantes pp
      WHERE pp.partida_id = partida.id AND pp.user_id = p_user_id
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
      SELECT count(*) FROM sesiones_usuario propia WHERE propia.dm_id <> p_user_id
    ),
    'companeros_distintos', (SELECT count(*) FROM companeros),
    'top_companeros', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', perfil.id, 'username', perfil.username, 'avatar_url', perfil.avatar_url,
        'avatar_position', perfil.avatar_position, 'sesiones_coincidentes', companeros.sesiones_coincidentes
      ) ORDER BY companeros.sesiones_coincidentes DESC, perfil.username)
      FROM (SELECT * FROM companeros ORDER BY sesiones_coincidentes DESC, id LIMIT 3) companeros
      JOIN public.profiles perfil ON perfil.id = companeros.id
    ), '[]'::jsonb),
    'historial', coalesce((
      SELECT jsonb_agg(to_jsonb(historial) ORDER BY historial.ultima_sesion DESC NULLS LAST, historial.titulo)
      FROM historial
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.estadisticas_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estadisticas_usuario(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.partidas_pendientes_valoracion();
DROP FUNCTION IF EXISTS public.listar_valoraciones_dm(uuid);
DROP FUNCTION IF EXISTS public.valorar_dm(uuid, integer, text[], text);
DROP TABLE IF EXISTS public.dm_valoraciones CASCADE;

DELETE FROM public.notificaciones WHERE titulo = 'Nueva valoración';
UPDATE public.notificaciones
SET mensaje = regexp_replace(mensaje, ' Ya puedes valorar a tu DM desde Mis Partidas\.', '')
WHERE titulo = 'Partida finalizada'
  AND mensaje LIKE '%Ya puedes valorar a tu DM desde Mis Partidas.%';

COMMIT;
