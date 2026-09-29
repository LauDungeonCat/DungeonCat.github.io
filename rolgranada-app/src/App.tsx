import Header from "./components/Header";
import Footer from "./components/Footer";
import { lazy, Suspense, useState } from "react";
import { AuthProvider } from "./auth/AuthContext";
import Login from "./auth/Login";
import { useAuth } from "./auth/useAuth";
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
  // ✅ Inicializamos con "inicio" si no hay parámetros en la URL
  const [pagina, setPagina] = useState<Pagina>(() =>
    new URLSearchParams(window.location.search).has("partida") ? "buscar-partidas" : "inicio"
  );
  const { profile, signOut, requestLogin } = useAuth();

  function cambiarPagina(nombre: string) {
    setPagina(nombre as Pagina);
  }

  function renderPagina() {
    switch (pagina) {
      case "generador-encuentros":
        return <GeneradorEncuentros />;
      case "disponibilidad":
        return <Disponibilidad />;
      case "mis-partidas":
        return <MisPartidas />;
      case "buscar-partidas":
        return <BuscarPartidas />;
      case "sample-text":
        return <section className="pagina-placeholder"><h1 className="page-title">Sample Text</h1><p>Proyecto de ejemplo pendiente de desarrollar.</p></section>;
      case "contacto":
        return <section className="pagina-placeholder"><h1 className="page-title">Contacto</h1><p>Sección de contacto pendiente de desarrollar.</p></section>;
      case "inicio":
      default:
        // ✅ Por defecto muestra Inicio
        return <section className="pagina-placeholder"><h1 className="page-title">Inicio</h1><p>Bienvenido a Rol Granada. Explora campañas, organiza tus partidas y encuentra cuándo jugar.</p></section>;
    }
  }

  return (
    <>
      <Header profile={profile} onSignOut={signOut} requestLogin={requestLogin} onNavigate={cambiarPagina} />
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