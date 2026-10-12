import "./Contacto.css";

export default function Contacto() {
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
              <a href="https://dungeon-cat.itch.io" target="_blank" rel="noreferrer"><span>Itch.io</span><strong>dungeon-cat.itch.io</strong></a>
            </address>
          </section>
        );
    }