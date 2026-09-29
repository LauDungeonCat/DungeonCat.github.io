-- Run in the Supabase SQL Editor before rls.sql.
-- The base profiles, partidas, partida_participantes and disponibilidades tables are assumed to exist.

alter table public.partidas
  add column if not exists notas_dm text;

create table if not exists public.sesiones (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas(id) on delete cascade,
  fecha date not null,
  franja text not null check (franja in ('manana', 'tarde')),
  notas text,
  created_at timestamp without time zone not null default now(),
  constraint sesiones_partida_fecha_franja_key unique (partida_id, fecha, franja)
);

alter table public.sesiones
  add column if not exists imagen_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sesiones', 'sesiones', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create index if not exists sesiones_fecha_idx on public.sesiones(fecha);
create index if not exists sesiones_partida_fecha_idx on public.sesiones(partida_id, fecha);
