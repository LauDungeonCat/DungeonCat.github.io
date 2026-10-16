import { createPortal } from 'react-dom';
import './Notificaciones.css'; // <-- Importante para cargar los estilos
import type { SolicitudPendienteRow } from '../lib/database.types';

type NotificacionesModalProps = {
  abierto: boolean;
  onCerrar: () => void;
  solicitudes: SolicitudPendienteRow[];
  cargando: boolean;
  error: string | null;
  solicitudEnResolucion: string | null;
  onResolver: (solicitud: SolicitudPendienteRow, aceptar: boolean) => void;
};

export default function NotificacionesModal({
  abierto,
  onCerrar,
  solicitudes,
  cargando,
  error,
  solicitudEnResolucion,
  onResolver,
}: NotificacionesModalProps) {
  if (!abierto) return null;

  // Renderizamos mediante Portal directamente en el body para evitar que quede atrapado en el Header
  return createPortal(
    <div 
      className="notificaciones-overlay" 
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCerrar(); }}
    >
      <section className="notificaciones-dialog" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
        <header className="notificaciones-header">
          <h2 id="notifications-title">Notificaciones</h2>
          <button type="button" className="notificaciones-cerrar" aria-label="Cerrar notificaciones" onClick={onCerrar}>×</button>
        </header>

        {error && <p className="datos-error" role="alert">{error}</p>}
        {cargando && <p role="status">Actualizando solicitudes…</p>}
        
        {!cargando && !error && solicitudes.length === 0 && (
          <p className="notificaciones-vacio">No tienes solicitudes pendientes.</p>
        )}

        {solicitudes.length > 0 && (
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
        )}
      </section>
    </div>,
    document.body
  );
}