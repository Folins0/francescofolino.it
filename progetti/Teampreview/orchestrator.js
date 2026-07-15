// Orchestratore dell'import team da screenshot: Scatto -> Visione -> Analisi
// Tattica -> Update UI. Nessun modulo qui: gli script sono caricati in ordine
// in index.html (champions-roster, pokeapi, damage, app, orchestrator), quindi
// questa classe riusa le funzioni e le costanti globali già definite altrove
// invece di duplicarle.

class TeamPreviewOrchestrator {
  constructor() {
    this.worker = null;
  }

  // Scatto: prende i file scelti dall'utente e li decodifica in immagini
  // (mantiene anche il File originale di "Info Pokémon", serve tale e quale
  // all'hint AI in Visione, che lo manda al backend come base64).
  async scatto(infoFile, statsFile) {
    if (!infoFile) throw new Error('Carica almeno lo screenshot della tab "Info Pokémon".');
    const infoImg = await loadImage(infoFile);
    const statsImg = statsFile ? await loadImage(statsFile) : null;
    return { infoFile, infoImg, statsImg };
  }

  // Visione (Sessione 2): hint AI (Gemini, via server.js/ai-vision.js) sulle
  // specie presenti, poi OCR delle schede -> specie, abilità, oggetto, mosse,
  // e se presente lo screenshot Statistiche, anche natura e SP. Se il backend
  // AI non è raggiungibile si procede con il solo OCR, senza rompersi.
  async visione({ infoFile, infoImg, statsImg }) {
    setScreenshotFeedback("Analizzo lo screenshot con l'AI…");
    let hintedLookup = {};
    try {
      const hints = await fetchVisionHints(infoFile);
      console.log("[TeamPreview AI] specie suggerite:", hints);
      hintedLookup = buildHintedLookup(hints, nameLookup);
    } catch (err) {
      console.log(`[TeamPreview AI] analisi vision non disponibile, procedo solo con OCR: ${err.message}`);
    }
    setScreenshotFeedback("Leggo le immagini… la prima volta scarica il modulo OCR, può richiedere qualche secondo.");

    this.worker = await getOcrWorker();
    const cards = detectCardBoxes(infoImg);
    console.log(`[TeamPreview OCR] schede rilevate: ${cards.length}`);
    if (!cards.length) {
      throw new Error("Non ho trovato nessuna scheda Pokémon nello screenshot. Prova a costruire il team manualmente.");
    }

    await setOcrMode(this.worker, "letters");
    const mons = [];
    for (let i = 0; i < Math.min(cards.length, MAX_TEAM_SIZE); i++) {
      const card = cards[i];
      const nameText = await ocrCanvas(this.worker, cropCardRegion(infoImg, card, NAME_REGION));
      const speciesSlug = closestMatch(nameText, hintedLookup, ["male"]) || closestMatch(nameText, nameLookup, ["male"]);
      console.log(`[TeamPreview OCR] scheda ${i + 1}: letto "${nameText.trim()}" -> ${speciesSlug || "NESSUN MATCH"}`);
      if (!speciesSlug) continue;

      let mon;
      try {
        mon = await fetchPokemon(speciesSlug);
      } catch (err) {
        console.log(`[TeamPreview OCR] scheda ${i + 1}: "${speciesSlug}" scartato - ${err.message}`);
        continue; // riconosciuto dall'OCR ma non trovato su PokéAPI o non in roster
      }

      const abilityText = await ocrCanvas(this.worker, cropCardRegion(infoImg, card, ABILITY_REGION));
      const abilitySlug = closestMatch(abilityText, abilityLookup);
      if (abilitySlug) mon.ability = abilitySlug;

      const itemText = await ocrCanvas(this.worker, cropCardRegion(infoImg, card, ITEM_REGION));
      const itemSlug = closestMatch(itemText, itemLookup);
      if (itemSlug) mon.item = itemSlug;

      const moveCanvases = cropMoveRegions(infoImg, card);
      for (let m = 0; m < moveCanvases.length; m++) {
        const moveText = await ocrCanvas(this.worker, moveCanvases[m]);
        const moveSlug = closestMatch(moveText, moveLookup);
        if (moveSlug) mon.moves[m] = moveSlug;
      }

      mons.push(mon);
    }

    if (!mons.length) {
      throw new Error("Non ho riconosciuto nessun Pokémon negli screenshot. Prova a costruire il team manualmente.");
    }

    if (statsImg) await this.leggiStatistiche(mons, statsImg);
    return mons;
  }

