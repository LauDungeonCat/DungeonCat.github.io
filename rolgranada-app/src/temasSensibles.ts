// Catálogo común de temas sensibles (trigger warnings) y utilidades compartidas.
// IMPORTANTE: los ids deben coincidir con la tabla public.temas_sensibles de la base de datos
// (la migración temas_sensibles.sql la rellena con esta misma lista).

export type TemaSensible = { id: string; etiqueta: string };

/** Nivel que un JUGADOR asigna a un tema: línea (no debe aparecer) o velo (sin detalles / fuera de escena). */
export type NivelPerfil = "linea" | "velo";

/** Nivel con el que un tema PUEDE aparecer en una partida. */
export type NivelPartida = "implicito" | "explicito";

export type TemasSensiblesPerfil = { lineas: string[]; velos: string[] };
export type TriggerWarningsPartida = { explicitos: string[]; implicitos: string[]; otro: string };

const LISTA: TemaSensible[] = [
	{ id: "aborto", etiqueta: "Aborto" },
	{ id: "suicidio", etiqueta: "Suicidio" },
	{ id: "agresion-policial", etiqueta: "Violencia o abuso policial" },
	{ id: "agresion-sexual", etiqueta: "Agresión sexual" },
	{ id: "aranas", etiqueta: "Arañas" },
	{ id: "autolesiones", etiqueta: "Autolesiones" },
	{ id: "bichos", etiqueta: "Bichos e insectos" },
	{ id: "cancer", etiqueta: "Cáncer" },
	{ id: "claustrofobia", etiqueta: "Claustrofobia (espacios cerrados)" },
	{ id: "clima-extremo", etiqueta: "Clima extremo (tormentas, huracanes, tornados)" },
	{ id: "dano-animales", etiqueta: "Daño o muerte de animales" },
	{ id: "demonios", etiqueta: "Demonios" },
	{ id: "desastres-naturales", etiqueta: "Desastres naturales" },
	{ id: "embarazo", etiqueta: "Embarazo y parto" },
	{ id: "genocidio", etiqueta: "Genocidio" },
	{ id: "globos-oculares", etiqueta: "Ojos y heridas oculares" },
	{ id: "golpe-de-calor", etiqueta: "Golpe de calor o calor extremo" },
	{ id: "gore", etiqueta: "Gore (violencia gráfica explícita)" },
	{ id: "hambre", etiqueta: "Hambre extrema (inanición)" },
	{ id: "homofobia", etiqueta: "Homofobia" },
	{ id: "luz-de-gas", etiqueta: "Manipulación psicológica" },
	{ id: "maltrato-infantil", etiqueta: "Maltrato infantil" },
	{ id: "morir-de-frio", etiqueta: "Hipotermia (morir de frío)" },
	{ id: "paralisis", etiqueta: "Parálisis o inmovilización (ser atado o retenido)" },
	{ id: "racismo", etiqueta: "Racismo" },
	{ id: "ratas", etiqueta: "Ratas y roedores" },
	{ id: "religion-real", etiqueta: "Religión del mundo real" },
	{ id: "romance", etiqueta: "Romance" },
	{ id: "sangre", etiqueta: "Sangre" },
	{ id: "sed", etiqueta: "Sed extrema (deshidratación)" },
	{ id: "sexismo", etiqueta: "Sexismo y misoginia" },
	{ id: "sexo", etiqueta: "Sexo (escenas sexuales)" },
	{ id: "terrorismo", etiqueta: "Terrorismo" },
	{ id: "tortura", etiqueta: "Tortura" },
];

export const TEMAS_SENSIBLES: TemaSensible[] = [...LISTA].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));

const ETIQUETAS = new Map(TEMAS_SENSIBLES.map((tema) => [tema.id, tema.etiqueta]));

export function etiquetaTema(id: string): string {
	return ETIQUETAS.get(id) ?? id;
}

function listaDeTextos(valor: unknown): string[] {
	return Array.isArray(valor) ? valor.filter((elemento): elemento is string => typeof elemento === "string") : [];
}

export function normalizarTemasPerfil(valor: unknown): TemasSensiblesPerfil {
	const objeto = typeof valor === "object" && valor !== null ? (valor as Record<string, unknown>) : {};
	return { lineas: listaDeTextos(objeto.lineas), velos: listaDeTextos(objeto.velos) };
}

export function normalizarTriggerWarnings(valor: unknown): TriggerWarningsPartida {
	const objeto = typeof valor === "object" && valor !== null ? (valor as Record<string, unknown>) : {};
	return {
		explicitos: listaDeTextos(objeto.explicitos),
		implicitos: listaDeTextos(objeto.implicitos),
		otro: typeof objeto.otro === "string" ? objeto.otro : "",
	};
}

export function contarTriggerWarnings(avisos: TriggerWarningsPartida | undefined): number {
	if (!avisos) return 0;
	return avisos.explicitos.length + avisos.implicitos.length + (avisos.otro.trim() ? 1 : 0);
}

export function hayTriggerWarnings(avisos: TriggerWarningsPartida | undefined): boolean {
	return contarTriggerWarnings(avisos) > 0;
}