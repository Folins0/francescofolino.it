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
    ev: { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 },
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

/** Dettaglio di una mossa (tipo, potenza, categoria fisica/speciale/status). */
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
    damageClass: data.damage_class.name, // physical | special | status
  };
  moveCache[key] = move;
  return move;
}

/** Dettaglio già in cache, se già scaricato in precedenza (uso sincrono per il rendering). */
function getCachedMove(name) {
  if (!name) return null;
  return moveCache[moveCacheKey(name)] || null;
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
  return data.results.map((p) => p.name);
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
