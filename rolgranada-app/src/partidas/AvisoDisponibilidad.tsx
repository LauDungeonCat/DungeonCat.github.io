import type { DisponibilidadDia, FranjaHorario } from "../types";
import calendarWarning from "../assets/Calendar-Warning.svg";
import { obtenerRangoMeses } from "./rangoMeses";
import "./AvisoDisponibilidad.css";

type SesionAviso = { fecha: string; franja: FranjaHorario };

type Props = {
  disponibilidad?: Record<string, DisponibilidadDia>;
  sesiones?: SesionAviso[];
};

function fechaIso(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export default function AvisoDisponibilidad({ disponibilidad, sesiones = [] }: Props) {
  if (!disponibilidad) return null;

  const ahora = new Date();
  const hoy = fechaIso(ahora);
  const mesActual = hoy.slice(0, 7);
  const diasEnMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
  const sesionesConfirmadas = new Set(
    sesiones
      .filter((sesion) => sesion.fecha >= hoy && sesion.fecha.startsWith(`${mesActual}-`))
      .map((sesion) => `${sesion.fecha}:${sesion.franja}`),
  );
  let franjasRellenadas = 0;
  let franjasPendientes = 0;

  for (let dia = ahora.getDate(); dia <= diasEnMes; dia += 1) {
    const fecha = `${mesActual}-${String(dia).padStart(2, "0")}`;
    const disponibilidadDia = disponibilidad[fecha];
    for (const franja of ["manana", "tarde"] as const) {
      if (sesionesConfirmadas.has(`${fecha}:${franja}`)) continue;
      if (disponibilidadDia?.[franja]) franjasRellenadas += 1;
      else franjasPendientes += 1;
    }
  }

  const mensajes: string[] = [];
  if (franjasPendientes > 0) {
    mensajes.push(
      franjasRellenadas === 0
        ? "No has rellenado la disponibilidad de este mes."
        : `Te faltan ${franjasPendientes} franjas por rellenar.`,
    );
  }
  if (obtenerRangoMeses(ahora).siguienteDisponible) {
    mensajes.push("Ya puedes rellenar el mes siguiente.");
  }
  if (mensajes.length === 0) return null;

  return (
    <aside className="aviso-disponibilidad" role="status">
      <img src={calendarWarning} alt="" aria-hidden="true" />
      <div>
        {mensajes.map((mensaje) => <p key={mensaje}>{mensaje}</p>)}
      </div>
    </aside>
  );
}
