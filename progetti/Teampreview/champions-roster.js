// champions-roster.js
// Roster ufficiale di Pokémon Champions (punto 6): specie base/evolute,
// forme regionali e Megaevoluzioni disponibili, così come indicato
// dall'utente il 2026-07-14. Il roster si amplia con gli aggiornamenti del
// gioco: aggiungere/rimuovere slug PokéAPI qui, uno per riga, senza toccare
// app.js/pokeapi.js. Ogni slug è verificato contro l'API (incluse le forme
// di default per le specie multi-forma: Aegislash, Meowstic, Pyroar,
// Basculin, Palafin, Tatsugiri, Basculegion, Gourgeist, Lycanroc, Maushold,
// Mimikyu, Morpeko).
const CHAMPIONS_ROSTER = new Set([
  // --- Specie base/evolute ---
  "abomasnow", "absol", "aegislash-shield", "aerodactyl", "aggron", "alakazam",
  "alcremie", "altaria", "ampharos", "annihilape", "araquanid", "arcanine",
  "archaludon", "armarouge", "aromatisse", "audino", "aurorus", "avalugg",
  "azumarill", "barbaracle", "basculegion-male", "bastiodon", "beartic",
  "beedrill", "blastoise", "blaziken", "camerupt", "castform", "ceruledge",
  "charizard", "chesnaught", "chimecho", "clawitzer", "clefable", "cofagrigus",
  "conkeldurr", "corviknight", "crabominable", "decidueye", "dedenne",
  "delphox", "diggersby", "ditto", "dondozo", "dragalge", "dragapult",
  "dragonite", "drampa", "eelektross", "emboar", "emolga", "empoleon",
  "espeon", "excadrill", "falinks", "farigiraf", "feraligatr", "flareon",
  "florges", "froslass", "furfrou", "gallade", "garbodor", "garchomp",
  "gardevoir", "garganacl", "gengar", "gholdengo", "glaceon", "glalie",
  "glimmora", "gliscor", "golurk", "goodra", "gourgeist-average", "greninja",
  "grimmsnarl", "gyarados", "hatterene", "hawlucha", "heracross", "hippowdon",
  "houndoom", "houndstone", "hydrapple", "hydreigon", "incineroar",
  "infernape", "jolteon", "kangaskhan", "kingambit", "kleavor", "klefki",
  "kommo-o", "krookodile", "leafeon", "liepard", "lopunny", "lucario",
  "luxray", "lycanroc-midday", "machamp", "malamar", "mamoswine", "manectric",
  "maushold-family-of-four", "mawile", "medicham", "meganium", "meowscarada",
  "meowstic-male", "metagross", "milotic", "mimikyu-disguised", "morpeko-full-belly",
  "mr-rime", "mudsdale", "musharna", "ninetales", "noivern", "oranguru",
  "orthworm", "overqwil", "palafin-zero", "pangoro", "pawmot", "pelipper",
  "pikachu", "pinsir", "politoed", "pyroar-male", "qwilfish", "raichu",
  "rampardos", "reuniclus", "rhyperior", "roserade", "rotom", "runerigus",
  "sableye", "samurott", "sandaconda", "sceptile", "scizor", "scolipede",
  "scovillain", "scrafty", "serperior", "sharpedo", "simipour", "simisage",
  "simisear", "sinistcha", "skarmory", "slowbro", "slowking", "sneasler",
  "snorlax", "spiritomb", "staraptor", "starmie", "steelix", "stunfisk",
  "swampert", "sylveon", "talonflame", "tatsugiri-curly", "tauros",
  "tinkaton", "torkoal", "torterra", "toucannon", "toxapex", "toxicroak",
  "trevenant", "tsareena", "typhlosion", "tyranitar", "tyrantrum", "umbreon",
  "ursaluna", "vanilluxe", "vaporeon", "venusaur", "victreebel", "vileplume",
  "vivillon", "volcarona", "watchog", "weavile", "whimsicott", "zoroark",

  // --- Forme regionali ---
  "arcanine-hisui", "avalugg-hisui", "basculin-red-striped",
  "basculin-blue-striped", "basculin-white-striped", "decidueye-hisui",
  "goodra-hisui", "lilligant-hisui", "ninetales-alola", "qwilfish-hisui",
  "raichu-alola", "runerigus", "samurott-hisui", "sneasel-hisui",
  "sneasler", "slowbro-galar", "slowking-galar",
  "tauros-paldea-combat-breed", "tauros-paldea-blaze-breed",
  "tauros-paldea-aqua-breed", "typhlosion-hisui", "ursaluna-bloodmoon",
  "zoroark-hisui", "zorua-hisui",
]);

// Megapietre disponibili (punto Mega, aggiunto 2026-07-14): solo quelle dei
// Pokémon con Megaevoluzione elencati sopra come disponibili in Pokémon
// Champions. Filtra il campo "oggetto tenuto": le megapietre non in questo
// elenco vengono escluse dall'autocomplete, gli altri oggetti restano tutti
// disponibili.
const CHAMPIONS_MEGA_STONES = new Set([
  "abomasite", "absolite", "aerodactylite", "aggronite", "alakazite",
  "altarianite", "ampharosite", "audinite", "beedrillite", "blastoisinite",
  "blazikenite", "cameruptite", "charizardite-x", "charizardite-y",
  "galladite", "garchompite", "gardevoirite", "gengarite", "glalitite",
  "gyaradosite", "heracronite", "houndoominite", "kangaskhanite",
  "lopunnite", "lucarionite", "manectite", "mawilite", "medichamite",
  "metagrossite", "pinsirite", "raichunite-x", "raichunite-y", "sablenite",
  "sceptilite", "scizorite", "sharpedonite", "slowbronite", "steelixite",
  "swampertite", "tyranitarite", "venusaurite",
]);
