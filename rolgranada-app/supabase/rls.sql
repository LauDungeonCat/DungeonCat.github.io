-- Run after creating the five tables described in the Rol Granada schema.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := coalesce(
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

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, username, avatar_url)
select
  users.id,
  left(coalesce(
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Jugador'
  ), 48) || '-' || left(users.id::text, 6),
  coalesce(users.raw_user_meta_data ->> 'avatar_url', users.raw_user_meta_data ->> 'picture')
from auth.users users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.partidas enable row level security;
alter table public.partida_participantes enable row level security;
alter table public.disponibilidades enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on public.partidas from anon, authenticated;
grant select (
  id, titulo, sistema, descripcion, imagen_url, dm_id, participantes_max,
  proxima_sesion, ubicacion_aproximada, estado, created_at
) on public.partidas to authenticated;
grant insert (
  titulo, sistema, descripcion, imagen_url, dm_id, participantes_max,
  proxima_sesion, ubicacion_aproximada, ubicacion_exacta, notas_dm
) on public.partidas to authenticated;
grant update (
  titulo, sistema, descripcion, imagen_url, participantes_max, proxima_sesion,
  ubicacion_aproximada, ubicacion_exacta, notas_dm, estado
) on public.partidas to authenticated;
grant delete on public.partidas to authenticated;

drop policy if exists "partidas_select_authenticated" on public.partidas;
create policy "partidas_select_authenticated" on public.partidas
for select to authenticated using (true);

drop policy if exists "partidas_insert_as_dm" on public.partidas;
create policy "partidas_insert_as_dm" on public.partidas
for insert to authenticated with check (dm_id = (select auth.uid()));

