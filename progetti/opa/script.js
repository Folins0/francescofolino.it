/* Opa! – script del sito
   Configurazione (indirizzo admin e numero WhatsApp predefinito) in config.js */
const CONFIG = window.OPA_CONFIG || {};
const INSTAGRAM_USER = "opa_cucinagreca_chefadomicilio";
let whatsappNumber = (CONFIG.WHATSAPP_NUMBER || "").replace(/\D/g, "");

/* ---------- Lingua IT / EN ---------- */
const T = {
  it: {
    toggle: "EN", toggleLabel: "Switch to English",
    greeting: "Ciao Opa! Vorrei richiedere una serata greca 🇬🇷",
    service: "Servizio", menu: "Menù", dessert: "Dolce", date: "Data", guests: "Persone",
    area: "Zona", notes: "Note", thanks: "Grazie", phone: "Telefono", callTime: "Quando chiamarmi",
    callback: "Potete ricontattarmi al numero indicato per prezzi e modalità?",
    errDate: "Scegli una data.", errAdvance: "Prenota con almeno 2 giorni di anticipo.", errGuests: "Il servizio è disponibile per minimo 4 persone.",
    errName: "Inserisci il tuo nome.", errPhone: "Inserisci un numero di telefono valido.", locale: "it-IT"
  },
  en: {
    toggle: "IT", toggleLabel: "Passa all'italiano",
    greeting: "Hi Opa! I'd like to book a Greek night 🇬🇷",
    service: "Service", menu: "Menu", dessert: "Dessert", date: "Date", guests: "Guests",
    area: "Area", notes: "Notes", thanks: "Thank you", phone: "Phone", callTime: "Best time to call",
    callback: "Could you call me back at this number with prices and details?",
    errDate: "Please choose a date.", errAdvance: "Please book at least 2 days in advance.", errGuests: "The service is available for at least 4 guests.",
    errName: "Please enter your name.", errPhone: "Please enter a valid phone number.", locale: "en-GB"
  }
};
let lang = "it";
const i18nEls = [...document.querySelectorAll("[data-en]")];
i18nEls.forEach(el => { el.dataset.it = el.innerHTML; });
const phEls = [...document.querySelectorAll("[data-en-placeholder]")];
phEls.forEach(el => { el.dataset.itPlaceholder = el.placeholder; });
const langBtn = document.getElementById("lang-toggle");

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Imposta un testo bilingue su un elemento (usato dai contenuti dell'admin)
function setBilingual(el, it, en) {
  el.dataset.it = esc(it);
  el.dataset.en = esc(en || it);
  if (!i18nEls.includes(el)) i18nEls.push(el);
  el.innerHTML = el.dataset[lang];
}

function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  i18nEls.forEach(el => { el.innerHTML = el.dataset[l]; });
  phEls.forEach(el => { el.placeholder = l === "en" ? el.dataset.enPlaceholder : el.dataset.itPlaceholder; });
  langBtn.textContent = T[l].toggle;
  langBtn.setAttribute("aria-label", T[l].toggleLabel);
  try { localStorage.setItem("opa-lang", l); } catch {}
  if (!copied.hidden) refresh();
}
langBtn.addEventListener("click", () => setLang(lang === "it" ? "en" : "it"));

/* ---------- Modulo prenotazione ---------- */
const form = document.getElementById("booking");
const errorBox = document.getElementById("form-error");
const preview = document.getElementById("preview");
const previewText = document.getElementById("preview-text");
const copied = document.getElementById("copied");
const waBtn = document.getElementById("send-wa");

function updateWhatsApp() { waBtn.hidden = !whatsappNumber; }
updateWhatsApp();

// Prenotazione con almeno 2 giorni di anticipo (data locale, non UTC)
const MIN_DAYS_AHEAD = 2;
const localISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const minDate = () => { const d = new Date(); d.setDate(d.getDate() + MIN_DAYS_AHEAD); return localISO(d); };
form.elements.data.min = minDate();

const chosen = name => form.querySelector(`input[name="${name}"]:checked`).nextElementSibling.textContent.trim();

