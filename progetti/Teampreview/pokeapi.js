// pokeapi.js
// Wrapper minimale attorno a PokéAPI (https://pokeapi.co).
// Nessuna chiave richiesta, endpoint pubblico e gratuito.

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const POKEAPI_GRAPHQL = "https://beta.pokeapi.co/graphql/v1beta";

/**
 * Cerca un Pokémon per nome (case-insensitive) e restituisce
 * i dati essenziali per una card del roster.
 * Lancia un errore con messaggio leggibile se non trovato.
 */
async function fetchPokemon(name) {
  const query = name.trim().toLowerCase().replace(/\s+/g, "-");
  if (!query) throw new Error("Inserisci un nome.");

  let res = await fetch(`${POKEAPI_BASE}/pokemon/${query}`);
  if (res.status === 404) {
    // Alcune specie con più forme (Aegislash, Meowstic, Pyroar, Basculin,
    // Palafin, Tatsugiri...) non hanno una voce col nome nudo su PokéAPI:
    // risaliamo alla forma di default tramite l'endpoint species, invece di
    // indovinare un suffisso fisso.
    const speciesRes = await fetch(`${POKEAPI_BASE}/pokemon-species/${query}`);
    if (speciesRes.ok) {
      const species = await speciesRes.json();
      const defaultVariety = species.varieties.find((v) => v.is_default);
      if (defaultVariety) res = await fetch(defaultVariety.pokemon.url);
    }
  }
  if (res.status === 404) {
    throw new Error(`Nessun Pokémon trovato per "${name}".`);
  }
  if (!res.ok) {
    throw new Error("PokéAPI non ha risposto correttamente. Riprova.");
  }

  const data = await res.json();

  if (!CHAMPIONS_ROSTER.has(data.name)) {
    throw new Error(`${data.name} non è disponibile in Pokémon Champions.`);
  }

  return {
    id: data.id,
    name: data.name,
    sprite:
      data.sprites?.front_default ||
      data.sprites?.other?.["official-artwork"]?.front_default ||
      "",
    types: data.types.map((t) => t.type.name),
    stats: Object.fromEntries(
      data.stats.map((s) => [s.stat.name, s.base_stat])
    ),
    // Fase 2: rosa di mosse imparabili (solo nomi, il dettaglio si scarica
    // alla scelta tramite fetchMoveDetail) e set di battaglia con default
    // neutri, modificabile dal pannello "Statistiche" del roster.
    learnset: data.moves.map((m) => m.move.name),
    moves: [null, null, null, null],
    item: "",
    ability: "", // editabile dal modal Statistiche del roster, o popolata dall'import screenshot
    sp: { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 },
    iv: { hp: 31, attack: 31, defense: 31, "special-attack": 31, "special-defense": 31, speed: 31 },
    nature: "Hardy",
  };
}

/**
 * Dati reali della forma Mega di un Pokémon (sprite, tipi, stats, abilità),
 * se PokéAPI la conosce. Alcune megaevoluzioni di Pokémon Champions sono
 * inventate e non esistono su PokéAPI: in quel caso restituisce null, e il
 * chiamante applica un boost sintetico (vedi megaEvolve in app.js).
 */
async function fetchMegaForm(baseName, variant) {
  const slug = `${baseName}-mega${variant ? `-${variant}` : ""}`;
  const res = await fetch(`${POKEAPI_BASE}/pokemon/${slug}`);
  if (!res.ok) return null;
  const data = await res.json();

  return {
    sprite:
      data.sprites?.front_default ||
      data.sprites?.other?.["official-artwork"]?.front_default ||
      "",
    types: data.types.map((t) => t.type.name),
    stats: Object.fromEntries(data.stats.map((s) => [s.stat.name, s.base_stat])),
    ability: data.abilities?.find((a) => !a.is_hidden)?.ability.name || data.abilities?.[0]?.ability.name || "",
  };
}

