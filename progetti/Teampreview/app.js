// app.js
// Stato applicativo: tutto ciò che descrive i team (roster, mosse, EV/IV,
// natura, oggetto) vive in `state`, un unico oggetto. In Fase 3 questo
// stesso `state` verrà salvato/caricato da un backend MySQL (o passato così
// com'è a un'API esterna, es. un assistente AI).

const MAX_TEAM_SIZE = 6; // Pokémon per team
const MAX_TEAMS = 6; // team creabili in totale
const STORAGE_KEY = "teampreview-state";

const state = {
  teams: [{ name: "Team 1", mons: [] }],
  activeTeamIndex: 0,
};

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
  return state.teams[state.activeTeamIndex];
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage pieno o non disponibile: l'app resta comunque usabile in memoria
  }
}

// Ricostruisce `state` dal localStorage. Se assente, vuoto o corrotto (JSON
// non valido, forma inattesa), lascia lo stato di default (roster vuoto),
// senza mai lanciare errori.
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.teams) || !parsed.teams.length) return;
    state.teams = parsed.teams;
    state.activeTeamIndex = clamp(parsed.activeTeamIndex ?? 0, 0, parsed.teams.length - 1);
  } catch {
    // JSON corrotto: si parte con lo stato di default, nessun errore in console
  }
}

function typeBadgeStyle(type) {
  return `background: var(--type-${type}, var(--muted));`;
}

