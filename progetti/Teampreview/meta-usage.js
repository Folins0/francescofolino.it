// meta-usage.js
// Lista statica dei Pokémon più usati nel meta attuale (Pokemon Champions VGC 2026,
// Regulation M-B, ranked ladder). Fonte: Pikalytics
// https://www.pikalytics.com/pokedex/battledataregmbs3 — non esiste un'API pubblica
// da interrogare al volo, quindi questa lista va aggiornata A MANO ogni tanto
// (indicativamente a ogni cambio di regulation, o quando la top 20 si muove molto),
// controllando la classifica sul link sopra. Zero costo di rete/AI per usarla: i tipi
// di ogni specie NON sono hardcoded qui, vengono letti da PokéAPI (fetchPokemon, già
// presente in pokeapi.js) e messi in cache al primo utilizzo, così restano corretti
// anche se questa lista invecchia.
//
// Rank = posizione nella top 20 Pikalytics al 15/07/2026 (più basso = più usato).
//
// ATTENZIONE forme ambigue: Pikalytics mostra solo lo sprite/nome, non sempre la forma
// esatta (mega, regionale...). Da verificare a mano contro PokéAPI + CHAMPIONS_ROSTER
// (champions-roster.js) prima di fidarsi ciecamente:
// - Raichu: potrebbe essere Raichu-Alola (molto comune in doubles), qui lasciato come
//   base "raichu". Se il meta reale è quello alolano, cambia lo slug in "raichu-alola".
// - Basculegion: default "basculegion" (forma maschile); verificare se il meta usa
//   "basculegion-female".
// - Charizard: qui la forma base "charizard". Se il meta è prevalentemente Mega Y,
//   valuta se serva uno slug dedicato "charizard-mega-y" (i tipi combaciano comunque:
//   fire/flying in entrambi i casi).
// - Floette-Eternal: forma evento, potrebbe non essere ancora in CHAMPIONS_ROSTER —
//   se fetchPokemon lancia "non disponibile in Pokémon Champions", va aggiunta lì o
//   rimossa da questa lista.
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
];
