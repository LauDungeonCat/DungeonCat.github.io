import Header from "./components/Header";
import Footer from "./components/Footer";
import Contacto from "./contacto/Contacto"
import { lazy, Suspense, useState } from "react";
import { AuthProvider } from "./auth/AuthContext";
import Login from "./auth/Login";
import { useAuth } from "./auth/useAuth";
import {Inicio} from "./inicio/Inicio";
import Perfil from "./perfil/Perfil"; // <-- Añadido

import "./App.css";

const GeneradorEncuentros = lazy(() => import("./herramientas/generador_encuentros/GeneradorEncuentros"));
const WotfFicha = lazy(() => import("./herramientas/wotf_ficha/WotfFicha"));
const Disponibilidad = lazy(() => import("./partidas/Disponibilidad"));
const MisPartidas = lazy(() => import("./partidas/MisPartidas"));
const BuscarPartidas = lazy(() => import("./partidas/BuscarPartidas"));

export type Pagina =
  | "generador-encuentros"
  | "wotf-ficha"
  | "disponibilidad"
  | "mis-partidas"
  | "buscar-partidas"
  | "inicio"
  | "contacto"
  | "perfil"; 

function AplicacionAutenticada() {
  const [pagina, setPagina] = useState<Pagina>(() =>
    new URLSearchParams(window.location.search).has("partida") ? "buscar-partidas" : "inicio"
  );

  const { profile, signOut, requestLogin, updateProfile } = useAuth();

  function cambiarPagina(nombre: string) {
    setPagina(nombre as Pagina);
  }

  function renderPagina() {
    switch (pagina) {
      case "generador-encuentros":
        return <GeneradorEncuentros />;
      case "wotf-ficha":
        return <WotfFicha />;
      case "disponibilidad":
        return <Disponibilidad />;
      case "mis-partidas":
        return <MisPartidas />;
      case "buscar-partidas":
        return <BuscarPartidas />;
      case "contacto":
        return <Contacto />;
      case "perfil": 
        return <Perfil />;
      case "inicio":
      default:
        return <Inicio onNavigate={(nuevaPagina) => setPagina(nuevaPagina)} />;
    }
  }

  return (
    <>
      <Header profile={profile} onSignOut={signOut} requestLogin={requestLogin} updateProfile={updateProfile} onNavigate={cambiarPagina} />
      <main>
        <Suspense fallback={<section className="auth-state" role="status">Cargando sección…</section>}>
          {renderPagina()}
        </Suspense>
      </main>
      <Footer />
      <Login />
    </>
  );
}

export default function App() {
  return <AuthProvider><AplicacionAutenticada /></AuthProvider>;
}