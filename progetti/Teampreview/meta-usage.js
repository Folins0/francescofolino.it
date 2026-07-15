// meta-usage.js
// Lista statica dei Pokémon più usati nel meta attuale (Pokemon Champions VGC 2026,
// Regulation M-B, ranked ladder). Fonte: Pikalytics
// https://www.pikalytics.com/pokedex/battledataregmbs3 — non esiste un'API pubblica
// da interrogare al volo, quindi questa lista va aggiornata A MANO ogni tanto
// (indicativamente a ogni cambio di regulation, o quando la top 25 si muove molto),
// controllando la classifica sul link sopra. Zero costo di rete/AI per usarla: i tipi
// di ogni specie NON sono hardcoded qui, vengono letti da PokéAPI (fetchPokemon, già
// presente in pokeapi.js) e messi in cache al primo utilizzo, così restano corretti
// anche se questa lista invecchia.
//
// Rank = posizione nella top 25 Pikalytics al 15/07/2026 (più basso = più usato).
//
// Verifica forme ambigue (15/07/2026, dati dalla pagina per-specie di Pikalytics +
// PokéAPI, non solo dallo sprite): tutte e 4 risolte, nessuno slug da cambiare.
// - Raichu: ability principale mostrata "Lightning Rod" (98.3%) e tipo puro Electric,
//   non Electric/Psychic → è il Raichu base (Kanto), non Raichu-Alola. Slug "raichu" corretto.
// - Basculegion: tipo Water/Ghost, tre ability miste (Adaptability/Swift Swim/Mold
//   Breaker: Pikalytics aggrega maschio+femmina in un'unica scheda). Lo slug bare
//   "basculegion" risolve comunque su "basculegion-male" (già in CHAMPIONS_ROSTER)
//   grazie al fallback su pokemon-species in fetchPokemon — nessuna modifica serve.
// - Charizard: tipo Fire/Flying, item più usato "Charizardite Y" (coerente con
//   il core Charizard-Mega-Y + Garchomp, il più comune del meta). Lo slug base
//   "charizard" ha comunque Fire/Flying corretto sia per la forma normale sia per Mega Y.
// - Floette-Eternal: era DAVVERO assente da CHAMPIONS_ROSTER (non solo da questa
//   lista) — aggiunta insieme al Floette base in champions-roster.js. Tipo Fairy puro,
//   confermato su PokéAPI (slug "floette-eternal", pokemon-species #670, forma non
//   di default). Mentre verificavo ho trovato anche un oggetto mancante usato dal
//   meta (Aerodactyl #20, Maushold #21): "wide-lens" → "Grandelente", aggiunto a
//   CHAMPIONS_ITEM_CATEGORIES.
const META_USAGE_REGMB = [
  { rank: 1, slug: "garchomp", name: "Garchomp" },
  { rank: 2, slug: "sinistcha", name: "Sinistcha" },
  { rank: 3, slug: "basculegion", name: "Basculegion" },
  { rank: 4, slug: "whimsicott", name: "Whimsicott" },
  { rank: 5, slug: "kingambit", name: "Kingambit" },
  { rank: 6, slug: "staraptor", name: "Staraptor" },
  { rank: 7, slug: "incineroar", name: "Incineroar" },
  { rank: 8, slug: "charizard", name: "Charizard" },
  { rank: 9, slug: "raichu", name: "Raichu" },
  { rank: 10, slug: "pelipper", name: "Pelipper" },
  { rank: 11, slug: "sneasler", name: "Sneasler" },
  { rank: 12, slug: "archaludon", name: "Archaludon" },
  { rank: 13, slug: "grimmsnarl", name: "Grimmsnarl" },
  { rank: 14, slug: "sylveon", name: "Sylveon" },
  { rank: 15, slug: "swampert", name: "Swampert" },
  { rank: 16, slug: "metagross", name: "Metagross" },
  { rank: 17, slug: "farigiraf", name: "Farigiraf" },
  { rank: 18, slug: "floette-eternal", name: "Floette-Eternal" },
  { rank: 19, slug: "gholdengo", name: "Gholdengo" },
  { rank: 20, slug: "aerodactyl", name: "Aerodactyl" },
  { rank: 21, slug: "maushold-family-of-four", name: "Maushold" },
  { rank: 22, slug: "annihilape", name: "Annihilape" },
  { rank: 23, slug: "sableye", name: "Sableye" },
  { rank: 24, slug: "mawile", name: "Mawile" },
  { rank: 25, slug: "ninetales-alola", name: "Ninetales-Alola" },
];
