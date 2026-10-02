import { useEffect, useState, type FormEvent } from 'react';
import './Header.css';
import logo from '../assets/logo.svg';
import bellIcon from '../assets/Bell-Notification.svg';
import bellAlertIcon from '../assets/Bell-Notification-There-Is-A-Notification.svg';
import type { ProfileRow, SolicitudPendienteRow } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type HeaderProps = {
  onNavigate: (pagina: string) => void;
  profile: ProfileRow | null;
  onSignOut: () => Promise<void>;
  requestLogin: () => void;
  updateProfile: (username: string, avatarUrl: string | null) => Promise<void>;
};

export default function Header({ onNavigate, profile, onSignOut, requestLogin, updateProfile }: HeaderProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [partidasAbierto, setPartidasAbierto] = useState(false);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [solicitudesCargadas, setSolicitudesCargadas] = useState<{ usuarioId: string; items: SolicitudPendienteRow[] } | null>(null);
  const solicitudes = solicitudesCargadas && solicitudesCargadas.usuarioId === profile?.id ? solicitudesCargadas.items : [];
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState<string | null>(null);
  const [solicitudEnResolucion, setSolicitudEnResolucion] = useState<string | null>(null);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  const usuarioId = profile?.id;
  useEffect(() => {
    if (!usuarioId) return;
    let activa = true;
    const cargarSolicitudes = async () => {
      setCargandoSolicitudes(true);
      const { data, error } = await supabase.rpc('listar_solicitudes_usuario');
      if (!activa) return;
      setCargandoSolicitudes(false);
      if (error) setErrorNotificaciones(error.message);
      else {
        setSolicitudesCargadas({ usuarioId, items: data ?? [] });
        setErrorNotificaciones(null);
      }
    };
    void cargarSolicitudes();
    const intervalo = window.setInterval(() => { void cargarSolicitudes(); }, 30_000);
    return () => {
      activa = false;
      window.clearInterval(intervalo);
    };
  }, [usuarioId]);

  function abrirMenu(setter: (abierto: boolean) => void) {
    if (window.matchMedia('(hover: hover)').matches) setter(true);
  }

  function cerrarMenu(setter: (abierto: boolean) => void) {
    if (window.matchMedia('(hover: hover)').matches) setter(false);
  }

  function navegarDesdeEnlace(event: React.MouseEvent<HTMLAnchorElement>, pagina: string) {
    event.preventDefault();
    setMenuAbierto(false);
    setPartidasAbierto(false);
    onNavigate(pagina);
  }

  async function resolverSolicitud(solicitud: SolicitudPendienteRow, aceptar: boolean) {
    const clave = `${solicitud.partida_id}:${solicitud.user_id}`;
    setSolicitudEnResolucion(clave);
    setErrorNotificaciones(null);
    const { error } = await supabase.rpc('resolver_solicitud_partida', {
      p_partida_id: solicitud.partida_id,
      p_user_id: solicitud.user_id,
      p_aceptar: aceptar,
    });
    setSolicitudEnResolucion(null);
    if (error) {
      setErrorNotificaciones(error.message);
      return;
    }
    setSolicitudesCargadas((actual) => actual && actual.usuarioId === profile?.id ? {
      ...actual,
      items: actual.items.filter((item) => item.partida_id !== solicitud.partida_id || item.user_id !== solicitud.user_id),
    } : actual);
  }

  function abrirPerfil() {
    if (!profile) return;
    setUsername(profile.username);
    setAvatarUrl(profile.avatar_url ?? '');
    setErrorPerfil(null);
    setPerfilAbierto(true);
    setNotificacionesAbiertas(false);
  }

  async function guardarPerfil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardandoPerfil(true);
    setErrorPerfil(null);
    try {
      await updateProfile(username, avatarUrl.trim() || null);
      setPerfilAbierto(false);
    } catch (error) {
      setErrorPerfil(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setGuardandoPerfil(false);
    }
  }

  return (
    <header className="main-header">
      <div className="header-logo">
        <a className="header-logo-link" href="#inicio" onClick={(event) => navegarDesdeEnlace(event, 'inicio')} aria-label="Ir al inicio">
          <img src={logo} alt="Icono D20" />
          <span>Rol Granada</span>
        </a>
      </div>

      <nav className="header-nav">
        <ul>
          <li><a href="#inicio" onClick={(event) => navegarDesdeEnlace(event, 'inicio')}>Inicio</a></li>
          <li
            className="tools-menu"
            onMouseEnter={() => abrirMenu(setPartidasAbierto)}
            onMouseLeave={() => cerrarMenu(setPartidasAbierto)}
          >
            <div className="tools-menu-content">
              <button
                className="tools-trigger active"
                type="button"
                aria-expanded={partidasAbierto}
                aria-haspopup="true"
                onClick={() => setPartidasAbierto((abierto) => !abierto)}
              >
                <span>Partidas</span>
              </button>
              {partidasAbierto && (
                <ul className="tools-dropdown">
                  <li><a href="#disponibilidad" onClick={(event) => navegarDesdeEnlace(event, 'disponibilidad')}>Disponibilidad</a></li>
                  <li><a href="#mis-partidas" onClick={(event) => navegarDesdeEnlace(event, 'mis-partidas')}>Mis Partidas</a></li>
                  <li><a href="#buscar-partidas" onClick={(event) => navegarDesdeEnlace(event, 'buscar-partidas')}>Buscar Partidas</a></li>
                </ul>
              )}
            </div>
          </li>
          <li
            className="tools-menu"
            onMouseEnter={() => abrirMenu(setMenuAbierto)}
            onMouseLeave={() => cerrarMenu(setMenuAbierto)}
          >
            <div className="tools-menu-content">
              <button
                className="tools-trigger active"
                type="button"
                aria-expanded={menuAbierto}
                aria-haspopup="true"
                onClick={() => setMenuAbierto((abierto) => !abierto)}
              >
                <span>Herramientas</span>
              </button>
              {menuAbierto && (
                <ul className="tools-dropdown">
                  <li><a href="#generador-encuentros" onClick={(event) => navegarDesdeEnlace(event, 'generador-encuentros')}>Generador de Encuentros</a></li>
                </ul>
              )}
            </div>
          </li>
          <li><a href="#contacto" onClick={(event) => navegarDesdeEnlace(event, 'contacto')}>Contacto</a></li>
        </ul>
      </nav>

      <div className="header-actions">
        {profile ? <>
          <span className="header-user-name">{profile.username}</span>
          {profile.role === 'admin' && <span className="header-user-role">Admin</span>}
          <button className="header-action" type="button" onClick={abrirPerfil}>Editar perfil</button>
          <button
            className="header-action header-notifications-trigger"
            type="button"
            aria-expanded={notificacionesAbiertas}
            onClick={() => {
              setNotificacionesAbiertas((abierto) => !abierto);
              setPerfilAbierto(false);
            }}
          >
            <img
              className="header-notification-icon"
              src={solicitudes.length > 0 ? bellAlertIcon : bellIcon}
              alt=""
              aria-hidden="true"
            />
            <span>Notificaciones</span>
            {solicitudes.length > 0 && <span className="header-notification-count">{solicitudes.length}</span>}
          </button>
          <button className="header-sign-out" type="button" onClick={() => { void onSignOut().catch(() => undefined); }}>Salir</button>
        </> : <button className="header-sign-out" type="button" onClick={requestLogin}>Acceder</button>}
      </div>

      {notificacionesAbiertas && (
        <div className="header-dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setNotificacionesAbiertas(false); }}>
          <section className="header-dialog notifications-dialog" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
            <header className="header-dialog-heading">
              <h2 id="notifications-title">Notificaciones</h2>
              <button type="button" className="header-dialog-close" aria-label="Cerrar notificaciones" onClick={() => setNotificacionesAbiertas(false)}>×</button>
            </header>
            {errorNotificaciones && <p className="datos-error" role="alert">{errorNotificaciones}</p>}
            {cargandoSolicitudes && <p role="status">Actualizando solicitudes…</p>}
            {!cargandoSolicitudes && !errorNotificaciones && solicitudes.length === 0 && (
              <p className="notifications-empty">No tienes solicitudes pendientes.</p>
            )}
            {solicitudes.length > 0 && (
              <ul className="notifications-list">
                {solicitudes.map((solicitud) => {
                  const clave = `${solicitud.partida_id}:${solicitud.user_id}`;
                  return (
                    <li key={clave}>
                      <div className="notification-details">
                        <strong>{solicitud.username}</strong>
                        <span>Quiere entrar en <strong>{solicitud.partida_titulo}</strong></span>
                        <time dateTime={solicitud.fecha_union}>{new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(solicitud.fecha_union))}</time>
                      </div>
                      <div className="notification-actions">
                        <button type="button" className="notification-accept" disabled={solicitudEnResolucion !== null} onClick={() => { void resolverSolicitud(solicitud, true); }}>Aceptar</button>
                        <button type="button" className="notification-reject" disabled={solicitudEnResolucion !== null} onClick={() => { void resolverSolicitud(solicitud, false); }}>Rechazar</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {perfilAbierto && (
        <div className="header-dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPerfilAbierto(false); }}>
          <section className="header-dialog profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <header className="header-dialog-heading">
              <h2 id="profile-title">Editar perfil</h2>
              <button type="button" className="header-dialog-close" aria-label="Cerrar edición de perfil" onClick={() => setPerfilAbierto(false)}>×</button>
            </header>
            <form className="profile-form" onSubmit={(event) => { void guardarPerfil(event); }}>
              <label>
                Nombre de usuario
                <input required minLength={3} maxLength={48} value={username} onChange={(event) => setUsername(event.target.value)} />
              </label>
              <label>
                URL del avatar <span>(opcional)</span>
                <input type="url" maxLength={500} value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://ejemplo.com/avatar.jpg" />
              </label>
              {errorPerfil && <p className="datos-error" role="alert">{errorPerfil}</p>}
              <div className="profile-form-actions">
                <button type="button" onClick={() => setPerfilAbierto(false)}>Cancelar</button>
                <button type="submit" disabled={guardandoPerfil}>{guardandoPerfil ? 'Guardando…' : 'Guardar perfil'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </header>
  );
}