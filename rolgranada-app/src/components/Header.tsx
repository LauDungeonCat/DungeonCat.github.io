import { useEffect, useState } from 'react';
import './Header.css';
import logo from '../assets/logo.svg';
import crownIcon from '../assets/crown.svg';
import bellIcon from '../assets/Bell-Notification.svg';
import bellAlertIcon from '../assets/Bell-Notification-There-Is-A-Notification.svg';
import sunIcon from '../assets/sun.svg';
import moonIcon from '../assets/moon.svg';
import { supabase } from '../lib/supabase';
import { activarPush } from '../lib/push';
import Notificaciones from './Notificaciones';
import type { Database } from '../lib/database.types';

// Tipos seguros para el Header
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type SolicitudPendienteRow = {
  partida_id: string;
  user_id: string;
  username: string;
  partida_titulo: string;
  fecha_union: string;
};

type HeaderProps = {
  onNavigate: (pagina: string) => void;
  profile: ProfileRow | null;
  onSignOut: () => Promise<void>;
  requestLogin: () => void;
  updateProfile: (username: string, avatarUrl: string | null, rolPreferencias?: any, lineasEvitar?: string, estiloMaster?: string) => Promise<void>;
};

export default function Header({ onNavigate, profile, requestLogin }: HeaderProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [partidasAbierto, setPartidasAbierto] = useState(false);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [solicitudesCargadas, setSolicitudesCargadas] = useState<{ usuarioId: string; items: SolicitudPendienteRow[] } | null>(null);
  const [noLeidasCount, setNoLeidasCount] = useState<number>(0);
  
  const solicitudes = solicitudesCargadas && solicitudesCargadas.usuarioId === profile?.id ? solicitudesCargadas.items : [];
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState<string | null>(null);
  const [solicitudEnResolucion, setSolicitudEnResolucion] = useState<string | null>(null);

  // Estado para el modo oscuro
  const [esModoOscuro, setEsModoOscuro] = useState(false);

  useEffect(() => {
    const guardadoOscuro = localStorage.getItem('darkMode') === 'true';
    if (guardadoOscuro) {
      document.body.classList.add('dark-mode');
      setEsModoOscuro(true);
    }
  }, []);

  const toggleModoOscuro = () => {
    const nuevoEstado = !esModoOscuro;
    setEsModoOscuro(nuevoEstado);
    if (nuevoEstado) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const usuarioId = profile?.id;

  // Renovar la suscripción Web Push en cada inicio de sesión si el permiso ya fue concedido
  useEffect(() => {
    if (usuarioId && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      void activarPush(usuarioId);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) return;
    let activa = true;

    const cargarSolicitudesYAvisos = async () => {
      setCargandoSolicitudes(true);
      const [resSolicitudes, resAvisos] = await Promise.all([
        supabase.rpc('listar_solicitudes_usuario'),
        supabase
          .from('notificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', usuarioId)
          .eq('leida', false)
          .neq('titulo', 'Solicitud de unión recibida')
      ]);

      if (!activa) return;
      setCargandoSolicitudes(false);

      if (resSolicitudes.error) {
        setErrorNotificaciones(resSolicitudes.error.message);
      } else {
        setSolicitudesCargadas({ usuarioId, items: resSolicitudes.data ?? [] });
        setErrorNotificaciones(null);
      }

      if (!resAvisos.error) {
        setNoLeidasCount(resAvisos.count ?? 0);
      }
    };

    void cargarSolicitudesYAvisos();

    // Event listener personalizado para refrescar notificaciones
    const refrescar = () => void cargarSolicitudesYAvisos();
    window.addEventListener('notificaciones-actualizadas', refrescar);

    // Suscripción Realtime a nuevas notificaciones
    const canal = supabase
      .channel(`notif_header_${usuarioId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${usuarioId}` },
        () => {
          void cargarSolicitudesYAvisos();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partida_participantes' },
        () => {
          void cargarSolicitudesYAvisos();
        }
      )
      .subscribe();

    return () => {
      activa = false;
      window.removeEventListener('notificaciones-actualizadas', refrescar);
      supabase.removeChannel(canal);
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

  const totalNotificaciones = solicitudes.length + noLeidasCount;

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
        <button 
          className="header-action header-theme-toggle" 
          type="button" 
          onClick={toggleModoOscuro}
          aria-label="Cambiar modo oscuro"
          title={esModoOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}
        >
          <img 
            src={esModoOscuro ? sunIcon : moonIcon} 
            alt="" 
            style={{ width: '1.2rem', height: '1.2rem', display: 'block' }} 
            aria-hidden="true"
          />
        </button>

        {profile ? <>
          <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            {profile.role === 'admin' && (
              <img 
                src={crownIcon} 
                alt="Admin Crown" 
                title="Administrador"
                style={{ 
                  position: 'absolute', 
                  top: '-14px', 
                  left: '6px', 
                  width: '20px', 
                  height: '20px', 
                  zIndex: 2,
                  filter: 'brightness(0) invert(1)' 
                }} 
              />
            )}
            {profile.avatar_url ? (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #202020', flexShrink: 0, position: 'relative', background: '#202020' }}>
                <img 
                  src={profile.avatar_url} 
                  alt="" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    display: 'block',
                    objectPosition: profile.avatar_position ? `${profile.avatar_position.split(' ')[0]}% ${profile.avatar_position.split(' ')[1]}%` : '50% 50%',
                    transform: profile.avatar_position && profile.avatar_position.split(' ')[2] ? `scale(${parseInt(profile.avatar_position.split(' ')[2], 10) / 100})` : 'none',
                    transformOrigin: profile.avatar_position ? `${profile.avatar_position.split(' ')[0]}% ${profile.avatar_position.split(' ')[1]}%` : '50% 50%'
                  }} 
                />
              </div>
            ) : null}
            <span className="header-user-name">{profile.username}</span>
          </div>
          
          <button className="header-action" type="button" onClick={() => onNavigate('perfil')}>Perfil</button>

          <button
            className="header-action header-notifications-trigger"
            type="button"
            aria-expanded={notificacionesAbiertas}
            onClick={() => setNotificacionesAbiertas((abierto) => !abierto)}
          >
            <img
              className="header-notification-icon"
              src={totalNotificaciones > 0 ? bellAlertIcon : bellIcon}
              alt=""
              aria-hidden="true"
            />
            {totalNotificaciones > 0 && <span className="header-notification-count">{totalNotificaciones}</span>}
          </button>
        </> : <button className="header-sign-out" type="button" onClick={requestLogin}>Acceder</button>}
      </div>

      <Notificaciones
        abierto={notificacionesAbiertas}
        onCerrar={() => setNotificacionesAbiertas(false)}
        solicitudes={solicitudes}
        cargando={cargandoSolicitudes}
        error={errorNotificaciones}
        solicitudEnResolucion={solicitudEnResolucion}
        onResolver={resolverSolicitud}
        userId={profile?.id}
      />
    </header>
  );
}