import React from 'react';
import type { Pagina } from '../App';
import whatsappQr from '../assets/whatsapp-qr.png';
import instagramQr from '../assets/instagram-qr.png';
import { useRolData } from '../useRolData';
import './Inicio.css';

interface InicioProps {
  onNavigate?: (pagina: Pagina) => void;
}

export const Inicio: React.FC<InicioProps> = ({ onNavigate }) => {
  const { partidas, sesiones } = useRolData();

  // Estadísticas calculadas directamente del estado cargado por useRolData
  const mesasActivas = partidas.length;
  const totalSesiones = sesiones.length;
  const totalJugadores = partidas.reduce((acc, p) => acc + (p.participantesCount ?? 0), 0);

  return (
    <div className="inicio-container">
      <header className="inicio-cabecera">
        <div>
          <p className="seccion-etiqueta">Inicio</p>
          <h1 className="page-title">Bienvenido a la Comunidad</h1>
          <p className="inicio-subtitulo">
            Encuentra partidas de rol, organiza tus horarios y gestiona tus campañas en un solo lugar.
          </p>
        </div>
      </header>

      {/* Accesos Rápidos */}
      <p className="seccion-etiqueta seccion-separador">Accesos Rápidos</p>
      
      <div className="inicio-grid">
        {/* Tarjeta 1: Buscar Partidas */}
        <article className="inicio-card" onClick={() => onNavigate?.('buscar-partidas')}>
          <div className="inicio-card-body">
            <h3>Explorar Partidas</h3>
            <p>Únete y crea mesas abiertas en la comunidad en cualquier parte de Granada!</p>
          </div>
          <div className="inicio-card-footer">
            <button className="btn-rojo btn-block">Buscar Partidas</button>
          </div>
        </article>

        {/* Tarjeta 2: Disponibilidad */}
        <article className="inicio-card" onClick={() => onNavigate?.('disponibilidad')}>
          <div className="inicio-card-body">
            <h3>Disponibilidad</h3>
            <p>Indica qué días tienes libres para jugar este mes para hacer más sencillo fechar sesiones.</p>
          </div>
          <div className="inicio-card-footer">
            <button className="btn-secundario btn-block">Ver Disponibilidad</button>
          </div>
        </article>

        {/* Tarjeta 3: Mis Partidas */}
        <article className="inicio-card" onClick={() => onNavigate?.('mis-partidas')}>
          <div className="inicio-card-body">
            <h3>Tus Partidas</h3>
            <p>Consulta tus siguientes sesiones y gestiona tus partidas.</p>
          </div>
          <div className="inicio-card-footer">
            <button className="btn-secundario btn-block">Ver Mis Partidas</button>
          </div>
        </article>
      </div>

{/* Sección de Comunidad / Redes con Doble QR */}
      <section className="inicio-comunidad-section">
        <div className="comunidad-box-header">
          <h3>Nuestra Comunidad</h3>
        </div>

        <div className="comunidad-qrs-grid">
          <div className="comunidad-qr-card">
            <a href="https://chat.whatsapp.com/ED0bfq8fHqi2NyuscYE62v" target="_blank" rel="noreferrer" className="whatsapp-box-link">
              <img src={whatsappQr} alt="Código QR de la comunidad de WhatsApp" className="whatsapp-qr-img" />
              <span className="whatsapp-link-text">Comunidad de WhatsApp</span>
            </a>
            <p className="comunidad-qr-desc">Este es el grupo de la comunidad donde hablamos, organizamos cosas y creamos grupos para partidas</p>
          </div>

          {/* Tarjeta Instagram */}
          <div className="comunidad-qr-card">
            <a href="https://instagram.com/rol_granada" target="_blank" rel="noreferrer" className="whatsapp-box-link">
              <img src={instagramQr} alt="Código QR de Instagram" className="whatsapp-qr-img" />
              <span className="whatsapp-link-text">Instagram @rol_granada</span>
            </a>
            <p className="comunidad-qr-desc">Aquí anunciamos cosas, como quedadas mensuales, eventos y mucho más.</p>
          </div>
        </div>
      </section>
      

      {/* Estadísticas de la Comunidad */}
      <section className="inicio-stats-section">
        <p className="seccion-etiqueta">Comunidad</p>
        <h3 className="inicio-seccion-titulo">Estadísticas de Rol Granada</h3>
        
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{mesasActivas}</span>
            <span className="stat-label">Partidas Activas</span>
          </div>

          <div className="stat-card">
            <span className="stat-value">{totalJugadores}</span>
            <span className="stat-label">Jugadores Totales</span>
          </div>

          <div className="stat-card">
            <span className="stat-value">{totalSesiones}</span>
            <span className="stat-label">Sesiones Totales</span>
          </div>
        </div>
      </section>

      {/* Roadmap / Próximamente */}
      <section className="inicio-roadmap-section">
        <p className="seccion-etiqueta">Próximamente</p>
        <h3 className="inicio-seccion-titulo">Evolución de la Web</h3>
        
        <div className="roadmap-grid">

          <div className="roadmap-card">
            <h4> Valoraciones y Comentarios</h4>
            <p>Sistema para dejar valoraciones y comentarios de agradecimiento o feedback a Dungeon Masters de la comunidad.</p>
          </div>

          <div className="roadmap-card">
            <h4> Mejora de Temas Sensibles</h4>
            <p>Tabla con temas específicos que dará avisos si se seleccionan en una partida. Añadir Trigger Warnings.</p>
          </div>

          <div className="roadmap-card">
            <h4> Sistema de Socios</h4>
            <p>Todo es gratis, los socios solo apoyan a la comunidad y reciben un sombrerito personalizado encima de su avatar.</p>
          </div>

          <div className="roadmap-card">
            <h4> Mejoras para DM</h4>
            <p>Más herramientas para Dungeon Masters y estadísticas de sus partidas.</p>
          </div>

          <div className="roadmap-card">
            <h4> Mejora de Perfil</h4>
            <p>Un sistema con insignias por logros, estadísticas de juego y recomendaciones de juegos.</p>
          </div>

          <div className="roadmap-card">
            <h4> Sugerencias y Feedback</h4>
            <p>Añadir un formulario para recoger sugerencias y feedback de la comunidad.</p>
          </div>

        </div>
      </section>
    </div>
  );
};