import type { SupabaseClient } from '@supabase/supabase-js';
import { SCHEMA_VERSION, fichaVacia, normalizar } from './wotfTipos';
import type { FichaData } from './wotfTipos';

const TABLA = 'fichas';

/** Lo justo para pintar la lista de personajes (sin cargar toda la ficha). */
export interface Resumen { id: string; nombre: string; clase: string; raza: string; nivel: number; updated_at: string }

const columnas = (d: FichaData) => ({
  nombre: d.nombre, clase: d.clase, raza: d.raza, nivel: Math.round(d.nivel) || 0,
  data: d, schema_version: SCHEMA_VERSION,
});

export async function listarFichas(sb: SupabaseClient): Promise<Resumen[]> {
  const { data, error } = await sb.from(TABLA).select('id, nombre, clase, raza, nivel, updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return data as Resumen[];
}

export async function crearFicha(sb: SupabaseClient): Promise<string> {
  const { data, error } = await sb.from(TABLA).insert(columnas(fichaVacia())).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function cargarFicha(sb: SupabaseClient, id: string) {
  const { data, error } = await sb.from(TABLA).select('data, updated_at').eq('id', id).single();
  if (error) throw error;
  return { data: normalizar(data.data), updatedAt: data.updated_at as string };
}

/**
 * Guarda solo si nadie ha modificado la ficha desde `updatedAt`.
 * Devuelve el nuevo `updated_at`, o null si hay conflicto (se editó desde otro dispositivo).
 */
export async function guardarFicha(sb: SupabaseClient, id: string, d: FichaData, updatedAt: string): Promise<string | null> {
  const { data, error } = await sb.from(TABLA).update(columnas(d)).eq('id', id).eq('updated_at', updatedAt).select('updated_at');
  if (error) throw error;
  return data.length ? (data[0].updated_at as string) : null;
}

export async function borrarFicha(sb: SupabaseClient, id: string) {
  const { error } = await sb.from(TABLA).delete().eq('id', id);
  if (error) throw error;
}
