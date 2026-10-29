import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, DragEvent, ReactNode, SetStateAction } from 'react';
import './WotfFicha.css';

type AttrKey = 'fue' | 'des' | 'per' | 'int' | 'pro' | 'alm';
type Grupo = 'equipada' | 'banco';
type Pos = { grupo: Grupo; i: number };
interface Item { nombre: string; slots: number }
interface Arma { nombre: string; t: number; dano: string | null; q: number; magia: string } // dano null = el de por defecto según T
interface Formula {
  vida: (fue: number, pro: number, niv: number) => number; vidaTxt: string;
  wp: (pro: number, fue: number, arm: number) => number; wpTxt: string;
}

/* ==========================================================================
   Datos y reglas del juego
   ========================================================================== */

const mitad = (n: number) => Math.floor(n / 2);

/** Recurso de casting según la clase. */
const CLASES: Record<string, string> = {
  Guerrero: 'Cargas', Chispero: 'Hierro', Fraguador: 'FP', Yuncador: 'Hierro', Consertador: 'FP', Excipiador: 'Control',
};

/** Vida y WP máximos (con su explicación) según la raza. */
const BASE: Formula = { vida: (f, _p, n) => f * 2 + n, vidaTxt: 'FUE×2 + Nivel', wp: (p, _f, a) => mitad(p) + a, wpTxt: '½PRO + Armadura' };
const RAZAS: Record<string, Formula> = {
  Ninguna: { vida: () => 0, vidaTxt: '—', wp: () => 0, wpTxt: '—' },
  Escoria: { vida: (f, p, n) => f * 2 + n + p * 2, vidaTxt: 'FUE×2 + Nivel + PRO×2', wp: (_p, _f, a) => a, wpTxt: 'Armadura' },
  Forjado: { vida: () => 0, vidaTxt: '—', wp: (p, f, a) => mitad(p) + mitad(f) + a, wpTxt: '½PRO + ½FUE + Armadura' },
  Vástagos: { ...BASE, vida: (f) => f * 2, vidaTxt: 'FUE×2' },
  Antiguo: BASE, Mediano: BASE, Ascali: BASE,
};

/** Atributos en el orden en que se muestran (dos columnas). */
const ATRIBUTOS: { key: AttrKey; sym: string }[] = [
  { key: 'fue', sym: '✠' }, { key: 'alm', sym: '🙪' },
  { key: 'des', sym: '⇋' }, { key: 'int', sym: '⟡' },
  { key: 'per', sym: '⌖' }, { key: 'pro', sym: '☍' },
];

const hab = (attr: AttrKey, ...items: [string, string][]) => items.map(([key, label]) => ({ key, label, attr }));
const HAB_IZQ = [
  ...hab('fue', ['poder', 'Poder'], ['mele', 'Melé']),
  ...hab('des', ['sigilo', 'Sigilo'], ['finura', 'Finura']),
  ...hab('per', ['detectar', 'Detectar'], ['supervive', 'Superv.'], ['distancia', 'Distancia']),
];
const HAB_DER = [
  ...hab('alm', ['forja', 'Forja'], ['quebrar', 'Quebrar']),
  ...hab('int', ['conocimi', 'Conoc.'], ['crear', 'Crear'], ['medicina', 'Medicina']),
  ...hab('pro', ['afinidad', 'Afinidad'], ['influencia', 'Influencia']),
];

const SALVACIONES: [string, AttrKey, AttrKey][] = [['Reflejos', 'des', 'per'], ['Aguante', 'fue', 'alm'], ['Voluntad', 'int', 'pro']];
const CORE = [['creencia', 'Creencia'], ['objetivo', 'Objetivo'], ['rasgo', 'Rasgo'], ['exasperacion', 'Exasperación']] as const;

/** Daño por defecto según el tamaño (T) del arma: 0 → 1, 1 → 1d4, 2 → 1d6 ... 6 → 1d20. */
const DANO = ['1', '1d4', '1d6', '1d8', '1d10', '1d12', '1d20'];
const danoDe = (t: number) => DANO[Math.min(6, Math.max(0, Math.round(t)))] ?? '1';

