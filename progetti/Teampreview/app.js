// app.js
// Stato applicativo: tutto ciò che descrive i team (roster, mosse, SP/IV,
// natura, oggetto) vive in `state`, un unico oggetto. In Fase 3 questo
// stesso `state` verrà salvato/caricato da un backend MySQL (o passato così
// com'è a un'API esterna, es. un assistente AI).

const MAX_TEAM_SIZE = 6; // Pokémon per team
const MAX_TEAMS = 6; // team creabili in totale
const STORAGE_KEY = "teampreview-state";
// URL del backend Node (server.js), deployato su Render. Se irraggiungibile
// l'import da screenshot degrada all'OCR client-side puro di prima, senza
// rompersi.
const AI_BACKEND_BASE = "https://teampreview-backend.onrender.com";
const AI_VISION_ENDPOINT = `${AI_BACKEND_BASE}/api/analyze-screenshot`;
const AI_COACH_ENDPOINT = `${AI_BACKEND_BASE}/api/coach-advice`;

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
let editMode = false; // modalità "Modifica team" (punto 7): mostra il controllo per sostituire un Pokémon in uno slot

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
const editTeamBtn = document.getElementById("edit-team-btn");

editTeamBtn.addEventListener("click", () => {
  editMode = !editMode;
  editTeamBtn.classList.toggle("active", editMode);
  editTeamBtn.textContent = editMode ? "Fine modifica" : "Modifica team";
  renderRoster();
});

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

// --- Testo dei tooltip hover (via CSS [data-tooltip]) ---

function moveTooltipText(detail) {
  const acc = detail.accuracy != null ? `${detail.accuracy}%` : "—";
  const power = detail.power ?? "—";
  return `Tipo: ${detail.type}\nDanno base: ${power}\nPrecisione: ${acc}${detail.effect ? `\n${detail.effect}` : ""}`;
}

function abilityTooltipText(detail) {
  return detail.effect || "Nessuna descrizione disponibile.";
}

function itemTooltipText(detail) {
  return detail.effect || "Nessuna descrizione disponibile.";
}

// Su desktop il tooltip si mostra col mouse (:hover in CSS). Su un
// dispositivo senza hover reale (touch) lo mostriamo al tap, tramite una
// classe che il CSS tratta come l'hover: un tap altrove lo richiude.
const isTouchOnly = window.matchMedia("(hover: none)").matches;

if (isTouchOnly) {
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-tooltip]");
    document.querySelectorAll(".tap-tooltip").forEach((el) => {
      if (el !== target) el.classList.remove("tap-tooltip");
    });
    // I chip mossa gestiscono da soli il proprio tap-tooltip (vedi
    // renderRoster): qui si occupa solo degli elementi non a bottone
    // (riga abilità/oggetto).
    if (target && target.tagName !== "BUTTON") target.classList.add("tap-tooltip");
  });
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

    const abilityLine = document.createElement("div");
    abilityLine.className = "item-line";
    if (mon.ability) {
      abilityLine.textContent = `Abilità: ${mon.ability.replace(/-/g, " ")}`;
      const detail = getCachedAbility(mon.ability);
      if (detail) abilityLine.dataset.tooltip = abilityTooltipText(detail);
      else if (detail === undefined) fetchAbilityDetail(mon.ability).then(() => renderRoster());
    } else {
      abilityLine.textContent = "Abilità: —";
    }
    slot.appendChild(abilityLine);

    const itemLine = document.createElement("div");
    itemLine.className = "item-line";
    if (mon.item) {
      itemLine.textContent = `Oggetto: ${itemDisplayName(mon.item)}`;
      const detail = getCachedItem(mon.item);
      if (detail) itemLine.dataset.tooltip = itemTooltipText(detail);
      else if (detail === undefined) fetchItemDetail(mon.item).then(() => renderRoster());
    } else {
      itemLine.textContent = "Oggetto: —";
    }
    slot.appendChild(itemLine);

    const movesRow = document.createElement("div");
    movesRow.className = "moves-row";
    mon.moves.forEach((moveName) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "move-chip";
      chip.addEventListener("click", () => {
        // Su touch, il primo tap su una mossa assegnata mostra solo il
        // tooltip (punto 3/mobile); il secondo tap apre il modal. Su
        // desktop (mouse) il tooltip è già visibile via hover: il click
        // apre subito il modal, come prima.
        if (isTouchOnly && moveName && !chip.classList.contains("tap-tooltip")) {
          document.querySelectorAll(".tap-tooltip").forEach((el) => el.classList.remove("tap-tooltip"));
          chip.classList.add("tap-tooltip");
          return;
        }
        openStatsModal(mon);
      });
      if (moveName) {
        const detail = getCachedMove(moveName);
        if (detail) {
          chip.style.cssText = `border-left-color: var(--type-${detail.type}, var(--muted));`;
          chip.dataset.tooltip = moveTooltipText(detail);
        } else {
          fetchMoveDetail(moveName).then(() => renderRoster()).catch(() => {});
        }
        chip.textContent = moveDisplayName(moveName);
      } else {
        chip.title = "Clicca per assegnare una mossa";
        chip.textContent = "+ Assegna mossa";
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

    if (editMode) slot.appendChild(buildReplaceControl(i));

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

// Sostituisce in-place il Pokémon di uno slot (modalità "Modifica team",
// punto 7): stessa posizione nel roster, niente rimuovi+ri-aggiungi in coda.
function buildReplaceControl(index) {
  const row = document.createElement("div");
  row.className = "slot-replace";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Cambia Pokémon…";
  input.setAttribute("list", "pokemon-names");
  input.autocomplete = "off";
  row.appendChild(input);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Sostituisci";
  btn.addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) return;
    btn.disabled = true;
    try {
      const newMon = await fetchPokemon(name);
      const oldName = activeTeam().mons[index].name;
      activeTeam().mons[index] = newMon;
      renderRoster();
      saveState();
      setFeedback(`${oldName} sostituito con ${newMon.name}.`);
    } catch (err) {
      setFeedback(err.message, true);
      btn.disabled = false;
    }
  });
  row.appendChild(btn);

  return row;
}

