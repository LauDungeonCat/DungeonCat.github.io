// database.ts

export const ARQUETIPOS = [
  // Jerarquía
  { nombre: "Líder", descripcion: "Comprometido; protege la misión y a su grupo, incluso a riesgo personal." },
  { nombre: "Veterano", descripcion: "Cansado, cínico pero sabio; actúa por deber, no por ilusión." },
  { nombre: "Novato", descripcion: "No sabe muy bien cómo posicionarse; aprende sobre la marcha." },
  { nombre: "Protector", descripcion: "Lucha por una persona concreta, no por una causa." },
  { nombre: "Ejecutor", descripcion: "Cumple órdenes sin cuestionarlas; la moral no es su problema." },
  { nombre: "Campeón", descripcion: "Representa el honor o la fuerza de su grupo; pelea para demostrar superioridad." },
  // Lealtad
  { nombre: "Traidor", descripcion: "Dispuesto a cambiar de bando por miedo u oportunidad." },
  { nombre: "Oportunista", descripcion: "Se adapta al viento que sople; la lealtad es flexible." },
  { nombre: "Rebelde", descripcion: "Se opone al sistema por convicción o rabia." },
  { nombre: "Leal", descripcion: "Cree en la cadena de mando y en la causa, incluso cuando no tiene sentido." },
  // Emoción
  { nombre: "Cobarde", descripcion: "Busca sobrevivir; podría redimirse si se siente acorralado." },
  { nombre: "Desesperado", descripcion: "No tiene nada que perder; su violencia nace del dolor." },
  { nombre: "Ambicioso", descripcion: "Quiere destacar o ascender; el conflicto es su escenario." },
  { nombre: "Inocente", descripcion: "No comprende del todo el conflicto, pero está atrapado en él." },
  { nombre: "Devoto", descripcion: "Cree en algo más grande; su fe lo ciega o lo inspira." },
  { nombre: "Vengativo", descripcion: "Lucha movido por una pérdida concreta que exige justicia." },
  // Mentalidad
  { nombre: "Pragmático", descripcion: "Calcula todo; valora los resultados por encima de los ideales." },
  { nombre: "Manipulador", descripcion: "Usa miedos y emociones ajenas para controlar." },
  { nombre: "Observador", descripcion: "Prefiere mirar y analizar antes de intervenir." },
  { nombre: "Visionario", descripcion: "Ve un futuro distinto y actúa para alcanzarlo, cueste lo que cueste." },
  { nombre: "Calculador", descripcion: "Siempre tiene un plan de contingencia; la batalla es un tablero." },
  // Extremos
  { nombre: "Fanático", descripcion: "Extremista; ve el mundo en blanco y negro." },
  { nombre: "Sádico", descripcion: "Disfruta del sufrimiento ajeno; ve el dolor como arte o justicia." },
  { nombre: "Cínico", descripcion: "No cree en causas ni héroes; solo en intereses." },
  { nombre: "Trágico", descripcion: "Sabe que su causa está perdida, pero lucha igualmente." },
  { nombre: "Apocalíptico", descripcion: "Cree que el mundo debe arder para poder renacer." },
  // Trasfondo
  { nombre: "Redimido", descripcion: "Carga con un pasado oscuro y busca compensarlo." },
  { nombre: "Caído", descripcion: "Antes fue noble; ahora es una sombra de lo que fue." },
  { nombre: "Mártir", descripcion: "Acepta el sacrificio como inevitable o necesario." },
  { nombre: "Huérfano", descripcion: "El conflicto le arrebató todo; busca pertenencia." },
  { nombre: "Sobreviviente", descripcion: "Ha resistido demasiado; vivir ya es una victoria." },
  { nombre: "Exiliado", descripcion: "Fue expulsado de su hogar o cultura; pelea para recuperar un lugar." }
];

