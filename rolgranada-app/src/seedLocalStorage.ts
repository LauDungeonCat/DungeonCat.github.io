import type { Partida, UsuarioLocal } from "./types";

export const CLAVE_USUARIO = "rolgranada_usuario";
export const CLAVE_PARTIDAS = "rolgranada_partidas";
const CLAVE_DISPONIBILIDAD_ANTIGUA = "rol-granada-disponibilidad";

const usuarioDemo: UsuarioLocal = {
	id: "usr_1",
	nombre: "Aventurero Demo",
	partidasInscritasIds: ["prt_1"],
	disponibilidad: {},
};

const partidasDemo: Partida[] = [
	{
		id: "prt_1",
		titulo: "Las ruinas de Valdoria",
		sistema: "Dungeons & Dragons 5e",
		dm: "Alicia",
		imagenUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80",
		descripcion: "Una expedición se adentra en una ciudad olvidada para descubrir por qué sus campanas siguen sonando bajo tierra.",
		participantesMax: 5,
		participantesActuales: ["usr_1", "usr_2"],
		proximaSesion: "2026-10-03T18:00:00",
		estado: "abierta",
	},
	{
		id: "prt_2",
		titulo: "Niebla sobre Puerto Gris",
		sistema: "Pathfinder 2e",
		dm: "Marcos",
		imagenUrl: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1000&q=80",
		descripcion: "El puerto ha quedado aislado por una niebla extraña y alguien deja mensajes en los faros.",
		participantesMax: 4,
		participantesActuales: [],
		proximaSesion: "2026-10-10T19:30:00",
		estado: "abierta",
	},
	{
		id: "prt_3",
		titulo: "La última caravana",
		sistema: "Savage Worlds",
		dm: "Nora",
		imagenUrl: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1000&q=80",
		descripcion: "Una caravana cruza un desierto cambiante mientras una tormenta parece seguir sus pasos.",
		participantesMax: 6,
		participantesActuales: ["usr_3", "usr_4", "usr_5"],
		proximaSesion: "2026-10-17T17:00:00",
		estado: "en_curso",
	},
	{
		id: "prt_4",
		titulo: "El archivo de los susurros",
		sistema: "Call of Cthulhu 7e",
		dm: "Diego",
		imagenUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=80",
		descripcion: "Un documento desaparecido conecta una biblioteca universitaria con sucesos imposibles.",
		participantesMax: 4,
		participantesActuales: ["usr_6", "usr_7", "usr_8", "usr_9"],
		estado: "finalizada",
	},
];

function leerJson<T>(clave: string): T | null {
	try {
		const valor = localStorage.getItem(clave);
		return valor ? JSON.parse(valor) as T : null;
	} catch {
		return null;
	}
}

export function initLocalStorage(): { usuario: UsuarioLocal; partidas: Partida[] } {
	if (typeof localStorage === "undefined") {
		return { usuario: usuarioDemo, partidas: partidasDemo };
	}

	const usuarioGuardado = leerJson<UsuarioLocal>(CLAVE_USUARIO);
	const partidasGuardadas = leerJson<Partida[]>(CLAVE_PARTIDAS);
	const usuario = usuarioGuardado ?? usuarioDemo;
	const partidas = partidasGuardadas ?? partidasDemo;
	const disponibilidadAntigua = leerJson<Record<string, Record<string, Partial<Record<"manana" | "tarde", string>>>>>(CLAVE_DISPONIBILIDAD_ANTIGUA);
	const usuarioNecesitaDisponibilidadMigrada = Object.keys(usuario.disponibilidad ?? {}).length === 0;
	if (usuarioNecesitaDisponibilidadMigrada && disponibilidadAntigua) {
		for (const dias of Object.values(disponibilidadAntigua)) {
			for (const [fecha, franjas] of Object.entries(dias)) {
				const manana = normalizarEstado(franjas.manana);
				const tarde = normalizarEstado(franjas.tarde);
				if (manana || tarde) {
					usuario.disponibilidad[fecha] = {
						fecha,
						manana: manana ?? "podria",
						tarde: tarde ?? "podria",
						franjasMarcadas: [
							...(manana ? ["manana" as const] : []),
							...(tarde ? ["tarde" as const] : []),
						],
					};
				}
			}
		}
	}

	if (!usuarioGuardado || (usuarioNecesitaDisponibilidadMigrada && disponibilidadAntigua)) {
		localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
	}
	if (!partidasGuardadas) localStorage.setItem(CLAVE_PARTIDAS, JSON.stringify(partidas));

	return { usuario, partidas };
}

function normalizarEstado(estado?: string) {
	if (estado === "puedo" || estado === "podria") return estado;
	if (estado === "no-puedo" || estado === "no_puedo") return "no_puedo";
	return undefined;
}