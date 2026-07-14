// app.js
// Stato in memoria (Fase 1: nessuna persistenza, si azzera al refresh).
// In Fase 3 questo stesso "teams" verrà salvato/caricato da un backend MySQL.

const MAX_TEAM_SIZE = 6; // Pokémon per team
const MAX_TEAMS = 6; // team creabili in totale

let teams = [{ name: "Team 1", mons: [] }];
let activeTeamIndex = 0;
const MAX_SUGGESTIONS = 5; // tentativi massimi quando il nome è scritto male

let allNames = []; // tutti i nomi Pokémon, per riconoscere una corrispondenza esatta
let pendingMon = null; // Pokémon in attesa di conferma dopo un match esatto
let suggestionCandidates = []; // possibili nomi corretti per il refuso corrente
let suggestionIndex = 0; // candidato mostrato in questo momento
let suggestionToken = 0; // invalida le fetch di suggerimento superate da un'azione più recente

const teamTabs = document.getElementById("team-tabs");
const rosterGrid = document.getElementById("roster-grid");
const rosterCount = document.getElementById("roster-count");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const feedback = document.getElementById("search-feedback");
const confirmBox = document.getElementById("confirm-box");
const confirmSprite = document.getElementById("confirm-sprite");
const confirmName = document.getElementById("confirm-name");
const confirmYesBtn = document.getElementById("confirm-yes");
const confirmNoBtn = document.getElementById("confirm-no");
const teamCodeInput = document.getElementById("team-code-input");
const teamCodeImportBtn = document.getElementById("team-code-import-btn");
const teamCodeExportBtn = document.getElementById("team-code-export-btn");
const teamCodeFeedback = document.getElementById("team-code-feedback");
const screenshot1Input = document.getElementById("screenshot-1");
const screenshot2Input = document.getElementById("screenshot-2");
const screenshotBuildBtn = document.getElementById("screenshot-build-btn");
const screenshotFeedback = document.getElementById("screenshot-feedback");

function activeTeam() {
  return teams[activeTeamIndex];
}

function typeBadgeStyle(type) {
  return `background: var(--type-${type}, var(--muted));`;
}

function renderTeamTabs() {
  teamTabs.innerHTML = "";

  teams.forEach((t, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "team-tab" + (i === activeTeamIndex ? " active" : "");
    tab.textContent = t.name;
    tab.addEventListener("click", () => {
      activeTeamIndex = i;
      hideConfirm();
      searchInput.value = "";
      setFeedback("");
      renderTeamTabs();
      renderRoster();
    });

    if (teams.length > 1) {
      const removeBtn = document.createElement("span");
      removeBtn.className = "team-tab-remove";
      removeBtn.textContent = "✕";
      removeBtn.setAttribute("aria-label", `Rimuovi ${t.name}`);
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeTeam(i);
      });
      tab.appendChild(removeBtn);
    }

    teamTabs.appendChild(tab);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "team-tab-add";
  addBtn.textContent = "+ Nuovo team";
  addBtn.disabled = teams.length >= MAX_TEAMS;
  addBtn.addEventListener("click", addTeam);
  teamTabs.appendChild(addBtn);
}

function addTeam() {
  if (teams.length >= MAX_TEAMS) return;
  teams.push({ name: `Team ${teams.length + 1}`, mons: [] });
  activeTeamIndex = teams.length - 1;
  renderTeamTabs();
  renderRoster();
}

// Aggiunge un nuovo team già popolato (da codice team o da screenshot).
function addImportedTeam(mons) {
  teams.push({ name: `Team ${teams.length + 1}`, mons });
  activeTeamIndex = teams.length - 1;
  renderTeamTabs();
  renderRoster();
}

function removeTeam(index) {
  if (teams.length <= 1) return;
  teams.splice(index, 1);
  if (activeTeamIndex >= teams.length) activeTeamIndex = teams.length - 1;
  else if (activeTeamIndex > index) activeTeamIndex--;
  renderTeamTabs();
  renderRoster();
}