// Cache in memoria dei dettagli mossa (tipo, potenza, categoria): evitiamo
// di richiamare PokéAPI ogni volta che una mossa viene mostrata o ricalcolata.
const moveCache = {};

function moveCacheKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Testo italiano (flavor text) di un'entità, se presente tra le sue voci
 * multilingua. Il campo testo si chiama "flavor_text" per mosse/abilità ma
 * "text" per gli strumenti (item) — stessa struttura a parte il nome campo.
 */
function pickFlavorText(entries, lang) {
  const entry = entries?.find((e) => e.language.name === lang);
  const text = entry?.flavor_text ?? entry?.text;
  return text ? text.replace(/[\n\f]/g, " ") : null;
}

// --- Testo esatto degli effetti (punto richiesto: "di quanto" cala/sale una
// stat, non solo "cala"), generato dai campi strutturati di PokéAPI
// (stat_changes, meta, target) invece che dal flavor text generico, che non
// riporta mai numeri. Copre automaticamente tutte le mosse, non solo quelle
// elencate a mano. ---

const STAT_NAME_IT = {
  hp: "PS", attack: "Attacco", defense: "Difesa",
  "special-attack": "Attacco Speciale", "special-defense": "Difesa Speciale",
  speed: "Velocità", accuracy: "Precisione", evasion: "Elusione",
};

const AILMENT_NAME_IT = {
  paralysis: "paralisi", poison: "veleno", "bad-poison": "iperveleno",
  burn: "scottatura", freeze: "congelamento", sleep: "sonno",
  confusion: "confusione", trap: "intrappolamento", "leech-seed": "pianta succhiante",
  nightmare: "incubo", torment: "tormento", disable: "blocco della mossa",
  yawn: "sonnolenza (si addormenta al turno successivo)", "heal-block": "blocco delle cure",
  embargo: "embargo (blocco oggetti)", "perish-song": "canto del commiato (KO tra 3 turni)",
  ingrain: "radicamento", silence: "silenzio (solo mosse sonore)",
  "no-type-immunity": "rimozione delle immunità di tipo",
};

// Frase preposizionale già concordata ("sul", "sull'", "su"...), per evitare
// concatenazioni scorrette tipo "su il bersaglio".
const TARGET_PHRASE_IT = {
  user: "su se stesso", ally: "sull'alleato", "user-and-allies": "sul lanciatore e sugli alleati",
  "user-or-ally": "sul lanciatore o su un alleato", "all-other-pokemon": "su tutti gli altri Pokémon",
  "selected-pokemon": "sul bersaglio", "all-opponents": "su tutti gli avversari",
  "entire-field": "sull'intero campo", "user-side": "sul proprio campo",
  "users-field": "sul proprio campo", "opponents-field": "sul campo avversario",
  "all-pokemon": "su tutti i Pokémon in campo", "all-allies": "su tutti gli alleati",
  "random-opponent": "su un avversario casuale", "fainting-pokemon": "sul Pokémon appena esausto",
  "selected-pokemon-me-first": "sul bersaglio",
};

// Tabella standard dei livelli di modifica statistica (-6..+6): stesso
// moltiplicatore per stat fisiche/speciali/velocità e, dalla Gen 6, anche
// per precisione/elusione.
function stageMultiplier(n) {
  return n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
}
function formatStageMult(n) {
  const m = Math.round(stageMultiplier(n) * 100) / 100;
  return `x${Number.isInteger(m) ? m : m.toFixed(2)}`;
}

