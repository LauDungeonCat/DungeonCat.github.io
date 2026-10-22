import {useEffect, useState} from 'react';
import logoSvg from '../assets/logo.svg';
import './Footer.css';

export default function Footer() {
  const [listo, setListo] = useState(false);

  // Evita el flashazo inicial asegurando el renderizado limpio tras el montaje
  useEffect(() => {
    setListo(true);
  }, []);

  return (
    <footer className={`main-footer ${listo ? 'footer-visible' : 'footer-oculto'}`}>
      <div className="footer-content">
        <div className="footer-brand">
          <img src={logoSvg} alt="Logo Rol Granada" className="footer-logo-img" />
          <span className="footer-brand-text">Rol Granada</span>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <span className="footer-heading">Contacto y Redes</span>
            <a href="https://instagram.com/rol_granada" target="_blank" rel="noreferrer">
              Instagram: <strong>@rol_granada</strong>
            </a>
            <a href="https://chat.whatsapp.com/ED0bfq8fHqi2NyuscYE62v" target="_blank" rel="noreferrer">
              Comunidad de WhatsApp
            </a>
          </div>

          <div className="footer-column">
            <span className="footer-heading">Apoyo</span>
            <a href="https://ko-fi.com/lauradungeoncat" target="_blank" rel="noreferrer">
              ☕ Invítame a un café (Ko-fi)
            </a>
            <p className="footer-text" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              Apoya el proyecto y consigue un sombrerito o orejitas personalizadas para tu avatar escribiendo por WhatsApp.
            </p>
          </div>

          <div className="footer-column">
            <span className="footer-heading">Plataforma</span>
            <p className="footer-text">Organiza tus mesas, gestiona tus partidas y encuentra jugadores fácilmente en Granada.</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Rol Granada. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}