// --- Modal "Statistiche": editor di mosse/oggetto/SP/IV/natura + stat finali ---

const modalBackdrop = document.getElementById("modal-backdrop");
const statsModal = document.getElementById("stats-modal");
const statsModalClose = document.getElementById("stats-modal-close");
const statsModalBody = document.getElementById("stats-modal-body");
let statsModalMon = null;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// Riusate sia dal modal Statistiche del roster sia dal pannello "spread
// personalizzato" del calcolatore danno (punto 1).
function natureOptionsHtml(selected) {
  return Object.keys(NATURES).map((n) => `<option value="${n}" ${selected === n ? "selected" : ""}>${n}${NATURES[n].plus ? ` (+${STAT_LABELS[NATURES[n].plus]}/-${STAT_LABELS[NATURES[n].minus]})` : " (neutra)"}</option>`).join("");
}

function spIvGridHtml(prefix, values, max) {
  return STAT_KEYS.map((k) => `<label>${STAT_LABELS[k]}<input type="number" min="0" max="${max}" step="1" data-${prefix}="${k}" value="${values[k]}"></label>`).join("");
}

// Oggetti raggruppati per categoria (Megapietre/Strumenti/Bacche, vedi
// champions-roster.js) tramite <optgroup>: elenco chiuso, non testo libero.
function itemOptionsHtml(selected) {
  return Object.entries(CHAMPIONS_ITEM_CATEGORIES).map(([category, items]) => `
    <optgroup label="${category}">
      ${Object.entries(items).map(([slug, label]) => `<option value="${slug}" ${selected === slug ? "selected" : ""}>${label}</option>`).join("")}
    </optgroup>
  `).join("");
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
              ${mon.learnset.slice().sort().map((name) => `<option value="${name}" ${mon.moves[i] === name ? "selected" : ""}>${moveDisplayName(name)}</option>`).join("")}
            </select>
          `).join("")}
        </div>

        <h4>Abilità</h4>
        <input type="text" id="stats-ability-input" list="ability-names" autocomplete="off" placeholder="es. intimidate">

        <h4>Oggetto tenuto</h4>
        <select id="stats-item-input">
          <option value="">— nessuno —</option>
          ${itemOptionsHtml(mon.item)}
        </select>

        <h4>Natura</h4>
        <select id="stats-nature-select">
          ${natureOptionsHtml(mon.nature)}
        </select>
      </section>

      <section class="stats-modal-section">
        <h4>SP <span class="sp-total" id="sp-total"></span></h4>
        <div class="sp-iv-grid">
          ${spIvGridHtml("sp", mon.sp, MAX_SP_PER_STAT)}
        </div>
        <h4>IV</h4>
        <div class="sp-iv-grid">
          ${spIvGridHtml("iv", mon.iv, 31)}
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

  // Valore del campo testo abilità impostato via .value (mai via HTML): il
  // testo libero dell'utente non deve mai finire dentro un template
  // innerHTML. L'oggetto è un elenco chiuso (<select>), già selezionato nel
  // template sopra.
  statsModalBody.querySelector("#stats-ability-input").value = mon.ability;

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

  statsModalBody.querySelector("#stats-item-input").addEventListener("change", (e) => {
    mon.item = e.target.value;
    renderRoster();
    saveState();
  });

  statsModalBody.querySelector("#stats-ability-input").addEventListener("input", (e) => {
    mon.ability = e.target.value;
    renderRoster();
    saveState();
  });

  statsModalBody.querySelector("#stats-nature-select").addEventListener("change", (e) => {
    mon.nature = e.target.value;
    updateFinalStats();
    saveState();
  });

  statsModalBody.querySelectorAll("[data-sp]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.sp;
      let v = clamp(parseInt(input.value, 10) || 0, 0, MAX_SP_PER_STAT);
      const others = STAT_KEYS.reduce((sum, k) => sum + (k === key ? 0 : mon.sp[k]), 0);
      if (others + v > MAX_SP_TOTAL) v = Math.max(0, MAX_SP_TOTAL - others);
      mon.sp[key] = v;
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

  let totalSp = 0;
  STAT_KEYS.forEach((k) => {
    totalSp += mon.sp[k];
    const base = mon.stats[k];
    const cell = statsModalBody.querySelector(`[data-final="${k}"]`);
    if (cell) cell.textContent = base != null ? calcStat(k, base, mon.iv[k], mon.sp[k], LEVEL, mon.nature) : "–";
  });

  const totalEl = statsModalBody.querySelector("#sp-total");
  totalEl.textContent = `${totalSp}/${MAX_SP_TOTAL}`;
  totalEl.classList.toggle("error", totalSp > MAX_SP_TOTAL);
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
const dmgDefenderCustom = document.getElementById("dmg-defender-custom");
const dmgDefenderNature = document.getElementById("dmg-defender-nature");
const dmgDefenderSp = document.getElementById("dmg-defender-sp");
const dmgDefenderIv = document.getElementById("dmg-defender-iv");

// Spread difensivo dell'avversario nel calcolatore danno (punto 1): "auto"
// calcola un range min-max sugli estremi possibili di SP/natura, "custom"
// usa lo spread scelto qui dall'utente.
const dmgDefenderConfig = {
  mode: "auto",
  nature: "Hardy",
  sp: { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 },
  iv: { hp: 31, attack: 31, defense: 31, "special-attack": 31, "special-defense": 31, speed: 31 },
};

dmgDefenderNature.innerHTML = natureOptionsHtml(dmgDefenderConfig.nature);
dmgDefenderSp.innerHTML = spIvGridHtml("sp", dmgDefenderConfig.sp, MAX_SP_PER_STAT);
dmgDefenderIv.innerHTML = spIvGridHtml("iv", dmgDefenderConfig.iv, 31);

dmgDefenderNature.addEventListener("change", (e) => { dmgDefenderConfig.nature = e.target.value; });

dmgDefenderSp.querySelectorAll("[data-sp]").forEach((input) => {
  input.addEventListener("input", () => {
    const key = input.dataset.sp;
    let v = clamp(parseInt(input.value, 10) || 0, 0, MAX_SP_PER_STAT);
    const others = STAT_KEYS.reduce((sum, k) => sum + (k === key ? 0 : dmgDefenderConfig.sp[k]), 0);
    if (others + v > MAX_SP_TOTAL) v = Math.max(0, MAX_SP_TOTAL - others);
    dmgDefenderConfig.sp[key] = v;
    input.value = v;
  });
});

dmgDefenderIv.querySelectorAll("[data-iv]").forEach((input) => {
  input.addEventListener("input", () => {
    const v = clamp(parseInt(input.value, 10) || 0, 0, 31);
    dmgDefenderConfig.iv[input.dataset.iv] = v;
    input.value = v;
  });
});

document.querySelectorAll('input[name="dmg-defender-mode"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    dmgDefenderConfig.mode = radio.value;
    dmgDefenderCustom.classList.toggle("hidden", radio.value !== "custom");
  });
});

// Nome della prima natura che aumenta/diminuisce una data stat (o "Hardy" se
// nessuna): usata per gli estremi del range automatico.
function natureFor(statKey, effect) {
  for (const name in NATURES) {
    if (NATURES[name][effect] === statKey) return name;
  }
  return "Hardy";
}

function effectivenessNote(eff) {
  return eff === 0 ? " (immune)" : eff > 1 ? " (superefficace)" : eff < 1 ? " (poco efficace)" : "";
}

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
    ? moves.map((m) => `<option value="${m}">${moveDisplayName(m)}</option>`).join("")
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
      setDmgResult(`${moveDisplayName(move.name)} è una mossa di stato: non infligge danno diretto.`, true);
      return;
    }

    const atkKey = move.damageClass === "special" ? "special-attack" : "attack";
    const defKey = move.damageClass === "special" ? "special-defense" : "defense";

    const atkStat = calcStat(atkKey, attacker.stats[atkKey], attacker.iv[atkKey], attacker.sp[atkKey], LEVEL, attacker.nature);

    let minPct, maxPct, eff;

    if (dmgDefenderConfig.mode === "custom") {
      const defStat = calcStat(defKey, defender.stats[defKey], dmgDefenderConfig.iv[defKey], dmgDefenderConfig.sp[defKey], LEVEL, dmgDefenderConfig.nature);
      const defHp = calcStat("hp", defender.stats.hp, dmgDefenderConfig.iv.hp, dmgDefenderConfig.sp.hp, LEVEL, dmgDefenderConfig.nature);
      const result = calcDamage({
        level: LEVEL, power: move.power, atk: atkStat, def: defStat,
        attackerTypes: attacker.types, moveType: move.type, defenderTypes: defender.types,
      });
      minPct = Math.min(100, Math.round((result.min / defHp) * 1000) / 10);
      maxPct = Math.min(100, Math.round((result.max / defHp) * 1000) / 10);
      eff = result.eff;
    } else {
      // Range automatico: estremi di bulk possibili (IV 31 in entrambi i
      // casi, SP e natura al minimo o al massimo sulla stat difensiva
      // rilevante), HP a SP 0 come base percentuale in entrambi i casi.
      const minDef = calcStat(defKey, defender.stats[defKey], 31, 0, LEVEL, natureFor(defKey, "minus"));
      const maxDef = calcStat(defKey, defender.stats[defKey], 31, MAX_SP_PER_STAT, LEVEL, natureFor(defKey, "plus"));
      const defHp = calcStat("hp", defender.stats.hp, 31, 0, LEVEL, "Hardy");

      const worstCase = calcDamage({ level: LEVEL, power: move.power, atk: atkStat, def: minDef, attackerTypes: attacker.types, moveType: move.type, defenderTypes: defender.types });
      const bestCase = calcDamage({ level: LEVEL, power: move.power, atk: atkStat, def: maxDef, attackerTypes: attacker.types, moveType: move.type, defenderTypes: defender.types });

      minPct = Math.min(100, Math.round((bestCase.min / defHp) * 1000) / 10);
      maxPct = Math.min(100, Math.round((worstCase.max / defHp) * 1000) / 10);
      eff = worstCase.eff; // dipende solo dai tipi, uguale in entrambi i casi
    }

    setDmgResult(`${attacker.name} usa ${moveDisplayName(move.name)} contro ${defender.name}: ${minPct}%–${maxPct}% HP${effectivenessNote(eff)}.`);
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

// Riconoscimento Pokémon da uno screenshot della team preview del gioco
// (OCR client-side con Tesseract.js, nessun backend/API key): specie,
// abilità, oggetto e le 4 mosse dalla tab "Info Pokémon", ed opzionalmente
// le 6 stat finali dalla tab "Statistiche". Il gioco è in italiano: ogni
// campo viene tradotto verso lo slug inglese PokéAPI via fuzzy match contro
// un dizionario IT/EN scaricato una volta sola all'avvio (vedi in fondo al
// file).
function setScreenshotFeedback(message, isError = false) {
  screenshotFeedback.textContent = message;
  screenshotFeedback.classList.toggle("error", isError);
}

// nome normalizzato (solo lettere, minuscolo) -> slug PokéAPI inglese.
// Un dizionario per campo (specie/mossa/oggetto/abilità), ognuno popolato
// all'avvio sia dai nomi inglesi (autocomplete) sia dalla mappa italiana,
// così l'OCR riconosce entrambe le lingue con lo stesso lookup.
let nameLookup = {};
let moveLookup = {};
let itemLookup = {};
let abilityLookup = {};

// slug inglese mossa -> nome italiano ufficiale, per la UI (punto 4).
const moveNameIT = {};
function moveDisplayName(moveName) {
  return moveNameIT[moveName] || moveName.replace(/-/g, " ");
}

// slug PokéAPI oggetto -> nome italiano ufficiale (da CHAMPIONS_ITEM_CATEGORIES).
const itemNameIT = {};
for (const items of Object.values(CHAMPIONS_ITEM_CATEGORIES)) {
  Object.assign(itemNameIT, items);
}
function itemDisplayName(itemSlug) {
  return itemNameIT[itemSlug] || itemSlug.replace(/-/g, " ");
}

function normalizeOcrText(s) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

function addToLookup(lookup, names) {
  names.forEach((slug) => {
    lookup[normalizeOcrText(slug)] = slug;
  });
}

// Slug PokéAPI più vicino al testo OCR di un ritaglio, solo se abbastanza
// simile: evita falsi positivi quando il ritaglio non contiene un testo
// leggibile, ma tollera un paio di caratteri sbagliati (l'OCR reale su uno
// screenshot compresso raramente legge un nome carattere per carattere).
// extraSuffixes gestisce casi come le forme di genere delle specie (Pyroar,
// Meowstic, Indeedee... -> slug con suffisso "-male").
function closestMatch(rawText, lookup, extraSuffixes = []) {
  const query = normalizeOcrText(rawText);
  if (query.length < 3) return null;
  if (lookup[query]) return lookup[query];
  for (const suffix of extraSuffixes) {
    if (lookup[`${query}${suffix}`]) return lookup[`${query}${suffix}`];
  }

  let best = null;
  let bestDist = Infinity;
  for (const key in lookup) {
    if (Math.abs(key.length - query.length) > 2) continue;
    const dist = levenshtein(query, key);
    if (dist < bestDist) {
      bestDist = dist;
      best = lookup[key];
    }
  }
  const threshold = Math.max(2, Math.round(query.length * 0.25));
  return bestDist <= threshold ? best : null;
}

// Manda lo screenshot "Info Pokémon" a Gemini (via backend, ai-vision.js)
// prima di far partire l'OCR: l'AI vede l'immagine intera e indovina le 6
// specie, l'OCR poi le userà come rosa ristretta per il match del nome
// (vedi buildHintedLookup) invece di cercare su tutto il pokedex.
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Impossibile leggere il file."));
    reader.readAsDataURL(file);
  });
}

async function fetchVisionHints(file) {
  const imageBase64 = await fileToBase64(file);
  const res = await fetch(AI_VISION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType: file.type || "image/png" }),
  });
  if (!res.ok) throw new Error(`AI vision error ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.pokemon) ? data.pokemon : [];
}