  // Parte di Visione: legge natura (dalle frecce) e SP (dai numeri) per ogni scheda.
  async leggiStatistiche(mons, statsImg) {
    const statCards = detectCardBoxes(statsImg);
    await setOcrMode(this.worker, "digits");

    for (let i = 0; i < Math.min(statCards.length, mons.length); i++) {
      const card = statCards[i];
      const statCanvases = cropStatRegions(statsImg, card);
      const spCanvases = cropSpRegions(statsImg, card);
      const arrowCanvases = cropNatureArrowRegions(statsImg, card);

      let boostedKey = null;
      let loweredKey = null;
      for (let s = 0; s < STAT_KEYS.length; s++) {
        const dir = detectNatureArrow(arrowCanvases[s]);
        if (dir === "up") boostedKey = STAT_KEYS[s];
        else if (dir === "down") loweredKey = STAT_KEYS[s];
      }
      mons[i].nature = natureFromArrows(boostedKey, loweredKey);

      for (let s = 0; s < STAT_KEYS.length; s++) {
        const key = STAT_KEYS[s];

        const spText = await ocrCanvas(this.worker, spCanvases[s]);
        const spValue = parseInt(spText.replace(/[^0-9]/g, ""), 10);
        if (Number.isFinite(spValue) && spValue <= MAX_SP_PER_STAT) {
          mons[i].sp[key] = spValue;
          continue;
        }

        const digitsText = await ocrCanvas(this.worker, statCanvases[s]);
        const target = parseInt(digitsText.replace(/[^0-9]/g, ""), 10);
        if (Number.isFinite(target)) {
          mons[i].sp[key] = solveSpForStat(key, mons[i].stats[key], target, mons[i].nature);
        }
      }
    }
  }

  // Analisi Tattica (Sessione 3): debolezze/resistenze/immunità per Pokémon e
  // copertura offensiva del team appena letto, calcolate su `mons` senza
  // toccare lo stato o il DOM (li usa Update UI, dopo).
  async analisiTattica(mons) {
    // getCachedMove legge solo dati già scaricati: senza questo prefetch la
    // copertura risulterebbe vuota per le mosse dei Pokémon appena importati.
    await Promise.all(
      mons.flatMap((mon) => mon.moves.filter(Boolean).map((name) => fetchMoveDetail(name).catch(() => null)))
    );

    const weaknesses = mons.map((mon) => {
      const weak = [], resist = [], immune = [];
      TYPES.forEach((atkType) => {
        const mult = typeEffectiveness(atkType, mon.types);
        if (mult === 0) immune.push(atkType);
        else if (mult > 1) weak.push(atkType);
        else if (mult < 1) resist.push(atkType);
      });
      return { name: mon.name, weak, resist, immune };
    });

    const attackMoves = mons.flatMap((mon) => mon.moves.map(getCachedMove).filter((d) => d && d.power));
    const coverage = TYPES.filter((defType) => attackMoves.some((m) => typeEffectiveness(m.type, [defType]) >= 2));
    const uncovered = TYPES.filter((t) => !coverage.includes(t));

    return { weaknesses, coverage, uncovered };
  }

  // Update UI (Sessione 1): commit del team nello stato e render (tabs, roster,
  // e a cascata il pannello matchup/copertura via renderRoster -> renderMatchup).
  updateUI(mons, tactical) {
    addImportedTeam(mons);
    const coverageNote = tactical.uncovered.length
      ? ` Copertura mosse incompleta contro: ${tactical.uncovered.join(", ")}.`
      : "";
    setScreenshotFeedback(`Team creato con ${mons.length} Pokémon riconosciuti (su 6 attesi). Controlla e completa a mano se serve.${coverageNote}`);
  }

  // Ciclo completo: Scatto -> Visione -> Analisi Tattica -> Update UI.
  async run(infoFile, statsFile) {
    if (state.teams.length >= MAX_TEAMS) {
      setScreenshotFeedback("Hai già 6 team: rimuovine uno prima di importarne un altro.", true);
      return;
    }

    screenshotBuildBtn.disabled = true;

    try {
      const shot = await this.scatto(infoFile, statsFile);
      const mons = await this.visione(shot);
      const tactical = await this.analisiTattica(mons);
      this.updateUI(mons, tactical);
    } catch (err) {
      setScreenshotFeedback(err.message || "Errore nella lettura degli screenshot. Riprova o costruisci il team a mano.", true);
    } finally {
      screenshotBuildBtn.disabled = false;
    }
  }
}

const teamPreviewOrchestrator = new TeamPreviewOrchestrator();

screenshotBuildBtn.addEventListener("click", () => {
  teamPreviewOrchestrator.run(screenshot1Input.files[0], screenshot2Input.files[0]);
});
