BEGIN;

ALTER TABLE public.partidas
  ADD COLUMN IF NOT EXISTS es_evento boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.marcar_partida_evento(
  p_partida_id uuid,
  p_es_evento boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo un administrador puede marcar partidas como evento.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.partidas
  SET es_evento = coalesce(p_es_evento, false)
  WHERE id = p_partida_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La partida no existe.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

ALTER FUNCTION public.marcar_partida_evento(uuid, boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.marcar_partida_evento(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_partida_evento(uuid, boolean) TO authenticated, service_role;

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
  fecha_fin timestamptz,
  amigos_pueden_unirse boolean,
  viewer_es_amigo boolean,
  es_evento boolean
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
    partida.fecha_fin,
    partida.amigos_pueden_unirse,
    coalesce(amigo_del_dm.value, false),
    partida.es_evento
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

COMMIT;