function buildMoveEffectText(data) {
  const parts = [];
  const meta = data.meta;
  const targetPhrase = TARGET_PHRASE_IT[data.target?.name] || "";

  if (data.stat_changes?.length) {
    const chance = meta?.stat_chance || 0;
    const chancePrefix = chance > 0 && chance < 100 ? `${chance}% di probabilità — ` : "";
    const changes = data.stat_changes.map((sc) => {
      const label = STAT_NAME_IT[sc.stat.name] || sc.stat.name;
      const sign = sc.change >= 0 ? "+" : "";
      return `${label} ${sign}${sc.change} livell${Math.abs(sc.change) === 1 ? "o" : "i"} (${formatStageMult(sc.change)})`;
    }).join(", ");
    parts.push(`${chancePrefix}${changes}${targetPhrase ? ` ${targetPhrase}` : ""}.`);
  }

  if (meta) {
    if (meta.ailment?.name && meta.ailment.name !== "none") {
      const ail = AILMENT_NAME_IT[meta.ailment.name] || meta.ailment.name.replace(/-/g, " ");
      const chance = meta.ailment_chance;
      parts.push(chance > 0 ? `${chance}% di probabilità di causare ${ail}.` : `Causa ${ail}.`);
    }
    if (meta.drain > 0) parts.push(`Il lanciatore recupera il ${meta.drain}% del danno inflitto in PS.`);
    if (meta.drain < 0) parts.push(`Il lanciatore subisce il ${Math.abs(meta.drain)}% del danno inflitto come contraccolpo.`);
    if (meta.healing > 0) parts.push(`Recupera il ${meta.healing}% dei PS massimi.`);
    if (meta.flinch_chance > 0) parts.push(`${meta.flinch_chance}% di probabilità di far tentennare il bersaglio.`);
    if (meta.crit_rate > 0) parts.push(`Rapporto di brutti colpi aumentato di ${meta.crit_rate} livell${meta.crit_rate === 1 ? "o" : "i"}.`);
    if (meta.min_hits) {
      parts.push(meta.min_hits === meta.max_hits
        ? `Colpisce ${meta.min_hits} volte.`
        : `Colpisce da ${meta.min_hits} a ${meta.max_hits} volte.`);
    }
    if (meta.min_turns) {
      parts.push(meta.min_turns === meta.max_turns
        ? `Dura ${meta.min_turns} turni.`
        : `Dura da ${meta.min_turns} a ${meta.max_turns} turni.`);
    }
  }

  return parts.join(" ");
}

/** Dettaglio di una mossa (tipo, potenza, precisione, categoria, effetto — per tooltip, punto 3). */
async function fetchMoveDetail(name) {
  const key = moveCacheKey(name);
  if (moveCache[key]) return moveCache[key];

  const res = await fetch(`${POKEAPI_BASE}/move/${key}`);
  if (!res.ok) throw new Error(`Mossa "${name}" non trovata.`);
  const data = await res.json();

  const flavor = pickFlavorText(data.flavor_text_entries, "it")
    || data.effect_entries?.find((e) => e.language.name === "en")?.short_effect
    || "";
  const exact = buildMoveEffectText(data);

  const move = {
    name: data.name,
    type: data.type.name,
    power: data.power, // null per le mosse di stato
    accuracy: data.accuracy, // null = non può fallire
    damageClass: data.damage_class.name, // physical | special | status
    // Testo narrativo (flavor, punto 3) + riga con i numeri esatti calcolati
    // da stat_changes/meta sopra: il flavor da solo non riporta mai valori.
    effect: [flavor, exact].filter(Boolean).join("\n"),
  };
  moveCache[key] = move;
  return move;
}

/** Dettaglio già in cache, se già scaricato in precedenza (uso sincrono per il rendering). */
function getCachedMove(name) {
  if (!name) return null;
  return moveCache[moveCacheKey(name)] || null;
}

// Cache abilità/oggetti per i tooltip (punto 3): la chiave viene salvata anche
// quando l'entità non esiste (valore null), altrimenti un testo libero non
// valido (es. il campo "oggetto" mentre l'utente sta ancora scrivendo)
// scatenerebbe una fetch fallita a ogni ridisegno.
const abilityCache = {};
const itemCache = {};