function renderRoster() {
  rosterGrid.innerHTML = "";
  const mons = activeTeam().mons;

  for (let i = 0; i < MAX_TEAM_SIZE; i++) {
    const mon = mons[i];
    const slot = document.createElement("div");
    slot.className = "slot" + (mon ? "" : " empty");

    const index = document.createElement("span");
    index.className = "slot-index";
    index.textContent = `#${i + 1}`;
    slot.appendChild(index);

    if (!mon) {
      slot.appendChild(document.createTextNode("Slot vuoto"));
      rosterGrid.appendChild(slot);
      continue;
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "slot-remove";
    removeBtn.setAttribute("aria-label", `Rimuovi ${mon.name} dal roster`);
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removeFromTeam(i));
    slot.appendChild(removeBtn);

    const body = document.createElement("div");
    body.className = "slot-body";

    const img = document.createElement("img");
    img.src = mon.sprite;
    img.alt = mon.name;
    body.appendChild(img);

    const info = document.createElement("div");

    const nameEl = document.createElement("div");
    nameEl.className = "slot-name";
    nameEl.textContent = mon.name;
    info.appendChild(nameEl);

    const typeRow = document.createElement("div");
    typeRow.className = "type-row";
    mon.types.forEach((t) => {
      const badge = document.createElement("span");
      badge.className = "type-badge";
      badge.textContent = t;
      badge.style.cssText = typeBadgeStyle(t);
      typeRow.appendChild(badge);
    });
    info.appendChild(typeRow);

    body.appendChild(info);
    slot.appendChild(body);

    const statRow = document.createElement("div");
    statRow.className = "stat-row";
    const shown = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
    const labels = { "hp": "HP", "attack": "Atk", "defense": "Def", "special-attack": "SpA", "special-defense": "SpD", "speed": "Spe" };
    shown.forEach((key) => {
      const span = document.createElement("span");
      span.innerHTML = `${labels[key]} <strong>${mon.stats[key] ?? "–"}</strong>`;
      statRow.appendChild(span);
    });
    slot.appendChild(statRow);

    rosterGrid.appendChild(slot);
  }

  rosterCount.textContent = mons.length;
}

function removeFromTeam(index) {
  activeTeam().mons.splice(index, 1);
  renderRoster();
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle("error", isError);
}

function addMonToTeam(mon) {
  const mons = activeTeam().mons;
  if (mons.length >= MAX_TEAM_SIZE) {
    setFeedback("Il roster è già completo (6/6). Rimuovi uno slot per aggiungerne un altro.", true);
    return;
  }
  if (mons.some((m) => m.name === mon.name)) {
    setFeedback(`${mon.name} è già nel roster.`, true);
    return;
  }
  mons.push(mon);
  renderRoster();
  setFeedback(`${mon.name} aggiunto al roster.`);
  searchInput.value = "";
  hideConfirm();
}

async function handleAdd() {
  const name = searchInput.value;

  if (!name.trim()) {
    setFeedback("Scrivi il nome di un Pokémon prima di aggiungerlo.", true);
    return;
  }

  searchBtn.disabled = true;
  setFeedback("Cerco su PokéAPI…");

  try {
    const mon = await fetchPokemon(name);
    addMonToTeam(mon);
  } catch (err) {
    setFeedback(err.message, true);
  } finally {
    searchBtn.disabled = false;
  }
}

function hideConfirm() {
  pendingMon = null;
  confirmBox.classList.add("hidden");
}

function showConfirm(mon) {
  pendingMon = mon;
  confirmSprite.src = mon.sprite;
  confirmName.textContent = mon.name;
  confirmBox.classList.remove("hidden");
}

// Distanza di Levenshtein: numero minimo di modifiche per trasformare a in b.
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  dp[0] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// I nomi validi più vicini a un probabile errore di battitura, dal più simile.
function findTypoMatches(query) {
  return allNames
    .filter((name) => Math.abs(name.length - query.length) <= 2)
    .map((name) => ({ name, dist: levenshtein(query, name) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.name);
}

async function showSuggestionAt(index) {
  const token = ++suggestionToken;
  const name = suggestionCandidates[index];
  try {
    const mon = await fetchPokemon(name);
    if (token !== suggestionToken) return; // superata da un click/input successivo
    showConfirm(mon);
  } catch {
    if (token === suggestionToken) hideConfirm();
  }
}

async function checkForSuggestion() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query || query.length < 3) {
    hideConfirm();
    return;
  }

  if (allNames.includes(query)) {
    suggestionCandidates = [query]; // nome corretto per intero
  } else if (allNames.some((n) => n.startsWith(query))) {
    hideConfirm(); // sta ancora scrivendo verso un nome valido, non è un errore
    return;
  } else {
    suggestionCandidates = findTypoMatches(query); // nessun nome inizia così: probabile refuso
  }

  if (!suggestionCandidates.length) {
    hideConfirm();
    return;
  }
  if (pendingMon && pendingMon.name === suggestionCandidates[0]) return; // già mostrato

  suggestionIndex = 0;
  await showSuggestionAt(suggestionIndex);
}

searchBtn.addEventListener("click", handleAdd);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAdd();
});
searchInput.addEventListener("input", checkForSuggestion);

