export type AttrKey = 'fue' | 'des' | 'per' | 'int' | 'pro' | 'alm';
export interface Item { nombre: string; slots: number }
export interface Arma { nombre: string; t: number; dano: string | null; q: number; magia: string } // dano null = el de por defecto según T

/** Todo lo que se guarda de un personaje. */
export interface FichaData {
  nombre: string; pronom: string; clase: string; raza: string; nivel: number; xp: number;
  atributos: Record<AttrKey, number>;
  competencias: Record<string, boolean>;
  rapidezBonus: number; dado: number; dadoBajo: number; vidaActual: number; wpActual: number;
  armaduraSlots: number; inventario: Item[]; invBonus: number; dinero: { a: number; b: number; c: number };
  armas: Arma[]; banco: Arma[];
  recursoActual: number; recursoMax: number | null; limite: number | null; // null = valor por defecto
  casting: string; notas: string;
  core: { creencia: string; objetivo: string; rasgo: string; exasperacion: string };
}

/** Súbela cuando cambie la estructura de forma incompatible (y migra en `normalizar`). */
export const SCHEMA_VERSION = 1;

export const armaVacia = (): Arma => ({ nombre: '', t: 0, dano: null, q: 0, magia: '' });

export const fichaVacia = (): FichaData => ({
  nombre: '', pronom: '', clase: 'Guerrero', raza: 'Ninguna', nivel: 1, xp: 0,
  atributos: { fue: 1, des: 1, per: 1, int: 1, pro: 1, alm: 1 },
  competencias: {},
  rapidezBonus: 0, dado: 0, dadoBajo: 0, vidaActual: 0, wpActual: 0,
  armaduraSlots: 0, inventario: Array.from({ length: 9 }, () => ({ nombre: '', slots: 0 })), invBonus: 0, dinero: { a: 0, b: 0, c: 0 },
  armas: Array.from({ length: 4 }, armaVacia), banco: [],
  recursoActual: 0, recursoMax: null, limite: null,
  casting: '', notas: '',
  core: { creencia: '', objetivo: '', rasgo: '', exasperacion: '' },
});

/** Completa con valores por defecto lo que falte (fichas guardadas con una versión anterior). */
export function normalizar(d: Partial<FichaData> | null): FichaData {
  const v = fichaVacia();
  return {
    ...v, ...d,
    atributos: { ...v.atributos, ...d?.atributos },
    dinero: { ...v.dinero, ...d?.dinero },
    core: { ...v.core, ...d?.core },
    competencias: d?.competencias ?? {},
  };
}
