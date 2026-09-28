import GeneradorEncuentros from "./herramientas/generador_encuentros/GeneradorEncuentros";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Disponibilidad from "./partidas/Disponibilidad";
import MisPartidas from "./partidas/MisPartidas";
import BuscarPartidas from "./partidas/BuscarPartidas";
import { useState } from "react";

type Pagina =
  | "generador-encuentros"
  | "disponibilidad"
  | "mis-partidas"
  | "buscar-partidas"
  | "inicio"
  | "sample-text"
  | "contacto";

export default function App() {
  const [pagina, setPagina] = useState<Pagina>("generador-encuentros");

  function cambiarPagina(nombre: string) {
    setPagina(nombre as Pagina);
  }

  function renderPagina() {
    switch (pagina) {
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
      case "generador-encuentros":
      default:
        return <GeneradorEncuentros />;
    }
  }

  return (
    <>
      <Header onNavigate={cambiarPagina} />
      <main>
        {renderPagina()}
      </main>
      <Footer />
    </>
  );
}