drop policy if exists "partidas_update_dm_or_admin" on public.partidas;
create policy "partidas_update_dm_or_admin" on public.partidas
for update to authenticated
using (
  dm_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
)
with check (
  dm_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists "partidas_delete_dm_or_admin" on public.partidas;
create policy "partidas_delete_dm_or_admin" on public.partidas
for delete to authenticated
using (
  dm_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

create or replace function public.listar_partidas()
returns table (
  id uuid,
  titulo text,
  sistema text,
  descripcion text,
  imagen_url text,
  dm_id uuid,
  participantes_max integer,
  proxima_sesion timestamptz,
  ubicacion_aproximada text,
  ubicacion_exacta text,
  estado text,
  created_at timestamp,
  dm_username text,
  dm_avatar_url text,
  participant_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    partida.id,
    partida.titulo,
    partida.sistema,
    partida.descripcion,
    partida.imagen_url,
    partida.dm_id,
    partida.participantes_max,
    partida.proxima_sesion,
    partida.ubicacion_aproximada,
    case
      when auth.uid() = partida.dm_id
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
        or exists (
          select 1 from public.partida_participantes pp
          where pp.partida_id = partida.id and pp.user_id = auth.uid()
        )
      then partida.ubicacion_exacta
      else null
    end,
    partida.estado,
    partida.created_at,
    coalesce(dm.username, 'DM'),
    dm.avatar_url,
    coalesce(array_agg(pp.user_id) filter (where pp.user_id is not null), '{}'::uuid[])
  from public.partidas partida
  left join public.profiles dm on dm.id = partida.dm_id
  left join public.partida_participantes pp on pp.partida_id = partida.id
  where auth.uid() is not null
  group by partida.id, dm.username, dm.avatar_url
  order by partida.created_at desc;
$$;
revoke all on function public.listar_partidas() from public, anon;
grant execute on function public.listar_partidas() to authenticated;

revoke all on public.partida_participantes from anon, authenticated;
grant select, delete on public.partida_participantes to authenticated;

drop policy if exists "participantes_select_self" on public.partida_participantes;
create policy "participantes_select_self" on public.partida_participantes
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "participantes_delete_self" on public.partida_participantes;
create policy "participantes_delete_self" on public.partida_participantes
for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.unirse_partida(p_partida_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  if exists (
    select 1 from public.partida_participantes
    where partida_id = p_partida_id and user_id = current_user_id
  ) then
    return;
  end if;

  if partida_actual.estado <> 'abierta' then
    raise exception 'La partida no está abierta.' using errcode = '22023';
  end if;

  if (select count(*) from public.partida_participantes where partida_id = p_partida_id) >= partida_actual.participantes_max then
    raise exception 'La partida está completa.' using errcode = '22023';
  end if;

  insert into public.partida_participantes (partida_id, user_id)
  values (p_partida_id, current_user_id);
end;
$$;
revoke all on function public.unirse_partida(uuid) from public, anon;
grant execute on function public.unirse_partida(uuid) to authenticated;

revoke all on public.disponibilidades from anon, authenticated;
grant select, insert, update, delete on public.disponibilidades to authenticated;

drop policy if exists "disponibilidades_select_self" on public.disponibilidades;
create policy "disponibilidades_select_self" on public.disponibilidades
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "disponibilidades_insert_self" on public.disponibilidades;
create policy "disponibilidades_insert_self" on public.disponibilidades
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "disponibilidades_update_self" on public.disponibilidades;
create policy "disponibilidades_update_self" on public.disponibilidades
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "disponibilidades_delete_self" on public.disponibilidades;
create policy "disponibilidades_delete_self" on public.disponibilidades
for delete to authenticated using (user_id = (select auth.uid()));

-- Public campaign listing: private exact addresses and DM notes are returned only to authorized viewers.
drop function if exists public.listar_partidas();
create function public.listar_partidas()
returns table (
  id uuid,
  titulo text,
  sistema text,
  descripcion text,
  imagen_url text,
  dm_id uuid,
  participantes_max integer,
  proxima_sesion timestamptz,
  ubicacion_aproximada text,
  ubicacion_exacta text,
  notas_dm text,
  estado text,
  created_at timestamp,
  proxima_sesion_franja text,
  dm_username text,
  dm_avatar_url text,
  participantes_count integer,
  viewer_is_participant boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    partida.id,
    partida.titulo,
    partida.sistema,
    partida.descripcion,
    partida.imagen_url,
    partida.dm_id,
    partida.participantes_max,
    coalesce(
      case
        when siguiente.fecha is null then null
        else (siguiente.fecha + case when siguiente.franja = 'manana' then time '09:00' else time '15:00' end) at time zone 'Europe/Madrid'
      end,
      partida.proxima_sesion
    ),
    partida.ubicacion_aproximada,
    case when autorizacion.puede_ver then partida.ubicacion_exacta else null end,
    case when auth.uid() = partida.dm_id or autorizacion.es_admin then partida.notas_dm else null end,
    partida.estado,
    partida.created_at,
    coalesce(siguiente.franja, null),
    coalesce(dm.username, 'DM'),
    dm.avatar_url,
    (select count(*)::integer from public.partida_participantes pp_count where pp_count.partida_id = partida.id),
    coalesce(existe_participante.value, false)
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
        or exists (select 1 from public.partida_participantes pp where pp.partida_id = partida.id and pp.user_id = auth.uid())
      ) as puede_ver
  ) autorizacion on true
  left join lateral (
    select exists (
      select 1 from public.partida_participantes pp
      where pp.partida_id = partida.id and pp.user_id = auth.uid()
    ) as value
  ) existe_participante on true
  order by partida.created_at desc;
$$;
revoke all on function public.listar_partidas() from public;
grant execute on function public.listar_partidas() to anon, authenticated;

create or replace function public.listar_jugadores_partida(p_partida_id uuid)
returns table (user_id uuid, username text, avatar_url text, fecha_union timestamp)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.partidas partida
    where partida.id = p_partida_id and (
      partida.dm_id = auth.uid()
      or exists (select 1 from public.profiles perfil where perfil.id = auth.uid() and perfil.role = 'admin')
    )
  ) then
    raise exception 'Solo el DM o un administrador puede ver la lista de jugadores.' using errcode = '42501';
  end if;

  return query
  select pp.user_id, perfil.username, perfil.avatar_url, pp.fecha_union
  from public.partida_participantes pp
  join public.profiles perfil on perfil.id = pp.user_id
  where pp.partida_id = p_partida_id
  order by pp.fecha_union;
end;
$$;
revoke all on function public.listar_jugadores_partida(uuid) from public, anon;
grant execute on function public.listar_jugadores_partida(uuid) to authenticated;

create or replace function public.invitar_jugador_partida(p_partida_id uuid, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  if exists (select 1 from public.partida_participantes where partida_id = p_partida_id and user_id = jugador_id) then return; end if;
  if partida_actual.estado <> 'abierta' then raise exception 'La partida no está abierta.' using errcode = '22023'; end if;
  if (select count(*) from public.partida_participantes where partida_id = p_partida_id) >= partida_actual.participantes_max then
    raise exception 'La partida está completa.' using errcode = '22023';
  end if;

  insert into public.partida_participantes (partida_id, user_id) values (p_partida_id, jugador_id);
end;
$$;
revoke all on function public.invitar_jugador_partida(uuid, text) from public, anon;
grant execute on function public.invitar_jugador_partida(uuid, text) to authenticated;

create or replace function public.echar_jugador_partida(p_partida_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
revoke all on function public.echar_jugador_partida(uuid, uuid) from public, anon;
grant execute on function public.echar_jugador_partida(uuid, uuid) to authenticated;

create or replace function public.listar_disponibilidad_partida(p_partida_id uuid, p_inicio date, p_fin date)
returns table (
  fecha date,
  franja text,
  participantes integer,
  pueden integer,
  podrian integer,
  no_pueden integer,
  no_indicado integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
  select
    dias.dia::date,
    franjas.franja,
    count(pp.user_id)::integer,
    count(*) filter (where pp.user_id is not null and estado.valor = 'puedo')::integer,
    count(*) filter (where pp.user_id is not null and estado.valor = 'podria')::integer,
    count(*) filter (where pp.user_id is not null and estado.valor = 'no_puedo')::integer,
    count(*) filter (where pp.user_id is not null and estado.valor = 'no_indicado')::integer
  from generate_series(p_inicio, p_fin, interval '1 day') dias(dia)
  cross join (values ('manana'::text), ('tarde'::text)) franjas(franja)
  left join public.partida_participantes pp on pp.partida_id = p_partida_id
  left join public.disponibilidades disp on disp.user_id = pp.user_id and disp.fecha = dias.dia::date
  cross join lateral (
    select coalesce(
      case when franjas.franja = 'manana' then disp.manana::text else disp.tarde::text end,
      'no_indicado'
    ) as valor
  ) estado
  group by dias.dia, franjas.franja
  order by dias.dia, franjas.franja;
end;
$$;
revoke all on function public.listar_disponibilidad_partida(uuid, date, date) from public, anon;
grant execute on function public.listar_disponibilidad_partida(uuid, date, date) to authenticated;

create or replace function public.listar_sesiones_usuario()
returns table (
  id uuid,
  partida_id uuid,
  fecha date,
  franja text,
  notas text,
  created_at timestamp,
  titulo_partida text
)
language sql
stable
security definer
set search_path = public
as $$
  select sesion.id, sesion.partida_id, sesion.fecha, sesion.franja,
    sesion.notas, sesion.created_at, partida.titulo
  from public.sesiones sesion
  join public.partidas partida on partida.id = sesion.partida_id
  where exists (
    select 1 from public.partida_participantes pp
    where pp.partida_id = sesion.partida_id and pp.user_id = auth.uid()
  ) or partida.dm_id = auth.uid()
  order by sesion.fecha, sesion.franja;
$$;
revoke all on function public.listar_sesiones_usuario() from public, anon;
grant execute on function public.listar_sesiones_usuario() to authenticated;

alter table public.sesiones enable row level security;
revoke all on public.sesiones from anon, authenticated;
grant select, insert, update, delete on public.sesiones to authenticated;

drop policy if exists "sesiones_select_members" on public.sesiones;
create policy "sesiones_select_members" on public.sesiones
for select to authenticated using (
  exists (
    select 1 from public.partidas partida
    where partida.id = partida_id and (
      partida.dm_id = (select auth.uid())
      or exists (select 1 from public.partida_participantes pp where pp.partida_id = partida.id and pp.user_id = (select auth.uid()))
    )
  )
);

drop policy if exists "sesiones_insert_dm" on public.sesiones;
create policy "sesiones_insert_dm" on public.sesiones
for insert to authenticated with check (
  exists (select 1 from public.partidas partida where partida.id = partida_id and partida.dm_id = (select auth.uid()))
);

drop policy if exists "sesiones_update_dm" on public.sesiones;
create policy "sesiones_update_dm" on public.sesiones
for update to authenticated
using (exists (select 1 from public.partidas partida where partida.id = partida_id and partida.dm_id = (select auth.uid())))
with check (exists (select 1 from public.partidas partida where partida.id = partida_id and partida.dm_id = (select auth.uid())));

drop policy if exists "sesiones_delete_dm_or_admin" on public.sesiones;
create policy "sesiones_delete_dm_or_admin" on public.sesiones
for delete to authenticated using (
  exists (
    select 1 from public.partidas partida
    where partida.id = partida_id and (
      partida.dm_id = (select auth.uid())
      or exists (select 1 from public.profiles perfil where perfil.id = (select auth.uid()) and perfil.role = 'admin')
    )
  )
);

notify pgrst, 'reload schema';