function buildMessage() {
  const f = form.elements, t = T[lang];
  const persone = parseInt(f.persone.value, 10);
  if (!f.data.value) return { error: t.errDate };
  if (f.data.value < minDate()) return { error: t.errAdvance };
  if (!persone || persone < 4) return { error: t.errGuests };
  if (!f.nome.value.trim()) return { error: t.errName };
  const phone = f.telefono.value.trim();
  if (phone.replace(/\D/g, "").length < 8) return { error: t.errPhone };

  const data = new Date(f.data.value + "T12:00").toLocaleDateString(t.locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const lines = [
    t.greeting, "",
    `• ${t.service}: ${chosen("servizio")}`,
    `• ${t.date}: ${data}`,
    `• ${t.guests}: ${persone}`,
  ];
  lines.push(`• ${t.phone}: ${phone}`);
  if (f.note.value.trim()) lines.push(`• ${t.notes}: ${f.note.value.trim()}`);
  lines.push("", t.callback, `${t.thanks}, ${f.nome.value.trim()}`);
  return { text: lines.join("\n") };
}

// Il messaggio si mostra solo dopo aver premuto il pulsante; se si modifica il modulo, si nasconde
function refresh() {
  const r = buildMessage();
  if (r.text) {
    previewText.textContent = r.text;
    errorBox.hidden = true;
  }
  return r;
}
form.addEventListener("input", () => { copied.hidden = true; errorBox.hidden = true; });

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch {}
    ta.remove(); return ok;
  }
}

function validate() {
  const r = refresh();
  if (r.error) { errorBox.textContent = r.error; errorBox.hidden = false; return null; }
  return r.text;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const text = validate();
  if (!text) return;
  await copy(text);
  preview.hidden = false;
  copied.hidden = false;
  copied.scrollIntoView({ behavior: "smooth", block: "nearest" });
  window.open(`https://ig.me/m/${INSTAGRAM_USER}`, "_blank", "noopener");
});

waBtn.addEventListener("click", () => {
  const text = validate();
  if (!text) return;
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});

/* ---------- Menù stampabile / PDF ---------- */
document.getElementById("print-menu").addEventListener("click", () => {
  document.querySelectorAll("#menu .reveal").forEach(el => el.classList.add("in"));
  window.print();
});

/* ---------- Contenuti modificabili dalla pagina admin ---------- */
function applyContent(c) {
  if (!c || typeof c !== "object") return;

  if (c.whatsapp) { whatsappNumber = String(c.whatsapp).replace(/\D/g, ""); updateWhatsApp(); }

  const notice = document.getElementById("notice");
  if (c.notice && c.notice.it) { setBilingual(notice, c.notice.it, c.notice.en); notice.hidden = false; }
  else notice.hidden = true;

  if (c.chef) {
    const bioIt = c.chef.bio && c.chef.bio.it;
    if (c.chef.name) { const n = document.getElementById("chef-name"); n.textContent = c.chef.name; n.hidden = false; }
    if (bioIt) { const b = document.getElementById("chef-bio"); setBilingual(b, bioIt, c.chef.bio.en); b.hidden = false; }
    if (bioIt) document.getElementById("chef-text").hidden = true;
    if (c.chef.photo) {
      const img = document.getElementById("chef-img");
      img.src = c.chef.photo; img.alt = c.chef.name || "Lo chef di Opa!";
      img.parentElement.classList.add("has-photo");
    }
  }

  if (Array.isArray(c.gallery)) {
    document.querySelectorAll(".gallery .tile").forEach((tile, i) => {
      const g = c.gallery[i];
      if (!g) return;
      const cap = tile.querySelector("figcaption");
      if (g.title) cap.textContent = g.title;
      if (g.photo) {
        let img = tile.querySelector("img");
        if (!img) { img = document.createElement("img"); img.loading = "lazy"; tile.prepend(img); }
        img.src = g.photo; img.alt = g.title || cap.textContent;
        tile.classList.add("has-photo");
      }
    });
  }
}

async function loadContent() {
  if (!CONFIG.CMS_URL) return;
  try { const cached = JSON.parse(localStorage.getItem("opa-content") || "null"); if (cached) applyContent(cached); } catch {}
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(CONFIG.CMS_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    const c = await res.json();
    applyContent(c);
    try { localStorage.setItem("opa-content", JSON.stringify(c)); } catch {}
  } catch { /* se il servizio non risponde restano i contenuti predefiniti */ }
}

/* ---------- Lingua iniziale ---------- */
let saved = null;
try { saved = localStorage.getItem("opa-lang"); } catch {}
const urlLang = new URLSearchParams(location.search).get("lang");
const startLang = urlLang === "en" || urlLang === "it" ? urlLang : saved;
if (startLang === "en") setLang("en");
loadContent();

/* ---------- Animazioni allo scroll ---------- */
const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  reveals.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 80}ms`;
    io.observe(el);
  });
} else {
  reveals.forEach(el => el.classList.add("in"));
}

/* ---------- Pulsante flottante ---------- */
// Nascosto quando sono visibili la copertina (che ha già i suoi pulsanti) o il modulo
const fab = document.querySelector(".fab");
const fabHiders = new Set();
const fabIO = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting ? fabHiders.add(e.target) : fabHiders.delete(e.target));
  fab.classList.toggle("hide", fabHiders.size > 0);
}, { threshold: 0.1 });
fabIO.observe(document.querySelector(".hero"));
fabIO.observe(document.getElementById("prenota"));
