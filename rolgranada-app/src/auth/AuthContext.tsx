import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { supabase } from "../lib/supabase";

function mensajeError(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
	return "Ha ocurrido un error de autenticación.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<AuthContextValue["profile"]>(null);
	const [authLoading, setAuthLoading] = useState(true);
	const [profileUserId, setProfileUserId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loginRequested, setLoginRequested] = useState(false);
	const [recoveryMode, setRecoveryMode] = useState(false);

	useEffect(() => {
		let activo = true;
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
			if (!activo) return;
			setSession(nextSession);
			if (!nextSession) {
				setProfile(null);
				setProfileUserId(null);
			} else if (event === "PASSWORD_RECOVERY") {
				setRecoveryMode(true);
				setLoginRequested(true);
			} else {
				setLoginRequested(false);
			}
			setAuthLoading(false);
		});

		void supabase.auth.getSession().then(({ data, error: sessionError }) => {
			if (!activo) return;
			if (sessionError) setError(mensajeError(sessionError));
			setSession(data.session);
			setAuthLoading(false);
		});

		return () => {
			activo = false;
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		let activo = true;
		if (!session?.user.id) return () => { activo = false; };
		const userId = session.user.id;
		void supabase
			.from("profiles")
			.select("id, username, avatar_url, role, created_at")
			.eq("id", userId)
			.single()
			.then(({ data, error: profileError }) => {
				if (!activo) return;
				setProfileUserId(userId);
				if (profileError) {
					setProfile(null);
					setError(profileError.message);
				} else {
					setProfile(data);
					setError(null);
				}
			});

		return () => { activo = false; };
	}, [session?.user.id]);

	async function signInWithGoogle() {
		setError(null);
		const { error: signInError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
		});
		if (signInError) {
			setError(mensajeError(signInError));
			throw signInError;
		}
	}

	async function signInWithEmail(email: string, password: string) {
		setError(null);
		const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
		if (signInError) {
			setError(mensajeError(signInError));
			throw signInError;
		}
		setLoginRequested(false);
	}

	async function signUpWithEmail(email: string, password: string, username: string) {
		setError(null);
		const { data, error: signUpError } = await supabase.auth.signUp({
			email: email.trim(),
			password,
			options: {
				data: { username: username.trim(), full_name: username.trim() },
				emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
			},
		});
		if (signUpError) {
			setError(mensajeError(signUpError));
			throw signUpError;
		}
		if (data.session) setLoginRequested(false);
		return !data.session;
	}

	async function sendPasswordReset(email: string) {
		setError(null);
		const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
			redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
		});
		if (resetError) {
			setError(mensajeError(resetError));
			throw resetError;
		}
	}

	async function updatePassword(password: string) {
		setError(null);
		const { error: updateError } = await supabase.auth.updateUser({ password });
		if (updateError) {
			setError(mensajeError(updateError));
			throw updateError;
		}
		setRecoveryMode(false);
		setLoginRequested(false);
	}

	async function signOut() {
		setError(null);
		const { error: signOutError } = await supabase.auth.signOut();
		if (signOutError) {
			setError(mensajeError(signOutError));
			throw signOutError;
		}
	}

	function requestLogin() {
		setError(null);
		setLoginRequested(true);
	}

	return (
		<AuthContext.Provider value={{
			session,
			profile,
			loading: authLoading || Boolean(session?.user.id && profileUserId !== session.user.id),
			error,
			loginRequested,
			recoveryMode,
			requestLogin,
			dismissLogin: () => setLoginRequested(false),
			signInWithGoogle,
			signInWithEmail,
			signUpWithEmail,
			sendPasswordReset,
			updatePassword,
			signOut,
		}}>
			{children}
		</AuthContext.Provider>
	);
}
