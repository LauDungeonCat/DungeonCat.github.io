import { useState, type FormEvent } from "react";
import { useAuth } from "./useAuth";
import "./Login.css";

type ModoFormulario = "entrar" | "registro" | "recuperar";

export default function Login() {
	const {
		error,
		loginRequested,
		recoveryMode,
		dismissLogin,
		signInWithGoogle,
		signInWithEmail,
		signUpWithEmail,
		sendPasswordReset,
		updatePassword,
	} = useAuth();
	const [modo, setModo] = useState<ModoFormulario>("entrar");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirmation, setPasswordConfirmation] = useState("");
	const [aviso, setAviso] = useState<string | null>(null);
	const [enviando, setEnviando] = useState(false);
	if (!loginRequested) return null;

	async function enviarFormulario(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setAviso(null);
		if ((modo === "registro" || recoveryMode) && password !== passwordConfirmation) {
			setAviso("Las contraseñas no coinciden.");
			return;
		}
		setEnviando(true);
		try {
			if (recoveryMode) {
				await updatePassword(password);
				setAviso("Contraseña actualizada.");
			} else if (modo === "registro") {
				const necesitaConfirmacion = await signUpWithEmail(email, password, username);
				setAviso(necesitaConfirmacion ? "Cuenta creada. Revisa tu correo para confirmar la dirección y poder iniciar sesión." : "Cuenta creada.");
			} else if (modo === "recuperar") {
				await sendPasswordReset(email);
				setAviso("Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.");
			} else {
				await signInWithEmail(email, password);
			}
		} catch {
			return;
		} finally {
			setEnviando(false);
		}
	}

	return (
		<div className="auth-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissLogin(); }}>
			<section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
				<p className="seccion-etiqueta">Rol Granada</p>
				<button type="button" className="auth-close" aria-label="Cerrar inicio de sesión" onClick={dismissLogin}>×</button>
				<h1 id="auth-title">{recoveryMode ? "Nueva contraseña" : modo === "registro" ? "Crear cuenta" : modo === "recuperar" ? "Restablecer contraseña" : "Inicia sesión"}</h1>
				<p>{recoveryMode ? "Elige una nueva contraseña para tu cuenta." : "Accede para guardar tu disponibilidad y gestionar tus partidas."}</p>
				{!recoveryMode && <div className="auth-modes" aria-label="Método de acceso">
					<button type="button" aria-pressed={modo === "entrar"} onClick={() => { setModo("entrar"); setAviso(null); }}>Entrar</button>
					<button type="button" aria-pressed={modo === "registro"} onClick={() => { setModo("registro"); setAviso(null); }}>Crear cuenta</button>
				</div>}
				{!recoveryMode && modo !== "recuperar" && <button type="button" className="google-login-button" onClick={() => { void signInWithGoogle().catch(() => undefined); }}>
					<span className="google-mark" aria-hidden="true">G</span>
					Continuar con Google
				</button>}
				{!recoveryMode && modo !== "recuperar" && <div className="auth-divider"><span>o con correo</span></div>}
				<form className="auth-form" onSubmit={(event) => { void enviarFormulario(event); }}>
					{modo === "registro" && !recoveryMode && <label>Nombre de usuario<input required minLength={3} maxLength={40} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>}
					{!recoveryMode && <label>Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
					{modo !== "recuperar" || recoveryMode ? <label>Contraseña<input required minLength={8} type="password" autoComplete={recoveryMode ? "new-password" : modo === "registro" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label> : null}
					{(modo === "registro" || recoveryMode) && <label>Repite la contraseña<input required minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>}
					{modo === "entrar" && !recoveryMode && <button className="auth-text-action" type="button" onClick={() => { setModo("recuperar"); setAviso(null); }}>He olvidado mi contraseña</button>}
					<button className="auth-submit" type="submit" disabled={enviando}>{enviando ? "Procesando…" : recoveryMode ? "Guardar contraseña" : modo === "registro" ? "Crear cuenta" : modo === "recuperar" ? "Enviar enlace" : "Entrar con correo"}</button>
				</form>
				{modo === "recuperar" && !recoveryMode && <button className="auth-text-action" type="button" onClick={() => { setModo("entrar"); setAviso(null); }}>Volver a iniciar sesión</button>}
				{error && <p className="auth-error" role="alert">{error}</p>}
				{aviso && <p className="auth-notice" role="status">{aviso}</p>}
			</section>
		</div>
	);
}
