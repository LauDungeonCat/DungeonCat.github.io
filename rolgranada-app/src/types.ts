export type FranjaEstado = "puedo" | "podria" | "no_puedo";
export type FranjaHorario = "manana" | "tarde";

export interface DisponibilidadDia {
	fecha: string;
	manana: FranjaEstado;
	tarde: FranjaEstado;
	franjasMarcadas?: FranjaHorario[];
}

export interface Partida {
	id: string;
	titulo: string;
	sistema: string;
	dm: string;
	imagenUrl: string;
	descripcion: string;
	participantesMax: number;
	participantesActuales: string[];
	proximaSesion?: string;
	estado: "abierta" | "en_curso" | "finalizada";
}

export interface UsuarioLocal {
	id: string;
	nombre: string;
	partidasInscritasIds: string[];
	disponibilidad: Record<string, DisponibilidadDia>;
}

export interface RolData {
	usuario: UsuarioLocal;
	partidas: Partida[];
}