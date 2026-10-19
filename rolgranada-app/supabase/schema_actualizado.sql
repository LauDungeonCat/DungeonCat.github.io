


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."franja_estado" AS ENUM (
    'no_indicado',
    'puedo',
    'podria',
    'no_puedo'
);


ALTER TYPE "public"."franja_estado" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."echar_jugador_partida"("p_partida_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1 from public.partidas partida
    where partida.id = p_partida_id and (
      partida.dm_id = auth.uid()
      or exists (select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin')
    )
  ) then
    raise exception 'Solo el DM o un administrador puede quitar jugadores.' using errcode = '42501';
  end if;

  delete from public.partida_participantes
  where partida_id = p_partida_id and user_id = p_user_id;
end;
$$;


ALTER FUNCTION "public"."echar_jugador_partida"("p_partida_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  base_username text;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Jugador'
  );

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    left(base_username, 48) || '-' || left(new.id::text, 6),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invitar_jugador_partida"("p_partida_id" "uuid", "p_username" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  jugador_id uuid;
  partida_actual public.partidas%rowtype;
begin
  select * into partida_actual from public.partidas where id = p_partida_id for update;
  if not found or (partida_actual.dm_id <> auth.uid() and not exists (
    select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin'
  )) then
    raise exception 'Solo el DM o un administrador puede invitar jugadores.' using errcode = '42501';
  end if;

  select id into jugador_id from public.profiles where lower(username) = lower(trim(p_username));
  if jugador_id is null then raise exception 'No existe un perfil con ese username.' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.partida_participantes
    where partida_id = p_partida_id and user_id = jugador_id
      and lower(trim(coalesce(estado, ''))) = 'aceptado'
  ) then return; end if;
  if partida_actual.estado <> 'abierta' then raise exception 'La partida no está abierta.' using errcode = '22023'; end if;
  if (select count(*) from public.partida_participantes where partida_id = p_partida_id and lower(trim(coalesce(estado, ''))) = 'aceptado') >= partida_actual.participantes_max then
    raise exception 'La partida está completa.' using errcode = '22023';
  end if;

  if exists (select 1 from public.partida_participantes where partida_id = p_partida_id and user_id = jugador_id) then
    update public.partida_participantes set estado = 'aceptado'
    where partida_id = p_partida_id and user_id = jugador_id;
  else
    insert into public.partida_participantes (partida_id, user_id, estado)
    values (p_partida_id, jugador_id, 'aceptado');
  end if;
end;
$$;


