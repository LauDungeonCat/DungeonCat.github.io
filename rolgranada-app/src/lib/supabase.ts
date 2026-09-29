import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Leemos las variables del archivo .env.local a través de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Error: Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env.local');
}

// Exportamos la instancia cliente para usarla en el resto de la app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);