// Dizionario ristretto ai soli slug suggeriti dall'AI (risolti sul lookup
// completo, che già capisce sia inglese che italiano). closestMatch cercherà
// prima qui: 6 candidati invece di ~1000+ specie riduce di molto i falsi
// positivi sui ritagli OCR rumorosi. Nomi non riconosciuti vengono scartati;
// se la lista è vuota (AI irraggiungibile) il chiamante ricade sul lookup pieno.
function buildHintedLookup(names, fullLookup) {
  const hinted = {};
  for (const name of names || []) {
    if (!name) continue;
    const slug = closestMatch(name, fullLookup, ["male"]);
    if (slug) hinted[normalizeOcrText(slug)] = slug;
  }
  return hinted;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non valida."));
    img.src = URL.createObjectURL(file);
  });
}

// Soglia di Otsu: il taglio di luminosità che massimizza la varianza tra le
// due classi risultanti. Rispetto a una semplice media, individua meglio la
// valle tra il picco "testo" e il picco "sfondo" anche quando lo sfondo ha
// una texture a righe leggere (il caso delle schede del gioco).
function otsuThreshold(lums) {
  const hist = new Array(256).fill(0);
  for (let p = 0; p < lums.length; p++) hist[Math.min(255, Math.max(0, Math.round(lums[p])))]++;

  const total = lums.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0, weightB = 0, maxVariance = 0, threshold = 127;
  for (let t = 0; t < 256; t++) {
    weightB += hist[t];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += t * hist[t];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) * (meanB - meanF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

// Il nome è testo scuro o chiaro in grassetto (la polarità varia con
// luminosità/tema dello screenshot, quindi non la fissiamo a priori), lo
// sfondo scheda è viola/lavanda con una leggera texture a righe. Sogliamo
// con Otsu e assumiamo che il testo sia la classe minoritaria di pixel (poco
// inchiostro, molto sfondo), poi lo portiamo a nero su bianco: il contrasto
// che Tesseract legge meglio.
function binarizeNameCrop(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const n = d.length / 4;
  const lums = new Float32Array(n);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    lums[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  const threshold = otsuThreshold(lums);

  let darkCount = 0;
  for (let p = 0; p < n; p++) if (lums[p] < threshold) darkCount++;
  const textIsDark = darkCount <= n - darkCount;

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const isDarkPixel = lums[p] < threshold;
    const isText = textIsDark ? isDarkPixel : !isDarkPixel;
    const v = isText ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);
}

// Rilevamento dinamico delle 6 schede viola (2 colonne x 3 righe), invece di
// coordinate hardcoded: scansioniamo i pixel per bande orizzontali/verticali
// dello sfondo viola/lavanda della scheda, così il roster si può leggere da
// uno screenshot di qualunque risoluzione/telefono, non solo da quella
// misurata in fase di sviluppo. Le sotto-regioni (nome/abilità/oggetto/
// mosse/stat) restano invece percentuali fisse relative alla scheda
// rilevata, tarate su un vero screenshot 3088x1440 della team preview di
// Pokémon Champions. Da ritarare se il gioco cambia UI.
function isCardPurple(r, g, b) {
  return b > r + 5 && b > g + 20 && r > 50 && r < 200 && b > 110 && b < 240;
}

// Bande contigue dove fracArray supera threshold, scartando quelle più
// corte di minSize (rumore).
function findBands(fracArray, threshold, minSize) {
  const bands = [];
  let start = null;
  for (let i = 0; i < fracArray.length; i++) {
    if (fracArray[i] > threshold && start === null) {
      start = i;
    } else if (fracArray[i] <= threshold && start !== null) {
      if (i - start >= minSize) bands.push([start, i]);
      start = null;
    }
  }
  if (start !== null && fracArray.length - start >= minSize) bands.push([start, fracArray.length]);
  return bands;
}

// Una scheda può apparire come una o più bande di colore adiacenti (es. nella
// tab "Info Pokémon" la porzione nome/abilità e quella mosse hanno due
// sfumature di viola leggermente diverse, quindi il rilevamento le vede come
// bande separate). Raggruppiamo le bande di una riga in (al più) 2 schede
// tagliando nel punto con lo spazio più ampio tra bande consecutive: quello
// è per costruzione il confine tra la scheda sinistra e quella destra, tutti
// gli altri spazi sono più piccoli confini interni alla stessa scheda.
function splitBandsIntoTwoCards(bands) {
  if (bands.length <= 1) return bands;

  let maxGapIndex = 0;
  let maxGap = -Infinity;
  for (let i = 0; i < bands.length - 1; i++) {
    const gap = bands[i + 1][0] - bands[i][1];
    if (gap > maxGap) {
      maxGap = gap;
      maxGapIndex = i;
    }
  }

  const groups = [bands.slice(0, maxGapIndex + 1), bands.slice(maxGapIndex + 1)];
  return groups.map((group) => [group[0][0], group[group.length - 1][1]]);
}

const EXPECTED_CARD_ROWS = 3;

// Rileva i box (in pixel dell'immagine originale) delle schede Pokémon,
// in ordine di lettura (riga per riga, sinistra poi destra).
function detectCardBoxes(img) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const purple = new Uint8Array(w * h);
  const rowFrac = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const i = (rowOffset + x) * 4;
      const isPurple = isCardPurple(data[i], data[i + 1], data[i + 2]) ? 1 : 0;
      purple[rowOffset + x] = isPurple;
      sum += isPurple;
    }
    rowFrac[y] = sum / w;
  }

  let rowBands = findBands(rowFrac, 0.15, h * 0.03);
  if (!rowBands.length) return [];
  const maxRowHeight = Math.max(...rowBands.map(([s, e]) => e - s));
  rowBands = rowBands
    .filter(([s, e]) => e - s >= maxRowHeight * 0.6) // scarta la barra superiore dell'interfaccia (più sottile)
    .sort((a, b) => a[0] - b[0])
    .slice(0, EXPECTED_CARD_ROWS);

  const cardBoxes = [];
  for (const [ry0, ry1] of rowBands) {
    const colFrac = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = ry0; y < ry1; y++) sum += purple[y * w + x];
      colFrac[x] = sum / (ry1 - ry0);
    }
    const colBands = splitBandsIntoTwoCards(findBands(colFrac, 0.5, w * 0.01));

    for (const [cx0, cx1] of colBands) {
      cardBoxes.push({ x: cx0, y: ry0, w: cx1 - cx0, h: ry1 - ry0 });
    }
  }
  return cardBoxes;
}