ALTER FUNCTION "public"."invitar_jugador_partida"("p_partida_id" "uuid", "p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_disponibilidad_partida"("p_partida_id" "uuid", "p_inicio" "date", "p_fin" "date") RETURNS TABLE("fecha" "date", "franja" "text", "participantes" integer, "pueden" integer, "podrian" integer, "no_pueden" integer, "no_indicado" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1 from public.partidas partida
    where partida.id = p_partida_id and (
      partida.dm_id = auth.uid()
      or exists (select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin')
    )
  ) then
    raise exception 'Solo el DM o un administrador puede ver el mapa de disponibilidad.' using errcode = '42501';
  end if;

  return query
  with jugadores as (
    select pp.user_id
    from public.partida_participantes pp
    where pp.partida_id = p_partida_id
      and lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
    union
    select partida.dm_id
    from public.partidas partida
    where partida.id = p_partida_id
  )
  select
    dias.dia::date,
    franjas.franja,
    count(jugadores.user_id)::integer,
    count(*) filter (where estado.valor = 'puedo')::integer,
    count(*) filter (where estado.valor = 'podria')::integer,
    count(*) filter (where estado.valor = 'no_puedo')::integer,
    count(*) filter (where estado.valor = 'no_indicado')::integer
  from generate_series(p_inicio, p_fin, interval '1 day') dias(dia)
  cross join (values ('manana'::text), ('tarde'::text)) franjas(franja)
  cross join jugadores
  left join public.disponibilidades disp on disp.user_id = jugadores.user_id and disp.fecha = dias.dia::date
  cross join lateral (
    select case
      when exists (
        select 1
        from public.sesiones sesion_ocupada
        join public.partidas partida_ocupada on partida_ocupada.id = sesion_ocupada.partida_id
        left join public.partida_participantes pp_ocupado
          on pp_ocupado.partida_id = partida_ocupada.id and pp_ocupado.user_id = jugadores.user_id
          and lower(trim(coalesce(pp_ocupado.estado, ''))) = 'aceptado'
        where sesion_ocupada.partida_id <> p_partida_id
          and sesion_ocupada.fecha = dias.dia::date
          and sesion_ocupada.franja = franjas.franja
          and (partida_ocupada.dm_id = jugadores.user_id or pp_ocupado.user_id is not null)
      ) then 'no_puedo'
      else coalesce(
        case when franjas.franja = 'manana' then disp.manana::text else disp.tarde::text end,
        'no_indicado'
      )
    end as valor
  ) estado
  group by dias.dia, franjas.franja
  order by dias.dia, franjas.franja;
end;
$$;


ALTER FUNCTION "public"."listar_disponibilidad_partida"("p_partida_id" "uuid", "p_inicio" "date", "p_fin" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_jugadores_partida"("p_partida_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "fecha_union" "text", "dias_indicados" integer, "franjas_indicadas" integer, "franjas_sin_indicar" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    r_jugador RECORD;
    v_hoy DATE := CURRENT_DATE;
    v_inicio_mes DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_fin_mes DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    v_dia_inicio INT;
    v_dias_en_mes INT;
    v_fecha_str TEXT;
    v_franjas_ind INT;
    v_franjas_pend INT;
    v_dias_ind INT;
    v_estado_manana TEXT;
    v_estado_tarde TEXT;
    v_tiene_dia BOOLEAN;
    d INT;
BEGIN
  -- Verificar permisos (DM, admin o participante)
  IF NOT (
    EXISTS (SELECT 1 FROM public.partidas p_part WHERE p_part.id = p_partida_id AND p_part.dm_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p_prof WHERE p_prof.id = auth.uid() AND p_prof.role = 'admin') OR
    EXISTS (SELECT 1 FROM public.partida_participantes p_part_part WHERE p_part_part.partida_id = p_partida_id AND p_part_part.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Solo los participantes de la partida pueden ver la lista de jugadores.';
  END IF;

  -- Iteramos por cada participante
  FOR r_jugador IN 
    SELECT pp.user_id AS p_uid, p.username AS p_uname, p.avatar_url AS p_avatar, pp.fecha_union AS p_funion
    FROM public.partida_participantes pp
    JOIN public.profiles p ON p.id = pp.user_id
    WHERE pp.partida_id = p_partida_id
  LOOP
    v_franjas_ind := 0;
    v_franjas_pend := 0;
    v_dias_ind := 0;

    -- Determinamos el día de inicio
    IF v_hoy >= v_inicio_mes AND v_hoy <= v_fin_mes THEN
      v_dia_inicio := EXTRACT(DAY FROM v_hoy)::INT;
    ELSE
      v_dia_inicio := 1;
    END IF;
    
    v_dias_en_mes := EXTRACT(DAY FROM v_fin_mes)::INT;

    -- Bucle día por día
    FOR d IN v_dia_inicio..v_dias_en_mes LOOP
      v_fecha_str := TO_CHAR(v_inicio_mes + (d - 1) * INTERVAL '1 day', 'YYYY-MM-DD');
      
      SELECT manana::text, tarde::text 
      INTO v_estado_manana, v_estado_tarde
      FROM public.disponibilidades
      WHERE public.disponibilidades.user_id = r_jugador.p_uid AND public.disponibilidades.fecha::text = v_fecha_str;

      v_tiene_dia := FALSE;

      IF v_estado_manana IS NOT NULL AND v_estado_manana != 'no_indicado' AND v_estado_manana != '' THEN
        v_franjas_ind := v_franjas_ind + 1;
        v_tiene_dia := TRUE;
      ELSE
        v_franjas_pend := v_franjas_pend + 1;
      END IF;

      IF v_estado_tarde IS NOT NULL AND v_estado_tarde != 'no_indicado' AND v_estado_tarde != '' THEN
        v_franjas_ind := v_franjas_ind + 1;
        v_tiene_dia := TRUE;
      ELSE
        v_franjas_pend := v_franjas_pend + 1;
      END IF;

      IF v_tiene_dia THEN
        v_dias_ind := v_dias_ind + 1;
      END IF;
    END LOOP;

    user_id := r_jugador.p_uid;
    username := r_jugador.p_uname;
    avatar_url := r_jugador.p_avatar;
    fecha_union := COALESCE(r_jugador.p_funion::text, NOW()::text);
    dias_indicados := v_dias_ind;
    franjas_indicadas := v_franjas_ind;
    franjas_sin_indicar := v_franjas_pend;
    
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."listar_jugadores_partida"("p_partida_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_partidas"() RETURNS TABLE("id" "uuid", "titulo" "text", "sistema" "text", "descripcion" "text", "imagen_url" "text", "dm_id" "uuid", "participantes_max" integer, "sesiones_al_mes" integer, "duracion_estimada" "text", "proxima_sesion" timestamp with time zone, "ubicacion_aproximada" "text", "ubicacion_exacta" "text", "estado" "text", "created_at" timestamp with time zone, "proxima_sesion_franja" "text", "dm_username" "text", "dm_avatar_url" "text", "participantes_count" integer, "viewer_is_participant" boolean, "viewer_has_requested" boolean, "es_privada" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    partida.id,
    partida.titulo,
    partida.sistema,
    partida.descripcion,
    partida.imagen_url,
    partida.dm_id,
    partida.participantes_max,
    partida.sesiones_al_mes,
    partida.duracion_estimada,
    case when siguiente.fecha is null then null
      else (siguiente.fecha + case when siguiente.franja = 'manana' then time '09:00' else time '15:00' end) at time zone 'Europe/Madrid'
    end,
    partida.ubicacion_aproximada,
    case when autorizacion.puede_ver then partida.ubicacion_exacta else null end,
    partida.estado,
    partida.created_at,
    coalesce(siguiente.franja, null),
    coalesce(dm.username, 'DM'),
    dm.avatar_url,
    (select count(*)::integer from public.partida_participantes pp_count where pp_count.partida_id = partida.id and lower(trim(coalesce(pp_count.estado, ''))) = 'aceptado'),
    coalesce(existe_participante.value, false),
    coalesce(existe_solicitud.value, false),
    partida.es_privada
  from public.partidas partida
  left join public.profiles dm on dm.id = partida.dm_id
  left join lateral (
    select sesion.fecha, sesion.franja
    from public.sesiones sesion
    where sesion.partida_id = partida.id and sesion.fecha >= current_date
    order by sesion.fecha, case when sesion.franja = 'manana' then 0 else 1 end
    limit 1
  ) siguiente on true
  left join lateral (
    select
      exists (select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin') as es_admin,
      (
        auth.uid() = partida.dm_id
        or exists (select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin')
        or exists (
          select 1 from public.partida_participantes pp
          where pp.partida_id = partida.id and pp.user_id = auth.uid()
            and lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
        )
      ) as puede_ver
  ) autorizacion on true
  left join lateral (
    select exists (
      select 1 from public.partida_participantes pp
      where pp.partida_id = partida.id and pp.user_id = auth.uid()
        and lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
    ) as value
  ) existe_participante on true
  left join lateral (
    select exists (
      select 1 from public.partida_participantes pp
      where pp.partida_id = partida.id and pp.user_id = auth.uid()
        and lower(trim(coalesce(pp.estado, ''))) = 'solicitado'
    ) as value
  ) existe_solicitud on true
  order by partida.created_at desc;
$$;


ALTER FUNCTION "public"."listar_partidas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_sesiones_usuario"() RETURNS TABLE("id" "uuid", "partida_id" "uuid", "fecha" "date", "franja" "text", "created_at" timestamp with time zone, "titulo_partida" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select sesion.id, sesion.partida_id, sesion.fecha, sesion.franja,
    sesion.created_at, partida.titulo
  from public.sesiones sesion
  join public.partidas partida on partida.id = sesion.partida_id
  where exists (
    select 1 from public.partida_participantes pp
    where pp.partida_id = sesion.partida_id and pp.user_id = auth.uid()
      and lower(trim(coalesce(pp.estado, ''))) = 'aceptado'
  ) or partida.dm_id = auth.uid()
  order by sesion.fecha, sesion.franja;
$$;


ALTER FUNCTION "public"."listar_sesiones_usuario"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_solicitudes_partida"("p_partida_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "fecha_union" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (select 1 from public.partidas partida where partida.id = p_partida_id and (
    partida.dm_id = auth.uid()
    or exists (select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin')
  )) then raise exception 'Solo el DM o un administrador puede ver las solicitudes.' using errcode = '42501'; end if;
  return query
  select pp.user_id, perfil.username, pp.fecha_union
  from public.partida_participantes pp
  join public.profiles perfil on perfil.id = pp.user_id
  where pp.partida_id = p_partida_id and lower(trim(coalesce(pp.estado, ''))) = 'solicitado'
  order by pp.fecha_union;
end;
$$;


ALTER FUNCTION "public"."listar_solicitudes_partida"("p_partida_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."listar_solicitudes_usuario"() RETURNS TABLE("partida_id" "uuid", "partida_titulo" "text", "user_id" "uuid", "username" "text", "fecha_union" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select 
    p.id as partida_id,
    p.titulo as partida_titulo,
    pp.user_id,
    pr.username,
    pp.fecha_union
  from public.partida_participantes pp
  join public.partidas p on p.id = pp.partida_id
  join public.profiles pr on pr.id = pp.user_id
  where p.dm_id = auth.uid() 
    and lower(trim(coalesce(pp.estado, ''))) in ('solicitado', 'pendiente');
$$;


ALTER FUNCTION "public"."listar_solicitudes_usuario"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obtener_codigo_invitacion"("p_partida_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  codigo uuid;
begin
  select partida.codigo_invitacion into codigo
  from public.partidas partida
  where partida.id = p_partida_id and partida.es_privada and (
    partida.dm_id = auth.uid()
    or exists (select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin')
  );
  if codigo is null then raise exception 'Solo el DM o un administrador puede generar el enlace.' using errcode = '42501'; end if;
  return codigo;
end;
$$;


ALTER FUNCTION "public"."obtener_codigo_invitacion"("p_partida_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolver_solicitud_partida"("p_partida_id" "uuid", "p_user_id" "uuid", "p_aceptar" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  partida_actual public.partidas%rowtype;
begin
  select * into partida_actual from public.partidas where id = p_partida_id for update;
  if not found or (partida_actual.dm_id <> auth.uid() and not exists (
    select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin'
  )) then raise exception 'Solo el DM o un administrador puede resolver solicitudes.' using errcode = '42501'; end if;
  if not exists (select 1 from public.partida_participantes where partida_id = p_partida_id and user_id = p_user_id and lower(trim(coalesce(estado, ''))) = 'solicitado') then
    raise exception 'La solicitud ya no está pendiente.' using errcode = '22023';
  end if;
  if p_aceptar then
    if partida_actual.estado <> 'abierta' then raise exception 'La partida no está abierta.' using errcode = '22023'; end if;
    if (select count(*) from public.partida_participantes where partida_id = p_partida_id and lower(trim(coalesce(estado, ''))) = 'aceptado') >= partida_actual.participantes_max then
      raise exception 'La partida está completa.' using errcode = '22023';
    end if;
    update public.partida_participantes set estado = 'aceptado' where partida_id = p_partida_id and user_id = p_user_id;
  else
    update public.partida_participantes set estado = 'rechazado' where partida_id = p_partida_id and user_id = p_user_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."resolver_solicitud_partida"("p_partida_id" "uuid", "p_user_id" "uuid", "p_aceptar" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."solicitar_unirse_partida"("p_partida_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  partida_actual public.partidas%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesión para solicitar acceso.' using errcode = '42501';
  end if;
  select * into partida_actual from public.partidas where id = p_partida_id for update;
  if not found then raise exception 'La partida no existe.' using errcode = 'P0002'; end if;
  if not partida_actual.es_privada then raise exception 'Esta campaña es pública; puedes unirte directamente.' using errcode = '22023'; end if;
  if partida_actual.dm_id = current_user_id then raise exception 'El DM ya dirige esta partida.' using errcode = '22023'; end if;
  if partida_actual.estado <> 'abierta' then raise exception 'La partida no está abierta.' using errcode = '22023'; end if;
  if (select count(*) from public.partida_participantes where partida_id = p_partida_id and lower(trim(coalesce(estado, ''))) = 'aceptado') >= partida_actual.participantes_max then
    raise exception 'La partida está completa.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.partida_participantes
    where partida_id = p_partida_id and user_id = current_user_id
      and lower(trim(coalesce(estado, ''))) = 'aceptado'
  ) then return; end if;
  if exists (select 1 from public.partida_participantes where partida_id = p_partida_id and user_id = current_user_id) then
    update public.partida_participantes set estado = 'solicitado'
    where partida_id = p_partida_id and user_id = current_user_id;
  else
    insert into public.partida_participantes (partida_id, user_id, estado)
    values (p_partida_id, current_user_id, 'solicitado');
  end if;
end;
$$;


ALTER FUNCTION "public"."solicitar_unirse_partida"("p_partida_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unirse_partida"("p_partida_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  partida_actual public.partidas%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesión para unirte a una partida.' using errcode = '42501';
  end if;

  select * into partida_actual
  from public.partidas
  where id = p_partida_id
  for update;

  if not found then
    raise exception 'La partida no existe.' using errcode = 'P0002';
  end if;

  if partida_actual.dm_id = current_user_id then
    raise exception 'El DM ya dirige esta partida y no puede unirse como participante.' using errcode = '22023';
  end if;

  if partida_actual.es_privada then
    raise exception 'Esta campaña es privada. Solicita acceso o usa un enlace de invitación.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.partida_participantes
    where partida_id = p_partida_id and user_id = current_user_id
      and lower(trim(coalesce(estado, ''))) = 'aceptado'
  ) then
    return;
  end if;

  if partida_actual.estado <> 'abierta' then
    raise exception 'La partida no está abierta.' using errcode = '22023';
  end if;

  if (select count(*) from public.partida_participantes where partida_id = p_partida_id and lower(trim(coalesce(estado, ''))) = 'aceptado') >= partida_actual.participantes_max then
    raise exception 'La partida está completa.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.partida_participantes
    where partida_id = p_partida_id and user_id = current_user_id
  ) then
    update public.partida_participantes
    set estado = 'aceptado'
    where partida_id = p_partida_id and user_id = current_user_id;
  else
    insert into public.partida_participantes (partida_id, user_id, estado)
    values (p_partida_id, current_user_id, 'aceptado');
  end if;
end;
$$;


ALTER FUNCTION "public"."unirse_partida"("p_partida_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unirse_por_invitacion"("p_partida_id" "uuid", "p_codigo_invitacion" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  partida_actual public.partidas%rowtype;
begin
  if current_user_id is null then raise exception 'Debes iniciar sesión para aceptar la invitación.' using errcode = '42501'; end if;
  select * into partida_actual from public.partidas where id = p_partida_id for update;
  if not found or not partida_actual.es_privada or partida_actual.codigo_invitacion <> p_codigo_invitacion then
    raise exception 'El enlace de invitación no es válido.' using errcode = '42501';
  end if;
  if partida_actual.dm_id = current_user_id then raise exception 'El DM ya dirige esta partida.' using errcode = '22023'; end if;
  if partida_actual.estado <> 'abierta' then raise exception 'La partida no está abierta.' using errcode = '22023'; end if;
  if exists (select 1 from public.partida_participantes where partida_id = p_partida_id and user_id = current_user_id and lower(trim(coalesce(estado, ''))) = 'aceptado') then return; end if;
  if (select count(*) from public.partida_participantes where partida_id = p_partida_id and lower(trim(coalesce(estado, ''))) = 'aceptado') >= partida_actual.participantes_max then
    raise exception 'La partida está completa.' using errcode = '22023';
  end if;
  if exists (select 1 from public.partida_participantes where partida_id = p_partida_id and user_id = current_user_id) then
    update public.partida_participantes set estado = 'aceptado'
    where partida_id = p_partida_id and user_id = current_user_id;
  else
    insert into public.partida_participantes (partida_id, user_id, estado)
    values (p_partida_id, current_user_id, 'aceptado');
  end if;
end;
$$;


ALTER FUNCTION "public"."unirse_por_invitacion"("p_partida_id" "uuid", "p_codigo_invitacion" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."disponibilidades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "manana" "public"."franja_estado" DEFAULT 'no_indicado'::"public"."franja_estado",
    "tarde" "public"."franja_estado" DEFAULT 'no_indicado'::"public"."franja_estado",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."disponibilidades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "mensaje" "text" NOT NULL,
    "leida" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."notificaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partida_participantes" (
    "partida_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fecha_union" timestamp with time zone DEFAULT "now"(),
    "estado" "text" DEFAULT 'aceptado'::"text",
    CONSTRAINT "partida_participantes_estado_check" CHECK ((("estado" IS NULL) OR ("lower"(TRIM(BOTH FROM "estado")) = ANY (ARRAY['aceptado'::"text", 'solicitado'::"text", 'rechazado'::"text", 'pendiente'::"text"]))))
);


ALTER TABLE "public"."partida_participantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partidas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "sistema" "text" NOT NULL,
    "descripcion" "text",
    "imagen_url" "text",
    "dm_id" "uuid",
    "participantes_max" integer DEFAULT 4,
    "estado" "text" DEFAULT 'abierta'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ubicacion_aproximada" "text",
    "ubicacion_exacta" "text",
    "sesiones_al_mes" integer,
    "duracion_estimada" "text",
    "es_privada" boolean DEFAULT false NOT NULL,
    "codigo_invitacion" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "partidas_estado_check" CHECK (("estado" = ANY (ARRAY['abierta'::"text", 'en_curso'::"text", 'finalizada'::"text"])))
);


ALTER TABLE "public"."partidas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rol_preferencias" "jsonb" DEFAULT '{}'::"jsonb",
    "lineas_evitar" "text" DEFAULT ''::"text",
    "estilo_master" "text" DEFAULT ''::"text",
    "pronombres" "text" DEFAULT ''::"text",
    "avatar_position" "text" DEFAULT '50% 50%'::"text",
    "notif_email_activo" boolean DEFAULT true,
    "notif_push_activo" boolean DEFAULT true,
    "notif_inapp_activo" boolean DEFAULT true,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subscription" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesiones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partida_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "franja" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sesiones_franja_check" CHECK (("franja" = ANY (ARRAY['manana'::"text", 'tarde'::"text"])))
);


ALTER TABLE "public"."sesiones" OWNER TO "postgres";


ALTER TABLE ONLY "public"."disponibilidades"
    ADD CONSTRAINT "disponibilidades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partida_participantes"
    ADD CONSTRAINT "partida_participantes_pkey" PRIMARY KEY ("partida_id", "user_id");



ALTER TABLE ONLY "public"."partidas"
    ADD CONSTRAINT "partidas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "unique_partida_fecha_franja" UNIQUE ("partida_id", "fecha", "franja");



ALTER TABLE ONLY "public"."disponibilidades"
    ADD CONSTRAINT "unique_user_fecha" UNIQUE ("user_id", "fecha");



CREATE INDEX "sesiones_fecha_idx" ON "public"."sesiones" USING "btree" ("fecha");



CREATE INDEX "sesiones_partida_fecha_idx" ON "public"."sesiones" USING "btree" ("partida_id", "fecha");



ALTER TABLE ONLY "public"."disponibilidades"
    ADD CONSTRAINT "disponibilidades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partida_participantes"
    ADD CONSTRAINT "partida_participantes_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partida_participantes"
    ADD CONSTRAINT "partida_participantes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partidas"
    ADD CONSTRAINT "partidas_dm_id_fkey" FOREIGN KEY ("dm_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE CASCADE;



CREATE POLICY "DM o Admin modifican/borran partida" ON "public"."partidas" USING ((("auth"."uid"() = "dm_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "DM o Admin pueden crear/borrar sesiones" ON "public"."sesiones" USING ((EXISTS ( SELECT 1
   FROM "public"."partidas"
  WHERE (("partidas"."id" = "sesiones"."partida_id") AND (("partidas"."dm_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))))))));



CREATE POLICY "Disponibilidad visible por usuarios autenticados" ON "public"."disponibilidades" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Inscripciones visibles por todos" ON "public"."partida_participantes" FOR SELECT USING (true);



CREATE POLICY "Jugadores gestionan sus inscripciones" ON "public"."partida_participantes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Los usuarios gestionan sus propias notificaciones" ON "public"."notificaciones" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Partidas visibles por todos" ON "public"."partidas" FOR SELECT USING (true);



CREATE POLICY "Perfiles visibles por todos" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Permitir actualizar partidas al DM creador" ON "public"."partidas" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "dm_id")) WITH CHECK (("auth"."uid"() = "dm_id"));



CREATE POLICY "Permitir borrar partidas al DM creador" ON "public"."partidas" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "dm_id"));



CREATE POLICY "Permitir crear partidas a usuarios autenticados" ON "public"."partidas" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "dm_id"));



CREATE POLICY "Permitir lectura de partidas" ON "public"."partidas" FOR SELECT USING (true);



CREATE POLICY "Sesiones visibles por todos los autenticados" ON "public"."sesiones" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Usuarios autenticados crean partidas" ON "public"."partidas" FOR INSERT WITH CHECK (("auth"."uid"() = "dm_id"));



CREATE POLICY "Usuarios gestionan sus propias suscripciones push" ON "public"."push_subscriptions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios modifican su propia disponibilidad" ON "public"."disponibilidades" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios modifican su propio perfil" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Usuarios pueden actualizar sus propias notificaciones" ON "public"."notificaciones" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios pueden ver sus propias notificaciones" ON "public"."notificaciones" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."disponibilidades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "disponibilidades_delete_self" ON "public"."disponibilidades" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "disponibilidades_insert_self" ON "public"."disponibilidades" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "disponibilidades_select_self" ON "public"."disponibilidades" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "disponibilidades_update_self" ON "public"."disponibilidades" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notificaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participantes_delete_self" ON "public"."partida_participantes" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "participantes_select_self" ON "public"."partida_participantes" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."partida_participantes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partidas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partidas_delete_dm_or_admin" ON "public"."partidas" FOR DELETE TO "authenticated" USING ((("dm_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'admin'::"text"))))));



CREATE POLICY "partidas_insert_as_dm" ON "public"."partidas" FOR INSERT TO "authenticated" WITH CHECK (("dm_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "partidas_select_authenticated" ON "public"."partidas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "partidas_update_dm_or_admin" ON "public"."partidas" FOR UPDATE TO "authenticated" USING ((("dm_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'admin'::"text")))))) WITH CHECK ((("dm_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sesiones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sesiones_delete_dm_or_admin" ON "public"."sesiones" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."partidas" "partida"
  WHERE (("partida"."id" = "sesiones"."partida_id") AND (("partida"."dm_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "perfil"
          WHERE (("perfil"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("perfil"."role" = 'admin'::"text")))))))));



CREATE POLICY "sesiones_insert_dm" ON "public"."sesiones" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."partidas" "partida"
  WHERE (("partida"."id" = "sesiones"."partida_id") AND ("partida"."dm_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "sesiones_select_members" ON "public"."sesiones" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."partidas" "partida"
  WHERE (("partida"."id" = "sesiones"."partida_id") AND (("partida"."dm_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."partida_participantes" "pp"
          WHERE (("pp"."partida_id" = "partida"."id") AND ("pp"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("lower"(TRIM(BOTH FROM COALESCE("pp"."estado", ''::"text"))) = 'aceptado'::"text")))))))));



CREATE POLICY "sesiones_update_dm" ON "public"."sesiones" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."partidas" "partida"
  WHERE (("partida"."id" = "sesiones"."partida_id") AND ("partida"."dm_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."partidas" "partida"
  WHERE (("partida"."id" = "sesiones"."partida_id") AND ("partida"."dm_id" = ( SELECT "auth"."uid"() AS "uid"))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notificaciones";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."echar_jugador_partida"("p_partida_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."echar_jugador_partida"("p_partida_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."echar_jugador_partida"("p_partida_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."invitar_jugador_partida"("p_partida_id" "uuid", "p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invitar_jugador_partida"("p_partida_id" "uuid", "p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invitar_jugador_partida"("p_partida_id" "uuid", "p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."listar_disponibilidad_partida"("p_partida_id" "uuid", "p_inicio" "date", "p_fin" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."listar_disponibilidad_partida"("p_partida_id" "uuid", "p_inicio" "date", "p_fin" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."listar_disponibilidad_partida"("p_partida_id" "uuid", "p_inicio" "date", "p_fin" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."listar_jugadores_partida"("p_partida_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."listar_jugadores_partida"("p_partida_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."listar_jugadores_partida"("p_partida_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."listar_partidas"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."listar_partidas"() TO "anon";
GRANT ALL ON FUNCTION "public"."listar_partidas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."listar_partidas"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."listar_sesiones_usuario"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."listar_sesiones_usuario"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."listar_sesiones_usuario"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."listar_solicitudes_partida"("p_partida_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."listar_solicitudes_partida"("p_partida_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."listar_solicitudes_partida"("p_partida_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."listar_solicitudes_usuario"() TO "anon";
GRANT ALL ON FUNCTION "public"."listar_solicitudes_usuario"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."listar_solicitudes_usuario"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."obtener_codigo_invitacion"("p_partida_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."obtener_codigo_invitacion"("p_partida_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."obtener_codigo_invitacion"("p_partida_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolver_solicitud_partida"("p_partida_id" "uuid", "p_user_id" "uuid", "p_aceptar" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolver_solicitud_partida"("p_partida_id" "uuid", "p_user_id" "uuid", "p_aceptar" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolver_solicitud_partida"("p_partida_id" "uuid", "p_user_id" "uuid", "p_aceptar" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."solicitar_unirse_partida"("p_partida_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."solicitar_unirse_partida"("p_partida_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."solicitar_unirse_partida"("p_partida_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."unirse_partida"("p_partida_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unirse_partida"("p_partida_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unirse_partida"("p_partida_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."unirse_por_invitacion"("p_partida_id" "uuid", "p_codigo_invitacion" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unirse_por_invitacion"("p_partida_id" "uuid", "p_codigo_invitacion" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unirse_por_invitacion"("p_partida_id" "uuid", "p_codigo_invitacion" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."disponibilidades" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."disponibilidades" TO "authenticated";



GRANT ALL ON TABLE "public"."notificaciones" TO "anon";
GRANT ALL ON TABLE "public"."notificaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."notificaciones" TO "service_role";



GRANT ALL ON TABLE "public"."partida_participantes" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."partida_participantes" TO "authenticated";



GRANT ALL ON TABLE "public"."partidas" TO "service_role";
GRANT DELETE ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("titulo"),INSERT("titulo"),UPDATE("titulo") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("sistema"),INSERT("sistema"),UPDATE("sistema") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("descripcion"),INSERT("descripcion"),UPDATE("descripcion") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("imagen_url"),INSERT("imagen_url"),UPDATE("imagen_url") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("dm_id"),INSERT("dm_id") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("participantes_max"),INSERT("participantes_max"),UPDATE("participantes_max") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("estado"),UPDATE("estado") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("ubicacion_aproximada"),INSERT("ubicacion_aproximada"),UPDATE("ubicacion_aproximada") ON TABLE "public"."partidas" TO "authenticated";



GRANT INSERT("ubicacion_exacta"),UPDATE("ubicacion_exacta") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("sesiones_al_mes"),INSERT("sesiones_al_mes"),UPDATE("sesiones_al_mes") ON TABLE "public"."partidas" TO "authenticated";



GRANT SELECT("duracion_estimada"),INSERT("duracion_estimada"),UPDATE("duracion_estimada") ON TABLE "public"."partidas" TO "authenticated";



GRANT INSERT("es_privada"),UPDATE("es_privada") ON TABLE "public"."partidas" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("username") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("rol_preferencias") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("lineas_evitar") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("estilo_master") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("pronombres") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_position") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";

GRANT ALL ON TABLE "public"."sesiones" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sesiones" TO "authenticated";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