export const TERRENOS = [
  { nombre: "Altura dominante (balcón, torre, cornisa)", efecto: "Ventaja para disparos o vigilancia" },
  { nombre: "Cobertura natural (rocas, pilares, árboles)", efecto: "Protege de ataques a distancia" },
  { nombre: "Sombras profundas", efecto: "Ocultamiento parcial, ideal para emboscadas" },
  { nombre: "Escaleras estrechas o rampas", efecto: "Controlan el flujo de enemigos" },
  { nombre: "Puentes frágiles", efecto: "Riesgo de colapso si se usan mal" },
  { nombre: "Terreno resbaladizo (hielo, barro, aceite)", efecto: "Puede hacer caer a personajes" },
  { nombre: "Corriente de agua rápida", efecto: "Dificulta movimiento y arrastra objetos ligeros" },
  { nombre: "Zona elevada / acantilado", efecto: "Permite observar o atacar desde arriba" },
  { nombre: "Columnas o paredes frágiles", efecto: "Pueden derrumbarse si se golpean" },
  { nombre: "Ventanas o huecos hacia el vacío", efecto: "Riesgo de caída o maniobra táctica" },
  { nombre: "Trampas antiguas / huecos ocultos", efecto: "Requiere cuidado o detección" },
  { nombre: "Puertas bloqueadas o atascadas", efecto: "Controlan rutas de paso" },
  { nombre: "Cuerpos o escombros grandes", efecto: "Obstaculizan movimiento o crean cobertura" },
  { nombre: "Pasadizos o túneles ocultos", efecto: "Permite flanquear o escapar" },
  { nombre: "Sombras o humo ambiental", efecto: "Reduce visibilidad, útil para emboscadas" },
  { nombre: "Corrientes de aire fuertes", efecto: "Afectan proyectiles o vuelo de criaturas" },
  { nombre: "Plataformas estrechas", efecto: "Riesgo de caída, controlan posición" },
  { nombre: "Zona de terreno blando (arena, barro profundo)", efecto: "Movimiento lento y difícil" },
  { nombre: "Terreno quebradizo / grietas", efecto: "Riesgo de colapso bajo peso" },
  { nombre: "Estructuras altas y débiles", efecto: "Pueden derrumbarse si se dañan" },
  { nombre: "Cavidades o pozos", efecto: "Pueden ser trampas naturales o escondites" },
  { nombre: "Área de terreno irregular", efecto: "Movimiento lento, línea de visión limitada" },
  { nombre: "Áreas con magnetismo o gravedad extraña", efecto: "Obstaculiza o altera saltos/proyectiles" },
  { nombre: "Reflejos o espejos naturales", efecto: "Posibilidad de deslumbrar o confundir" },
  { nombre: "Terreno con ecos o sonido amplificado", efecto: "Alertas a enemigos o crea confusión" },
  { nombre: "Vegetación densa o líquenes", efecto: "Oculta movimientos y dificulta el combate" },
  { nombre: "Niebla, polvo o humo ambiental", efecto: "Reduce visibilidad y percepción" },
  { nombre: "Superficie irregular o fragmentada", efecto: "Riesgo de tropiezos o caídas" },
  { nombre: "Acantilados, salientes o cornices", efecto: "Permite ataques sorpresa desde altura" },
  { nombre: "Área con calor intenso o frío extremo", efecto: "Causa daño gradual o penaliza acciones" },
  { nombre: "Zonas de terreno inestable", efecto: "Requiere cuidado al moverse, puede derrumbarse" },
  { nombre: "Corrientes subterráneas / túneles inundados", efecto: "Movimiento restringido o peligroso" },
  { nombre: "Terreno fangoso o lodoso", efecto: "Reduce velocidad y movilidad" },
  { nombre: "Zonas de sombra mágica o ilusión", efecto: "Confunde percepción o ataques" },
  { nombre: "Pasillos estrechos o callejones", efecto: "Limita movimiento de grupos grandes" },
  { nombre: "Elementos arquitectónicos peligrosos (pilares, vigas)", efecto: "Pueden derrumbarse y causar daño" }
];