function renderTeamTabs() {
  teamTabs.innerHTML = "";

  state.teams.forEach((t, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "team-tab" + (i === state.activeTeamIndex ? " active" : "");
    tab.textContent = t.name;
    tab.addEventListener("click", () => {
      state.activeTeamIndex = i;
      hideConfirm();
      searchInput.value = "";
      setFeedback("");
      renderTeamTabs();
      renderRoster();
      saveState();
    });

    if (state.teams.length > 1) {
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
  addBtn.disabled = state.teams.length >= MAX_TEAMS;
  addBtn.addEventListener("click", addTeam);
  teamTabs.appendChild(addBtn);
}

function addTeam() {
  if (state.teams.length >= MAX_TEAMS) return;
  state.teams.push({ name: `Team ${state.teams.length + 1}`, mons: [] });
  state.activeTeamIndex = state.teams.length - 1;
  renderTeamTabs();
  renderRoster();
  saveState();
}

// Aggiunge un nuovo team già popolato (da codice team o da screenshot).
function addImportedTeam(mons) {
  state.teams.push({ name: `Team ${state.teams.length + 1}`, mons });
  state.activeTeamIndex = state.teams.length - 1;
  renderTeamTabs();
  renderRoster();
  saveState();
}

function removeTeam(index) {
  if (state.teams.length <= 1) return;
  state.teams.splice(index, 1);
  if (state.activeTeamIndex >= state.teams.length) state.activeTeamIndex = state.teams.length - 1;
  else if (state.activeTeamIndex > index) state.activeTeamIndex--;
  renderTeamTabs();
  renderRoster();
  saveState();
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
    STAT_KEYS.forEach((key) => {
      const span = document.createElement("span");
      span.innerHTML = `${STAT_LABELS[key]} <strong>${mon.stats[key] ?? "–"}</strong>`;
      statRow.appendChild(span);
    });
    slot.appendChild(statRow);

    const itemLine = document.createElement("div");
    itemLine.className = "item-line";
    itemLine.textContent = mon.item ? `Oggetto: ${mon.item.replace(/-/g, " ")}` : "Oggetto: —";
    slot.appendChild(itemLine);

    const movesRow = document.createElement("div");
    movesRow.className = "moves-row";
    mon.moves.forEach((moveName) => {
      const chip = document.createElement("span");
      chip.className = "move-chip";
      if (moveName) {
        const detail = getCachedMove(moveName);
        if (detail) {
          chip.style.cssText = `border-left-color: var(--type-${detail.type}, var(--muted));`;
        } else {
          fetchMoveDetail(moveName).then(() => renderRoster()).catch(() => {});
        }
        chip.textContent = moveName.replace(/-/g, " ");
      } else {
        chip.textContent = "—";
        chip.classList.add("empty-move");
      }
      movesRow.appendChild(chip);
    });
    slot.appendChild(movesRow);

    const statsBtn = document.createElement("button");
    statsBtn.type = "button";
    statsBtn.className = "stats-btn";
    statsBtn.textContent = "Statistiche";
    statsBtn.addEventListener("click", () => openStatsModal(mon));
    slot.appendChild(statsBtn);

    rosterGrid.appendChild(slot);
  }

  rosterCount.textContent = mons.length;
  renderMatchup();
}

function removeFromTeam(index) {
  activeTeam().mons.splice(index, 1);
  renderRoster();
  saveState();
}

// --- Modal "Statistiche": editor di mosse/oggetto/EV/IV/natura + stat finali ---

const modalBackdrop = document.getElementById("modal-backdrop");
const statsModal = document.getElementById("stats-modal");
const statsModalClose = document.getElementById("stats-modal-close");
const statsModalBody = document.getElementById("stats-modal-body");
let statsModalMon = null;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function closeStatsModal() {
  statsModalMon = null;
  statsModal.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
}
statsModalClose.addEventListener("click", closeStatsModal);
modalBackdrop.addEventListener("click", closeStatsModal);

function openStatsModal(mon) {
  statsModalMon = mon;
  renderStatsModal();
  statsModal.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
}

function renderStatsModal() {
  const mon = statsModalMon;

  statsModalBody.innerHTML = `
    <div class="stats-modal-header">
      <img src="${mon.sprite}" alt="">
      <div>
        <h3>${mon.name}</h3>
        <div class="type-row">${mon.types.map((t) => `<span class="type-badge" style="${typeBadgeStyle(t)}">${t}</span>`).join("")}</div>
      </div>
    </div>

    <div class="stats-modal-grid">
      <section class="stats-modal-section">
        <h4>Mosse</h4>
        <div class="moves-edit-grid">
          ${[0, 1, 2, 3].map((i) => `
            <select data-move-slot="${i}">
              <option value="">— nessuna —</option>
              ${mon.learnset.slice().sort().map((name) => `<option value="${name}" ${mon.moves[i] === name ? "selected" : ""}>${name.replace(/-/g, " ")}</option>`).join("")}
            </select>
          `).join("")}
        </div>

        <h4>Oggetto tenuto</h4>
        <input type="text" id="stats-item-input" list="item-names" autocomplete="off" placeholder="es. choice-specs">

        <h4>Natura</h4>
        <select id="stats-nature-select">
          ${Object.keys(NATURES).map((n) => `<option value="${n}" ${mon.nature === n ? "selected" : ""}>${n}${NATURES[n].plus ? ` (+${STAT_LABELS[NATURES[n].plus]}/-${STAT_LABELS[NATURES[n].minus]})` : " (neutra)"}</option>`).join("")}
        </select>
      </section>

      <section class="stats-modal-section">
        <h4>EV <span class="ev-total" id="ev-total"></span></h4>
        <div class="ev-iv-grid">
          ${STAT_KEYS.map((k) => `<label>${STAT_LABELS[k]}<input type="number" min="0" max="252" step="4" data-ev="${k}" value="${mon.ev[k]}"></label>`).join("")}
        </div>
        <h4>IV</h4>
        <div class="ev-iv-grid">
          ${STAT_KEYS.map((k) => `<label>${STAT_LABELS[k]}<input type="number" min="0" max="31" data-iv="${k}" value="${mon.iv[k]}"></label>`).join("")}
        </div>
      </section>
    </div>

    <table class="final-stats-table">
      <thead><tr><th></th>${STAT_KEYS.map((k) => `<th>${STAT_LABELS[k]}</th>`).join("")}</tr></thead>
      <tbody>
        <tr><th>Base</th>${STAT_KEYS.map((k) => `<td>${mon.stats[k] ?? "–"}</td>`).join("")}</tr>
        <tr class="final-row"><th>Finali (Lv.${LEVEL})</th>${STAT_KEYS.map((k) => `<td data-final="${k}"></td>`).join("")}</tr>
      </tbody>
    </table>
  `;

  // Valore del campo testo oggetto impostato via .value (mai via HTML), il
  // testo libero dell'utente non deve mai finire dentro un template innerHTML.
  statsModalBody.querySelector("#stats-item-input").value = mon.item;

  wireStatsModalEvents();
  updateFinalStats();
}

function wireStatsModalEvents() {
  const mon = statsModalMon;

  statsModalBody.querySelectorAll("[data-move-slot]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const i = Number(sel.dataset.moveSlot);
      mon.moves[i] = sel.value || null;
      if (sel.value) {
        try { await fetchMoveDetail(sel.value); } catch { /* badge tipo resterà assente */ }
      }
      renderRoster();
      saveState();
    });
  });

  statsModalBody.querySelector("#stats-item-input").addEventListener("input", (e) => {
    mon.item = e.target.value;
    renderRoster();
    saveState();
  });

  statsModalBody.querySelector("#stats-nature-select").addEventListener("change", (e) => {
    mon.nature = e.target.value;
    updateFinalStats();
    saveState();
  });

  statsModalBody.querySelectorAll("[data-ev]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.ev;
      let v = clamp(parseInt(input.value, 10) || 0, 0, 252);
      const others = STAT_KEYS.reduce((sum, k) => sum + (k === key ? 0 : mon.ev[k]), 0);
      if (others + v > 510) v = Math.max(0, 510 - others);
      mon.ev[key] = v;
      input.value = v;
      updateFinalStats();
      saveState();
    });
  });

  statsModalBody.querySelectorAll("[data-iv]").forEach((input) => {
    input.addEventListener("input", () => {
      const v = clamp(parseInt(input.value, 10) || 0, 0, 31);
      mon.iv[input.dataset.iv] = v;
      input.value = v;
      updateFinalStats();
      saveState();
    });
  });
}

