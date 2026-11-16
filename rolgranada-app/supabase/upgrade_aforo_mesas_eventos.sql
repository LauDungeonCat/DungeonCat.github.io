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

NOTIFY pgrst, 'reload schema';
