import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './WotfFicha.css';

type AttrKey = 'fue' | 'des' | 'per' | 'int' | 'pro' | 'alm';
type Atributos = Record<AttrKey, number>;

interface ItemInventario { nombre: string; slots: number; }
interface Arma { nombre: string; t: number; dano: string; q: number; magia: string; }
interface Habilidad { key: string; label: string; attr: AttrKey; }

const RAZAS = ['Ninguna', 'Escoria', 'Forjado', 'Vástagos', 'Antiguo', 'Mediano', 'Ascali'];
const ATRIBUTOS: { key: AttrKey; label: string }[] = [
  { key: 'fue', label: 'FUE' }, { key: 'des', label: 'DES' }, { key: 'per', label: 'PER' },
  { key: 'int', label: 'INT' }, { key: 'pro', label: 'PRO' }, { key: 'alm', label: 'ALM' },
];

const HABILIDADES_IZQ: Habilidad[] = [
  { key: 'poder', label: 'Poder', attr: 'fue' }, { key: 'mele', label: 'Melé', attr: 'fue' },
  { key: 'sigilo', label: 'Sigilo', attr: 'des' }, { key: 'finura', label: 'Finura', attr: 'des' },
  { key: 'detectar', label: 'Detectar', attr: 'per' }, { key: 'supervive', label: 'Supervivencia', attr: 'per' },
  { key: 'distancia', label: 'Distancia', attr: 'per' },
];

const HABILIDADES_DER: Habilidad[] = [
  { key: 'conocimi', label: 'Conocimiento', attr: 'int' }, { key: 'crear', label: 'Crear', attr: 'int' },
  { key: 'medicina', label: 'Medicina', attr: 'int' }, { key: 'afinidad', label: 'Afinidad', attr: 'pro' },
  { key: 'influencia', label: 'Influencia', attr: 'pro' }, { key: 'forja', label: 'Forja', attr: 'alm' },
  { key: 'quebrar', label: 'Quebrar', attr: 'alm' },
];

const clamp = (n: number, min = 1, max = 6) => Math.min(max, Math.max(min, Math.round(n) || min));

function calcVidaMax(raza: string, fue: number, niv: number) {
  if (raza === 'Escoria') return fue * 2 + niv * 2;
  if (raza === 'Vástagos') return fue * 2;
  if (['Antiguo', 'Mediano', 'Ascali'].includes(raza)) return fue * 2 + niv;
  return 0;
}

function calcWpMax(raza: string, alm: number, niv: number, arm: number) {
  const halfAlm = Math.floor(alm / 2);
  if (raza === 'Escoria') return arm;
  if (raza === 'Forjado') return halfAlm + Math.floor((niv + 1) / 2) + arm;
  if (['Vástagos', 'Antiguo', 'Mediano', 'Ascali'].includes(raza)) return halfAlm + arm;
  return 0;
}

