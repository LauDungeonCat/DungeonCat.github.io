const T = {
  es: {
    coverSub: "TTRPG + WEB", tap: "toca para abrir\no agarra y desliza",
    tHome: "Inicio", tProj: "Proyectos", tGames: "Juegos", tAbout: "Sobre mí", tContact: "Contacto", tSkills: "Habilidades",
    by: "por",
    lead: "Diseño juegos de rol y desarrollo webs que los acompañan.",
    intro: "Soy ingeniera informática y diseñadora de juegos. Me gusta experimentar con sistemas de juego, narrativas interactivas y herramientas nuevas, sobre todo si abren la puerta a experiencias diferentes.",
    c1: "Diseño de juegos", c2: "Desarrollo web", c3: "Educación",
    rg: "Proyecto personal para la comunidad de juegos de rol de Granada. Es una web donde se buscan y se crean campañas, se pide unirse a ellas, cada jugador marca su disponibilidad y el director de juego fija las sesiones. Avisa con notificaciones y permite indicar trigger warnings, con líneas y velos, para hablar de los límites de cada mesa.",
    rgBtn: "Abrir Rol Granada",
    tfgT: "Trabajo de Fin de Grado",
    tfg: "Explora una aplicación creativa de la inteligencia artificial generativa en un juego de rol de escritura. Combina desarrollo de software, experimentación tecnológica y diseño de experiencias interactivas.",
    tfgBtn: "Abrir el TFG", tfgTech: "HTML · CSS · JavaScript · Vercel · API de OpenAI",
    printCV: "Imprimir CV", cvRole: "Ingeniera informática y diseñadora de juegos", cvProfT: "Perfil",
    cvRg: "Web para la comunidad rolera de Granada: campañas, disponibilidad, sesiones y notificaciones, con trigger warnings. React, TypeScript y Supabase.",
    cvTfg: "IA generativa en un juego de rol de escritura. Web estática con Vercel y API de OpenAI.",
    cvGames: "Juegos de rol de mi diseño publicados en itch.io.",
    gamesIntro: "Mis juegos están publicados en itch.io.", allGames: "Ver todos mis juegos",
    about1: "Soy graduada en Ingeniería Informática por la Universidad de Granada, con la especialización en Sistemas de Información. Diseño juegos por afición y por su potencial educativo.",
    about2: "Me gusta trabajar en equipo y contribuir a que el ambiente sea cómodo y colaborativo. Quiero seguir desarrollándome en informática, diseño de juegos y educación.",
    skills: "Programación y herramientas", design: "Diseño de juegos",
    d1: "Diseño y balance de mecánicas", d2: "Narrativa interactiva", d3: "Construcción de mundos",
    d4: "Sin IA en procesos creativos", d5: "Aprendizaje Basado en Juegos", d6: "Gamificación",
    edu: "Formación", eduT: "Grado en Ingeniería Informática",
    langs: "Idiomas", langList: "Español: nativo\nInglés: B1, Escuela Oficial de Idiomas de Motril (2020)\nFrancés: básico",
    mail: "Correo", phone: "Teléfono", talk: "¡Hablemos!", bye: "Gracias por pasar por aquí. ¡Que rueden buenos dados!", closeBook: "volver a la portada"
  },
  en: {
    coverSub: "TTRPG + WEB", tap: "tap to open\nor grab and slide",
    tHome: "Home", tProj: "Projects", tGames: "Games", tAbout: "About me", tContact: "Contact", tSkills: "Skills",
    by: "by",
    lead: "I design tabletop RPGs and build the websites that go with them.",
    intro: "I'm a computer engineer and game designer. I enjoy experimenting with game systems, interactive narratives and new tools, especially when they open the door to different kinds of experiences.",
    c1: "Game design", c2: "Web development", c3: "Education",
    rg: "A personal project for the tabletop RPG community in Granada. It's a website to find and create campaigns, ask to join them, mark your availability, and let the game master set the sessions. It sends notifications and lets each table state trigger warnings, with lines and veils, to talk about their limits.",
    rgBtn: "Open Rol Granada",
    tfgT: "Bachelor's thesis",
    tfg: "Explores a creative use of generative AI in a writing role-playing game. It combines software development, technological experimentation and interactive experience design.",
    tfgBtn: "Open the thesis project", tfgTech: "HTML · CSS · JavaScript · Vercel · OpenAI API",
    printCV: "Print CV", cvRole: "Computer engineer and game designer", cvProfT: "Profile",
    cvRg: "Website for the Granada tabletop RPG community: campaigns, availability, sessions and notifications, with trigger warnings. React, TypeScript and Supabase.",
    cvTfg: "Generative AI in a writing role-playing game. Static website with Vercel and the OpenAI API.",
    cvGames: "Tabletop RPGs of my own design, published on itch.io.",
    gamesIntro: "My games are published on itch.io.", allGames: "See all my games",
    about1: "I hold a degree in Computer Engineering from the University of Granada, specializing in Information Systems. I design games as a hobby and for their educational potential.",
    about2: "I like working in a team and helping keep the atmosphere comfortable and collaborative. I want to keep growing in computing, game design and education.",
    skills: "Programming and tools", design: "Game design",
    d1: "Mechanics design and balance", d2: "Interactive narrative", d3: "Worldbuilding",
    d4: "No AI in creative processes", d5: "Game-Based Learning", d6: "Gamification",
    edu: "Education", eduT: "Degree in Computer Engineering",
    langs: "Languages", langList: "Spanish: native\nEnglish: B1, Escuela Oficial de Idiomas de Motril (2020)\nFrench: basic",
    mail: "Email", phone: "Phone", talk: "Let's talk!", bye: "Thanks for stopping by. May your dice roll high!", closeBook: "back to cover"
  }
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// widgets de itch.io: se escalan para no cortarse
function fit() {
  $$(".wg").forEach(w => {
    const f = w.firstElementChild, k = Math.min(1, w.clientWidth / f.width);
    if (k) { w.style.setProperty("--k", k); w.style.height = f.height * k + "px"; }
  });
}
function setLang(l) {
  document.documentElement.lang = l;
  $$("[data-i18n]").forEach(el => { el.textContent = T[l][el.dataset.i18n]; });
  $("#lc").textContent = l === "es" ? "EN" : "ES";
  const lt = l === "es" ? "Switch to English" : "Cambiar a español";
  $("#lang").title = lt; $("#lang").setAttribute("aria-label", lt);
  $$("#print,#print2").forEach(b => { b.title = T[l].printCV; });
  try { localStorage.setItem("dc-lang", l); } catch (e) {}
  fit();
}

// ---- montaje del libro: portada + páginas (+ una en blanco si hace falta) + contraportada ----
const src = $("#src"), spread = $("#spread");
const pages = $$("section.pg", src);
if (pages.length % 2) { const b = document.createElement("section"); b.className = "pg blank"; pages.push(b); }
const list = [$(".cover:not(.bk)", src), ...pages, $(".cover.bk", src)];
const NF = list.length;               // siempre par: la contraportada es la última cara y queda por fuera
const tabFaces = {};
const bs = document.createElement("div"); bs.className = "bs"; spread.appendChild(bs);
for (let k = 0; k < NF; k += 2) {
  const sh = document.createElement("div"); sh.className = "sheet" + (k === 0 || k + 2 >= NF ? " board" : "");
  [0, 1].forEach(j => {
    const idx = k + j, el = list[idx], fc = document.createElement("div");
    fc.className = "face " + (j ? "back L" : "front"); fc.dataset.face = idx;
    if (el.classList.contains("cover")) {
      fc.classList.add("cover"); if (el.classList.contains("bk")) fc.classList.add("bk");
      fc.append(...el.childNodes);
    } else {
      el.classList.toggle("L", !!j); fc.appendChild(el);
      if (el.dataset.tab) (tabFaces[el.dataset.tab] = tabFaces[el.dataset.tab] || []).push(idx);
    }
    sh.appendChild(fc);
  });
  const eg = document.createElement("i"); eg.className = "edge"; sh.appendChild(eg);
  spread.appendChild(sh);
}
const book = $("#book"), sheets = $$(".sheet"), faces = $$("[data-face]");
const cover = $(".face.cover");
cover.tabIndex = 0; cover.setAttribute("role", "button"); cover.setAttribute("aria-label", "Abrir / Open");

// marcadores pegados a su hoja (escritorio): giran con ella
const tabCols = ["#F6BD60", "#F5CAC3", "#F28482", "#84A59D", "#c4e5db", "#e9b872"];
$$("#tabs button").forEach((nb, k) => {
  const f = tabFaces[nb.dataset.page]; if (!f) return;
  const t = document.createElement("div");
  t.className = "tab"; t.dataset.page = nb.dataset.page; t.tabIndex = 0; t.setAttribute("role", "button");
  t.style.setProperty("--top", 18 + k * 46 + "px"); t.style.setProperty("--c", tabCols[k % 6]);
  t.innerHTML = `<span class="tf" data-i18n="${nb.dataset.i18n}"></span><span class="tb" data-i18n="${nb.dataset.i18n}"></span>`;
  sheets[f[0] >> 1].appendChild(t);
});

const mq = matchMedia("(max-width:820px)");
let step = 0; // móvil: cara visible · escritorio: cara derecha del pliego (pares)
const inc = () => (mq.matches ? 1 : 2);
const maxStep = () => (mq.matches ? NF - 1 : NF);
const norm = t => { t = Math.max(0, Math.min(maxStep(), t)); return mq.matches ? t : 2 * Math.ceil(t / 2); };

function render() {
  const f = Math.ceil(step / 2);
  sheets.forEach((s, i) => {
    s.classList.toggle("flipped", i < f);
    s.classList.toggle("top", i === f);
    s.classList.toggle("last", i === f - 1);
    s.style.zIndex = i < f ? i : 20 - i;
  });
  const vis = mq.matches ? [step] : step ? [step - 1, step] : [0];
  faces.forEach(el => { el.inert = !vis.includes(+el.dataset.face); });
  $$("#tabs button,.tab").forEach(b => b.classList.toggle("on", (tabFaces[b.dataset.page] || []).some(x => vis.includes(x))));
  const W2 = "calc(var(--W) / 2)", shut = step === 0 || step === NF;   // libro cerrado por delante o por detrás
  book.classList.toggle("closed", shut);
  track(1100);
  book.style.setProperty("--tx", mq.matches ? (step % 2 ? "0px" : "calc(var(--W) * -1)") : step === 0 ? `calc(${W2} * -1)` : step === NF ? W2 : "0px");
  $("#pn").textContent = mq.matches ? `${step + 1} / ${NF}` : `${step / 2 + 1} / ${NF / 2 + 1}`;
  $("#prev").disabled = step === 0;
  $("#next").disabled = step >= maxStep();
}
// sombra del libro: sigue por abajo a las hojas fotograma a fotograma (también al arrastrar despacio)
let raf = 0, until = 0;
function shadow() {
  const w = sheets[0].offsetWidth; let lo = 0, hi = 0;
  sheets.forEach(s => {
    const t = getComputedStyle(s).transform, c = t === "none" ? 1 : parseFloat(t.slice(t.indexOf("(") + 1));
    lo = Math.min(lo, w * c); hi = Math.max(hi, w * c);
  });
  bs.style.left = w + lo + 5 + "px"; bs.style.width = Math.max(0, hi - lo - 10) + "px";
}
function track(ms) {
  until = Math.max(until, performance.now() + ms);
  if (!raf) raf = requestAnimationFrame(function tick() {
    shadow();
    raf = performance.now() < until ? requestAnimationFrame(tick) : 0;
  });
}
const go = t => { const n = norm(t); if (n !== step) { step = n; render(); } };

// esquinas sensibles
function zone(e) {
  const f = Math.ceil(step / 2), nx = sheets[f], pv = sheets[f - 1], m = mq.matches;
  const hit = (r, left) => e.clientY > r.bottom - 90 && e.clientY <= r.bottom &&
    (left ? e.clientX >= r.left && e.clientX < r.left + 90 : e.clientX > r.right - 90 && e.clientX <= r.right);
  if (nx && step < maxStep() && (!m || step % 2 === 0) && hit(nx.getBoundingClientRect(), false)) return "next";
  if (pv && (!m || step % 2 === 1) && hit(pv.getBoundingClientRect(), true)) return "prev";
  return "";
}
const peek = z => {
  if (peek.k !== z) { peek.k = z; track(450); }
  book.classList.toggle("peek-next", z === "next");
  book.classList.toggle("peek-prev", z === "prev");
  book.style.cursor = z ? "pointer" : "";
};

faces.forEach(el => {   // la solapa muestra el reverso de la hoja: si es una tapa, sale del color de la tapa
  const c = document.createElement("i"), o = (+el.dataset.face) ^ 1;
  c.className = "curl" + (o === 0 || o === NF - 1 ? " rc" : ""); el.appendChild(c);
});
let noClick = false, drag = null;
book.addEventListener("pointermove", e => { if (e.pointerType === "mouse" && !drag) peek(zone(e)); });
book.addEventListener("pointerleave", () => peek(""));
book.addEventListener("click", e => {
  if (noClick || e.target.closest("button,a,iframe,.tab")) return;
  const z = zone(e);
  if (z === "next") go(step + inc());
  else if (z === "prev") go(step - inc());
  else if (step === 0 && e.target.closest(".cover")) go(1);
  peek("");
});

// arrastrar para pasar página
book.addEventListener("pointerdown", e => {
  if (e.button > 0 || e.target.closest("button,a,iframe,.tab")) return;
  drag = { x: e.clientX, y: e.clientY, dir: 0, sheet: null, p: 0 };
});
addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.dir) {
    if (Math.abs(dx) < 8 || Math.abs(e.clientY - drag.y) > Math.abs(dx)) return;
    const dir = dx < 0 ? 1 : -1, f = Math.ceil(step / 2);
    if ((dir > 0 && step >= maxStep()) || (dir < 0 && step === 0)) { drag = null; return; }
    drag.dir = dir; peek("");
    if (!mq.matches) {
      drag.sheet = sheets[dir > 0 ? f : f - 1];
      drag.sheet.style.zIndex = 30;
      drag.sheet.style.transition = "none";
    }
    book.classList.add("dragging");
    getSelection().removeAllRanges();
  }
  if (drag.sheet) {
    drag.p = Math.min(1, Math.max(0, (-dx * drag.dir) / drag.sheet.offsetWidth));
    drag.sheet.style.transform = `rotateY(${drag.dir > 0 ? -180 * drag.p : -180 + 180 * drag.p}deg)`;
    shadow();
  }
});
function endDrag(e, ok) {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.dir) return;
  noClick = true; setTimeout(() => { noClick = false; });
  book.classList.remove("dragging");
  const commit = d.sheet ? d.p > 0.3 : Math.abs(e.clientX - d.x) > 60;
  if (d.sheet) {   // la hoja queda con la capa del lado en el que está ahora; render() la cambia al cruzar el lomo
    const i = sheets.indexOf(d.sheet), onRight = d.dir > 0 ? d.p < 0.5 : d.p >= 0.5;
    d.sheet.style.transition = ""; d.sheet.style.transform = ""; d.sheet.style.zIndex = onRight ? 20 - i : i;
  }
  if (ok && commit) go(step + d.dir * inc()); else render();
}
addEventListener("pointerup", e => endDrag(e, true));
addEventListener("pointercancel", e => endDrag(e, false));

cover.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(1); } });
$("#prev").addEventListener("click", () => go(step - inc()));
$("#next").addEventListener("click", () => go(step + inc()));
$("#close").addEventListener("click", () => go(0));
$$("#tabs button,.tab").forEach(b => {
  const open = () => { const f = tabFaces[b.dataset.page]; if (f) go(f[0]); };
  b.addEventListener("click", open);
  b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
});
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") go(step + inc());
  if (e.key === "ArrowLeft") go(step - inc());
});
mq.addEventListener("change", () => { step = norm(step); render(); fit(); });
addEventListener("resize", fit);
$$("#print,#print2").forEach(b => b.addEventListener("click", () => window.print()));
$("#lang").addEventListener("click", () => setLang(document.documentElement.lang === "es" ? "en" : "es"));

let saved = null;
try { saved = localStorage.getItem("dc-lang"); } catch (e) {}
setLang(saved || ((navigator.language || "es").toLowerCase().startsWith("en") ? "en" : "es"));
render();
addEventListener("load", fit);