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
  if (res.status === 404 && !/-(male|female|mega)$/.test(query)) {
    // Alcune specie con forme di genere (Pyroar, Meowstic, Indeedee...) non
    // hanno una voce col nome nudo su PokéAPI: la forma di base è "-male".
    res = await fetch(`${POKEAPI_BASE}/pokemon/${query}-male`);
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

/** Dettaglio di una mossa (tipo, potenza, precisione, categoria, effetto — per tooltip, punto 3). */
async function fetchMoveDetail(name) {
  const key = moveCacheKey(name);
  if (moveCache[key]) return moveCache[key];

  const res = await fetch(`${POKEAPI_BASE}/move/${key}`);
  if (!res.ok) throw new Error(`Mossa "${name}" non trovata.`);
  const data = await res.json();

  const move = {
    name: data.name,
    type: data.type.name,
    power: data.power, // null per le mosse di stato
    accuracy: data.accuracy, // null = non può fallire
    damageClass: data.damage_class.name, // physical | special | status
    effect: pickFlavorText(data.flavor_text_entries, "it")
      || data.effect_entries?.find((e) => e.language.name === "en")?.short_effect
      || "",
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

/** Dettaglio di uno strumento tenuto (effetto), o null se non trovato. */
async function fetchItemDetail(name) {
  const key = moveCacheKey(name);
  if (key in itemCache) return itemCache[key];

  const res = await fetch(`${POKEAPI_BASE}/item/${key}`);
  if (!res.ok) { itemCache[key] = null; return null; }
  const data = await res.json();

  const item = {
    name: data.name,
    effect: pickFlavorText(data.flavor_text_entries, "it")
      || data.effect_entries?.find((e) => e.language.name === "en")?.short_effect
      || "",
  };
  itemCache[key] = item;
  return item;
}

function getCachedItem(name) {
  if (!name) return null;
  const key = moveCacheKey(name);
  return key in itemCache ? itemCache[key] : undefined;
}

/** Lista nomi oggetti (per l'autocomplete del campo "oggetto tenuto"). */
async function fetchItemNames() {
  const res = await fetch(`${POKEAPI_BASE}/item?limit=2000`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.map((i) => i.name);
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
const fetchItalianItemMap = () => fetchItalianMap("pokemon_v2_item", "pokemon_v2_itemnames", 2200);
const fetchItalianAbilityMap = () => fetchItalianMap("pokemon_v2_ability", "pokemon_v2_abilitynames", 400);
