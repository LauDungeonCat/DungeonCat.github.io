import { useAuth } from "./useAuth";
import "./Login.css";

export default function Login() {
	const { error, loginRequested, dismissLogin, signInWithGoogle } = useAuth();
	if (!loginRequested) return null;

	return (
		<div className="auth-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissLogin(); }}>
			<section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
				<p className="seccion-etiqueta">Rol Granada</p>
				<button type="button" className="auth-close" aria-label="Cerrar inicio de sesión" onClick={dismissLogin}>×</button>
				<h1 id="auth-title">Inicia sesión para continuar</h1>
				<p>Necesitas una cuenta para guardar cambios y participar en partidas.</p>
				<button type="button" className="google-login-button" onClick={() => { void signInWithGoogle().catch(() => undefined); }}>
					<span className="google-mark" aria-hidden="true">G</span>
					Continuar con Google
				</button>
				{error && <p className="auth-error" role="alert">{error}</p>}
			</section>
		</div>
	);
}