/** Dettaglio di un'abilità (descrizione), o null se non trovata. */
async function fetchAbilityDetail(name) {
  const key = moveCacheKey(name);
  if (key in abilityCache) return abilityCache[key];

  const res = await fetch(`${POKEAPI_BASE}/ability/${key}`);
  if (!res.ok) { abilityCache[key] = null; return null; }
  const data = await res.json();

  const ability = {
    name: data.name,
    effect: pickFlavorText(data.flavor_text_entries, "it")
      || data.effect_entries?.find((e) => e.language.name === "en")?.short_effect
      || "",
  };
  abilityCache[key] = ability;
  return ability;
}

function getCachedAbility(name) {
  if (!name) return null;
  const key = moveCacheKey(name);
  return key in abilityCache ? abilityCache[key] : undefined;
}

// Percentuali/valori esatti degli strumenti e delle bacche del roster
// Champions (CHAMPIONS_ITEM_CATEGORIES in champions-roster.js): il flavor
// text di PokéAPI è generico ("aumenta la potenza delle mosse di tipo X")
// e non riporta mai il numero. Valori verificati (meccaniche di gioco
// invariate da diverse generazioni, fonte Bulbapedia). Appesi come riga in
// più al testo di PokéAPI, non lo sostituiscono.
const ITEM_EXACT_EFFECTS_IT = {
  // --- Strumenti e oggetti lotta ---
  "expert-belt": "Aumenta del 20% la potenza delle mosse super efficaci contro il bersaglio (x1.2).",
  "mystic-water": "Aumenta del 20% la potenza delle mosse di tipo Acqua (x1.2).",
  "silver-powder": "Aumenta del 20% la potenza delle mosse di tipo Coleottero (x1.2).",
  "life-orb": "Aumenta del 30% la potenza di tutte le mosse (x1.3); dopo ogni mossa che infligge danno il possessore perde il 10% dei propri PS massimi.",
  leftovers: "Recupera 1/16 (6,25%) dei PS massimi alla fine di ogni turno.",
  "sharp-beak": "Aumenta del 20% la potenza delle mosse di tipo Volante (x1.2).",
  magnet: "Aumenta del 20% la potenza delle mosse di tipo Elettro (x1.2).",
  charcoal: "Aumenta del 20% la potenza delle mosse di tipo Fuoco (x1.2).",
  "black-belt": "Aumenta del 20% la potenza delle mosse di tipo Lotta (x1.2).",
  "shell-bell": "Recupera 1/8 (12,5%) del danno inflitto dal possessore come PS.",
  "light-clay": "Estende a 8 turni (invece di 5) la durata di Riflesso, Schermoluce e Velo Aurora create dal possessore.",
  "twisted-spoon": "Aumenta del 20% la potenza delle mosse di tipo Psico (x1.2).",
  "dragon-fang": "Aumenta del 20% la potenza delle mosse di tipo Drago (x1.2).",
  "shed-shell": "Permette di cambiare Pokémon anche se il possessore è intrappolato o trattenuto da mosse/abilità.",
  "light-ball": "Raddoppia (x2) Attacco e Attacco Speciale, ma solo se il possessore è Pikachu.",
  "iron-ball": "Dimezza la Velocità del possessore (x0.5) e lo rende bersagliabile da mosse di tipo Terra anche se di tipo Volante o con Levitazione.",
  "focus-sash": "Se il possessore è a PS pieni, sopravvive con 1 PS a un colpo che lo farebbe altrimenti stramazzare (anche KO diretti); si consuma dopo l'uso.",
  "never-melt-ice": "Aumenta del 20% la potenza delle mosse di tipo Ghiaccio (x1.2).",
  "big-root": "Aumenta del 30% i PS recuperati dalle mosse assorbi-vita (es. Assorbimento, Megassorbimento, Parassiseme, Radicamento).",
  "bright-powder": "Riduce al 90% (x0.9) la precisione delle mosse dirette contro il possessore.",
  "mental-herb": "Se il possessore è infatuato, provocato, ripetuto, tormentato, bloccato nelle cure o disabilitato, si consuma e lo libera dall'effetto; monouso.",
  "metal-coat": "Aumenta del 20% la potenza delle mosse di tipo Acciaio (x1.2).",
  "miracle-seed": "Aumenta del 20% la potenza delle mosse di tipo Erba (x1.2).",
  "scope-lens": "Aumenta di 1 livello il rapporto di brutti colpi del possessore.",
  "wide-lens": "Aumenta al 110% (x1.1) la precisione delle mosse del possessore.",
  "muscle-band": "Aumenta del 10% la potenza delle mosse fisiche (x1.1).",
  "black-glasses": "Aumenta del 20% la potenza delle mosse di tipo Buio (x1.2).",
  "fairy-feather": "Aumenta del 20% la potenza delle mosse di tipo Folletto (x1.2).",
  metronome: "Aumenta la potenza della mossa usata del 20% per ogni turno consecutivo in cui viene ripetuta la stessa mossa, fino a un massimo di +100% (x2) alla 6ª volta; l'aumento si azzera se il Pokémon cambia mossa, viene cambiato o la mossa fallisce.",
  "quick-claw": "20% di probabilità di agire per primo nella propria fascia di priorità, indipendentemente dalla Velocità.",
  "heat-rock": "Estende a 8 turni (invece di 5) la durata di Giornodisole creato dal possessore.",
  "kings-rock": "10% di probabilità aggiuntiva di far tentennare il bersaglio quando la mossa colpisce (si somma a eventuale probabilità già presente sulla mossa).",
  "icy-rock": "Estende a 8 turni (invece di 5) la durata di Grandine/Nevicata create dal possessore.",
  "damp-rock": "Estende a 8 turni (invece di 5) la durata di Piovaschio creato dal possessore.",
  "smooth-rock": "Estende a 8 turni (invece di 5) la durata di Terrempesta creata dal possessore.",
  "soft-sand": "Aumenta del 20% la potenza delle mosse di tipo Terra (x1.2).",
  "choice-scarf": "Aumenta del 50% la Velocità (x1.5), ma blocca il possessore sulla prima mossa usata finché non cambia Pokémon.",
  "silk-scarf": "Aumenta del 20% la potenza delle mosse di tipo Normale (x1.2).",
  "spell-tag": "Aumenta del 20% la potenza delle mosse di tipo Spettro (x1.2).",
  "poison-barb": "Aumenta del 20% la potenza delle mosse di tipo Veleno (x1.2).",
  "white-herb": "Se una o più statistiche del possessore sono state abbassate, le riporta al livello 0; monouso.",

  // --- Bacche ---
  // Bacche resisti-tipo: dimezzano il danno di un colpo super efficace del
  // tipo indicato, monouso (Baccacinlan fa eccezione: dimezza sempre le
  // mosse di tipo Normale, non solo se super efficaci).
  "occa-berry": "Se colpito da una mossa super efficace di tipo Fuoco, ne dimezza il danno; monouso.",
  "passho-berry": "Se colpito da una mossa super efficace di tipo Acqua, ne dimezza il danno; monouso.",
  "wacan-berry": "Se colpito da una mossa super efficace di tipo Elettro, ne dimezza il danno; monouso.",
  "rindo-berry": "Se colpito da una mossa super efficace di tipo Erba, ne dimezza il danno; monouso.",
  "yache-berry": "Se colpito da una mossa super efficace di tipo Ghiaccio, ne dimezza il danno; monouso.",
  "chople-berry": "Se colpito da una mossa super efficace di tipo Lotta, ne dimezza il danno; monouso.",
  "kebia-berry": "Se colpito da una mossa super efficace di tipo Veleno, ne dimezza il danno; monouso.",
  "shuca-berry": "Se colpito da una mossa super efficace di tipo Terra, ne dimezza il danno; monouso.",
  "coba-berry": "Se colpito da una mossa super efficace di tipo Volante, ne dimezza il danno; monouso.",
  "payapa-berry": "Se colpito da una mossa super efficace di tipo Psico, ne dimezza il danno; monouso.",
  "tanga-berry": "Se colpito da una mossa super efficace di tipo Coleottero, ne dimezza il danno; monouso.",
  "kasib-berry": "Se colpito da una mossa super efficace di tipo Spettro, ne dimezza il danno; monouso.",
  "haban-berry": "Se colpito da una mossa super efficace di tipo Drago, ne dimezza il danno; monouso.",
  "colbur-berry": "Se colpito da una mossa super efficace di tipo Buio, ne dimezza il danno; monouso.",
  "babiri-berry": "Se colpito da una mossa super efficace di tipo Acciaio, ne dimezza il danno; monouso.",
  "roseli-berry": "Se colpito da una mossa super efficace di tipo Folletto, ne dimezza il danno; monouso.",
  "chilan-berry": "Dimezza il danno subito da qualsiasi mossa di tipo Normale, super efficace o no; monouso.",
  // Bacche cura-stato
  "chesto-berry": "Se il possessore si addormenta, la consuma e si sveglia subito.",
  "rawst-berry": "Se il possessore si scotta, la consuma e guarisce dalla scottatura.",
  "pecha-berry": "Se il possessore si avvelena, la consuma e guarisce dal veleno.",
  "persim-berry": "Se il possessore si confonde, la consuma e guarisce dalla confusione.",
  "lum-berry": "Se il possessore ha una qualsiasi alterazione di stato o è confuso, la consuma e ne guarisce.",
  // Bacche PS/PP
  "oran-berry": "Se i PS del possessore scendono al 50% o meno, la consuma e recupera 10 PS.",
  "sitrus-berry": "Se i PS del possessore scendono al 50% o meno, la consuma e recupera il 25% dei PS massimi.",
  "leppa-berry": "Se una mossa del possessore finisce i PP, la consuma e recupera 10 PP di quella mossa.",
  // Bacche "pinch" (attivate sotto il 25% dei PS)
  "liechi-berry": "Se i PS del possessore scendono al 25% o meno, la consuma e aumenta il proprio Attacco di 1 livello (x1.5).",
  "custap-berry": "Se i PS del possessore scendono al 25% o meno, la consuma e agisce per primo nella propria fascia di priorità in quel turno; monouso.",
  // Bacche riduci-PE (fuori combattimento, usate su un Pokémon già allevato)
  "pomeg-berry": "Fuori combattimento, riduce di 10 i punti esperienza (PE) investiti in PS del Pokémon a cui viene data da mangiare.",
  "kelpsy-berry": "Fuori combattimento, riduce di 10 i punti esperienza (PE) investiti in Attacco del Pokémon a cui viene data da mangiare.",
  "qualot-berry": "Fuori combattimento, riduce di 10 i punti esperienza (PE) investiti in Difesa del Pokémon a cui viene data da mangiare.",
  "hondew-berry": "Fuori combattimento, riduce di 10 i punti esperienza (PE) investiti in Attacco Speciale del Pokémon a cui viene data da mangiare.",
  "grepa-berry": "Fuori combattimento, riduce di 10 i punti esperienza (PE) investiti in Difesa Speciale del Pokémon a cui viene data da mangiare.",
  "tamato-berry": "Fuori combattimento, riduce di 10 i punti esperienza (PE) investiti in Velocità del Pokémon a cui viene data da mangiare.",
  // Bacche senza effetto in combattimento nei giochi principali (solo
  // ingrediente per Pokéblock/Poffin, o effetti specifici di Pokémon GO
  // legati alla cattura che non si applicano qui).
  "pinap-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "watmel-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "nanab-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "wiki-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "razz-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "nomel-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "belue-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "bluk-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
  "wepear-berry": "Nessun effetto in combattimento nei giochi principali: ingrediente per Pokéblock/Poffin.",
};

