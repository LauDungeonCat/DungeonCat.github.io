import { useState, type FormEvent } from "react";
import type { Partida } from "../types";
import { useRolData } from "../useRolData";
import "./FormularioPartida.css";

const IMAGEN_DEFAULT = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80";

interface FormularioPartidaProps {
  partidaAEditar?: Partida | null;
  partidaAEliminar?: Partida | null;
  onClose: () => void;
}

export default function FormularioPartida({ partidaAEditar, partidaAEliminar, onClose }: FormularioPartidaProps) {
  const { crearPartida, actualizarPartida, eliminarPartida, usuario } = useRolData();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formulario, setFormulario] = useState({
    titulo: partidaAEditar?.titulo ?? "",
    sistema: partidaAEditar?.sistema ?? "",
    ubicacionAproximada: partidaAEditar?.ubicacionAproximada ?? "",
    ubicacionExacta: partidaAEditar?.ubicacionExacta ?? "",
    descripcion: partidaAEditar?.descripcion ?? "",
    participantesMax: String(partidaAEditar?.participantesMax ?? 4),
    sesionesAlMes: String(partidaAEditar?.sesionesAlMes ?? 2),
    duracionEstimada: partidaAEditar?.duracionEstimada ?? "",
    imagenUrl: partidaAEditar?.imagenUrl ?? "",
    esPrivada: partidaAEditar?.esPrivada ?? false,
  });

  function actualizarCampo(campo: string, valor: string | boolean) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function enviarCreacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setError(null);

    const datos = {
      titulo: formulario.titulo.trim(),
      sistema: formulario.sistema.trim(),
      ubicacionAproximada: formulario.ubicacionAproximada.trim(),
      ubicacionExacta: formulario.ubicacionExacta.trim() || null,
      imagenUrl: formulario.imagenUrl.trim() || IMAGEN_DEFAULT,
      descripcion: formulario.descripcion.trim(),
      participantesMax: Math.max(1, parseInt(formulario.participantesMax, 10) || 4),
      sesionesAlMes: Math.max(1, parseInt(formulario.sesionesAlMes, 10) || 2),
      duracionEstimada: formulario.duracionEstimada.trim(),
      esPrivada: formulario.esPrivada,
    };

    try {
      if (partidaAEditar) {
        await actualizarPartida(partidaAEditar.id, datos);
      } else {
        await crearPartida(datos);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hubo un error al guardar la campaña.");
      setGuardando(false);
    }
  }

  async function confirmarBorrado() {
    if (!partidaAEliminar) return;
    setGuardando(true);
    setError(null);
    try {
      await eliminarPartida(partidaAEliminar.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hubo un error al eliminar la campaña.");
      setGuardando(false);
    }
  }

  if (partidaAEliminar) {
    return (
      <div className="crear-campana-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <section className="crear-campana-dialog" role="dialog" aria-modal="true" aria-labelledby="eliminar-campana-titulo">
          <header className="crear-campana-header">
            <div>
              <p className="seccion-etiqueta" style={{ color: "#a8131a" }}>Atención</p>
              <h2 id="eliminar-campana-titulo">Eliminar campaña</h2>
            </div>
            <button type="button" className="crear-campana-cerrar" onClick={onClose} disabled={guardando}>×</button>
          </header>

          {error && <p className="datos-error" role="alert">{error}</p>}

          <div className="crear-campana-form">
            <p className="crear-campana-aviso">
              ¿Quieres borrar la campaña <strong>"{partidaAEliminar.titulo}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="crear-campana-acciones">
              <button className="crear-campana-cancelar" type="button" onClick={onClose} disabled={guardando}>Cancelar</button>
              <button className="crear-campana-enviar" type="button" style={{ backgroundColor: "#c02642", borderColor: "#a8131a" }} onClick={() => void confirmarBorrado()} disabled={guardando}>
                {guardando ? "Eliminando…" : "Sí, eliminar campaña"}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="crear-campana-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="crear-campana-dialog" role="dialog" aria-modal="true" aria-labelledby="crear-campana-titulo">
        <header className="crear-campana-header">
          <div>
            <p className="seccion-etiqueta">Campaña</p>
            <h2 id="crear-campana-titulo">{partidaAEditar ? "Editar campaña" : "Crear campaña"}</h2>
          </div>
          <button type="button" className="crear-campana-cerrar" onClick={onClose}>×</button>
        </header>

        {error && <p className="datos-error" role="alert">{error}</p>}

        <form className="crear-campana-form" onSubmit={enviarCreacion}>
          <div className="crear-campana-grid">
            <label>
              Título
              <input required maxLength={80} value={formulario.titulo} onChange={(e) => actualizarCampo("titulo", e.target.value)} />
            </label>
            <label>
              Sistema
              <input required maxLength={60} value={formulario.sistema} onChange={(e) => actualizarCampo("sistema", e.target.value)} placeholder="Ej. D&D 5e" />
            </label>
            <p className="crear-campana-dm">DM: <strong>{usuario?.username ?? ""}</strong></p>

            <label className="crear-campana-campo-amplio">
              URL de imagen de portada <span>(opcional)</span>
              <input type="url" value={formulario.imagenUrl} onChange={(e) => actualizarCampo("imagenUrl", e.target.value)} placeholder="https://..." />
            </label>

            <label className="crear-campana-privacidad crear-campana-campo-amplio">
              <input type="checkbox" checked={formulario.esPrivada} onChange={(e) => actualizarCampo("esPrivada", e.target.checked)} />
              Campaña privada: requiere aprobación o enlace de invitación
            </label>

            <label>
              Ubicación aproximada
              <input required maxLength={100} value={formulario.ubicacionAproximada} onChange={(e) => actualizarCampo("ubicacionAproximada", e.target.value)} placeholder="Zona" />
            </label>

            <label className="crear-campana-campo-amplio">
              Ubicación exacta <span>(opcional)</span>
              <textarea rows={2} maxLength={250} value={formulario.ubicacionExacta} onChange={(e) => actualizarCampo("ubicacionExacta", e.target.value)} />
            </label>

            <label>
              Máximo de participantes
              <input required type="number" min="1" max="20" value={formulario.participantesMax} onChange={(e) => actualizarCampo("participantesMax", e.target.value)} />
            </label>

            <label>
              Sesiones al mes
              <input required type="number" min="1" max="10" value={formulario.sesionesAlMes} onChange={(e) => actualizarCampo("sesionesAlMes", e.target.value)} />
            </label>

            <label className="crear-campana-campo-amplio">
              Duración estimada de campaña
              <input value={formulario.duracionEstimada} maxLength={80} onChange={(e) => actualizarCampo("duracionEstimada", e.target.value)} placeholder="Ej. 6 meses" />
            </label>

            <label className="crear-campana-campo-amplio">
              Descripción
              <textarea required rows={3} maxLength={500} value={formulario.descripcion} onChange={(e) => actualizarCampo("descripcion", e.target.value)} />
            </label>
          </div>

          <div className="crear-campana-acciones">
            <button className="crear-campana-cancelar" type="button" onClick={onClose}>Cancelar</button>
            <button className="crear-campana-enviar" type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : partidaAEditar ? "Guardar cambios" : "Publicar campaña"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}