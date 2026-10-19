import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Notificaciones.css';
import type { SolicitudPendienteRow } from '../lib/database.types';
import type { Notificacion } from '../types';
import { supabase } from '../lib/supabase';

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

  // Cargar notificaciones In-App de la base de datos
  useEffect(() => {
    if (!userId || !abierto) return;
    let activa = true;

    async function cargarInApp() {
    if (!userId) return; 
    setCargandoInApp(true);
    const { data, error: err } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', userId)
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

  // Solicitar permisos de Web Push nativas del navegador
  async function solicitarPermisoPush() {
    if (!('Notification' in window)) {
      alert('Este navegador no soporta notificaciones de escritorio.');
      return;
    }

    const resultado = await Notification.requestPermission();
    setPermisoPush(resultado);

    if (resultado === 'granted') {
      new Notification('Rol Granada', {
        body: '¡Notificaciones activadas correctamente!',
        icon: '/favicon.ico',
      });
    }
  }

  // Marcar notificación In-App como leída
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

  const totalVacias = solicitudes.length === 0 && notificacionesInApp.length === 0;

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

        {/* Sección para activar notificaciones nativas push si el navegador lo permite */}
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

        {/* 2. Historial de Notificaciones In-App */}
        {notificacionesInApp.length > 0 && (
          <>
            <h3 style={{ fontSize: '0.95rem', margin: '1rem 0 0.5rem 0', color: 'var(--text-primary)' }}>Avisos Recientes</h3>
            <ul className="notificaciones-lista">
              {notificacionesInApp.map((notif) => (
                <li key={notif.id} style={{ opacity: notif.leida ? 0.7 : 1, background: notif.leida ? 'transparent' : 'var(--bg-hover)', padding: '0.5rem', borderRadius: '4px' }}>
                  <div className="notificacion-detalles">
                    <strong>{notif.titulo}</strong>
                    <span>{notif.mensaje}</span>
                    <time dateTime={notif.created_at}>
                      {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notif.created_at))}
                    </time>
                  </div>
                  {!notif.leida && (
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