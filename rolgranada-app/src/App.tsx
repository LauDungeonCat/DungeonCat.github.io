import Header from "./components/Header";
import Footer from "./components/Footer";
import { lazy, Suspense, useState } from "react";
import { AuthProvider } from "./auth/AuthContext";
import Login from "./auth/Login";
import { useAuth } from "./auth/useAuth";
import type { Partida } from "./types";
import "./App.css";

const GeneradorEncuentros = lazy(() => import("./herramientas/generador_encuentros/GeneradorEncuentros"));
const Disponibilidad = lazy(() => import("./partidas/Disponibilidad"));
const MisPartidas = lazy(() => import("./partidas/MisPartidas"));
const BuscarPartidas = lazy(() => import("./partidas/BuscarPartidas"));

type Pagina =
  | "generador-encuentros"
  | "disponibilidad"
  | "mis-partidas"
  | "buscar-partidas"
  | "inicio"
  | "sample-text"
  | "contacto";

function AplicacionAutenticada() {
  const [pagina, setPagina] = useState<Pagina>(() =>
    new URLSearchParams(window.location.search).has("partida") ? "buscar-partidas" : "inicio"
  );
  const [abrirCreacionCampana, setAbrirCreacionCampana] = useState(false);
  const [partidaAEditar, setPartidaAEditar] = useState<Partida | null>(null);
  const { profile, signOut, requestLogin, updateProfile } = useAuth();

  function cambiarPagina(nombre: string) {
    if (nombre !== "buscar-partidas") {
      setAbrirCreacionCampana(false);
      setPartidaAEditar(null);
    }
    setPagina(nombre as Pagina);
  }

  function crearCampanaDesdeMisPartidas() {
    setPartidaAEditar(null);
    setAbrirCreacionCampana(true);
    setPagina("buscar-partidas");
  }

  function editarCampanaDesdeMisPartidas(partida: Partida) {
    setAbrirCreacionCampana(false);
    setPartidaAEditar(partida);
    setPagina("buscar-partidas");
  }

  function renderPagina() {
    switch (pagina) {
      case "generador-encuentros":
        return <GeneradorEncuentros />;
      case "disponibilidad":
        return <Disponibilidad />;
      case "mis-partidas":
        return <MisPartidas onCrearCampana={crearCampanaDesdeMisPartidas} onEditarCampana={editarCampanaDesdeMisPartidas} />;
      case "buscar-partidas":
        return <BuscarPartidas abrirCreacionInicial={abrirCreacionCampana} partidaInicialAEditar={partidaAEditar} />;
      case "sample-text":
        return <section className="pagina-placeholder"><h1 className="page-title">Sample Text</h1><p>Proyecto de ejemplo pendiente de desarrollar.</p></section>;
      case "contacto":
        return (
          <section className="contact-page" aria-labelledby="contact-title">
            <div className="contact-identity">
              <p className="contact-eyebrow">Contacto</p>
              <h1 id="contact-title">Dungeon Cat</h1>
              <p className="contact-name">Laura R.A</p>
              <p className="contact-role">TTRPG Designer <span>&amp; Web Developer</span></p>
            </div>
            <address className="contact-details">
              <a href="tel:+34652585634"><span>Teléfono y WhatsApp</span><strong>652 58 56 34</strong></a>
              <a href="https://dungeoncat.site" target="_blank" rel="noreferrer"><span>Web</span><strong>dungeoncat.site</strong></a>
              <a href="mailto:lau.ra.dungeoncat@gmail.com"><span>Correo</span><strong>lau.ra.dungeoncat@gmail.com</strong></a>
              <a href="https://www.instagram.com/dungeon_cat_" target="_blank" rel="noreferrer"><span>Instagram</span><strong>@dungeon_cat_</strong></a>
            </address>
          </section>
        );
      case "inicio":
      default:
        return <section className="pagina-placeholder"><h1 className="page-title">Inicio</h1><p>Bienvenido a Rol Granada. Explora campañas, organiza tus partidas y encuentra cuándo jugar.</p></section>;
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