export const OBJETOS = [
  { nombre: "Antorchas", uso: "Iluminar zonas oscuras o prender fuego" },
  { nombre: "Cuerdas", uso: "Escalar, atar enemigos o rescatar aliados" },
  { nombre: "Armas improvisadas (palos, piedras, sillas)", uso: "Ataque básico o aturdir" },
  { nombre: "Pociones curativas", uso: "Recuperar salud o resistencia" },
  { nombre: "Barriles explosivos", uso: "Causar daño masivo si se disparan" },
  { nombre: "Cristales mágicos inestables", uso: "Pueden potenciar magia o estallar" },
  { nombre: "Runas o pergaminos activables", uso: "Magia rápida, trampas o efectos elementales" },
  { nombre: "Plataforma elevadora / polea", uso: "Moverse verticalmente o crear ventaja" },
  { nombre: "Carros o plataformas móviles", uso: "Cobertura móvil o empujar al enemigo" },
  { nombre: "Redes o cuerdas colgantes", uso: "Atrapar o ralentizar" },
  { nombre: "Catapulta o mecanismo grande", uso: "Disparar proyectiles pesados o causar caos" },
  { nombre: "Palancas / botones", uso: "Activar trampas o modificar el terreno" },
  { nombre: "Armaduras o escudos sueltos", uso: "Cobertura temporal o mejorar defensa" },
  { nombre: "Munición / proyectiles", uso: "Flechas, piedras o bolas de cañón" },
  { nombre: "Antídotos o pociones de resistencia", uso: "Contrarrestar veneno o efectos mágicos" },
  { nombre: "Llaves o herramientas", uso: "Abrir puertas, cofres o mecanismos" },
  { nombre: "Barriles de agua / aceite", uso: "Crear zonas resbaladizas o incendiar" },
  { nombre: "Telas, mantas o telones", uso: "Ocultarse o atrapar enemigos" },
  { nombre: "Carrozas abandonadas", uso: "Cobertura o movimiento táctico" },
  { nombre: "Cuerpos o cadáveres", uso: "Bloquear pasos, crear trampas improvisadas" },
  { nombre: "Antorchas mágicas", uso: "Luz intensa o efecto elemental" },
  { nombre: "Pociones de invisibilidad o velocidad", uso: "Maniobra táctica" },
  { nombre: "Cajas o cofres con suministros", uso: "Contienen armas, munición o recursos" },
  { nombre: "Espejos o cristales reflectantes", uso: "Deslumbrar o redirigir magia" },
  { nombre: "Redes portátiles / trampas improvisadas", uso: "Detener enemigos o bestias" },
  { nombre: "Tizas o runas pintadas", uso: "Activar efectos temporales" },
  { nombre: "Carro de combate pequeño", uso: "Protección y movilidad" },
  { nombre: "Piedras o fragmentos pesados", uso: "Lanzar o bloquear caminos" },
  { nombre: "Bengalas o señales", uso: "Avisar aliados o distraer enemigos" },
  { nombre: "Cajas con bombas pequeñas", uso: "Daño localizado" },
  { nombre: "Pergaminos de barrera mágica", uso: "Crear cobertura temporal" },
  { nombre: "Viales de alquimia", uso: "Ácido, fuego o humo" },
  { nombre: "Arena o terreno suelto", uso: "Crear zonas resbaladizas o cegar enemigos" },
  { nombre: "Puertas / tablones sueltos", uso: "Bloquear o improvisar barricadas" },
  { nombre: "Pociones de maná", uso: "Para que los casters sean felices" },
  { nombre: "Arma mágica", uso: "Usar o descartar" }
];

