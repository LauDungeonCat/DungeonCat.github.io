import "./WillOfForgeInicio.css";

export default function WillOfForgeInicio() {
  return (
    <div className="wotf-home">
      <section className="wotf-home-intro wotf-panel">
        <h1>Introducción</h1>
        <div className="wotf-prose">
          <p>En un mundo separado por enormes grietas, donde sangre y chispas se derraman.<br />
            Siempre hay un olor a metal nuevo, acompañado del ruido de forjas desgastadas.<br />
            Se preparan para otra batalla, aquellos que portan el Poder de la Forja:</p>

          <p>Un valeroso que convierte en arma su cuerpo, con los ojos chispeantes.<br />
            A quien el mundo le presta sus partes, maleándolas cual metal fundido.<br />
            Evocador de armas doradas, con el crujir de su martillo golpeando el aire.<br />
            La resonancia de un yunque que ordena qué hacer al campo de batalla.<br />
            Alguien que roba el poder de las armas para crear algo nunca antes visto.<br />
            Quien la naturaleza y sí están aleadas como si fueran parte de un todo.</p>

          <p>Su voluntad no está clara todavía, eso te toca descubrirlo a tí. ¿Ayudarás a la Fundición a purgar a la escoria? ¿Buscarás reforjar el mundo? Quizás solo quieres sobrevivir, como todos los demás. Sea como sea, te espera una gran aventura.</p>
        </div>

        <div className="wotf-feature-list">
          <p>Cada clase ofrece un estilo propio de juego con infinita personalización.</p>
          <p>Habiendo más de 300 armas mágicas cuyo poder se puede interpretar.</p>
          <p>Combates que juntan lo táctico y lo narrativo, premiando la creatividad.</p>
        </div>
      </section>

      <section className="wotf-home-context wotf-panel">
        <h2>Contexto</h2>
        <p>Wolcladen, un país dividido por la religión, la guerra y grietas gigantescas sin fondo.<br />
          La chispas mágicas fluyen a través de las armas, el llamado ᛤ Poder de la Forja.</p>
        <p>Todo gira alrededor de la cantidad inmensa de armas mágicas que se encuentran en el mismo. Estas simbolizan poder y riqueza en una sociedad donde la guerra se ha convertido en cotidiano, una cultura en la que el combate es educación primaria.</p>
        <blockquote>
          “Marteum forjó la realidad con su martillo divino, agrietando el mundo.<br />
          Su martillo se dividió en Las Seis Armas Legendarias, de inmenso poder.<br />
          Quien reúna las seis podrá reforjar el mundo”
        </blockquote>
      </section>

      <section className="wotf-home-about wotf-panel">
        <h2>Sobre esta web</h2>
        <p>Esta es una pre-alfa semi abierta. Puedes escribirme por Instagram o por Whatsapp si me tienes agregada para dar feedback o si encuentras algún error. Esta web de momento solo sirve para gestionar personajes.</p>
      </section>
    </div>
  );
}