// Megapietre (CHAMPIONS_ITEM_CATEGORIES.Megapietre): mappa inversa di
// MEGA_STONE_BY_POKEMON (slug pietra -> { pokemon, variant }), per risalire
// dallo strumento tenuto al Pokémon e alla variante corretti.
const POKEMON_BY_MEGA_STONE = {};
for (const [mon, entry] of Object.entries(MEGA_STONE_BY_POKEMON)) {
  if (typeof entry === "string") {
    POKEMON_BY_MEGA_STONE[entry] = { pokemon: mon, variant: null };
  } else {
    POKEMON_BY_MEGA_STONE[entry.x] = { pokemon: mon, variant: "x" };
    POKEMON_BY_MEGA_STONE[entry.y] = { pokemon: mon, variant: "y" };
  }
}

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
}

/**
 * Descrizione di una megapietra con le variazioni statistiche ESATTE (non
 * un valore stimato scritto a mano): stat della forma Mega meno stat base,
 * calcolate al volo dai dati reali di PokéAPI (stessa fonte di
 * fetchMegaForm, già usata dal pulsante "Mega Evolvi"). Se PokéAPI non
 * conosce la forma Mega (alcune megaevoluzioni di Pokémon Champions sono
 * inventate, vedi megaEvolve in app.js), lo segnala e mostra la stima
 * sintetica +20 usata dall'app invece di inventare numeri.
 */
