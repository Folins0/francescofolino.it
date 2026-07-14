// champions-roster.js
// Roster limitato di Pokémon Champions (punto 6): il gioco non include
// l'intero Pokédex, solo una selezione per il competitivo (niente forme base
// non evolute, niente leggendari/mitici al lancio). Il roster si amplia con
// gli aggiornamenti del gioco, quindi va tenuto qui — un file a parte, uno
// slug PokéAPI per riga — così si aggiorna senza toccare la logica in
// app.js/pokeapi.js.
//
// ATTENZIONE: la lista qui sotto è un PLACEHOLDER dimostrativo (una manciata
// di Pokémon competitivi noti), NON l'elenco ufficiale e completo di Pokémon
// Champions. Vanno verificati e sostituiti con quelli reali prima di usare
// il sito in produzione.
const CHAMPIONS_ROSTER = new Set([
  "incineroar", "rillaboom", "amoonguss", "whimsicott", "grimmsnarl",
  "indeedee-male", "indeedee-female", "torkoal", "ferrothorn", "corviknight",
  "dragapult", "dragonite", "garchomp", "tyranitar", "salamence", "metagross",
  "hydreigon", "gholdengo", "urshifu", "urshifu-rapid-strike", "talonflame",
  "gyarados", "milotic", "azumarill", "sylveon", "goodra", "hatterene",
  "polteageist", "glimmora", "kingambit", "excadrill", "weavile", "pelipper",
  "arcanine", "chandelure", "volcarona", "toxtricity", "clefable",
]);
