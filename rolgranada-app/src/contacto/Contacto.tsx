import whatsappQr from "../assets/whatsapp-qr.png";
import instagramQr from "../assets/instagram-qr.png";
import "./Contacto.css";

export default function Contacto() {
  return (
    <div className="contact-container">
      <section className="contact-page" aria-labelledby="contact-title">
        {/* Columna Izquierda: Tu info arriba y el WhatsApp de comunidad debajo */}
        <div className="contact-left-column">
          <div className="contact-identity">
            <p className="contact-eyebrow">Contacto</p>
            <h1 id="contact-title">Dungeon Cat</h1>
            <p className="contact-name">Laura R.A</p>
            <p className="contact-role">
              TTRPG Designer <span>&amp; Web Developer</span>
            </p>
          </div>
        </div>

        {/* Columna Derecha: Los enlaces de contacto */}
        <address className="contact-details">
          <a href="https://dungeoncat.site" target="_blank" rel="noreferrer">
            <span>Web</span>
            <strong>dungeoncat.site</strong>
          </a>
          <a href="mailto:lau.ra.dungeoncat@gmail.com">
            <span>Correo</span>
            <strong>lau.ra.dungeoncat@gmail.com</strong>
          </a>
          <a
            href="https://dungeon-cat.itch.io"
            target="_blank"
            rel="noreferrer"
          >
            <span>Itch.io</span>
            <strong>dungeon-cat.itch.io</strong>
          </a>
        </address>
      </section>
      <section className="inicio-comunidad-section">
        <div className="comunidad-box-header">
          <h3>Nuestra Comunidad</h3>
        </div>

        <div className="comunidad-qrs-grid">
          <div className="comunidad-qr-card">
            <a
              href="https://chat.whatsapp.com/ED0bfq8fHqi2NyuscYE62v"
              target="_blank"
              rel="noreferrer"
              className="whatsapp-box-link"
            >
              <img
                src={whatsappQr}
                alt="Código QR de la comunidad de WhatsApp"
                className="whatsapp-qr-img"
              />
              <span className="whatsapp-link-text">Comunidad de WhatsApp</span>
            </a>
            <p className="comunidad-qr-desc">
              Este es el grupo de la comunidad donde hablamos, organizamos cosas
              y creamos grupos para partidas
            </p>
          </div>

          {/* Tarjeta Instagram */}
          <div className="comunidad-qr-card">
            <a
              href="https://instagram.com/rol_granada"
              target="_blank"
              rel="noreferrer"
              className="whatsapp-box-link"
            >
              <img
                src={instagramQr}
                alt="Código QR de Instagram"
                className="whatsapp-qr-img"
              />
              <span className="whatsapp-link-text">Instagram @rol_granada</span>
            </a>
            <p className="comunidad-qr-desc">
              Aquí anunciamos cosas, como quedadas mensuales, eventos y mucho
              más.
            </p>
          </div>
        </div>
      </section>
      </div>
  );
}
