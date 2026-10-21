// Tipos auxiliares para los componentes.
// Viven aparte de database.types.ts porque ese archivo se SOBRESCRIBE entero cada vez que
// ejecutas `supabase gen types typescript` y se perderían estos alias.
import type { Database } from "./database.types";

type ProfileTabla = Database["public"]["Tables"]["profiles"]["Row"];

// temas_sensibles es opcional: AuthContext carga el perfil con una lista fija de columnas que no la
// incluye, y la pantalla de Perfil la lee por separado cuando la necesita.
export type ProfileRow = Omit<ProfileTabla, "temas_sensibles"> & {
  temas_sensibles?: ProfileTabla["temas_sensibles"];
  notif_email_activo?: boolean | null;
  notif_inapp_activo?: boolean | null;
  notif_push_activo?: boolean | null;
};

export type JugadorPartidaRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role?: string;
  fecha_union?: string;
  franjas_indicadas?: number;
  franjas_sin_indicar?: number;
};

export type SesionUsuarioRow = {
  id: string;
  partida_id: string;
  fecha: string;
  franja: "manana" | "tarde" | string;
  titulo_partida?: string;
  created_at?: string | null;
};

export type DisponibilidadPartidaRow = {
  fecha: string;
  franja: string;
  pueden: number;
  podrian: number;
  no_pueden: number;
  no_indicado: number;
  participantes: number;
};