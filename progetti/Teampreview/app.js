// app.js
// Stato in memoria (Fase 1: nessuna persistenza, si azzera al refresh).
// In Fase 3 questo stesso "teams" verrà salvato/caricato da un backend MySQL.

const MAX_TEAM_SIZE = 6; // Pokémon per team
const MAX_TEAMS = 6; // team creabili in totale

let teams = [{ name: "Team 1", mons: [] }];
let activeTeamIndex = 0;
let allNames = []; // tutti i nomi Pokémon, per riconoscere una corrispondenza esatta
let pendingMon = null; // Pokémon in attesa di conferma dopo un match esatto

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

// Nome valido più vicino a un probabile errore di battitura, o null se troppo diverso.
function findTypoMatch(query) {
  let best = null;
  let bestDist = Infinity;
  for (const name of allNames) {
    if (Math.abs(name.length - query.length) > 2) continue;
    const dist = levenshtein(query, name);
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  const threshold = Math.max(1, Math.floor(query.length * 0.3));
  return bestDist <= threshold ? best : null;
}

async function checkForSuggestion() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query || query.length < 3) {
    hideConfirm();
    return;
  }

  let match;
  if (allNames.includes(query)) {
    match = query; // nome corretto per intero
  } else if (allNames.some((n) => n.startsWith(query))) {
    hideConfirm(); // sta ancora scrivendo verso un nome valido, non è un errore
    return;
  } else {
    match = findTypoMatch(query); // nessun nome inizia così: probabile refuso
  }

  if (!match) {
    hideConfirm();
    return;
  }
  if (pendingMon && pendingMon.name === match) return; // già mostrato

  try {
    const mon = await fetchPokemon(match);
    showConfirm(mon);
  } catch {
    hideConfirm();
  }
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
  hideConfirm();
  searchInput.value = "";
  searchInput.focus();
});

fetchPokemonNames().then((names) => {
  allNames = names;
  document.getElementById("pokemon-names").innerHTML = names
    .map((n) => `<option value="${n}"></option>`)
    .join("");
});

renderTeamTabs();
renderRoster();