const CROP_SCALE = 3; // upscale prima dell'OCR, il testo piccolo si legge meglio ingrandito

function cardRegionRect(card, frac) {
  return {
    sx: card.x + frac.left * card.w,
    sy: card.y + frac.top * card.h,
    sw: (frac.right - frac.left) * card.w,
    sh: (frac.bottom - frac.top) * card.h,
  };
}

// Ritaglia una sotto-regione di una scheda (frazioni 0-1 relative al box
// della scheda) e la binarizza per l'OCR.
function cropCardRegion(img, card, frac) {
  const { sx, sy, sw, sh } = cardRegionRect(card, frac);
  const canvas = document.createElement("canvas");
  canvas.width = sw * CROP_SCALE;
  canvas.height = sh * CROP_SCALE;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  binarizeNameCrop(ctx, canvas.width, canvas.height);
  return canvas;
}

// Come cropCardRegion ma senza binarizzare: serve per analizzare il colore
// originale dei pixel (le frecce di natura), non per l'OCR.
function cropCardRegionRaw(img, card, frac) {
  const { sx, sy, sw, sh } = cardRegionRect(card, frac);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Tab "Info Pokémon": nome in alto a sinistra (dopo lo sprite, prima delle
// icone genere/tipo), abilità e oggetto sotto (con margine maggiore per
// l'oggetto per saltarne l'icona), le 4 mosse in colonna sulla destra.
const NAME_REGION = { left: 0.0952, right: 0.421, top: 0, bottom: 0.242 };
const ABILITY_REGION = { left: 0.0868, right: 0.607, top: 0.30, bottom: 0.47 };
const ITEM_REGION = { left: 0.1238, right: 0.607, top: 0.56, bottom: 0.73 };
const MOVES_BOX_REGION = { left: 0.6473, right: 1.0 };
const MOVE_TEXT_LEFT_MARGIN = 0.05; // frazione della larghezza della colonna mosse, per saltare l'icona tipo

const MOVES_TOP_MARGIN = 0.04; // evita il bordo/angolo arrotondato in alto della scheda, sopra la prima mossa

function cropMoveRegions(img, card) {
  const boxLeft = card.x + MOVES_BOX_REGION.left * card.w;
  const boxW = (MOVES_BOX_REGION.right - MOVES_BOX_REGION.left) * card.w;
  const listTop = card.y + MOVES_TOP_MARGIN * card.h;
  const rowH = (card.h * (1 - MOVES_TOP_MARGIN)) / 4;

  const canvases = [];
  for (let i = 0; i < 4; i++) {
    canvases.push(cropCardRegion(img, {
      x: boxLeft + MOVE_TEXT_LEFT_MARGIN * boxW,
      y: listTop + i * rowH,
      w: boxW * (1 - MOVE_TEXT_LEFT_MARGIN),
      h: rowH,
    }, { left: 0, right: 1, top: 0, bottom: 1 }));
  }
  return canvases;
}

// Tab "Statistiche": PS/Attacco/Difesa nella metà sinistra della scheda,
// Att.Sp/Dif.Sp/Velocità nella metà destra, stesso ordine di STAT_KEYS.
// Ogni riga mostra numero finale + un trattino + il piccolo numero di SP: ci
// serve solo il primo numero, quindi il ritaglio si ferma prima del trattino.
const STAT_ROWS = [
  { top: 0.30, bottom: 0.512 },
  { top: 0.512, bottom: 0.723 },
  { top: 0.723, bottom: 0.935 },
];
const STAT_COL_LEFT = { left: 0.29, right: 0.38 };
const STAT_COL_RIGHT = { left: 0.762, right: 0.85 };

// Ritorna 6 ritagli nell'ordine di STAT_KEYS (hp, attack, defense,
// special-attack, special-defense, speed).
function cropStatRegions(img, card) {
  const canvases = [];
  for (const col of [STAT_COL_LEFT, STAT_COL_RIGHT]) {
    for (const row of STAT_ROWS) {
      canvases.push(cropCardRegion(img, card, { left: col.left, right: col.right, top: row.top, bottom: row.bottom }));
    }
  }
  return canvases;
}

// Dopo il trattino, il numero di SP investiti (0-32, valore diretto: il
// gioco non usa gli EV classici 0-252). Stessa disposizione di cropStatRegions.
const SP_COL_LEFT = { left: 0.42, right: 0.475 };
const SP_COL_RIGHT = { left: 0.89, right: 0.95 };

function cropSpRegions(img, card) {
  const canvases = [];
  for (const col of [SP_COL_LEFT, SP_COL_RIGHT]) {
    for (const row of STAT_ROWS) {
      canvases.push(cropCardRegion(img, card, { left: col.left, right: col.right, top: row.top, bottom: row.bottom }));
    }
  }
  return canvases;
}

// Tra la fine dell'etichetta e l'inizio del numero c'è, quando la natura non
// è neutra, una doppia freccia colorata: rossa verso l'alto per la stat
// aumentata (+10%), blu verso il basso per quella diminuita (-10%). Verificato
// sui pixel reali dello screenshot: tonalità ~320° per il rosso e ~210° per
// il blu, ben distinte dal viola di sfondo (~250°). Nota: questo è
// l'opposto della convenzione "blu=su/rosso=giù" di altri giochi Pokémon.
const NATURE_ARROW_COL_LEFT = { left: 0.22, right: 0.29 };
const NATURE_ARROW_COL_RIGHT = { left: 0.68, right: 0.762 };

// Ritorna 6 ritagli (non binarizzati: qui serve il colore) nell'ordine di
// STAT_KEYS, stessa disposizione di cropStatRegions.
function cropNatureArrowRegions(img, card) {
  const canvases = [];
  for (const col of [NATURE_ARROW_COL_LEFT, NATURE_ARROW_COL_RIGHT]) {
    for (const row of STAT_ROWS) {
      canvases.push(cropCardRegionRaw(img, card, { left: col.left, right: col.right, top: row.top, bottom: row.bottom }));
    }
  }
  return canvases;
}

// "up" (freccia rossa, stat aumentata), "down" (freccia blu, stat diminuita)
// o null (nessuna freccia, stat neutra), contando i pixel per tonalità.
function detectNatureArrow(canvas) {
  const ctx = canvas.getContext("2d");
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let blueCount = 0;
  let redCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < 0.15) continue;

    let hue;
    if (max === min) hue = 0;
    else if (max === r) hue = 60 * (((g - b) / (max - min)) % 6);
    else if (max === g) hue = 60 * ((b - r) / (max - min) + 2);
    else hue = 60 * ((r - g) / (max - min) + 4);
    if (hue < 0) hue += 360;

    if (hue >= 195 && hue <= 235) blueCount++;
    else if (hue >= 310 && hue <= 350) redCount++;
  }
  if (redCount > blueCount && redCount > 5) return "up";
  if (blueCount > redCount && blueCount > 5) return "down";
  return null;
}

