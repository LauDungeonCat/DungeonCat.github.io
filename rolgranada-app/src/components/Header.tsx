import { useState } from 'react';
import './Header.css';
import logo from '../assets/logo.svg';
import type { ProfileRow } from '../lib/database.types';

type HeaderProps = {
  onNavigate: (pagina: string) => void;
  profile: ProfileRow | null;
  onSignOut: () => Promise<void>;
  requestLogin: () => void;
};

export default function Header({ onNavigate, profile, onSignOut, requestLogin }: HeaderProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [partidasAbierto, setPartidasAbierto] = useState(false);

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
          <button className="header-sign-out" type="button" onClick={() => { void onSignOut().catch(() => undefined); }}>Salir</button>
        </> : <button className="header-sign-out" type="button" onClick={requestLogin}>Acceder</button>}
      </div>
    </header>
  );
}