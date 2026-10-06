// Configurazione contatti: inserire il numero WhatsApp (formato internazionale, solo cifre, es. "393331234567")
const WHATSAPP_NUMBER = "";
const INSTAGRAM_USER = "opa_cucinagreca_chefadomicilio";

const form = document.getElementById("booking");
const errorBox = document.getElementById("form-error");
const preview = document.getElementById("preview");
const previewText = document.getElementById("preview-text");
const copied = document.getElementById("copied");
const waBtn = document.getElementById("send-wa");

if (WHATSAPP_NUMBER) waBtn.hidden = false;

// Data minima: domani
const dateInput = form.elements.data;
const tomorrow = new Date(Date.now() + 864e5);
dateInput.min = tomorrow.toISOString().slice(0, 10);

function buildMessage() {
  const f = form.elements;
  const persone = parseInt(f.persone.value, 10);
  if (!f.data.value) return { error: "Scegli una data." };
  if (!persone || persone < 4) return { error: "Il servizio è disponibile per minimo 4 persone." };
  if (!f.nome.value.trim()) return { error: "Inserisci il tuo nome." };

  const data = new Date(f.data.value + "T12:00").toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const lines = [
    "Ciao Opa! Vorrei richiedere una serata greca 🇬🇷",
    "",
    `• Servizio: ${f.servizio.value}`,
    `• Menù: ${f.menu.value}`,
    `• Dolce: ${f.dolce.value}`,
    `• Data: ${data}`,
    `• Persone: ${persone}`,
  ];
  if (f.zona.value.trim()) lines.push(`• Zona: ${f.zona.value.trim()}`);
  if (f.note.value.trim()) lines.push(`• Note: ${f.note.value.trim()}`);
  lines.push("", `Grazie, ${f.nome.value.trim()}`);
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
  if (r.error) {
    errorBox.textContent = r.error;
    errorBox.hidden = false;
    return null;
  }
  return r.text;
}

form.addEventListener("submit", async (e) => {
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

// Nasconde il pulsante flottante quando il modulo è visibile
const fab = document.querySelector(".fab");
const target = document.getElementById("prenota");
new IntersectionObserver(([entry]) => {
  fab.classList.toggle("hide", entry.isIntersecting);
}, { threshold: 0.1 }).observe(target);