export const DINAMICAS = [
  { p: "Un fuego comienza", e1: "El humo reduce visibilidad", e2: "Parte del lugar colapsa", c: "Documentos, reliquias o prisioneros pueden quemarse si no se salvan" },
  { p: "Gas o veneno se libera", e1: "La zona empieza a intoxicar", e2: "El gas se expande por el área", c: "Un enemigo atrapado podría morir… o revelar información si se rescata" },
  { p: "La estructura se vuelve inestable", e1: "Caen escombros", e2: "Colapso bloquea rutas", c: "Un personaje o enemigo clave puede quedar atrapado" },
  { p: "Agua entra en la zona", e1: "Movimiento difícil", e2: "Corriente fuerte", c: "Algo importante puede ser arrastrado por el agua" },
  { p: "Un ritual oscuro empieza", e1: "Energía mágica se intensifica", e2: "El ritual casi se completa", c: "Interrumpirlo puede sacrificar al objetivo del ritual" },
  { p: "Una criatura está despertando", e1: "Empieza a liberarse", e2: "Entra en combate", c: "Matarla rápido puede destruir el lugar o herir inocentes" },
  { p: "Una máquina peligrosa se activa", e1: "Empieza a atacar", e2: "Se vuelve inestable", c: "Destruirla puede provocar una explosión" },
  { p: "Tormenta violenta", e1: "Visibilidad reducida", e2: "Rayos o viento extremo", c: "Un aliado aislado queda expuesto al clima" },
  { p: "El enemigo intenta huir", e1: "Derriba obstáculos", e2: "Está a punto de escapar", c: "Escapar puede permitirle llevar información o rehenes" },
  { p: "Rehenes en peligro", e1: "Son movidos o usados como escudo", e2: "Un rehén está al borde de morir", c: "Atacar al enemigo puede poner al rehén en riesgo" },
  { p: "Una grieta mágica aparece", e1: "Energía extraña emerge", e2: "Criaturas o magia salen", c: "Cerrarla podría atrapar a alguien dentro" },
  { p: "El suelo se vuelve frágil", e1: "Se rompen zonas pequeñas", e2: "Grandes partes colapsan", c: "Un enemigo o aliado puede caer a una zona peligrosa" },
  { p: "Una alarma se activa", e1: "Llegan refuerzos menores", e2: "Llegan refuerzos fuertes", c: "Huir ahora evita refuerzos pero abandona el objetivo" },
  { p: "Criaturas menores aparecen", e1: "Llegan más", e2: "Se forma una horda", c: "Ignorarlas permite centrarse en el jefe pero pone en riesgo a otros" },
  { p: "Explosivos armados", e1: "Algunos empiezan a detonar", e2: "Gran explosión", c: "Desactivarlos consume tiempo mientras el enemigo actúa" },
  { p: "Oscuridad sobrenatural", e1: "Visión casi nula", e2: "Sombras atacan", c: "Un inocente puede ser confundido con enemigo" },
  { p: "Objeto importante cae", e1: "Todos intentan recuperarlo", e2: "Puede romperse o perderse", c: "Protegerlo implica dejar al enemigo actuar" },
  { p: "Un aliado queda atrapado", e1: "Empieza a agotarse", e2: "Puede morir", c: "Liberarlo implica exponerse a los enemigos" },
  { p: "Criatura salvaje entra", e1: "Ataca a cualquiera", e2: "Se vuelve incontrolable", c: "Matarla puede enfurecer a su manada o dueño" },
  { p: "El terreno empieza a arder", e1: "Zonas peligrosas", e2: "Gran parte daña", c: "Algo valioso queda atrapado en el fuego" },
  { p: "Una pared se rompe", e1: "Se abre nueva zona", e2: "Algo peligroso entra", c: "Puede ser una vía de escape… o de invasión" },
  { p: "Magia inestable", e1: "Hechizos impredecibles", e2: "Estallido mágico", c: "Usar magia puede empeorar el caos" },
  { p: "Un enemigo entra en pánico", e1: "Actúa de forma desesperada", e2: "Provoca un desastre", c: "Puede herir a inocentes si se le presiona" },
  { p: "Un plan oculto del enemigo", e1: "Activa ventaja táctica", e2: "El plan entra en fase final", c: "Detenerlo implica ignorar otros peligros" },
  { p: "Civil en la zona", e1: "Se vuelve objetivo accidental", e2: "Peligro inmediato", c: "Salvarlo puede dejar escapar al enemigo" },
  { p: "Puente o plataforma tiembla", e1: "Partes se rompen", e2: "Puede caer", c: "Combatir sobre él arriesga la caída de todos" },
  { p: "Algo valioso se rompe", e1: "Se deteriora más", e2: "Puede destruirse", c: "Recuperarlo implica dejar el combate" },
  { p: "Magia poderosa usada", e1: "Afecta el terreno", e2: "Efecto masivo", c: "Detener al mago puede provocar explosión mágica" },
  { p: "Animales o monturas se asustan", e1: "Corren descontrolados", e2: "Estampida", c: "Detenerlas puede salvar a civiles" },
  { p: "Puerta clave se bloquea", e1: "Escape limitado", e2: "Quedan atrapados", c: "Romperla puede atraer enemigos" },
  { p: "Señales de refuerzos", e1: "Se acercan", e2: "Llegan al combate", c: "Acabar rápido o retirarse" },
  { p: "Silencio sobrenatural", e1: "Ecos confunden", e2: "Emboscadas posibles", c: "Los enemigos pueden ocultarse entre aliados" },
  { p: "Objeto mágico pierde control", e1: "Efectos aleatorios", e2: "Explosión o portal", c: "Destruirlo podría empeorar la situación" },
  { p: "El enemigo roba algo", e1: "Intenta retirarse", e2: "Puede escapar", c: "Perseguirlo deja el combate atrás" },
  { p: "Algo grande se acerca", e1: "Temblores o pasos", e2: "La criatura llega", c: "Huir ahora o enfrentar algo peor" },
  { p: "Autodestrucción / Colapso", e1: "El escenario se vuelve inhabitable", e2: "El lugar desaparece (implosión)", c: "¿Saltas a ciegas hacia una salida incierta o intentas una última acción heroica?" }
];