const armaVacia = (): Arma => ({ nombre: '', t: 0, dano: null, q: 0, magia: '' });
const esVacia = (a: Arma) => !a.nombre && !a.t && !a.q && !a.magia && a.dano === null;
const suma = (nums: number[]) => nums.reduce((acc, n) => acc + (n || 0), 0);

/** Actualiza el elemento i de una lista. */
const patchAt = <T extends object>(i: number, p: Partial<T>) => (prev: T[]) => prev.map((x, k) => (k === i ? { ...x, ...p } : x));

/** Saca el elemento `de` y lo coloca en la posición `a`. */
function mover<T>(lista: T[], de: number, a: number): T[] {
  const copia = [...lista];
  copia.splice(a, 0, copia.splice(de, 1)[0]);
  return copia;
}

/* ==========================================================================
   Componentes pequeños
   ========================================================================== */

/**
 * Campo numérico sin límites que admite quedarse vacío mientras se edita (cuenta como 0).
 * Con `defecto`, el valor puede ser null (= usa el de por defecto) y se puede sobrescribir.
 */
function Num<T extends number | null>({ value, onChange, label, className = '', defecto }: {
  value: T; onChange: (n: T) => void; label: string; className?: string; defecto?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const custom = defecto !== undefined && value !== null && value !== defecto;
  const emit = (n: number | null) => onChange(n as T);
  return (
    <input
      type="number"
      className={`num ${className}${custom ? ' is-custom' : ''}`}
      value={draft ?? String(value ?? defecto ?? 0)}
      aria-label={label}
      title={defecto === undefined ? undefined : custom
        ? `Personalizado (por defecto: ${defecto}). Vacíalo para volver al valor por defecto`
        : `Por defecto (${defecto}). Escribe para sobrescribirlo`}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setDraft(e.target.value);
        emit(e.target.value === '' ? (defecto === undefined ? 0 : null) : Number(e.target.value));
      }}
      onBlur={() => {
        setDraft(null);
        if (defecto !== undefined && value === defecto) emit(null);
      }}
    />
  );
}

