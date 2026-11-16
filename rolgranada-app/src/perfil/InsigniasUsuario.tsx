import { useEffect, useRef, useState } from "react";
import { calcularInsignias } from "./insignias";
import type { EstadisticasUsuario } from "../types";
import "./InsigniasUsuario.css";

const NOMBRE_METAL = {
  generica: "Genérica",
  cobre: "Cobre",
  plata: "Plata",
  oro: "Oro",
  diamante: "Diamante",
} as const;

export default function InsigniasUsuario({ estadisticas }: { estadisticas: EstadisticasUsuario }) {
  const insignias = calcularInsignias(estadisticas);
  const [insigniaAbierta, setInsigniaAbierta] = useState<(typeof insignias)[number] | null>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!insigniaAbierta) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInsigniaAbierta(null);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [insigniaAbierta]);

  function iconoDe(insignia: (typeof insignias)[number]) {
    return insignia.icono === "perfil-anonimo" ? (
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="7" r="4" fill="currentColor" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8H4Z" fill="currentColor" />
      </svg>
    ) : insignia.icono;
  }

  function textoActual(categoria: string, valor: number | boolean) {
    if (typeof valor === "boolean") return valor ? "Insignia conseguida." : "Aún no has conseguido esta insignia.";
    if (categoria === "Antigüedad") {
      return `Llevas ${valor} ${valor === 1 ? "mes" : "meses"} en la comunidad.`;
    }
    if (categoria === "Dirección") {
      return `Has dirigido ${valor} ${valor === 1 ? "sesión" : "sesiones"} que ya han tenido lugar.`;
    }
    if (categoria === "Participación") {
      return `Has jugado ${valor} ${valor === 1 ? "sesión" : "sesiones"} que ya han tenido lugar.`;
    }
    return `Has jugado con ${valor} ${valor === 1 ? "persona distinta" : "personas distintas"}.`;
  }

  return (
    <section className="insignias-seccion" aria-labelledby="insignias-titulo">
      <h2 id="insignias-titulo">Insignias</h2>
      <div className="insignias-grid">
        {insignias.map((insignia) => {
          return (
            <button
              type="button"
              key={insignia.id}
              className={`insignia-card metal-${insignia.metal}${insignia.obtenida ? " obtenida" : ""}`}
              aria-haspopup="dialog"
              onClick={() => setInsigniaAbierta(insignia)}
            >
              <span className="insignia-icono" aria-hidden="true">{iconoDe(insignia)}</span>
              <span className="insignia-categoria">{insignia.categoria}</span>
              <strong>{insignia.nombre}</strong>
              <span className="insignia-metal">{NOMBRE_METAL[insignia.metal]}</span>
              <span className="insignia-detalle-hint">Ver detalles</span>
            </button>
          );
        })}
      </div>
      {insigniaAbierta && (
        <div
          className="insignia-popup-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInsigniaAbierta(null);
          }}
        >
          <section
            className="insignia-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="insignia-popup-titulo"
            aria-describedby="insignia-popup-detalle"
          >
            <button
              type="button"
              ref={cerrarRef}
              className="insignia-popup-cerrar"
              aria-label="Cerrar detalles de insignia"
              onClick={() => setInsigniaAbierta(null)}
            >
              ×
            </button>
            <div className={`insignia-popup-tarjeta metal-${insigniaAbierta.metal}${insigniaAbierta.obtenida ? " obtenida" : ""}`}>
              <span className="insignia-popup-icono" aria-hidden="true">{iconoDe(insigniaAbierta)}</span>
              <span className="insignia-popup-categoria">{insigniaAbierta.categoria}</span>
              <h3 id="insignia-popup-titulo">{insigniaAbierta.nombre}</h3>
              <span className="insignia-popup-metal">{NOMBRE_METAL[insigniaAbierta.metal]}</span>
            </div>
            <div className="insignia-popup-detalle" id="insignia-popup-detalle">
              <p>{textoActual(insigniaAbierta.categoria, insigniaAbierta.valorActual)}</p>
              {insigniaAbierta.siguienteUmbral !== null && (
                <p className="insignia-siguiente">Siguiente: {insigniaAbierta.siguienteUmbral}</p>
              )}
              <p className="insignia-descripcion">{insigniaAbierta.descripcion}</p>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
