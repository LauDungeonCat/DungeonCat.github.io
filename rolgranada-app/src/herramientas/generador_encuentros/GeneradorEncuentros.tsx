import React, { useState } from "react";
import {
  ARQUETIPOS,
  TERRENOS,
  OBJETOS,
  DINAMICAS,
  COMPOSICIONES,
} from "./database.ts";
import "./GeneradorEncuentros.css";

function Tarjeta({
  categoria,
  children,
  onRegenerar,
  onInfoClick,
}: {
  categoria: string;
  children: React.ReactNode;
  onRegenerar: () => void;
  onInfoClick: (categoria: string) => void;
}) {
  return (
    <div className="tarjeta">
      <h2>{categoria}</h2>
      <button
        className="info-button"
        type="button"
        onClick={() => onInfoClick(categoria)}
        aria-label={`Información sobre ${categoria}`}
        title={`Información sobre ${categoria}`}
      >
        ?
      </button>
      <hr />
      <div className="tarjeta-contenido">{children}</div>
      <button
        type="button"
        onClick={onRegenerar}
        aria-label={`Regenerar ${categoria}`}
        title={`Regenerar ${categoria}`}
      >
        ↻
      </button>
    </div>
  );
}

export default function App() {
  const [encuentro, setEncuentro] = useState({
    composicion: 0,
    arquetipo1: 0,
    arquetipo2: 0,
    arquetipo3: 0,
    terreno1: 0,
    terreno2: 0,
    objeto1: 0,
    objeto2: 0,
    dinamica: 0,
  });

  const [infoActiva, setInfoActiva] = useState<string | null>(null);

  const infoText: Record<string, string> = {
    "Tipo de Combate":
      "Define la estructura y el flujo del encuentro. Cada una con sus propias dinámicas y desafíos. Como todas, es orientativa, puede y se debe adaptar a la narrativa y estilo de juego del grupo.",
    "Arquetipos":
      "Representan los roles y comportamientos, asigna uno a cada enemigo o a los clave. Afectan cómo interactúan con los jugadores y entre sí durante el combate, facilitando su interpretación.",
    "Escenario Táctico":
      "Se refiere al terreno y los objetos presentes en el encuentro. Estos elementos pueden influir en la estrategia de combate, ofreciendo ventajas o desventajas a los jugadores y enemigos.",
    "Dinámica del Entorno":
      "Describe un cambio progresivo durante el encuentro. Estos obligan a los jugadores a adaptar su estrategia y a tomar decisiones críticas, añadiendo tensión y profundidad al combate.",
  };

  function generarEncuentro() {
    setEncuentro((prev) => ({
      ...prev,
      composicion: Math.floor(Math.random() * COMPOSICIONES.length),
      arquetipo1: Math.floor(Math.random() * ARQUETIPOS.length),
      arquetipo2: Math.floor(Math.random() * ARQUETIPOS.length),
      arquetipo3: Math.floor(Math.random() * ARQUETIPOS.length),
      terreno1: Math.floor(Math.random() * TERRENOS.length),
      terreno2: Math.floor(Math.random() * TERRENOS.length),
      objeto1: Math.floor(Math.random() * OBJETOS.length),
      objeto2: Math.floor(Math.random() * OBJETOS.length),
      dinamica: Math.floor(Math.random() * DINAMICAS.length),
    }));
  }

  function handleRegenerar(categoria: string) {
    setEncuentro((prev) => {
      const next = { ...prev };

      switch (categoria) {
        case "Tipo de Combate":
          next.composicion = Math.floor(Math.random() * COMPOSICIONES.length);
          break;
        case "Arquetipos":
          next.arquetipo1 = Math.floor(Math.random() * ARQUETIPOS.length);
          next.arquetipo2 = Math.floor(Math.random() * ARQUETIPOS.length);
          next.arquetipo3 = Math.floor(Math.random() * ARQUETIPOS.length);
          break;
        case "Escenario Táctico":
          next.terreno1 = Math.floor(Math.random() * TERRENOS.length);
          next.terreno2 = Math.floor(Math.random() * TERRENOS.length);
          next.objeto1 = Math.floor(Math.random() * OBJETOS.length);
          next.objeto2 = Math.floor(Math.random() * OBJETOS.length);
          break;
        case "Dinámica del Entorno":
          next.dinamica = Math.floor(Math.random() * DINAMICAS.length);
          break;
      }

      return next;
    });
  }

  function handleInfoClick(categoria: string) {
    setInfoActiva(categoria);
  }

  const [isFirstRender, setIsFirstRender] = useState(true);

  if (isFirstRender) {
    generarEncuentro();
    setIsFirstRender(false);
  }

  return (
    <div className="generador-encuentros">
      <h1 className="page-title">Generador de Encuentros</h1>
      <div className="tarjetas-container">
        <Tarjeta
          categoria="Tipo de Combate"
          onRegenerar={() => handleRegenerar("Tipo de Combate")}
          onInfoClick={handleInfoClick}
        >
          <p>
            <strong>{COMPOSICIONES[encuentro.composicion].nombre}</strong>
          </p>
          <p>{COMPOSICIONES[encuentro.composicion].descripcion}</p>
          <p>
            <strong>Distribución:</strong>{" "}
            {COMPOSICIONES[encuentro.composicion].distribucion}
          </p>
          <p>
            <em>Nota: {COMPOSICIONES[encuentro.composicion].notas}</em>
          </p>
        </Tarjeta>

        <Tarjeta
          categoria="Arquetipos"
          onRegenerar={() => handleRegenerar("Arquetipos")}
          onInfoClick={handleInfoClick}
        >
          <p>
            <strong>{ARQUETIPOS[encuentro.arquetipo1].nombre}:</strong>{" "}
            {ARQUETIPOS[encuentro.arquetipo1].descripcion}
          </p>
          <p>
            <strong>{ARQUETIPOS[encuentro.arquetipo2].nombre}:</strong>{" "}
            {ARQUETIPOS[encuentro.arquetipo2].descripcion}
          </p>
          <p>
            <strong>{ARQUETIPOS[encuentro.arquetipo3].nombre}:</strong>{" "}
            {ARQUETIPOS[encuentro.arquetipo3].descripcion}
          </p>
        </Tarjeta>

        <Tarjeta
          categoria="Escenario Táctico"
          onRegenerar={() => handleRegenerar("Escenario Táctico")}
          onInfoClick={handleInfoClick}
        >
          <p>
            <strong>Terreno 1:</strong> {TERRENOS[encuentro.terreno1].nombre} —{" "}
            <em>{TERRENOS[encuentro.terreno1].efecto}</em>
          </p>
          <p>
            <strong>Terreno 2:</strong> {TERRENOS[encuentro.terreno2].nombre} —{" "}
            <em>{TERRENOS[encuentro.terreno2].efecto}</em>
          </p>
          <p>
            <strong>Objeto 1:</strong> {OBJETOS[encuentro.objeto1].nombre} —{" "}
            <em>{OBJETOS[encuentro.objeto1].uso}</em>
          </p>
          <p>
            <strong>Objeto 2:</strong> {OBJETOS[encuentro.objeto2].nombre} —{" "}
            <em>{OBJETOS[encuentro.objeto2].uso}</em>
          </p>
        </Tarjeta>

        <Tarjeta
          categoria="Dinámica del Entorno"
          onRegenerar={() => handleRegenerar("Dinámica del Entorno")}
          onInfoClick={handleInfoClick}
        >
          <p>
            <strong>{DINAMICAS[encuentro.dinamica].p}</strong>
          </p>
          <ul>
            <li>Fase 1: {DINAMICAS[encuentro.dinamica].e1}</li>
            <li>Fase 2: {DINAMICAS[encuentro.dinamica].e2}</li>
          </ul>
          <p>
            <em>Dilema: {DINAMICAS[encuentro.dinamica].c}</em>
          </p>
        </Tarjeta>
      </div>

      {infoActiva && (
        <div className="info-popup">
          <h3>Info de {infoActiva}</h3>
          <p>{infoText[infoActiva]}</p>
          <button type="button" onClick={() => setInfoActiva(null)}>
            Cerrar
          </button>
        </div>
      )}

      <button type="button" onClick={generarEncuentro}>
        Generar Encuentro
      </button>
    </div>
  );
}
