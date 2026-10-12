import whatsappQr from "../assets/whatsapp-qr.png";
import "./Contacto.css";

export default function Contacto() {
    return (
        <section className="contact-page" aria-labelledby="contact-title">
            {/* Columna Izquierda: Tu info arriba y el WhatsApp de comunidad debajo */}
            <div className="contact-left-column">
                <div className="contact-identity">
                    <p className="contact-eyebrow">Contacto</p>
                    <h1 id="contact-title">Dungeon Cat</h1>
                    <p className="contact-name">Laura R.A</p>
                    <p className="contact-role">TTRPG Designer <span>&amp; Web Developer</span></p>
                </div>

                <div className="contact-whatsapp-box">
                    <div className="whatsapp-box-header">
                        <h3>Comunidad de WhatsApp</h3>
                        <p>Este es el grupo de la comunidad donde hablamos y organizamos cosas, creamos grupos para partidas y demás.</p>
                    </div>
                    <a href="https://chat.whatsapp.com/ED0bfq8fHqi2NyuscYE62v" target="_blank" rel="noreferrer" className="whatsapp-box-link">
                        <img src={whatsappQr} alt="Código QR de la comunidad de WhatsApp" className="whatsapp-qr-img" />
                        <span className="whatsapp-link-text">Unirse a la comunidad</span>
                    </a>
                </div>
            </div>
            
            {/* Columna Derecha: Los enlaces de contacto */}
            <address className="contact-details">
                <a href="tel:+34652585634">
                    <span>Teléfono y WhatsApp</span>
                    <strong>652 58 56 34</strong>
                </a>
                <a href="https://dungeoncat.site" target="_blank" rel="noreferrer">
                    <span>Web</span>
                    <strong>dungeoncat.site</strong>
                </a>
                <a href="mailto:lau.ra.dungeoncat@gmail.com">
                    <span>Correo</span>
                    <strong>lau.ra.dungeoncat@gmail.com</strong>
                </a>
                <a href="https://www.instagram.com/rol_granada" target="_blank" rel="noreferrer">
                    <span>Instagram</span>
                    <strong>@rol_granada</strong>
                </a>
                <a href="https://dungeon-cat.itch.io" target="_blank" rel="noreferrer">
                    <span>Itch.io</span>
                    <strong>dungeon-cat.itch.io</strong>
                </a>
            </address>
        </section>
    );
}