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
  ubicacionAproximada: string;
  ubicacionExacta: string | null;
  imagenUrl: string;
  descripcion: string | null;
  participantesMax: number;
  participantesCount: number;
  viewerIsParticipant: boolean;
  viewerHasRequested: boolean;
  esPrivada: boolean;
  proximaSesion?: string;
  proximaSesionFranja?: FranjaHorario;
  estado: "abierta" | "en_curso" | "finalizada";
  sesionesAlMes: number;
  duracionEstimada: string | null;
  triggerWarnings: TriggerWarningsPartida;
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