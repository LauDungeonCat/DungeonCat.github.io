import { useState } from "react";
import "./CalendarioSesiones.css";

export type Sesion = {
    fecha: Date;
    titulo: string;
    campana: string;
    hora: string;
    sistema?: string;
    ubicacion?: string;
    onSelectCampana?: (nombreCampana: string) => void;
};

interface CalendarioSesionesProps {
    sesiones: Sesion[];
}

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fechaClave(fecha: Date) {
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// Generar enlace de Google Calendar con bloques de mañana (9-14) o tarde (16-22)
function obtenerEnlaceGoogleCalendar(sesion: Sesion) {
    const d = new Date(sesion.fecha);
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    const fechaStr = `${anio}${mes}${dia}`;

    const esMañana = sesion.hora.toLowerCase().includes("mañana");
    const horaInicio = esMañana ? "090000" : "160000";
    const horaFin = esMañana ? "140000" : "220000";

    const text = encodeURIComponent(`Sesión: ${sesion.campana} (${sesion.hora})`);
    const details = encodeURIComponent(
        `Sistema: ${sesion.sistema || "No especificado"}\nUbicación: ${sesion.ubicacion || "Por decidir"}\n\nNota: La hora específica de inicio y fin exacta la indica el Dungeon Master (DM).`
    );
    const location = encodeURIComponent(sesion.ubicacion || "Granada");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fechaStr}T${horaInicio}/${fechaStr}T${horaFin}&details=${details}&location=${location}`;
}

export default function CalendarioSesiones({ sesiones }: CalendarioSesionesProps) {
    const [mesVisible, setMesVisible] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));

    const inicioMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const desplazamientoInicio = (inicioMes.getDay() + 6) % 7;
    const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    const totalCeldas = Math.ceil((desplazamientoInicio + diasEnMes) / 7) * 7;

    const calendarioDias = Array.from({ length: totalCeldas }, (_, indice) =>
        new Date(mesVisible.getFullYear(), mesVisible.getMonth(), indice - desplazamientoInicio + 1),
    );

    const sesionesPorFecha = new Map<string, Sesion[]>();
    for (const sesion of sesiones) {
        const clave = fechaClave(sesion.fecha);
        sesionesPorFecha.set(clave, [...(sesionesPorFecha.get(clave) ?? []), sesion]);
    }

    const formatoMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

    return (
        <section className="calendario-sesiones" aria-labelledby="calendario-titulo">
            <div className="calendario-cabecera">
                <div>
                    <p className="seccion-etiqueta">Agenda</p>
                    <h2 className="section-title" id="calendario-titulo">Próximas sesiones</h2>
                </div>
                <div className="calendario-navegacion">
                    <button type="button" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))} aria-label="Mes anterior">‹</button>
                    <strong>{formatoMes.format(mesVisible)}</strong>
                    <button type="button" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))} aria-label="Mes siguiente">›</button>
                </div>
            </div>

            <div className="calendario-grid" role="grid" aria-label={`Calendario de ${formatoMes.format(mesVisible)}`}>
                {diasSemana.map((dia) => <div className="calendario-dia-semana" role="columnheader" key={dia}>{dia}</div>)}
                {calendarioDias.map((fecha) => {
                    const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
                    const esPasado = fechaSinHora < hoy;
                    const esHoy = fechaSinHora.getTime() === hoy.getTime();
                    
                    const sesionesDia = sesionesPorFecha.get(fechaClave(fecha)) ?? [];
                    const perteneceAlMes = fecha.getMonth() === mesVisible.getMonth();

                    let clasesCelda = "calendario-celda";
                    if (!perteneceAlMes) clasesCelda += " fuera-de-mes";
                    if (esPasado) clasesCelda += " dia-pasado";
                    if (esHoy) clasesCelda += " dia-actual";
                    if (sesionesDia.length) clasesCelda += " con-sesion";

                    return (
                        <div className={clasesCelda} role="gridcell" key={fechaClave(fecha)}>
                            <time dateTime={fechaClave(fecha)}>{fecha.getDate()}</time>
                            {sesionesDia.map((sesion) => {
                                const urlGCal = obtenerEnlaceGoogleCalendar(sesion);
                                return (
                                    <div 
                                        className="evento-sesion" 
                                        key={`${sesion.campana}-${sesion.hora}`}
                                        title={`Campaña: ${sesion.campana}\nSistema: ${sesion.sistema || "N/D"}\nUbicación: ${sesion.ubicacion || "Por decidir"}\nHaz clic para exportar a Google Calendar`}
                                        onClick={() => window.open(urlGCal, "_blank")}
                                    >
                                        <strong>{sesion.titulo}</strong>
                                        <span>{sesion.campana}</span>
                                        <small className="evento-gcal-hint">📅 + Google Calendar</small>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}