// Le 25 nature hanno un effetto +10%/-10% univoco su una coppia di stat
// (vedi NATURES in damage.js): dalla coppia (stat aumentata, stat diminuita)
// rilevata dalle frecce si risale alla natura esatta. Se non se ne rileva
// nessuna (o solo una), la natura è neutra/non determinabile: "Hardy".
function natureFromArrows(boostedKey, loweredKey) {
  if (!boostedKey || !loweredKey) return "Hardy";
  for (const name in NATURES) {
    const n = NATURES[name];
    if (n.plus === boostedKey && n.minus === loweredKey) return name;
  }
  return "Hardy";
}

// Worker Tesseract riutilizzato tra uno screenshot e l'altro (crearne uno
// per ritaglio sarebbe molto più lento). setOcrMode cambia whitelist/PSM a
// seconda che si stia leggendo testo (nome/abilità/oggetto/mosse) o cifre
// (stat numeriche).
let ocrWorkerPromise = null;
async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = Tesseract.createWorker("eng");
  }
  return ocrWorkerPromise;
}

let ocrMode = null;
async function setOcrMode(worker, mode) {
  if (ocrMode === mode) return;
  ocrMode = mode;
  await worker.setParameters({
    tessedit_char_whitelist: mode === "digits"
      ? "0123456789"
      : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ",
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
  });
}