async function fetchMegaStoneDetail(slug) {
  const match = POKEMON_BY_MEGA_STONE[slug];
  if (!match) return null;

  const [baseRes, megaData] = await Promise.all([
    fetch(`${POKEAPI_BASE}/pokemon/${match.pokemon}`).then((r) => (r.ok ? r.json() : null)),
    fetchMegaForm(match.pokemon, match.variant),
  ]);
  if (!baseRes) return null;

  const monName = capitalize(match.pokemon);
  const megaLabel = `Mega-${monName}${match.variant ? ` ${match.variant.toUpperCase()}` : ""}`;
  const statOrder = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];

  if (!megaData) {
    const lines = statOrder.map((k) => `${STAT_NAME_IT[k]} +20`).join(", ");
    return {
      name: slug,
      effect: `Permette a ${monName} di Mega Evolversi in ${megaLabel} durante il combattimento. Megaevoluzione non presente su PokéAPI: variazioni statistiche stimate (non ufficiali) di ${lines}, abilità e tipo invariati.`,
    };
  }

  const baseStats = Object.fromEntries(baseRes.stats.map((s) => [s.stat.name, s.base_stat]));
  const baseAbility = baseRes.abilities?.find((a) => !a.is_hidden)?.ability.name || baseRes.abilities?.[0]?.ability.name || "";
  const baseTypes = baseRes.types.map((t) => t.type.name);

  const diffLine = statOrder.map((k) => {
    const diff = (megaData.stats[k] ?? baseStats[k]) - baseStats[k];
    const sign = diff >= 0 ? "+" : "";
    return `${STAT_NAME_IT[k]} ${sign}${diff}`;
  }).join(", ");

  const abilityLine = megaData.ability && megaData.ability !== baseAbility
    ? ` Abilità: ${baseAbility.replace(/-/g, " ")} → ${megaData.ability.replace(/-/g, " ")}.`
    : "";
  const typeLine = megaData.types.join(",") !== baseTypes.join(",")
    ? ` Tipo: ${baseTypes.join("/")} → ${megaData.types.join("/")}.`
    : "";

  return {
    name: slug,
    effect: `Permette a ${monName} di Mega Evolversi in ${megaLabel} durante il combattimento. Variazioni statistiche rispetto alla forma base: ${diffLine}.${typeLine}${abilityLine}`,
  };
}