function updateFinalStats() {
  const mon = statsModalMon;
  if (!mon) return;

  let totalEv = 0;
  STAT_KEYS.forEach((k) => {
    totalEv += mon.ev[k];
    const base = mon.stats[k];
    const cell = statsModalBody.querySelector(`[data-final="${k}"]`);
    if (cell) cell.textContent = base != null ? calcStat(k, base, mon.iv[k], mon.ev[k], LEVEL, mon.nature) : "–";
  });

  const totalEl = statsModalBody.querySelector("#ev-total");
  totalEl.textContent = `${totalEv}/510`;
  totalEl.classList.toggle("error", totalEv > 510);
}

// --- Analisi matchup: debolezze/resistenze per Pokémon, copertura offensiva
// del team, calcolatore di danno tra un Pokémon del roster e un avversario. ---

const matchupDefense = document.getElementById("matchup-defense");
const matchupCovered = document.getElementById("matchup-covered");
const matchupUncovered = document.getElementById("matchup-uncovered");
const dmgAttackerSelect = document.getElementById("dmg-attacker-select");
const dmgMoveSelect = document.getElementById("dmg-move-select");
const dmgDefenderInput = document.getElementById("dmg-defender-input");
const dmgCalcBtn = document.getElementById("dmg-calc-btn");
const dmgResult = document.getElementById("dmg-result");

function buildTypeGroup(label, types, cls) {
  const wrap = document.createElement("div");
  wrap.className = `matchup-group matchup-group-${cls}`;
  const lbl = document.createElement("span");
  lbl.className = "matchup-group-label";
  lbl.textContent = `${label}:`;
  wrap.appendChild(lbl);
  if (!types.length) {
    const none = document.createElement("span");
    none.className = "muted-note";
    none.textContent = "—";
    wrap.appendChild(none);
  }
  types.forEach((t) => {
    const badge = document.createElement("span");
    badge.className = "type-badge";
    badge.textContent = t;
    badge.style.cssText = typeBadgeStyle(t);
    wrap.appendChild(badge);
  });
  return wrap;
}

function renderMatchup() {
  const mons = activeTeam().mons;
  matchupDefense.innerHTML = "";

  if (!mons.length) {
    const empty = document.createElement("p");
    empty.className = "muted-note";
    empty.textContent = "Aggiungi almeno un Pokémon al roster per vedere l'analisi.";
    matchupDefense.appendChild(empty);
  }

  mons.forEach((mon) => {
    const row = document.createElement("div");
    row.className = "matchup-mon-row";

    const label = document.createElement("span");
    label.className = "matchup-mon-name";
    label.textContent = mon.name;
    row.appendChild(label);

    const weak = [], resist = [], immune = [];
    TYPES.forEach((atkType) => {
      const mult = typeEffectiveness(atkType, mon.types);
      if (mult === 0) immune.push(atkType);
      else if (mult > 1) weak.push(atkType);
      else if (mult < 1) resist.push(atkType);
    });

    row.appendChild(buildTypeGroup("Debole", weak, "weak"));
    row.appendChild(buildTypeGroup("Resiste", resist, "resist"));
    if (immune.length) row.appendChild(buildTypeGroup("Immune", immune, "immune"));

    matchupDefense.appendChild(row);
  });

  renderCoverage();
  renderAttackerOptions();
}