async function ocrCanvas(worker, canvas) {
  const { data } = await worker.recognize(canvas);
  return data.text;
}

// Fallback se il numero di SP non è leggibile: risali dal valore finale
// della stat, provando ogni SP possibile (0-32) con la natura rilevata.
function solveSpForStat(statKey, base, target, natureName) {
  if (base == null) return 0;
  let bestSp = 0;
  let bestDiff = Infinity;
  for (let sp = 0; sp <= MAX_SP_PER_STAT; sp++) {
    const diff = Math.abs(calcStat(statKey, base, 31, sp, LEVEL, natureName) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSp = sp;
    }
  }
  return bestSp;
}

// Il ciclo Scatto -> Visione -> Analisi Tattica -> Update UI dell'import da
// screenshot è coordinato da TeamPreviewOrchestrator (orchestrator.js), che
// riusa le funzioni OCR/AI-vision/crop qui sopra e collega il click su
// screenshotBuildBtn.

fetchPokemonNames().then((names) => {
  allNames = names;
  addToLookup(nameLookup, names);
  document.getElementById("pokemon-names").innerHTML = names
    .map((n) => `<option value="${n}"></option>`)
    .join("");
});

// Nomi italiani per il riconoscimento OCR (specie/mosse/oggetti/abilità): se
// una fetch fallisce (rete offline, endpoint irraggiungibile) restano
// comunque riconoscibili i nomi coincidenti con l'inglese, già nel lookup.
fetchItalianNameMap().then((map) => Object.assign(nameLookup, map)).catch(() => {});