/** Dettaglio di uno strumento tenuto (effetto), o null se non trovato. */
async function fetchItemDetail(name) {
  const key = moveCacheKey(name);
  if (key in itemCache) return itemCache[key];

  // Megapietra: descrizione calcolata (stat esatte), non testo PokéAPI.
  if (POKEMON_BY_MEGA_STONE[key]) {
    const detail = await fetchMegaStoneDetail(key).catch(() => null);
    itemCache[key] = detail;
    return detail;
  }

  const res = await fetch(`${POKEAPI_BASE}/item/${key}`);
  if (!res.ok) { itemCache[key] = null; return null; }
  const data = await res.json();

  const flavor = pickFlavorText(data.flavor_text_entries, "it")
    || data.effect_entries?.find((e) => e.language.name === "en")?.short_effect
    || "";
  const exact = ITEM_EXACT_EFFECTS_IT[key];

  const item = {
    name: data.name,
    effect: [flavor, exact].filter(Boolean).join("\n"),
  };
  itemCache[key] = item;
  return item;
}

function getCachedItem(name) {
  if (!name) return null;
  const key = moveCacheKey(name);
  return key in itemCache ? itemCache[key] : undefined;
}

/**
 * Scarica una volta la lista di tutti i nomi Pokémon (per l'autocomplete).
 * Usata per popolare una <datalist>, quindi basta il nome.
 */