export const COMPOSICIONES = [
  {
    nombre: "Escaramuza",
    descripcion: "Pelea simple y equilibrada. Es fiable y funcional, como encontrar guardias en una habitación.",
    distribucion: "Dificultad distribuida equitativamente entre enemigos de nivel medio o un grupo mixto estándar.",
    notas: "Cuidado con abusar de este; añade un objetivo secundario (como evitar que suenen una alarma) para que no se vuelva largo y aburrido."
  },
  {
    nombre: "Emboscada",
    descripcion: "Los enemigos atacan primero. Genera tensión inmediata e incertidumbre.",
    distribucion: "Dificultad invertida en enemigos con alto daño inicial o gran movilidad, apoyados por el terreno.",
    notas: "Asigna un arquetipo al líder de la emboscada. La amenaza debe cambiar constantemente para mantener la confusión."
  },
  {
    nombre: "Ataque Dirigido",
    descripcion: "Los jugadores planean y ejecutan un ataque preventivo. Recompensa la preparación.",
    distribucion: "Enemigos de alta dificultad, estacionarios o en patrullas. Un combate que frontalmente sería letal.",
    notas: "Haz que los enemigos tengan rutinas. Si los jugadores ejecutan bien su plan, el combate difícil se sentirá muy satisfactorio."
  },
  {
    nombre: "Horda de Enemigos",
    descripcion: "Batallas a gran escala contra muchos enemigos débiles. Pone a prueba la resistencia del grupo.",
    distribucion: "La dificultad se reparte entre muchos enemigos de bajo nivel, con algunos de nivel medio para variar.",
    notas: "El foco no es la dificultad individual, sino desgastar los recursos (hechizos, vida). El arquetipo define el 'ánimo' de toda la horda."
  },
  {
    nombre: "Equipo de Élite",
    descripcion: "Un pequeño grupo de enemigos poderosos con habilidades distintas (como un grupo aventurero rival).",
    distribucion: "Dificultad dividida equitativamente entre 3-4 enemigos de alto nivel que se complementan.",
    notas: "Funciona como un mini-jefe táctico. Dales sinergias claras (ej. uno tanquea, otro cura, otro ataca de lejos) y arquetipos muy marcados."
  },
  {
    nombre: "Zona de Dominio",
    descripcion: "Diseñado para mostrar a los jugadores dominando enemigos inferiores para reforzar su progresión.",
    distribucion: "Dificultad intencionadamente baja frente al nivel de los jugadores. Enemigos simples y directos.",
    notas: "Haz que los enemigos huyan, supliquen o mueran de un golpe. Sirve para que los PJs sientan lo mucho que han crecido."
  },
  {
    nombre: "Batalla contra Jefe",
    descripcion: "El clímax de la aventura. Alto riesgo, habilidades legendarias y posible muerte de personajes.",
    distribucion: "Toda la dificultad concentrada en 1 jefe principal y quizás 2-3 esbirros menores.",
    notas: "Combina dos arquetipos en el jefe para darle profundidad psicológica. Debe tener múltiples fases o cambios de comportamiento."
  },
  {
    nombre: "Combate tipo Puzzle",
    descripcion: "No se trata de hacer daño, sino de descubrir cómo ganar usando el entorno o la lógica.",
    distribucion: "Ejemplo: Enemigos inmortales o que reaparecen infinitamente hasta resolver el puzzle.",
    notas: "El objetivo táctico (cerrar el portal, activar las runas, mover los pilares) importa más que el combate en sí."
  }
];