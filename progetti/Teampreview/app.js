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
function setScreenshotFeedback(message, isError = false) {
  screenshotFeedback.textContent = message;
  screenshotFeedback.classList.toggle("error", isError);
}

// Nome PokéAPI più vicino a una riga OCR, solo se molto simile (soglia
// stretta): la maggior parte del testo in uno screenshot NON è una specie
// (abilità, mosse, oggetti, etichette), quindi qui serve essere severi per
// evitare falsi positivi.
function closestNameStrict(line) {
  if (allNames.includes(line)) return line;
  if (allNames.includes(`${line}-male`)) return `${line}-male`; // Pyroar, Meowstic, Indeedee...
  let best = null;
  let bestDist = Infinity;
  for (const name of allNames) {
    if (Math.abs(name.length - line.length) > 1) continue;
    const dist = levenshtein(line, name);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  const threshold = Math.max(1, Math.floor(line.length * 0.15));
  return bestDist <= threshold ? best : null;
}

function extractSpeciesFromText(text) {
  // Split per parola, non per riga: nello screenshot il nome specie e la
  // prima mossa condividono spesso la stessa riga (colonne affiancate).
  const words = (text.match(/[A-Za-z]+/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 4);

  const found = [];
  for (const word of words) {
    const match = closestNameStrict(word);
    if (match && !found.includes(match)) found.push(match);
  }
  return found;
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
    let text = "";
    for (const file of files) {
      const { data } = await Tesseract.recognize(file, "eng");
      text += "\n" + data.text;
    }

    const speciesNames = extractSpeciesFromText(text);
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
  document.getElementById("pokemon-names").innerHTML = names
    .map((n) => `<option value="${n}"></option>`)
    .join("");
});

renderTeamTabs();
renderRoster();