fetchMoveNames().then((names) => addToLookup(moveLookup, names));
fetchItalianMoveMap(moveNameIT).then((map) => Object.assign(moveLookup, map)).then(renderRoster).catch(() => {});

fetchAbilityNames().then((names) => {
  addToLookup(abilityLookup, names);
  document.getElementById("ability-names").innerHTML = names
    .map((n) => `<option value="${n}"></option>`)
    .join("");
});
fetchItalianAbilityMap().then((map) => Object.assign(abilityLookup, map)).catch(() => {});

// Oggetti: elenco chiuso (CHAMPIONS_ITEM_CATEGORIES in champions-roster.js),
// niente fetch dell'intera lista PokéAPI. Il lookup OCR riconosce sia lo
// slug inglese sia il nome italiano ufficiale, già noti in anticipo.
for (const items of Object.values(CHAMPIONS_ITEM_CATEGORIES)) {
  addToLookup(itemLookup, Object.keys(items));
  for (const [slug, label] of Object.entries(items)) {
    itemLookup[normalizeOcrText(label)] = slug;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderTeamTabs();
  renderRoster();
});

// --- Assistente AI "Professoressa Pokémon" (Scout) --------------------------
// Collega l'overlay Scout (scout.js) al roster attivo, via il server Node.js
// locale (server.js).
const btnCoach = document.getElementById("btn-coach");

async function fetchAICoachAdvice(rosterData) {
  try {
    const res = await fetch(AI_COACH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roster: rosterData }),
    });
    
    if (!res.ok) throw new Error("Errore di connessione al server locale.");
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    return data.advice;
  } catch (err) {
    console.error("Errore Coach:", err);
    throw err;
  }
}

async function handleCoachAnalysis() {
  const rosterData = activeTeam().mons;

  if (!rosterData.length) {
    Scout.show();
    Scout.setExpression("idle");
    Scout.say("Il tuo roster è vuoto. Aggiungi qualche Pokémon prima di chiedermi un parere!", 3000);
    return;
  }

  Scout.show();
  Scout.setExpression("thinking");
  Scout.say("Mmh, fammi dare un'occhiata alle sinergie del tuo team...", 3000);

  try {
    const advice = await fetchAICoachAdvice(rosterData);
    Scout.setExpression("speaking");
    Scout.say(advice, 5000);
  } catch {
    Scout.setExpression("idle");
    Scout.say("Ops, c'è stato un problema di connessione col Server PC di Bill. Riprova più tardi!", 4000);
  }
}

btnCoach.addEventListener("click", handleCoachAnalysis);
