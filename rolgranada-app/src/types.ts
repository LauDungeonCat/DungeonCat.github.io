import type { Database } from "./lib/database.types";
import type { ProfileRow } from "./lib/database.helpers";
import type { TriggerWarningsPartida } from "./temasSensibles";
export type { ProfileRow };

export type FranjaEstado = "puedo" | "podria" | "no_puedo";
export type FranjaHorario = "manana" | "tarde";
export type CambioDisponibilidad = { fecha: string } & Partial<
  Record<FranjaHorario, FranjaEstado>
>;

// Tipos seguros extraídos o adaptados desde la base de datos
export type RolUsuario = string; // O el tipo correspondiente de tu rol si es un enum o string

export type PartidaConAccesoRow = any; 
export type DisponibilidadPartidaRow = any;
export type SesionUsuarioRow = Database["public"]["Tables"]["sesiones"]["Row"];
export type NotificacionRow = Database["public"]["Tables"]["notificaciones"]["Row"];

export interface DisponibilidadDia {
  fecha: string;
  manana?: FranjaEstado;
  tarde?: FranjaEstado;
  franjasMarcadas?: FranjaHorario[];
}

export interface Partida {
  id: string;
  titulo: string;
  sistema: string;
  dmId: string;
  dm: string;
  dmAvatarUrl: string | null;
  dmAvatarPosition: string | null;
  ubicacionAproximada: string;
  ubicacionExacta: string | null;
  imagenUrl: string;
  descripcion: string | null;
  participantesMax: number;
  participantesCount: number;
  viewerIsParticipant: boolean;
  viewerHasRequested: boolean;
  esPrivada: boolean;
  amigosPuedenUnirse: boolean;
  viewerEsAmigo: boolean;
  proximaSesion?: string;
  proximaSesionFranja?: FranjaHorario;
  estado: "abierta" | "en_curso" | "finalizada";
  fechaFin: string | null;
  sesionesAlMes: number;
  duracionEstimada: string | null;
  triggerWarnings: TriggerWarningsPartida;
}

export interface EstadisticasPerfil {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_position: string | null;
  role: string | null;
  created_at: string | null;
  bio: string;
  apoyo_kofi: boolean;
  seguidor_youtube: boolean;
  creador_jdr: boolean;
}

export interface CompaneroFrecuente {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_position: string | null;
  sesiones_coincidentes: number;
}

export interface PartidaHistorial {
  partida_id: string;
  titulo: string;
  sistema: string;
  estado: string;
  rol: "DM" | "Jugador";
  sesiones_jugadas: number;
  ultima_sesion: string | null;
}

export interface EstadisticasUsuario {
  perfil: EstadisticasPerfil | null;
  companeros_distintos: number;
  partidas_dirigidas: number;
  partidas_activas: number;
  partidas_finalizadas: number;
  inscripciones_aceptadas: number;
  sesiones_dirigidas: number;
  sesiones_jugadas: number;
  top_companeros: CompaneroFrecuente[];
  historial: PartidaHistorial[];
}

export interface AmigoPerfil {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  avatar_position: string | null;
}

export interface SolicitudAmistad extends AmigoPerfil {
  id: string;
}

export interface RelacionAmistad {
  id: string;
  estado: "pendiente" | "aceptada";
  enviada_por_visor: boolean;
}

export interface DatosAmistad {
  amigos: AmigoPerfil[];
  solicitudes_recibidas: SolicitudAmistad[];
  solicitudes_enviadas: SolicitudAmistad[];
  relacion: RelacionAmistad | null;
}

export interface PartidaEditable {
  titulo: string;
  sistema: string;
  ubicacionAproximada: string;
  ubicacionExacta?: string | null;
  descripcion?: string | null;
  imagenUrl?: string | null;
  participantesMax: number;
  sesionesAlMes: number;
  duracionEstimada: string;
  esPrivada?: boolean;
  amigosPuedenUnirse?: boolean;
  triggerWarnings?: TriggerWarningsPartida;
}

export interface UsuarioActivo extends ProfileRow {
  nombre: string;
  partidasInscritasIds: string[];
  disponibilidad: Record<string, DisponibilidadDia>;
}

export type MapaDisponibilidad = DisponibilidadPartidaRow;
export type SesionAgendada = SesionUsuarioRow;
export type Notificacion = NotificacionRow;