/** Textarea que crece con su contenido, para que nunca se corte el texto. */
function AutoTextarea({ value, onChange, className = '', label }: {
  value: string; onChange: (v: string) => void; className?: string; label?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const ajustar = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`; // scrollHeight no cuenta el borde
  };
  useLayoutEffect(ajustar, [value]);
  useEffect(() => {
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, []);
  return <textarea ref={ref} rows={1} className={`auto-textarea ${className}`} value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} />;
}

const Campo = ({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) => (
  <label className={`h-field ${className}`}><span className="h-label">{label}</span>{children}</label>
);

/* ==========================================================================
   Ficha
   ========================================================================== */

export default function WotfFicha() {
  const [info, setInfo] = useState({ nombre: '', pronom: '', clase: 'Guerrero', raza: 'Ninguna' });
  const [nivel, setNivel] = useState(1);
  const [xp, setXp] = useState(0);
  const [atributos, setAtributos] = useState<Record<AttrKey, number>>({ fue: 1, des: 1, per: 1, int: 1, pro: 1, alm: 1 });
  const [competencias, setCompetencias] = useState<Record<string, boolean>>({});
  const [rapidezBonus, setRapidezBonus] = useState(0);
  const [dado, setDado] = useState(0);
  const [dadoBajo, setDadoBajo] = useState(0);
  const [vidaActual, setVidaActual] = useState(0);
  const [wpActual, setWpActual] = useState(0);

  const [armaduraSlots, setArmaduraSlots] = useState(0);
  const [inventario, setInventario] = useState<Item[]>(Array.from({ length: 9 }, () => ({ nombre: '', slots: 0 })));
  const [invBonus, setInvBonus] = useState(0);
  const [dinero, setDinero] = useState({ a: 0, b: 0, c: 0 });

  const [armas, setArmas] = useState<Arma[]>(Array.from({ length: 4 }, armaVacia));
  const [banco, setBanco] = useState<Arma[]>([]); // no ocupan slots; se llena arrastrando
  const [drag, setDrag] = useState<Pos | null>(null);
  const [over, setOver] = useState<Pos | null>(null);

  const [recursoActual, setRecursoActual] = useState(0);
  const [recursoMax, setRecursoMax] = useState<number | null>(null); // null = 3 × nivel
  const [limite, setLimite] = useState<number | null>(null); // null = 3
  const [casting, setCasting] = useState('');
  const [notas, setNotas] = useState('');
  const [core, setCore] = useState({ creencia: '', objetivo: '', rasgo: '', exasperacion: '' });

  /* ---------- Cálculos derivados ---------- */
  const F = RAZAS[info.raza];
  const recurso = CLASES[info.clase];
  const rapidezBase = atributos.des <= 2 ? 5 : atributos.des <= 4 ? 6 : 7;
  const invMax = 6 + atributos.fue + invBonus;
  const slotsArmas = suma(armas.map((a) => a.t));
  const totalSlots = armaduraSlots + slotsArmas + suma(inventario.map((i) => i.slots));
  const invLleno = totalSlots > invMax;

  const vitales = [
    { sym: '❤', label: 'Vida', val: vidaActual, set: setVidaActual, max: F.vida(atributos.fue, atributos.pro, nivel), txt: F.vidaTxt, extra: null },
    { sym: '⛉', label: 'WP', val: wpActual, set: setWpActual, max: F.wp(atributos.pro, atributos.fue, armaduraSlots), txt: F.wpTxt,
      extra: <span className="armadura-tag">+{armaduraSlots} Arm.</span> },
  ];

  /* ---------- Arrastrar armas ---------- */
  const dropProps = (grupo: Grupo, i: number) => ({
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!drag) return;
      e.preventDefault();
      if (over?.grupo !== grupo || over.i !== i) setOver({ grupo, i });
    },
    onDrop: (e: DragEvent<HTMLElement>) => { e.preventDefault(); soltar(grupo, i); },
  });

  const soltar = (dest: Grupo, j: number) => {
    if (!drag) return;
    const { grupo: orig, i } = drag;
    setDrag(null);
    setOver(null);
    if (orig === dest) {
      if (i !== j) (dest === 'equipada' ? setArmas : setBanco)((p) => mover(p, i, Math.min(j, p.length - 1)));
    } else if (orig === 'equipada') { // equipada → banco: fila nueva en el banco, la equipada queda vacía
      const arma = armas[i];
      if (esVacia(arma)) return;
      setArmas(patchAt<Arma>(i, armaVacia()));
      setBanco((p) => [...p.slice(0, j), arma, ...p.slice(j)]);
    } else { // banco → equipada: ocupa esa fila; si había un arma, se intercambian
      const arma = banco[i], previa = armas[j];
      setArmas(patchAt<Arma>(j, arma));
      setBanco((p) => (esVacia(previa) ? p.filter((_, k) => k !== i) : patchAt<Arma>(i, previa)(p)));
    }
  };

  /* ---------- Piezas de la tabla de armas ---------- */
  const cabeceraArmas = (titulo: string, tag: ReactNode) => (
    <>
      <th className="th-title">{titulo}</th>
      <th className="center">{tag}</th>
      <th className="center">Daño</th>
      <th className="center">Q</th>
      <th>Magia / Efectos</th>
    </>
  );

  const filaArma = (a: Arma, i: number, grupo: Grupo) => {
    const set: Dispatch<SetStateAction<Arma[]>> = grupo === 'equipada' ? setArmas : setBanco;
    const upd = (p: Partial<Arma>) => set(patchAt<Arma>(i, p));
    const defecto = danoDe(a.t);
    const custom = a.dano !== null && a.dano !== defecto;
    const clases = `${over?.grupo === grupo && over.i === i ? 'is-over' : ''} ${drag?.grupo === grupo && drag.i === i ? 'is-dragging' : ''}`;
    const id = `${i + 1} (${grupo})`;
    return (
      <tr key={`${grupo}-${i}`} className={clases} {...dropProps(grupo, i)}>
        <td>
          <div className="arma-name-wrap">
            <span
              className="drag-handle"
              draggable
              role="button"
              aria-label={`Arrastrar arma ${id}`}
              title="Arrastra para ordenar o mover entre armas y banco"
              onDragStart={(e) => {
                setDrag({ grupo, i });
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', 'arma');
                const fila = e.currentTarget.closest('tr');
                if (fila) e.dataTransfer.setDragImage(fila, 12, 12);
              }}
              onDragEnd={() => { setDrag(null); setOver(null); }}
            />
            <input type="text" className="arma-name" aria-label={`Nombre del arma ${id}`} value={a.nombre} onChange={(e) => upd({ nombre: e.target.value })} />
          </div>
        </td>
        <td className="center"><Num value={a.t} onChange={(t) => upd({ t })} label={`Tamaño del arma ${id}`} /></td>
        <td className="center">
          <input
            type="text"
            className={`arma-dano${custom ? ' is-custom' : ''}`}
            aria-label={`Daño del arma ${id}`}
            title={custom ? `Personalizado (por defecto: ${defecto}). Vacíalo para volver al valor por defecto` : `Por defecto según el tamaño (${defecto}). Escribe para sobrescribirlo`}
            value={a.dano ?? defecto}
            onFocus={(e) => e.target.select()}
            onChange={(e) => upd({ dano: e.target.value })}
            onBlur={() => { if (a.dano === '' || a.dano === defecto) upd({ dano: null }); }}
          />
        </td>
        <td className="center"><Num value={a.q} onChange={(q) => upd({ q })} label={`Q del arma ${id}`} /></td>
        <td><AutoTextarea value={a.magia} onChange={(magia) => upd({ magia })} className="magia-input" label={`Efectos del arma ${id}`} /></td>
      </tr>
    );
  };

  const renderHabilidad = ({ key, label, attr }: { key: string; label: string; attr: AttrKey }) => {
    const trained = !!competencias[key];
    return (
      <label key={key} className={`skill-item c-${attr}${trained ? ' is-trained' : ''}`}>
        <span className="skill-name">{label}</span>
        <span className="skill-val calc">{19 - atributos[attr] * (trained ? 2 : 1)}</span>
        <input type="checkbox" className="trained-check" checked={trained} onChange={() => setCompetencias((p) => ({ ...p, [key]: !p[key] }))} />
      </label>
    );
  };

  const txt = (k: keyof typeof info) => ({ value: info[k], onChange: (e: { target: { value: string } }) => setInfo((p) => ({ ...p, [k]: e.target.value })) });

  return (
    <div className="wotf-sheet">
      {/* ===================== Cabecera ===================== */}
      <header className="wotf-card header-card">
        <div className="header-grid">
          <Campo label="Nombre" className="flex-2"><input className="h-name" type="text" {...txt('nombre')} /></Campo>
          <Campo label="Pronom."><input type="text" {...txt('pronom')} /></Campo>
          <Campo label="Clase">
            <select className="h-select" {...txt('clase')}>{Object.keys(CLASES).map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          <Campo label="Raza">
            <select className="h-select" {...txt('raza')}>{Object.keys(RAZAS).map((r) => <option key={r}>{r}</option>)}</select>
          </Campo>
          <Campo label="Nivel" className="mini"><Num value={nivel} onChange={setNivel} label="Nivel" /></Campo>
          <Campo label="XP" className="mini"><Num value={xp} onChange={setXp} label="XP" /></Campo>
        </div>
      </header>

      <div className="wotf-main-grid">
        {/* ===================== Columna izquierda ===================== */}
        <div className="wotf-col">
          <section className="wotf-card acc-attr">
            <h4 className="card-title">Atributos</h4>
            <div className="attr-grid">
              {ATRIBUTOS.map(({ key, sym }) => (
                <div key={key} className={`attr-row c-${key}`}>
                  <span className="attr-name"><span className="sym">{sym}</span>{key.toUpperCase()}</span>
                  <Num value={atributos[key]} onChange={(v) => setAtributos((p) => ({ ...p, [key]: v }))} label={key.toUpperCase()} />
                </div>
              ))}
            </div>

            <div className="chips-row">
              <div className="chip chip-rapidez c-des" title={`Base ${rapidezBase} (según DES) + Bon ${rapidezBonus}`}>
                <span className="chip-label">Rapidez</span>
                <span className="chip-big calc">{rapidezBase + rapidezBonus}</span>
                <label className="chip-bonus"><span>Bon</span><Num value={rapidezBonus} onChange={setRapidezBonus} label="Bonus de rapidez" className="num-sm" /></label>
              </div>
              <div className="chip chip-dado c-alm">
                <span className="emoji">🎲</span><Num value={dado} onChange={setDado} label="Dado" className="num-sm" />
                <span className="sym">▼</span><Num value={dadoBajo} onChange={setDadoBajo} label="Valor ▼" className="num-sm" />
              </div>
            </div>
            <div className="formula-hint formula-badge">Rapidez: DES 1-2 → 5 · 3-4 → 6 · 5-6 → 7 + Bon</div>

            <div className="vital-horizontal">
              {vitales.map((v) => (
                <div key={v.label} className="vital-item">
                  <span className="sym">{v.sym}</span>
                  <Num value={v.val} onChange={v.set} label={v.label} className="num-sm" />
                  <span>/</span>
                  <span className="stat-max-val calc" title={`${v.label} máx = ${v.txt}`}>{v.max}</span>
                  {v.extra}
                </div>
              ))}
            </div>
            <div className="formula-lines">
              {vitales.map((v) => <span key={v.label}><span className="sym">{v.sym}</span> Máx: {v.txt}</span>)}
            </div>
          </section>

          <section className="wotf-card acc-salv">
            <div className="card-title-between"><h4 className="card-title">Salvación</h4><span className="formula-hint">19 − STAT1 − STAT2</span></div>
            <div className="salv-grid">
              {SALVACIONES.map(([nombre, a, b]) => (
                <div key={nombre} className="salv-tile" title={`19 − ${a.toUpperCase()} (${atributos[a]}) − ${b.toUpperCase()} (${atributos[b]})`}>
                  <span>{nombre}</span>
                  <span className="salv-calc-val calc">{19 - atributos[a] - atributos[b]}</span>
                  <span className="salv-stats">{a.toUpperCase()} + {b.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="wotf-card acc-skills grow">
            <div className="card-title-between"><h4 className="card-title">Habilidades</h4><span className="formula-hint">19−STAT (×2 comp.)</span></div>
            <div className="skills-grid">
              <div className="skills-col">{HAB_IZQ.map(renderHabilidad)}</div>
              <div className="skills-col">{HAB_DER.map(renderHabilidad)}</div>
            </div>
          </section>
        </div>

        {/* ===================== Columna derecha ===================== */}
        <div className="wotf-col-main-right">
          <section className="wotf-card acc-armas">
            <div className="armas-scroll">
              <table className="armas-table">
                <colgroup><col className="col-nombre" /><col className="col-t" /><col className="col-dano" /><col className="col-q" /><col /></colgroup>
                <thead>
                  <tr>{cabeceraArmas('Armas mágicas', <span className="slots-tag" title="Slots que ocupan las armas">Slots · {slotsArmas}</span>)}</tr>
                </thead>
                <tbody>{armas.map((a, i) => filaArma(a, i, 'equipada'))}</tbody>
                <tbody>
                  <tr className={`banco-head${over?.grupo === 'banco' && over.i === 0 ? ' is-over-head' : ''}`} {...dropProps('banco', 0)}>
                    {cabeceraArmas('Banco de Armas', <span className="slots-tag slots-tag-off" title="Las armas del banco no ocupan slots del inventario">Tamaño</span>)}
                  </tr>
                  {banco.map((a, i) => filaArma(a, i, 'banco'))}
                  <tr className={`banco-drop${over?.grupo === 'banco' && over.i === banco.length ? ' is-over' : ''}`} {...dropProps('banco', banco.length)}>
                    <td colSpan={5}>Arrastra un arma aquí para guardarla en el banco</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="wotf-subgrid-2col grow">
            <section className="wotf-card acc-inv inv-full-column grow">
              <div>
                <div className="card-title-between"><h4 className="card-title">Inventario</h4><span className="slots-tag">Slots</span></div>
                <div className="inv-armor c-armadura"><span>Armadura</span><Num value={armaduraSlots} onChange={setArmaduraSlots} label="Armadura" /></div>
                <div className="inv-items">
                  {inventario.map((item, i) => (
                    <div key={i} className="inv-item">
                      <input type="text" className="inv-name" placeholder={`Objeto ${i + 1}`} value={item.nombre} onChange={(e) => setInventario(patchAt<Item>(i, { nombre: e.target.value }))} />
                      <Num value={item.slots} onChange={(slots) => setInventario(patchAt<Item>(i, { slots }))} label={`Slots del objeto ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="inv-summary">
                <div className="summary-line">
                  <div className="load-info"><span>Capacidad</span><strong className={invLleno ? 'is-over' : ''}>{totalSlots} / {invMax}</strong></div>
                  <label className="bonus-inline"><span>Bonus</span><Num value={invBonus} onChange={setInvBonus} label="Bonus" className="num-sm" /></label>
                </div>
                <div className={`bar bar-load${invLleno ? ' is-over' : ''}`}><span style={{ width: `${Math.min(100, (totalSlots / invMax) * 100)}%` }} /></div>
                <div className="formula-hint formula-badge">6 + FUE ({atributos.fue}) + Bonus ({invBonus})</div>
                <div className="dinero-grid">
                  <span className="dinero-title">Dinero</span>
                  {(['a', 'b', 'c'] as const).map((k) => (
                    <label key={k} className="dinero-col">
                      <span>{k.toUpperCase()}</span>
                      <Num value={dinero[k]} onChange={(v) => setDinero((p) => ({ ...p, [k]: v }))} label={`Dinero ${k.toUpperCase()}`} />
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <div className="wotf-col right-stacked-col grow">
              <div className="top-right-duo grow">
                <section className="wotf-card acc-casting grow">
                  <div className="card-title-between casting-header-inline">
                    <h4 className="card-title">Casting</h4>
                    <div className="casting-meta">
                      <label className="casting-limit" title={`${recurso} actuales / máximos`}>
                        <span>{recurso}</span>
                        <Num value={recursoActual} onChange={setRecursoActual} label={`${recurso} actuales`} className="num-sm" />
                        <span>/</span>
                        <Num value={recursoMax} defecto={3 * nivel} onChange={setRecursoMax} label={`${recurso} máximos`} className="num-sm" />
                      </label>
                      <label className="casting-limit">
                        <span>Límite / Acción</span>
                        <Num value={limite} defecto={3} onChange={setLimite} label="Límite por acción" className="num-sm" />
                      </label>
                    </div>
                  </div>
                  <textarea className="casting-area" value={casting} onChange={(e) => setCasting(e.target.value)} />
                </section>

                <section className="wotf-card acc-notas grow">
                  <h4 className="card-title">Notas y Perks</h4>
                  <textarea className="notas-area" value={notas} onChange={(e) => setNotas(e.target.value)} />
                </section>
              </div>

              <section className="wotf-card acc-core core-compact">
                <h4 className="card-title">C.O.R.E.</h4>
                <div className="core-grid-2x2">
                  {CORE.map(([k, nombre]) => (
                    <div key={k} className="core-item">
                      <label>{nombre}</label>
                      <AutoTextarea value={core[k]} onChange={(v) => setCore((p) => ({ ...p, [k]: v }))} className="core-input" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}