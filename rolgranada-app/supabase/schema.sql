-- Run in the Supabase SQL Editor before rls.sql.
-- The base profiles, partidas, partida_participantes and disponibilidades tables are assumed to exist.

alter table public.partidas
  add column if not exists sesiones_al_mes integer,
  add column if not exists duracion_estimada text,
  add column if not exists es_privada boolean not null default false,
  add column if not exists codigo_invitacion uuid not null default gen_random_uuid();

alter table public.partida_participantes
  drop constraint if exists partida_participantes_estado_check;

alter table public.partida_participantes
  add constraint partida_participantes_estado_check
  check (
    estado is null
    or lower(trim(estado)) in ('aceptado', 'solicitado', 'rechazado', 'pendiente')
  );

create table if not exists public.sesiones (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas(id) on delete cascade,
  fecha date not null,
  franja text not null check (franja in ('manana', 'tarde')),
  created_at timestamp with time zone default now(),
  constraint sesiones_partida_fecha_franja_key unique (partida_id, fecha, franja)
);

create index if not exists sesiones_fecha_idx on public.sesiones(fecha);
create index if not exists sesiones_partida_fecha_idx on public.sesiones(partida_id, fecha);
