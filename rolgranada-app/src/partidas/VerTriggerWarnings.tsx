import { useEffect } from "react";
import { etiquetaTema, type TriggerWarningsPartida } from "../temasSensibles";
import "./TriggerWarnings.css";

type VerTriggerWarningsProps = {
	titulo: string;
	avisos: TriggerWarningsPartida;
	onClose: () => void;
};

export default function VerTriggerWarnings({ titulo, avisos, onClose }: VerTriggerWarningsProps) {
	useEffect(() => {
		function alPulsarTecla(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		window.addEventListener("keydown", alPulsarTecla);
		return () => window.removeEventListener("keydown", alPulsarTecla);
	}, [onClose]);

	return (
		<div className="tw-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className="tw-dialog tw-dialog-lectura" role="dialog" aria-modal="true" aria-labelledby="tw-ver-titulo">
				<header className="tw-header">
					<div>
						<p className="tw-etiqueta">{titulo}</p>
						<h2 id="tw-ver-titulo">Trigger Warnings</h2>
					</div>
					<button type="button" className="tw-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
				</header>

				<p className="tw-intro">
					Estos temas sensibles podrían aparecer en la campaña. Si alguno te incomoda, habla con el DM.
					Si lo tienes marcado como línea o velo en tu perfil, se le avisará automáticamente cuando te unas.
				</p>

				{avisos.explicitos.length > 0 && (
					<div className="tw-grupo">
						<h3><span className="tw-nivel explicito">Explícito</span> Pueden aparecer descritos o mostrados</h3>
						<ul className="tw-chips">
							{avisos.explicitos.map((id) => <li className="tw-chip explicito" key={id}>{etiquetaTema(id)}</li>)}
						</ul>
					</div>
				)}

				{avisos.implicitos.length > 0 && (
					<div className="tw-grupo">
						<h3><span className="tw-nivel implicito">Implícito</span> Pueden insinuarse o quedar fuera de escena</h3>
						<ul className="tw-chips">
							{avisos.implicitos.map((id) => <li className="tw-chip implicito" key={id}>{etiquetaTema(id)}</li>)}
						</ul>
					</div>
				)}

				{avisos.otro.trim() && (
					<div className="tw-grupo">
						<h3>Otros</h3>
						<p className="tw-otro-texto">{avisos.otro}</p>
					</div>
				)}

				<div className="tw-acciones">
					<button type="button" className="tw-guardar" onClick={onClose}>Entendido</button>
				</div>
			</section>
		</div>
	);
}
