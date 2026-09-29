import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ProfileRow } from "../lib/database.types";

export type AuthContextValue = {
	session: Session | null;
	profile: ProfileRow | null;
	loading: boolean;
	error: string | null;
	loginRequested: boolean;
	recoveryMode: boolean;
	requestLogin: () => void;
	dismissLogin: () => void;
	signInWithGoogle: () => Promise<void>;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signUpWithEmail: (email: string, password: string, username: string) => Promise<boolean>;
	sendPasswordReset: (email: string) => Promise<void>;
	updatePassword: (password: string) => Promise<void>;
	signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
