// Configurazione contatti: inserire il numero WhatsApp (formato internazionale, solo cifre, es. "393331234567")
const WHATSAPP_NUMBER = "";
const INSTAGRAM_USER = "opa_cucinagreca_chefadomicilio";

/* ---------- Lingua IT / EN ---------- */
const T = {
  it: {
    toggle: "EN", toggleLabel: "Switch to English",
    greeting: "Ciao Opa! Vorrei richiedere una serata greca 🇬🇷",
    service: "Servizio", menu: "Menù", dessert: "Dolce", date: "Data", guests: "Persone",
    area: "Zona", notes: "Note", thanks: "Grazie",
    errDate: "Scegli una data.", errGuests: "Il servizio è disponibile per minimo 4 persone.",
    errName: "Inserisci il tuo nome.", locale: "it-IT"
  },
  en: {
    toggle: "IT", toggleLabel: "Passa all'italiano",
    greeting: "Hi Opa! I'd like to book a Greek night 🇬🇷",
    service: "Service", menu: "Menu", dessert: "Dessert", date: "Date", guests: "Guests",
    area: "Area", notes: "Notes", thanks: "Thank you",
    errDate: "Please choose a date.", errGuests: "The service is available for at least 4 guests.",
    errName: "Please enter your name.", locale: "en-GB"
  }
};
let lang = "it";
const i18nEls = [...document.querySelectorAll("[data-en]")];
i18nEls.forEach(el => { el.dataset.it = el.innerHTML; });
const phEls = [...document.querySelectorAll("[data-en-placeholder]")];
phEls.forEach(el => { el.dataset.itPlaceholder = el.placeholder; });
const langBtn = document.getElementById("lang-toggle");

function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  i18nEls.forEach(el => { el.innerHTML = el.dataset[l]; });
  phEls.forEach(el => { el.placeholder = l === "en" ? el.dataset.enPlaceholder : el.dataset.itPlaceholder; });
  langBtn.textContent = T[l].toggle;
  langBtn.setAttribute("aria-label", T[l].toggleLabel);
  try { localStorage.setItem("opa-lang", l); } catch {}
  if (!preview.hidden) refresh();
}
langBtn.addEventListener("click", () => setLang(lang === "it" ? "en" : "it"));

/* ---------- Modulo prenotazione ---------- */
const form = document.getElementById("booking");
const errorBox = document.getElementById("form-error");
const preview = document.getElementById("preview");
const previewText = document.getElementById("preview-text");
const copied = document.getElementById("copied");
const waBtn = document.getElementById("send-wa");

if (WHATSAPP_NUMBER) waBtn.hidden = false;

const dateInput = form.elements.data;
dateInput.min = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

const chosen = name => form.querySelector(`input[name="${name}"]:checked`).nextElementSibling.textContent.trim();

function buildMessage() {
  const f = form.elements, t = T[lang];
  const persone = parseInt(f.persone.value, 10);
  if (!f.data.value) return { error: t.errDate };
  if (!persone || persone < 4) return { error: t.errGuests };
  if (!f.nome.value.trim()) return { error: t.errName };

  const data = new Date(f.data.value + "T12:00").toLocaleDateString(t.locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const lines = [
    t.greeting, "",
    `• ${t.service}: ${chosen("servizio")}`,
    `• ${t.menu}: ${chosen("menu")}`,
    `• ${t.dessert}: ${chosen("dolce")}`,
    `• ${t.date}: ${data}`,
    `• ${t.guests}: ${persone}`,
  ];
  if (f.zona.value.trim()) lines.push(`• ${t.area}: ${f.zona.value.trim()}`);
  if (f.note.value.trim()) lines.push(`• ${t.notes}: ${f.note.value.trim()}`);
  lines.push("", `${t.thanks}, ${f.nome.value.trim()}`);
  return { text: lines.join("\n") };
}

function refresh() {
  const r = buildMessage();
  if (r.text) {
    previewText.textContent = r.text;
    preview.hidden = false;
    errorBox.hidden = true;
  }
  return r;
}
form.addEventListener("input", refresh);
form.addEventListener("change", refresh);

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
  copied.hidden = false;
  window.open(`https://ig.me/m/${INSTAGRAM_USER}`, "_blank", "noopener");
});

waBtn.addEventListener("click", () => {
  const text = validate();
  if (!text) return;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});

/* ---------- Lingua iniziale ---------- */
let saved = null;
try { saved = localStorage.getItem("opa-lang"); } catch {}
const urlLang = new URLSearchParams(location.search).get("lang");
const startLang = urlLang === "en" || urlLang === "it" ? urlLang : saved;
if (startLang === "en") setLang("en");

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
const fab = document.querySelector(".fab");
new IntersectionObserver(([entry]) => {
  fab.classList.toggle("hide", entry.isIntersecting);
}, { threshold: 0.1 }).observe(document.getElementById("prenota"));
