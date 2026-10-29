import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import WotfFicha from './WotfFicha';
import { borrarFicha, cargarFicha, crearFicha, guardarFicha, listarFichas } from './fichasApi';
import type { Resumen } from './fichasApi';
import type { FichaData } from './wotfTipos';
import './WotfFicha.css';

type Estado = 'guardado' | 'pendiente' | 'guardando' | 'error' | 'conflicto';
const ESTADOS: Record<Estado, string> = {
  guardado: 'Guardado ✓', pendiente: 'Cambios sin guardar…', guardando: 'Guardando…',
  error: 'Error al guardar', conflicto: 'Modificado desde otro dispositivo',
};

const msg = (e: unknown) => (e as { message?: string })?.message ?? 'Error desconocido';

/* ==========================================================================
   Editor: la ficha con autoguardado en Supabase
   ========================================================================== */

function Editor({ sb, id, inicial, updatedAt, onSalir, onRecargar }: {
  sb: SupabaseClient; id: string; inicial: FichaData; updatedAt: string; onSalir: () => void; onRecargar: () => void;
}) {
  const [estado, setEstado] = useState<Estado>('guardado');
  const ultimo = useRef(updatedAt);                       // updated_at de la última versión que conocemos
  const pendiente = useRef<FichaData | null>(null);       // cambios aún sin enviar
  const conflicto = useRef(false);
  const bucle = useRef<Promise<void> | null>(null);       // envío en marcha
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Envía lo pendiente, de uno en uno, hasta vaciarlo. Si ya hay un envío en marcha, espera a ese. */
  const enviar = useCallback((): Promise<void> => {
    if (!bucle.current) {
      bucle.current = (async () => {
        while (pendiente.current && !conflicto.current) {
          const d = pendiente.current;
          pendiente.current = null;
          setEstado('guardando');
          try {
            const nuevo = await guardarFicha(sb, id, d, ultimo.current);
            if (nuevo === null) { conflicto.current = true; setEstado('conflicto'); } else ultimo.current = nuevo;
          } catch {
            pendiente.current ??= d; // se reintentará con el siguiente cambio o con "Reintentar"
            setEstado('error');
            return;
          }
        }
        if (!conflicto.current) setEstado('guardado');
      })().finally(() => { bucle.current = null; });
    }
    return bucle.current;
  }, [sb, id]);

  const volcar = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    return enviar();
  }, [enviar]);

  const programar = (d: FichaData) => {
    pendiente.current = d;
    if (!conflicto.current) setEstado('pendiente');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void enviar(); }, 800);
  };

  // Al ocultar la pestaña, cerrarla o salir del editor, se guarda lo pendiente
  useEffect(() => {
    const alOcultar = () => { if (document.visibilityState === 'hidden') void volcar(); };
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', alOcultar);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', alOcultar);
      void volcar();
    };
  }, [volcar]);

  return (
    <div className="wotf-app">
      <div className="wotf-topbar">
        <button className="wotf-btn" onClick={async () => { await volcar(); onSalir(); }}>← Mis personajes</button>
        <span className={`wotf-estado is-${estado}`} role="status">{ESTADOS[estado]}</span>
        {estado === 'error' && <button className="wotf-btn" onClick={() => void volcar()}>Reintentar</button>}
        {estado === 'conflicto' && <button className="wotf-btn" onClick={onRecargar}>Recargar ficha</button>}
      </div>
      <WotfFicha inicial={inicial} onChange={programar} />
    </div>
  );
}

/* ==========================================================================
   Menú de personajes
   ========================================================================== */

/** Menú de personajes del jugador. Hay que pasarle el cliente de Supabase con la sesión iniciada. */
export default function WotfPersonajes({ supabase }: { supabase: SupabaseClient }) {
  const [lista, setLista] = useState<Resumen[] | null>(null);
  const [abierto, setAbierto] = useState<{ id: string; data: FichaData; updatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const refrescar = useCallback(async () => {
    try { setLista(await listarFichas(supabase)); setError(null); } catch (e) { setLista([]); setError(msg(e)); }
  }, [supabase]);

  useEffect(() => { if (!abierto) void refrescar(); }, [abierto, refrescar]);

  const abrir = async (id: string) => {
    setOcupado(true);
    try {
      const { data, updatedAt } = await cargarFicha(supabase, id);
      setAbierto({ id, data, updatedAt });
      setError(null);
    } catch (e) { setError(msg(e)); } finally { setOcupado(false); }
  };

  const nuevo = async () => {
    setOcupado(true);
    try { await abrir(await crearFicha(supabase)); } catch (e) { setError(msg(e)); } finally { setOcupado(false); }
  };

  const borrar = async (r: Resumen) => {
    if (!window.confirm(`¿Borrar a ${r.nombre || 'este personaje'}? No se puede deshacer.`)) return;
    try { await borrarFicha(supabase, r.id); await refrescar(); } catch (e) { setError(msg(e)); }
  };

  if (abierto) {
    return (
      <Editor
        key={`${abierto.id}-${abierto.updatedAt}`}
        sb={supabase} id={abierto.id} inicial={abierto.data} updatedAt={abierto.updatedAt}
        onSalir={() => setAbierto(null)} onRecargar={() => void abrir(abierto.id)}
      />
    );
  }

  return (
    <div className="wotf-app">
      <div className="wotf-menu">
        <h2 className="card-title">Mis personajes</h2>
        {error && <p className="wotf-error">{error}</p>}
        {lista === null ? <p className="wotf-aviso">Cargando…</p> : (
          <div className="pj-grid">
            {lista.map((r) => (
              <article key={r.id} className="pj-card">
                <button className="pj-open" onClick={() => void abrir(r.id)} disabled={ocupado}>
                  <span className="pj-nombre">{r.nombre || 'Sin nombre'}</span>
                  <span className="pj-sub">{[r.clase, r.raza !== 'Ninguna' ? r.raza : '', `Nivel ${r.nivel}`].filter(Boolean).join(' · ')}</span>
                </button>
                <button className="pj-del" title="Borrar personaje" aria-label={`Borrar ${r.nombre || 'personaje'}`} onClick={() => void borrar(r)}>✕</button>
              </article>
            ))}
            <button className="pj-card pj-nuevo" onClick={() => void nuevo()} disabled={ocupado}>+ Nuevo personaje</button>
          </div>
        )}
      </div>
    </div>
  );
}
