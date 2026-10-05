import React from 'react';
import type { Pagina } from '../App';
import './Inicio.css';

interface InicioProps {
  onNavigate?: (pagina: Pagina) => void;
}

export const Inicio: React.FC<InicioProps> = ({ onNavigate }) => {
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

      {/* Rejilla de tarjetas con la estética exacta de Buscar Partidas */}
      <p className="seccion-etiqueta" style={{ marginTop: '2rem' }}>Accesos Rápidos</p>
      
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
    </div>
  );
};