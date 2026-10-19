import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Notificaciones.css';
import type { Notificacion } from '../types';
import { supabase } from '../lib/supabase';
import { activarPush } from '../lib/push';

export type SolicitudPendienteRow = {
  partida_id: string;
  user_id: string;
  username: string;
  partida_titulo: string;
  fecha_union: string;
};

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
        if (!err && data) {
          setNotificacionesInApp(data as Notificacion[]);
        }
      }
    }

    void cargarInApp();
    return () => {
      activa = false;
    };
  }, [userId, abierto]);

  async function solicitarPermisoPush() {
    if (!userId) return;
    const r = await activarPush(userId, true);
    if (r === 'no_soportado') alert('Tu navegador no soporta push. En iPhone hay que añadir la web a la pantalla de inicio.');
    else if (r === 'denegado') alert('Notificaciones bloqueadas: actívalas en los ajustes del sitio.');
    else if (r === 'error' || r === 'sin_clave') alert('No se pudo activar. Revisa la consola.');
    setPermisoPush(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default');
  }

  async function marcarComoLeida(id: string) {
    const { error: updateError } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id);

    if (!updateError) {
      setNotificacionesInApp((actuales) =>
        actuales.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    }
  }

  if (!abierto) return null;

  // Filtramos las notificaciones In-App para excluir aquellas que son solicitudes de unión duplicadas
  // (ya que las solicitudes se muestran de forma interactiva arriba con sus botones de Aceptar/Rechazar)
  const notificacionesFiltradas = notificacionesInApp.filter((n) => {
    const esSolicitudUnion = n.titulo?.toLowerCase().includes('solicitud') || n.mensaje?.toLowerCase().includes('quiere unirse');
    return !esSolicitudUnion;
  });

  const totalVacias = solicitudes.length === 0 && notificacionesFiltradas.every(n => n.leida);

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
        {(cargando || cargandoInApp) && <p role="status">Cargando notificaciones…</p>}
        
        {!cargando && !cargandoInApp && !error && totalVacias && (
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

        {/* 2. Historial de Notificaciones In-App (excluyendo duplicados de solicitudes) */}
        {notificacionesFiltradas.some(n => !n.leida) && (
          <>
            <h3 style={{ fontSize: '0.95rem', margin: '1rem 0 0.5rem 0', color: 'var(--text-primary)' }}>Avisos Recientes</h3>
            <ul className="notificaciones-lista">
              {notificacionesFiltradas.map((notif) => {
                if (notif.leida) return null; // Ocultamos las leídas para que el indicador de pendientes sea real
                return (
                  <li key={notif.id} style={{ opacity: 1, background: 'var(--bg-hover)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div className="notificacion-detalles">
                      <strong>{notif.titulo}</strong>
                      <span>{notif.mensaje}</span>
                      <time dateTime={notif.created_at}>
                        {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notif.created_at))}
                      </time>
                    </div>
                    <div className="notificacion-acciones">
                      <button 
                        type="button" 
                        className="notificacion-rechazar" 
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => void marcarComoLeida(notif.id)}
                      >
                        Marcar leída
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}