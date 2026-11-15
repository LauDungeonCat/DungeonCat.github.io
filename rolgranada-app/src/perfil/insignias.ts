import type { EstadisticasUsuario } from "../types";

export type MetalInsignia = "generica" | "cobre" | "plata" | "oro" | "diamante";

export interface Insignia {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  valorActual: number | boolean;
  textoValor: string;
  siguienteUmbral: number | null;
  metal: MetalInsignia;
  obtenida: boolean;
  icono: string;
}

type DatosInsignias = Pick<
  EstadisticasUsuario,
  | "perfil"
  | "sesiones_dirigidas"
  | "sesiones_jugadas"
  | "companeros_distintos"
>;

const MESES = [
  { umbral: 1, nombre: "Nuevo" },
  { umbral: 3, nombre: "Iniciado" },
  { umbral: 6, nombre: "Compañero" },
  { umbral: 12, nombre: "Veterano" },
];

const SESIONES_DM = [
  { umbral: 3, nombre: "Narrador" },
  { umbral: 10, nombre: "Director" },
  { umbral: 25, nombre: "Maestro" },
  { umbral: 50, nombre: "Arquitecto" },
];

const SESIONES_JUGADOR = [
  { umbral: 3, nombre: "Recluta" },
  { umbral: 10, nombre: "Aventurero" },
  { umbral: 25, nombre: "Héroe" },
  { umbral: 50, nombre: "Leyenda" },
];

const COMUNIDAD = [
  { umbral: 5, nombre: "Amigable" },
  { umbral: 10, nombre: "Social" },
  { umbral: 15, nombre: "Comunitario" },
  { umbral: 20, nombre: "Conector" },
];

function mesesDesde(fechaInicio: string | null, ahora: Date): number {
  if (!fechaInicio) return 0;
  const inicio = new Date(fechaInicio);
  if (Number.isNaN(inicio.getTime()) || inicio > ahora) return 0;
  let meses = (ahora.getFullYear() - inicio.getFullYear()) * 12 + ahora.getMonth() - inicio.getMonth();
  if (ahora.getDate() < inicio.getDate()) meses -= 1;
  return Math.max(0, meses);
}

function insigniaProgresiva(
  id: string,
  categoria: string,
  icono: string,
  valor: number,
  rangos: { umbral: number; nombre: string }[],
  unidad: string,
  descripcion: string,
): Insignia {
  const indice = rangos.findLastIndex((rango) => valor >= rango.umbral);
  const nombre = indice < 0 ? "Sin Rango" : rangos[indice].nombre;
  const metales: MetalInsignia[] = ["cobre", "plata", "oro", "diamante"];
  return {
    id,
    nombre,
    categoria,
    descripcion,
    valorActual: valor,
    textoValor: `${valor} ${unidad}`,
    siguienteUmbral: rangos[indice + 1]?.umbral ?? null,
    metal: indice < 0 ? "generica" : metales[indice],
    obtenida: indice >= 0,
    icono,
  };
}

function insigniaEspecial(
  id: string,
  nombre: string,
  icono: string,
  obtenida: boolean,
  descripcion: string,
): Insignia {
  return {
    id,
    nombre,
    categoria: "Especial",
    descripcion,
    valorActual: obtenida,
    textoValor: obtenida ? "Conseguida" : "Pendiente",
    siguienteUmbral: null,
    metal: obtenida ? "diamante" : "generica",
    obtenida,
    icono,
  };
}

export function calcularInsignias(datos: DatosInsignias, ahora = new Date()): Insignia[] {
  const perfil = datos.perfil;
  return [
    insigniaProgresiva(
      "antiguedad",
      "Antigüedad",
      "⧗",
      mesesDesde(perfil?.created_at ?? null, ahora),
      MESES,
      "meses",
      "Por formar parte de Rol Granada.",
    ),
    insigniaProgresiva(
      "direccion",
      "Dirección",
      "⚒",
      datos.sesiones_dirigidas,
      SESIONES_DM,
      "sesiones",
      "Por dirigir sesiones que ya han tenido lugar.",
    ),
    insigniaProgresiva(
      "participacion",
      "Participación",
      "⚔",
      datos.sesiones_jugadas,
      SESIONES_JUGADOR,
      "sesiones",
      "Por jugar sesiones que ya han tenido lugar.",
    ),
    insigniaProgresiva(
      "comunidad",
      "Comunidad",
      "perfil-anonimo",
      datos.companeros_distintos,
      COMUNIDAD,
      "personas",
      "Por compartir sesiones con distintas personas de la comunidad.",
    ),
    insigniaEspecial("apoyo", "Apoyo", "♡", perfil?.apoyo_kofi ?? false, "Apoyo al proyecto confirmado por administración."),
    insigniaEspecial("seguidor", "Seguidor", "▶", perfil?.seguidor_youtube ?? false, "Seguidor del canal de Lau DungeonCat en YouTube."),
    insigniaEspecial("admin", "Admin", "♛", perfil?.role === "admin", "Insignia automática de administración."),
    insigniaEspecial("creador", "Creador", "✦", perfil?.creador_jdr ?? false, "Creador de juegos de rol indicado en el perfil."),
  ];
}