async function fetchPokemonNames() {
  const res = await fetch(`${POKEAPI_BASE}/pokemon?limit=2000`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.map((p) => p.name).filter((n) => CHAMPIONS_ROSTER.has(n));
}

/**
 * Mappa "nome italiano normalizzato (solo lettere) -> slug PokéAPI inglese",
 * per riconoscere i nomi Pokémon negli screenshot in italiano del gioco.
 * Una sola query GraphQL per tutte le specie (language_id 8 = italiano),
 * invece di una fetch per specie.
 */
async function fetchItalianNameMap() {
  const query = `{
    pokemon_v2_pokemonspecies(limit: 1100) {
      pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: 8}}) { name }
      pokemon_v2_pokemons(where: {is_default: {_eq: true}}) { name }
    }
  }`;

  const res = await fetch(POKEAPI_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return {};

  const { data } = await res.json();
  const map = {};
  for (const species of data?.pokemon_v2_pokemonspecies || []) {
    const itName = species.pokemon_v2_pokemonspeciesnames[0]?.name;
    const slug = species.pokemon_v2_pokemons[0]?.name;
    if (!itName || !slug) continue;
    map[itName.toLowerCase().replace(/[^a-z]/g, "")] = slug;
  }
  return map;
}

/** Lista nomi mosse (per il lookup OCR in inglese). */
async function fetchMoveNames() {
  const res = await fetch(`${POKEAPI_BASE}/move?limit=1000`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.map((m) => m.name);
}

/** Lista nomi abilità (per il lookup OCR in inglese). */
async function fetchAbilityNames() {
  const res = await fetch(`${POKEAPI_BASE}/ability?limit=400`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.map((a) => a.name);
}

/**
 * Mappa "nome italiano normalizzato -> slug PokéAPI inglese" generica, per
 * entità semplici (mossa/oggetto/abilità) dove lo slug inglese è il campo
 * "name" dell'entità stessa (a differenza delle specie, che hanno
 * l'indirezione specie -> forma di default, vedi fetchItalianNameMap).
 * Se passato, `displayMap` viene popolato in parallelo con la direzione
 * inversa "slug inglese -> nome italiano" (per mostrarlo in UI), dalla
 * stessa risposta, senza una seconda fetch.
 */
async function fetchItalianMap(entityTable, namesField, limit, displayMap) {
  const query = `{
    ${entityTable}(limit: ${limit}) {
      name
      ${namesField}(where: {language_id: {_eq: 8}}) { name }
    }
  }`;

  const res = await fetch(POKEAPI_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return {};

  const { data } = await res.json();
  const map = {};
  for (const entity of data?.[entityTable] || []) {
    const itName = entity[namesField][0]?.name;
    if (!itName || !entity.name) continue;
    map[itName.toLowerCase().replace(/[^a-z]/g, "")] = entity.name;
    if (displayMap) displayMap[entity.name] = itName;
  }
  return map;
}

const fetchItalianMoveMap = (displayMap) => fetchItalianMap("pokemon_v2_move", "pokemon_v2_movenames", 1000, displayMap);
const fetchItalianAbilityMap = () => fetchItalianMap("pokemon_v2_ability", "pokemon_v2_abilitynames", 400);
