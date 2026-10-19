import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Notificaciones.css';
import type { Notificacion } from '../types';
import { supabase } from '../lib/supabase';
import { activarPush, detalleErrorPush } from '../lib/push';

export type SolicitudPendienteRow = {
  partida_id: string;
  user_id: string;
  username: string;
  partida_titulo: string;
  fecha_union: string;
};

// Debe coincidir EXACTO con el título que crea el trigger de la base de datos.
// Esa notificación se muestra como tarjeta interactiva (Aceptar/Rechazar), no como aviso.
export const TITULO_SOLICITUD_RECIBIDA = 'Solicitud de unión recibida';

type NotificacionesProps = {
  abierto: boolean;
  onCerrar: () => void;
  solicitudes: SolicitudPendienteRow[];
  cargando: boolean;
  error: string | null;
  solicitudEnResolucion: string | null;
  onResolver: (solicitud: SolicitudPendienteRow, aceptar: boolean) => void;
  userId?: string;
};

export default function Notificaciones({
  abierto,
  onCerrar,
  solicitudes,
  cargando,
  error,
  solicitudEnResolucion,
  onResolver,
  userId,
}: NotificacionesProps) {
  const [notificacionesInApp, setNotificacionesInApp] = useState<Notificacion[]>([]);
  const [cargandoInApp, setCargandoInApp] = useState(false);
  const [errorInApp, setErrorInApp] = useState<string | null>(null);
  const [permisoPush, setPermisoPush] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!userId || !abierto) return;
    let activa = true;
    const currentUserId = userId;

    async function cargarInApp() {
      setCargandoInApp(true);
      const { data, error: err } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (activa) {
        setCargandoInApp(false);
        if (err) {
          setErrorInApp(`No se pudo cargar el historial: ${err.message}`);
        } else {
          setErrorInApp(null);
          setNotificacionesInApp((data ?? []) as Notificacion[]);
        }
      }
    }

    void cargarInApp();
    return () => {
      activa = false;
    };
  }, [userId, abierto]);

  // Tiempo real: si llega un aviso con la web abierta, entra en la lista sin recargar
  // (el panel puede estar abierto o cerrado; al abrirlo se vuelve a cargar todo igualmente).
  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`notif_panel_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${userId}` },
        (payload) => {
          const nueva = payload.new as Notificacion;
          setNotificacionesInApp((actuales) =>
            actuales.some((n) => n.id === nueva.id) ? actuales : [nueva, ...actuales]
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId]);

  async function solicitarPermisoPush() {
    if (!userId) return;
    const r = await activarPush(userId, true);
    if (r === 'no_soportado') alert('Tu navegador no soporta push. En iPhone hay que añadir la web a la pantalla de inicio.');
    else if (r === 'servicio_push') alert('Este navegador no puede conectar con su servicio de notificaciones push (pasa en Opera y en algunos navegadores basados en Chromium). Prueba con Chrome, Edge o Firefox. Los avisos dentro de la web seguirán funcionando.');
    else if (r === 'denegado') alert('Notificaciones bloqueadas: actívalas en los ajustes del sitio.');
    else if (r === 'error' || r === 'sin_clave') alert(`No se pudo activar.\n${detalleErrorPush()}`);
    setPermisoPush(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default');
  }

  // Avisa al Header para que recalcule el contador de no leídas
  function avisarCambioLeidas() {
    window.dispatchEvent(new Event('notificaciones-actualizadas'));
  }

  async function marcarComoLeida(id: string) {
    const { data, error: updateError } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
      .select('id');

    // Con RLS mal configurada el UPDATE no da error pero afecta a 0 filas
    if (updateError || !data || data.length === 0) {
      setErrorInApp('No se pudo marcar como leída (¿falta la política UPDATE en notificaciones?).');
      return;
    }
    setErrorInApp(null);
    setNotificacionesInApp((actuales) => actuales.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    avisarCambioLeidas();
  }

  async function marcarTodasComoLeidas() {
    if (!userId) return;
    const { data, error: updateError } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('user_id', userId)
      .eq('leida', false)
      .select('id');

    if (updateError) {
      setErrorInApp(updateError.message);
      return;
    }
    if (data && data.length > 0) {
      setNotificacionesInApp((actuales) => actuales.map((n) => ({ ...n, leida: true })));
    }
    avisarCambioLeidas();
  }

  if (!abierto) return null;

  // Solo se oculta la notificación de "solicitud recibida" (ya aparece arriba con botones).
  // Antes se filtraba por texto ('solicitud'), lo que también escondía "Solicitud aceptada/rechazada".
  const notificacionesFiltradas = notificacionesInApp.filter((n) => n.titulo !== TITULO_SOLICITUD_RECIBIDA);
  const hayNoLeidas = notificacionesFiltradas.some((n) => !n.leida);
  const totalVacias = solicitudes.length === 0 && notificacionesFiltradas.length === 0;

  return createPortal(
    <div 
      className="notificaciones-overlay" 
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCerrar(); }}
    >
      <section className="notificaciones-dialog" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
        <header className="notificaciones-header">
          <h2 id="notifications-title">Notificaciones y Solicitudes</h2>
          <button type="button" className="notificaciones-cerrar" aria-label="Cerrar notificaciones" onClick={onCerrar}>×</button>
        </header>

        {('Notification' in window) && permisoPush !== 'granted' && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem' }}>Activa las notificaciones del navegador para recibir avisos nativos.</span>
            <button 
              type="button" 
              className="notificacion-aceptar" 
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              onClick={() => void solicitarPermisoPush()}
            >
              Activar Push
            </button>
          </div>
        )}

        {error && <p className="datos-error" role="alert">{error}</p>}
        {errorInApp && <p className="datos-error" role="alert">{errorInApp}</p>}
        {(cargando || cargandoInApp) && <p role="status">Cargando notificaciones…</p>}
        
        {!cargando && !cargandoInApp && !error && !errorInApp && totalVacias && (
          <p className="notificaciones-vacio">No tienes notificaciones ni solicitudes pendientes.</p>
        )}

        {/* 1. Solicitudes Pendientes para el DM */}
        {solicitudes.length > 0 && (
          <>
            <h3 style={{ fontSize: '0.95rem', margin: '0.5rem 0', color: 'var(--text-primary)' }}>Solicitudes de Partida</h3>
            <ul className="notificaciones-lista">
              {solicitudes.map((solicitud) => {
                const clave = `${solicitud.partida_id}:${solicitud.user_id}`;
                return (
                  <li key={clave}>
                    <div className="notificacion-detalles">
                      <strong>{solicitud.username}</strong>
                      <span>Quiere entrar en <strong>{solicitud.partida_titulo}</strong></span>
                      <time dateTime={solicitud.fecha_union}>
                        {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(solicitud.fecha_union))}
                      </time>
                    </div>
                    <div className="notificacion-acciones">
                      <button 
                        type="button" 
                        className="notificacion-aceptar" 
                        disabled={solicitudEnResolucion !== null} 
                        onClick={() => { void onResolver(solicitud, true); }}
                      >
                        Aceptar
                      </button>
                      <button 
                        type="button" 
                        className="notificacion-rechazar" 
                        disabled={solicitudEnResolucion !== null} 
                        onClick={() => { void onResolver(solicitud, false); }}
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* 2. Historial de Notificaciones In-App */}
        {notificacionesFiltradas.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.5rem 0' }}>
              <h3 style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-primary)' }}>Avisos Recientes</h3>
              {hayNoLeidas && (
                <button
                  type="button"
                  className="notificacion-rechazar"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => void marcarTodasComoLeidas()}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <ul className="notificaciones-lista">
              {notificacionesFiltradas.map((notif) => (
                <li 
                  key={notif.id} 
                  style={{ 
                    opacity: notif.leida ? 0.6 : 1, 
                    background: notif.leida ? 'transparent' : 'var(--bg-hover)', 
                    padding: '0.5rem', 
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div className="notificacion-detalles">
                    <strong>{notif.titulo}</strong>
                    <span>{notif.mensaje}</span>
                    <time dateTime={notif.created_at} style={{ display: 'block', fontSize: '0.75rem', opacity: 0.8 }}>
                      {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notif.created_at))}
                    </time>
                  </div>
                  {!notif.leida && (
                    <div className="notificacion-acciones" style={{ marginLeft: '1rem' }}>
                      <button 
                        type="button" 
                        className="notificacion-rechazar" 
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => void marcarComoLeida(notif.id)}
                      >
                        Marcar leída
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}