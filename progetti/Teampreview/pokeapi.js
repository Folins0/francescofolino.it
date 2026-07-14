// pokeapi.js
// Wrapper minimale attorno a PokéAPI (https://pokeapi.co).
// Nessuna chiave richiesta, endpoint pubblico e gratuito.

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

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
  };
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