function Num({ value, onChange, label, min = 1, max = 6, className = '' }: {
  value: number; onChange: (n: number) => void; label: string; min?: number; max?: number; className?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={`num ${className}`}
      value={value}
      min={min}
      max={max}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function AutoTextarea({ value, onChange, className = '', rows = 1, label }: {
  value: string; onChange: (v: string) => void; className?: string; rows?: number; label?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const ajustar = () => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  };
  useLayoutEffect(ajustar, [value]);
  useEffect(() => {
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, []);

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`auto-textarea ${className}`}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function WotfFicha() {
  const [nombre, setNombre] = useState('Kristha Augol');
  const [pronom, setPronom] = useState('Ella');
  const [clase, setClase] = useState('Chispero');
  const [raza, setRaza] = useState('Mediano');
  const [nivel, setNivel] = useState(3);
  const [xp, setXp] = useState(25);

  const [atributos, setAtributos] = useState<Atributos>({ fue: 6, des: 2, per: 1, int: 3, pro: 4, alm: 6 });
  const [dbVal, setDbVal] = useState(0);
  const [wpActual, setWpActual] = useState(3);
  const [vidaActual, setVidaActual] = useState(6);
  const [competencias, setCompetencias] = useState<Record<string, boolean>>({ poder: true, mele: true, conocimi: true, forja: true });

  const [armaduraSlots, setArmaduraSlots] = useState(3);
  const [inventario, setInventario] = useState<ItemInventario[]>([
    { nombre: 'Botiquín', slots: 1 }, { nombre: 'Saco de dormir', slots: 1 },
    { nombre: 'Cantimplora 1lit', slots: 1 }, { nombre: '4 raciones viaje', slots: 0 },
    { nombre: 'Antorcha IIIII', slots: 1 }, { nombre: '', slots: 0 },
    { nombre: '', slots: 0 }, { nombre: '', slots: 0 }, { nombre: 'Colgante 𝜋 Familia', slots: 1 },
  ]);
  const [invBonus, setInvBonus] = useState(4);
  const [dinero, setDinero] = useState({ a: 4, b: 0, c: 0 });

  const [armas, setArmas] = useState<Arma[]>([
    { nombre: 'Parásito M.', t: 0, dano: 'd12', q: 2, magia: 'Tiradas fáciles poder + fuerte - HP, come 🎲 fuego' },
    { nombre: 'Esc. Peluche', t: 2, dano: 'd6', q: 3, magia: 'Recibo 🎲 al proteger a alguien' },
    { nombre: 'Ramo Rosas', t: 1, dano: 'd4', q: 2, magia: 'Controla vida vegetal' },
    { nombre: 'Homb Spinn', t: 2, dano: 'd6', q: 2, magia: 'Campo magnético giratorio atrae objetos' },
  ]);

  const [notasPerks, setNotasPerks] = useState('Perks\nGuardián. Protege a aliados cercanos\nPericia. Sabe medicina, es fácil\n\nHija de la Forja: Sangre + PRO');
  const [castingHeader, setCastingHeader] = useState('Hierro 7 / 9');
  const [castingLimite, setCastingLimite] = useState(3);
  const [casting, setCasting] = useState('🛡️ Bronce+ Crea cubos con 1🛡️ de vida y golpea a más enemigos con ellos.\n\n⚔️ Acero de Forja Habilidad del arma se pasa al hechizo.');

  const [core, setCore] = useState({
    creencia: 'La justicia está por encima de las personas',
    objetivo: 'Alimentar a su familia y acercarse a Marteum',
    rasgo: 'Priorizo salvar antes que atacar',
    exasperacion: 'El abuso de poder, alturas y muerte, Marea',
  });

  const rapidez = atributos.des <= 2 ? 5 : atributos.des <= 4 ? 6 : 7;
  const invMax = 6 + atributos.fue + invBonus;
  const vidaMax = calcVidaMax(raza, atributos.fue, nivel);
  const wpMax = calcWpMax(raza, atributos.alm, nivel, armaduraSlots);

  const totalArmasSlots = armas.reduce((acc, a) => acc + (Number(a.t) || 0), 0);
  const totalSlots = armaduraSlots + totalArmasSlots + inventario.reduce((acc, i) => acc + (Number(i.slots) || 0), 0);
  const invLleno = totalSlots > invMax;

  const setAttr = (k: AttrKey, v: number) => setAtributos((p) => ({ ...p, [k]: clamp(v) }));
  const updateInv = (i: number, p: Partial<ItemInventario>) => setInventario((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...p } : item)));
  const updateArma = (i: number, p: Partial<Arma>) => setArmas((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...p } : a)));

  const renderHabilidad = (h: Habilidad) => {
    const trained = !!competencias[h.key];
    const val = 19 - atributos[h.attr] * (trained ? 2 : 1);
    return (
      <label key={h.key} className={`skill-item c-${h.attr}${trained ? ' is-trained' : ''}`}>
        <span className="skill-name">{h.label}</span>
        <span className="skill-val">{val}</span>
        <input
          type="checkbox"
          className="trained-check"
          checked={trained}
          onChange={() => setCompetencias((p) => ({ ...p, [h.key]: !p[h.key] }))}
        />
      </label>
    );
  };

  return (
    <div className="wotf-sheet">
      <header className="wotf-card header-card">
        <div className="header-grid">
          <label className="h-field flex-2">
            <span className="h-label">Nombre</span>
            <input className="h-name" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="h-field">
            <span className="h-label">Pronom.</span>
            <input type="text" value={pronom} onChange={(e) => setPronom(e.target.value)} />
          </label>
          <label className="h-field">
            <span className="h-label">Clase</span>
            <input type="text" value={clase} onChange={(e) => setClase(e.target.value)} />
          </label>
          <label className="h-field">
            <span className="h-label">Raza</span>
            <select className="h-select" value={raza} onChange={(e) => setRaza(e.target.value)}>
              {RAZAS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="h-field mini">
            <span className="h-label">Nivel</span>
            <input type="number" value={nivel} onChange={(e) => setNivel(Number(e.target.value))} />
          </label>
          <label className="h-field mini">
            <span className="h-label">XP</span>
            <input type="number" value={xp} onChange={(e) => setXp(Number(e.target.value))} />
          </label>
        </div>
      </header>

      <div className="wotf-main-grid">
        <div className="wotf-col">
          <section className="wotf-card acc-attr">
            <h4 className="card-title">Atributos</h4>
            <div className="attr-wrapper">
              <div className="attr-list">
                {ATRIBUTOS.map((a) => (
                  <div key={a.key} className={`attr-row c-${a.key}`}>
                    <span>{a.label}</span>
                    <Num value={atributos[a.key]} onChange={(v) => setAttr(a.key, v)} label={a.label} />
                  </div>
                ))}
              </div>
              <div className="attr-sub-col">
                <div className="sub-box c-des"><span className="sub-label">Rapidez</span><span className="sub-big">{rapidez}</span></div>
                <div className="sub-box c-pro"><span className="sub-label">🎲 DB</span><Num value={dbVal} onChange={setDbVal} label="DB" className="num-sm" /></div>
              </div>
            </div>
            <div className="vital-horizontal">
              <div className="vital-item">
                <span>🖤</span>
                <Num value={vidaActual} onChange={setVidaActual} label="Vida" className="num-sm" />
                <span>/</span><span className="stat-max-val">{vidaMax}</span>
              </div>
              <div className="vital-item">
                <span>🛡️</span>
                <Num value={wpActual} onChange={setWpActual} label="WP" className="num-sm" />
                <span>/</span><span className="stat-max-val">{wpMax}</span>
                <span className="armadura-tag">+{armaduraSlots} Arm.</span>
              </div>
            </div>
          </section>

          <section className="wotf-card acc-salv">
            <div className="card-title-between"><h4 className="card-title">Salvación</h4><span className="formula-hint">19−S1−S2</span></div>
            <div className="salv-grid">
              <div className="salv-tile"><span>Reflejos</span><span className="salv-calc-val">{19 - atributos.des - atributos.per}</span></div>
              <div className="salv-tile"><span>Aguante</span><span className="salv-calc-val">{19 - atributos.fue - atributos.alm}</span></div>
              <div className="salv-tile"><span>Voluntad</span><span className="salv-calc-val">{19 - atributos.int - atributos.pro}</span></div>
            </div>
          </section>

          <section className="wotf-card acc-skills grow">
            <div className="card-title-between"><h4 className="card-title">Habilidades</h4><span className="formula-hint">19−STAT (×2 comp.)</span></div>
            <div className="skills-grid">
              <div className="skills-col">{HABILIDADES_IZQ.map(renderHabilidad)}</div>
              <div className="skills-col">{HABILIDADES_DER.map(renderHabilidad)}</div>
            </div>
          </section>
        </div>

        <div className="wotf-col-main-right">
          <section className="wotf-card acc-armas">
            <div className="card-title-between"><h4 className="card-title">Armas y Mágicas</h4><span className="slots-tag">Slots Armas: {totalArmasSlots}</span></div>
            <div className="armas-scroll">
              <table className="armas-table">
                <colgroup>
                  <col className="col-nombre" />
                  <col className="col-t" />
                  <col className="col-dano" />
                  <col className="col-q" />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th className="center">T (Slots)</th>
                    <th className="center">Daño</th>
                    <th className="center">Q</th>
                    <th>Magia / Efectos</th>
                  </tr>
                </thead>
                <tbody>
                  {armas.map((a, i) => (
                    <tr key={i}>
                      <td><input type="text" value={a.nombre} onChange={(e) => updateArma(i, { nombre: e.target.value })} /></td>
                      <td className="center"><input type="number" value={a.t} onChange={(e) => updateArma(i, { t: Number(e.target.value) })} /></td>
                      <td className="center"><input type="text" value={a.dano} onChange={(e) => updateArma(i, { dano: e.target.value })} /></td>
                      <td className="center"><input type="number" value={a.q} onChange={(e) => updateArma(i, { q: Number(e.target.value) })} /></td>
                      <td><AutoTextarea value={a.magia} onChange={(v) => updateArma(i, { magia: v })} className="magia-input" /></td>
                    </tr>
                  ))}
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
                      <input type="text" className="inv-name" placeholder={`Objeto ${i + 1}`} value={item.nombre} onChange={(e) => updateInv(i, { nombre: e.target.value })} />
                      <Num value={item.slots} onChange={(v) => updateInv(i, { slots: v })} label="Slots" />
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
                      <Num value={dinero[k]} onChange={(v) => setDinero((p) => ({ ...p, [k]: v }))} label={k} />
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <div className="wotf-col right-stacked-col grow">
              <div className="top-right-duo grow">
                <section className="wotf-card acc-casting grow">
                  <div className="card-title-between casting-header-inline">
                    <div className="title-with-input">
                      <h4 className="card-title">Casting</h4>
                      <input type="text" className="casting-inline-input" value={castingHeader} onChange={(e) => setCastingHeader(e.target.value)} />
                    </div>
                    <label className="casting-limit">
                      <span>Límite / Acción</span>
                      <Num value={castingLimite} onChange={setCastingLimite} label="Límite por acción" className="num-sm" />
                    </label>
                  </div>
                  <textarea className="casting-area" value={casting} onChange={(e) => setCasting(e.target.value)} />
                </section>

                <section className="wotf-card acc-notas grow">
                  <h4 className="card-title">Notas y Perks</h4>
                  <textarea className="notas-area" value={notasPerks} onChange={(e) => setNotasPerks(e.target.value)} />
                </section>
              </div>

              <section className="wotf-card acc-core core-compact">
                <h4 className="card-title">C.O.R.E.</h4>
                <div className="core-grid-2x2">
                  {(['creencia', 'objetivo', 'rasgo', 'exasperacion'] as const).map((k) => (
                    <div key={k} className="core-item">
                      <label>{k.charAt(0).toUpperCase() + k.slice(1)}</label>
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