confirmYesBtn.addEventListener("click", () => {
  if (pendingMon) addMonToTeam(pendingMon);
});
confirmNoBtn.addEventListener("click", () => {
  suggestionIndex++;
  if (suggestionIndex < suggestionCandidates.length) {
    showSuggestionAt(suggestionIndex);
  } else {
    suggestionToken++; // invalida eventuali fetch di suggerimento ancora in corso
    hideConfirm();
    searchInput.value = "";
    setFeedback("Non riesco a trovare il Pokémon che mi hai chiesto, riprova a cercarlo.", true);
  }
});

// Codice team proprio di TeamPreview (non è il formato ufficiale del gioco,
// che non è pubblico): l'ID PokéAPI di ogni Pokémon in base36, separati da
// "-", per un codice corto e alfanumerico da condividere con un altro
// utente di TeamPreview o da un dispositivo all'altro.
function encodeTeamCode(mons) {
  return mons.map((m) => m.id.toString(36).toUpperCase()).join("-");
}

function decodeTeamCode(code) {
  const ids = code.trim().toUpperCase().split("-").filter(Boolean).map((part) => parseInt(part, 36));
  if (!ids.length || ids.some((id) => Number.isNaN(id))) throw new Error("Codice non valido.");
  return ids;
}

function setTeamCodeFeedback(message, isError = false) {
  teamCodeFeedback.textContent = message;
  teamCodeFeedback.classList.toggle("error", isError);
}

teamCodeExportBtn.addEventListener("click", async () => {
  const mons = activeTeam().mons;
  if (!mons.length) {
    setTeamCodeFeedback("Il team attivo è vuoto: aggiungi almeno un Pokémon prima di esportare.", true);
    return;
  }
  const code = encodeTeamCode(mons);
  try {
    await navigator.clipboard.writeText(code);
    setTeamCodeFeedback("Codice copiato negli appunti!");
  } catch {
    teamCodeInput.value = code;
    setTeamCodeFeedback("Copia manualmente il codice dal campo qui sopra.");
  }
});

teamCodeImportBtn.addEventListener("click", async () => {
  const raw = teamCodeInput.value.trim();
  if (!raw) {
    setTeamCodeFeedback("Incolla un codice team prima di importare.", true);
    return;
  }
  if (teams.length >= MAX_TEAMS) {
    setTeamCodeFeedback("Hai già 6 team: rimuovine uno prima di importarne un altro.", true);
    return;
  }

  let ids;
  try {
    ids = decodeTeamCode(raw);
  } catch {
    setTeamCodeFeedback("Codice non valido o non riconosciuto.", true);
    return;
  }

  teamCodeImportBtn.disabled = true;
  setTeamCodeFeedback("Importo il team…");

  const mons = [];
  for (const id of ids.slice(0, MAX_TEAM_SIZE)) {
    try {
      mons.push(await fetchPokemon(String(id)));
    } catch {
      // ID non riconosciuto da PokéAPI: lo saltiamo
    }
  }

  teamCodeImportBtn.disabled = false;

  if (!mons.length) {
    setTeamCodeFeedback("Nessun Pokémon valido trovato in questo codice.", true);
    return;
  }

  addImportedTeam(mons);
  teamCodeInput.value = "";
  setTeamCodeFeedback(`Team importato con ${mons.length} Pokémon.`);
});

// Riconoscimento specie Pokémon da uno screenshot della team preview del
// gioco (OCR client-side con Tesseract.js, nessun backend/API key). Cerca
// solo i nomi specie: abilità/oggetto/mosse/statistiche non sono ancora
// gestiti dal roster, quindi non proviamo a estrarli.
//
// Layout screenshot: griglia 2 colonne x 3 righe (6 schede viola), nome
// specie sempre in alto a sinistra di ogni scheda, testo chiaro su sfondo
// viola. Invece di fare OCR sull'intera immagine (troppo rumore da abilità/
// mosse/statistiche) ritagliamo la zona nome di ogni scheda e la leggiamo
// separatamente.
function setScreenshotFeedback(message, isError = false) {
  screenshotFeedback.textContent = message;
  screenshotFeedback.classList.toggle("error", isError);
}

// nome normalizzato (solo lettere, minuscolo) -> slug PokéAPI inglese.
// Popolata all'avvio sia dai nomi inglesi (autocomplete) sia dalla mappa
// italiana, così l'OCR riconosce entrambe le lingue con lo stesso lookup.
let nameLookup = {};

function normalizeOcrText(s) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

function addNamesToLookup(names) {
  names.forEach((slug) => {
    nameLookup[normalizeOcrText(slug)] = slug;
  });
}

