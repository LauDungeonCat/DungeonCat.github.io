import { useEffect, useState } from "react";
import {
	TEMAS_SENSIBLES,
	type NivelPartida,
	type TriggerWarningsPartida,
} from "../temasSensibles";
import "./TriggerWarnings.css";

type EditorTriggerWarningsProps = {
	valor: TriggerWarningsPartida;
	onGuardar: (avisos: TriggerWarningsPartida) => void;
	onClose: () => void;
};

const OPCIONES: { nivel: NivelPartida | null; texto: string }[] = [
	{ nivel: null, texto: "Ninguno" },
	{ nivel: "implicito", texto: "Implícito" },
	{ nivel: "explicito", texto: "Explícito" },
];

export default function EditorTriggerWarnings({ valor, onGuardar, onClose }: EditorTriggerWarningsProps) {
	const [seleccion, setSeleccion] = useState<Record<string, NivelPartida>>(() => {
		const inicial: Record<string, NivelPartida> = {};
		valor.implicitos.forEach((id) => { inicial[id] = "implicito"; });
		valor.explicitos.forEach((id) => { inicial[id] = "explicito"; });
		return inicial;
	});
	const [otro, setOtro] = useState(valor.otro);

	useEffect(() => {
		function alPulsarTecla(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		window.addEventListener("keydown", alPulsarTecla);
		return () => window.removeEventListener("keydown", alPulsarTecla);
	}, [onClose]);

	function cambiarTema(id: string, nivel: NivelPartida | null) {
		setSeleccion((actual) => {
			const siguiente = { ...actual };
			if (nivel) siguiente[id] = nivel;
			else delete siguiente[id];
			return siguiente;
		});
	}

	function guardar() {
		onGuardar({
			explicitos: TEMAS_SENSIBLES.filter((tema) => seleccion[tema.id] === "explicito").map((tema) => tema.id),
			implicitos: TEMAS_SENSIBLES.filter((tema) => seleccion[tema.id] === "implicito").map((tema) => tema.id),
			otro: otro.trim(),
		});
		onClose();
	}

	const totalExplicitos = Object.values(seleccion).filter((nivel) => nivel === "explicito").length;
	const totalImplicitos = Object.values(seleccion).filter((nivel) => nivel === "implicito").length;

	return (
		<div className="tw-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section className="tw-dialog" role="dialog" aria-modal="true" aria-labelledby="tw-editor-titulo">
				<header className="tw-header">
					<div>
						<p className="tw-etiqueta">Campaña</p>
						<h2 id="tw-editor-titulo">Trigger Warnings</h2>
					</div>
					<button type="button" className="tw-cerrar" onClick={onClose} aria-label="Cerrar">×</button>
				</header>

				<div className="tw-explicacion">
					<p>Indica qué temas sensibles <strong>podrían aparecer</strong> en tu campaña. Los jugadores verán esta lista antes de unirse.</p>
					<p><span className="tw-nivel explicito">Explícito</span> el tema puede aparecer descrito o mostrado en escena.</p>
					<p><span className="tw-nivel implicito">Implícito</span> el tema se insinúa, se menciona de pasada o ocurre fuera de escena, sin detalles.</p>
					<p className="tw-nota">Si un jugador tiene como línea o velo alguno de estos temas, recibirás un aviso cuando se una para que podáis hablarlo.</p>
				</div>

				<p className="tw-resumen">Explícitos: <strong>{totalExplicitos}</strong> · Implícitos: <strong>{totalImplicitos}</strong></p>

				<ul className="tw-lista">
					{TEMAS_SENSIBLES.map((tema) => {
						const nivelActual = seleccion[tema.id] ?? null;
						return (
							<li className={`tw-fila${nivelActual ? ` es-${nivelActual}` : ""}`} key={tema.id}>
								<span className="tw-nombre" id={`tw-tema-${tema.id}`}>{tema.etiqueta}</span>
								<div className="tw-selector" role="group" aria-labelledby={`tw-tema-${tema.id}`}>
									{OPCIONES.map((opcion) => (
										<button
											key={opcion.texto}
											type="button"
											className={`tw-opcion${opcion.nivel ? ` ${opcion.nivel}` : ""}${nivelActual === opcion.nivel ? " activo" : ""}`}
											aria-pressed={nivelActual === opcion.nivel}
											onClick={() => cambiarTema(tema.id, opcion.nivel)}
										>
											{opcion.texto}
										</button>
									))}
								</div>
							</li>
						);
					})}
				</ul>

				<label className="tw-otro">
					<span>Otro <small>(temas que no estén en la lista)</small></span>
					<textarea
						rows={3}
						maxLength={500}
						value={otro}
						onChange={(event) => setOtro(event.target.value)}
						placeholder="Ej. Muerte de personajes importantes, dilemas morales duros…"
					/>
				</label>

				<div className="tw-acciones">
					<button type="button" className="tw-cancelar" onClick={onClose}>Cancelar</button>
					<button type="button" className="tw-guardar" onClick={guardar}>Guardar avisos</button>
				</div>
			</section>
		</div>
	);
}
