import Header from "./components/Header";
import Footer from "./components/Footer";
import Contacto from "./contacto/Contacto";
import { lazy, Suspense, useState, useEffect } from "react";
import { AuthProvider } from "./auth/AuthContext";
import Login from "./auth/Login";
import { useAuth } from "./auth/useAuth";
import { Inicio } from "./inicio/Inicio";
import Perfil from "./perfil/Perfil";
import WillOfForgeInicio from "./herramientas/wotf_ficha/WillOfForgeInicio";
import WotfPersonajes from "./herramientas/wotf_ficha/WotfPersonajes";

import "./App.css";
import { supabase } from "./lib/supabase";

const GeneradorEncuentros = lazy(() => import("./herramientas/generador_encuentros/GeneradorEncuentros"));
const Disponibilidad = lazy(() => import("./partidas/Disponibilidad"));
const MisPartidas = lazy(() => import("./partidas/MisPartidas"));
const BuscarPartidas = lazy(() => import("./partidas/BuscarPartidas"));

export type Pagina =
  | "generador-encuentros"
  | "wotf-inicio"
  | "wotf-ficha"
  | "disponibilidad"
  | "mis-partidas"
  | "buscar-partidas"
  | "inicio"
  | "contacto"
  | "perfil"; 

const paginas: Pagina[] = [
  "generador-encuentros",
  "wotf-inicio",
  "wotf-ficha",
  "disponibilidad",
  "mis-partidas",
  "buscar-partidas",
  "inicio",
  "contacto",
  "perfil",
];

function esPagina(valor: string): valor is Pagina {
  return paginas.includes(valor as Pagina);
}

function obtenerPaginaActual(): Pagina {
  const paginaHash = window.location.hash.slice(1).replace(/^\/+/, "").split("?")[0];
  if (esPagina(paginaHash)) return paginaHash;
  if (new URLSearchParams(window.location.search).has("partida")) return "buscar-partidas";
  return "inicio";
}

function AplicacionAutenticada() {
  const [pagina, setPagina] = useState<Pagina>(obtenerPaginaActual);

  const { profile, signOut, requestLogin, updateProfile } = useAuth();

  useEffect(() => {
    const sincronizarPagina = () => setPagina(obtenerPaginaActual());
    window.addEventListener("hashchange", sincronizarPagina);
    return () => window.removeEventListener("hashchange", sincronizarPagina);
  }, []);

  // Detección automática del tema del sistema y soporte para localStorage
  useEffect(() => {
    const guardadoOscuro = localStorage.getItem('darkMode');
    
    if (guardadoOscuro !== null) {
      if (guardadoOscuro === 'true') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    } else {
      const prefiereOscuroSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefiereOscuroSistema) {
        document.body.classList.add('dark-mode');
      }
    }

    // Listener ligero para cambios en tiempo real del sistema operativo
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('darkMode') === null) {
        if (e.matches) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  function cambiarPagina(nombre: string) {
    if (!esPagina(nombre)) return;
    setPagina(nombre);
    const hash = `#/${nombre}`;
    if (window.location.hash !== hash) window.location.hash = hash;
  }

  function renderPagina() {
    switch (pagina) {
      case "generador-encuentros":
        return <GeneradorEncuentros />;
      case "wotf-inicio":
        return <WillOfForgeInicio />;
      case "wotf-ficha":
        return <WotfPersonajes supabase={supabase} />;
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

  const esWillOfTheForge = pagina === "wotf-inicio" || pagina === "wotf-ficha";

  return (
    <div className={`app-layout${esWillOfTheForge ? " wotf-site" : ""}`}>
      <Header profile={profile} onSignOut={signOut} requestLogin={requestLogin} updateProfile={updateProfile} onNavigate={cambiarPagina} wotfMode={esWillOfTheForge} />
      <main>
        <Suspense fallback={<section className="auth-state" role="status">Cargando sección…</section>}>
          {renderPagina()}
        </Suspense>
      </main>
      {esWillOfTheForge ? (
        <footer className="wotf-site-footer">Will of the Forge · Pre-alfa semi abierta</footer>
      ) : <Footer />}
      <Login />
    </div>
  );
}

export default function App() {
  return <AuthProvider><AplicacionAutenticada /></AuthProvider>;
}