function renderCoverage() {
  const mons = activeTeam().mons;
  const attackMoves = [];
  mons.forEach((mon) => {
    mon.moves.forEach((name) => {
      const detail = getCachedMove(name);
      if (detail && detail.power) attackMoves.push(detail);
    });
  });

  const covered = [], uncovered = [];
  TYPES.forEach((defType) => {
    const hits = attackMoves.some((m) => typeEffectiveness(m.type, [defType]) >= 2);
    (hits ? covered : uncovered).push(defType);
  });

  matchupCovered.innerHTML = "";
  matchupCovered.appendChild(buildTypeGroup("Copertura buona", covered, "resist"));
  matchupUncovered.innerHTML = "";
  matchupUncovered.appendChild(buildTypeGroup("Tipi scoperti", uncovered, "weak"));
}

function renderAttackerOptions() {
  const mons = activeTeam().mons;
  dmgAttackerSelect.innerHTML = mons.length
    ? mons.map((m, i) => `<option value="${i}">${m.name}</option>`).join("")
    : `<option value="">Nessun Pokémon nel roster</option>`;
  renderMoveOptions();
}

function renderMoveOptions() {
  const mons = activeTeam().mons;
  const mon = mons[Number(dmgAttackerSelect.value)];
  const moves = mon ? mon.moves.filter(Boolean) : [];
  dmgMoveSelect.innerHTML = moves.length
    ? moves.map((m) => `<option value="${m}">${m.replace(/-/g, " ")}</option>`).join("")
    : `<option value="">Nessuna mossa assegnata</option>`;
}

dmgAttackerSelect.addEventListener("change", renderMoveOptions);

function setDmgResult(message, isError = false) {
  dmgResult.textContent = message;
  dmgResult.classList.toggle("error", isError);
}

dmgCalcBtn.addEventListener("click", async () => {
  const mons = activeTeam().mons;
  const attacker = mons[Number(dmgAttackerSelect.value)];
  const moveName = dmgMoveSelect.value;
  const defenderName = dmgDefenderInput.value.trim();

  if (!attacker) { setDmgResult("Aggiungi un Pokémon al roster prima di calcolare.", true); return; }
  if (!moveName) { setDmgResult("Assegna una mossa a questo Pokémon (pulsante Statistiche) prima di calcolare.", true); return; }
  if (!defenderName) { setDmgResult("Scrivi il nome del Pokémon avversario.", true); return; }

  dmgCalcBtn.disabled = true;
  setDmgResult("Calcolo…");

  try {
    const [move, defender] = await Promise.all([fetchMoveDetail(moveName), fetchPokemon(defenderName)]);

    if (!move.power) {
      setDmgResult(`${move.name.replace(/-/g, " ")} è una mossa di stato: non infligge danno diretto.`, true);
      return;
    }

    const atkKey = move.damageClass === "special" ? "special-attack" : "attack";
    const defKey = move.damageClass === "special" ? "special-defense" : "defense";

    // L'avversario non è nel roster e non ha EV/IV/natura propri: spread
    // neutro di default (IV 31, EV 0, natura neutra), vedi nota in UI.
    const atkStat = calcStat(atkKey, attacker.stats[atkKey], attacker.iv[atkKey], attacker.ev[atkKey], LEVEL, attacker.nature);
    const defStat = calcStat(defKey, defender.stats[defKey], 31, 0, LEVEL, "Hardy");
    const defHp = calcStat("hp", defender.stats.hp, 31, 0, LEVEL, "Hardy");

    const result = calcDamage({
      level: LEVEL, power: move.power, atk: atkStat, def: defStat,
      attackerTypes: attacker.types, moveType: move.type, defenderTypes: defender.types,
    });

    const minPct = Math.min(100, Math.round((result.min / defHp) * 1000) / 10);
    const maxPct = Math.min(100, Math.round((result.max / defHp) * 1000) / 10);
    const effNote = result.eff === 0 ? " (immune)" : result.eff > 1 ? " (superefficace)" : result.eff < 1 ? " (poco efficace)" : "";

    setDmgResult(`${attacker.name} usa ${move.name.replace(/-/g, " ")} contro ${defender.name}: ${minPct}%–${maxPct}% HP${effNote}.`);
  } catch (err) {
    setDmgResult(err.message || "Errore nel calcolo del danno.", true);
  } finally {
    dmgCalcBtn.disabled = false;
  }
});

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
  saveState();
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
  if (state.teams.length >= MAX_TEAMS) {
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
  if (state.teams.length >= MAX_TEAMS) {
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

fetchItemNames().then((names) => {
  document.getElementById("item-names").innerHTML = names
    .map((n) => `<option value="${n}"></option>`)
    .join("");
});

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderTeamTabs();
  renderRoster();
});