// Slug PokéAPI più vicino al testo OCR di un ritaglio-nome, solo se molto
// simile (soglia stretta): evita falsi positivi quando il ritaglio non
// contiene un nome leggibile.
function closestSpeciesForCrop(rawText) {
  const query = normalizeOcrText(rawText);
  if (query.length < 3) return null;
  if (nameLookup[query]) return nameLookup[query];
  if (nameLookup[`${query}male`]) return nameLookup[`${query}male`]; // Pyroar, Meowstic, Indeedee...

  let best = null;
  let bestDist = Infinity;
  for (const key in nameLookup) {
    if (Math.abs(key.length - query.length) > 2) continue;
    const dist = levenshtein(query, key);
    if (dist < bestDist) {
      bestDist = dist;
      best = nameLookup[key];
    }
  }
  const threshold = Math.max(1, Math.floor(query.length * 0.2));
  return bestDist <= threshold ? best : null;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non valida."));
    img.src = URL.createObjectURL(file);
  });
}

// Le schede hanno testo chiaro su sfondo viola: rendiamo i pixel chiari
// (il nome) neri e il resto bianco, il contrasto che Tesseract legge meglio.
function binarizeLightTextOnDark(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum > 150 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);
}

// ponytail: frazioni approssimate, relative a ogni cella della griglia, di
// dove compare il nome (alto-sinistra della scheda). Da tarare su uno
// screenshot reale se il gioco cambia layout o risoluzione.
const NAME_CROP = { left: 0.04, right: 0.98, top: 0.04, bottom: 0.3 };
const CROP_SCALE = 2; // upscale prima dell'OCR, il testo piccolo si legge meglio ingrandito

function cropNameRegions(img) {
  const cols = 2;
  const rows = 3;
  const cellW = img.naturalWidth / cols;
  const cellH = img.naturalHeight / rows;
  const canvases = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * cellW + NAME_CROP.left * cellW;
      const sy = r * cellH + NAME_CROP.top * cellH;
      const sw = (NAME_CROP.right - NAME_CROP.left) * cellW;
      const sh = (NAME_CROP.bottom - NAME_CROP.top) * cellH;

      const canvas = document.createElement("canvas");
      canvas.width = sw * CROP_SCALE;
      canvas.height = sh * CROP_SCALE;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      binarizeLightTextOnDark(ctx, canvas.width, canvas.height);
      canvases.push(canvas);
    }
  }
  return canvases;
}

screenshotBuildBtn.addEventListener("click", async () => {
  const files = [screenshot1Input.files[0], screenshot2Input.files[0]].filter(Boolean);
  if (!files.length) {
    setScreenshotFeedback("Carica almeno uno screenshot.", true);
    return;
  }
  if (teams.length >= MAX_TEAMS) {
    setScreenshotFeedback("Hai già 6 team: rimuovine uno prima di importarne un altro.", true);
    return;
  }

  screenshotBuildBtn.disabled = true;
  setScreenshotFeedback("Leggo le immagini… la prima volta scarica il modulo OCR, può richiedere qualche secondo.");

  try {
    const speciesNames = [];
    for (const file of files) {
      const img = await loadImage(file);
      for (const canvas of cropNameRegions(img)) {
        const { data } = await Tesseract.recognize(canvas, "eng");
        const match = closestSpeciesForCrop(data.text);
        if (match && !speciesNames.includes(match)) speciesNames.push(match);
      }
    }

    if (!speciesNames.length) {
      setScreenshotFeedback("Non ho riconosciuto nessun Pokémon negli screenshot. Prova a costruire il team manualmente.", true);
      return;
    }

    const mons = [];
    for (const name of speciesNames.slice(0, MAX_TEAM_SIZE)) {
      try {
        mons.push(await fetchPokemon(name));
      } catch {
        // riconosciuto dall'OCR ma non trovato su PokéAPI: lo saltiamo
      }
    }

    if (!mons.length) {
      setScreenshotFeedback("Nomi riconosciuti ma non trovati su PokéAPI.", true);
      return;
    }

    addImportedTeam(mons);
    setScreenshotFeedback(`Team creato con ${mons.length} Pokémon riconosciuti (su 6 attesi). Controlla e completa a mano se serve.`);
  } catch {
    setScreenshotFeedback("Errore nella lettura degli screenshot. Riprova o costruisci il team a mano.", true);
  } finally {
    screenshotBuildBtn.disabled = false;
  }
});

fetchPokemonNames().then((names) => {
  allNames = names;
  addNamesToLookup(names);
  document.getElementById("pokemon-names").innerHTML = names
    .map((n) => `<option value="${n}"></option>`)
    .join("");
});

// Nomi italiani per il riconoscimento OCR: se la fetch fallisce (rete offline,
// endpoint irraggiungibile) restano comunque riconoscibili i nomi coincidenti
// con l'inglese, già in nameLookup.
fetchItalianNameMap()
  .then((map) => Object.assign(nameLookup, map))
  .catch(() => {});

renderTeamTabs();
renderRoster();
