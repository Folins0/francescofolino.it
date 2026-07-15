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
  "flapple", "florges", "froslass", "furfrou", "gallade", "garbodor", "garchomp",
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

// Oggetti disponibili in Pokémon Champions (aggiunto 2026-07-14): elenco
// CHIUSO fornito dall'utente, non "tutti gli oggetti PokéAPI meno quelli
// esclusi" — a differenza del roster Pokémon, qui l'assunzione è che se un
// oggetto non è in questa lista non esiste nel gioco. Raggruppati per
// categoria (usato per gli <optgroup> del menu "oggetto tenuto"): slug
// PokéAPI -> nome italiano ufficiale. Aggiornare qui, categoria per
// categoria, quando l'elenco cambia.
//
// Nota: "Distintivo Esperto" (strumenti) e alcune bacche del messaggio
// originale (Abilcoro, Amarena, Asqua, Kiwano, Lamber, Nespola, Radice,
// Baccasalm) non corrispondono a nessun oggetto reale di PokéAPI né a un
// nome italiano ufficiale conosciuto: non sono incluse, da verificare.
const CHAMPIONS_ITEM_CATEGORIES = {
  "Megapietre": {
    "abomasite": "Abomasnowite", "absolite": "Absolite", "aerodactylite": "Aerodactylite",
    "aggronite": "Aggronite", "alakazite": "Alakazamite", "altarianite": "Altarite",
    "ampharosite": "Ampharosite", "audinite": "Audinite", "beedrillite": "Beedrillite",
    "blastoisinite": "Blastoisite", "blazikenite": "Blazikenite", "cameruptite": "Cameruptite",
    "charizardite-x": "Charizardite X", "charizardite-y": "Charizardite Y",
    "galladite": "Galladite", "garchompite": "Garchompite", "gardevoirite": "Gardevoirite",
    "gengarite": "Gengarite", "glalitite": "Glalite", "gyaradosite": "Gyaradosite",
    "heracronite": "Heracrossite", "houndoominite": "Houndoomite",
    "kangaskhanite": "Kangaskhanite", "lopunnite": "Lopunnite", "lucarionite": "Lucarite",
    "manectite": "Manectricite", "mawilite": "Mawilite", "medichamite": "Medichamite",
    "metagrossite": "Metagrossite", "pinsirite": "Pinsirite", "pyroarite": "Pyroarite",
    "raichunite-x": "Raichunite X", "raichunite-y": "Raichunite Y", "sablenite": "Sableyite",
    "sceptilite": "Sceptilite", "scizorite": "Scizorite", "sharpedonite": "Sharpedite",
    "slowbronite": "Slowbroite", "steelixite": "Steelixite", "swampertite": "Swampertite",
    "tyranitarite": "Tyranitarite", "venusaurite": "Venusaurite",
  },
  "Strumenti e oggetti lotta": {
    "expert-belt": "Abilcintura", "mystic-water": "Acqua Magica", "silver-powder": "Argenpolvere",
    "life-orb": "Assorbisfera", "leftovers": "Avanzi", "sharp-beak": "Beccaffilato",
    "magnet": "Calamita", "charcoal": "Carbonella", "black-belt": "Cinturanera",
    "shell-bell": "Conchinella", "light-clay": "Creta Luce", "twisted-spoon": "Cucchiaio Torto",
    "dragon-fang": "Dentedidrago", "shed-shell": "Disfoguscio", "light-ball": "Elettropalla",
    "iron-ball": "Ferropalla", "focus-sash": "Focalnastro", "never-melt-ice": "Gelomai",
    "big-root": "Granradice", "bright-powder": "Luminpolvere", "mental-herb": "Mentalerba",
    "metal-coat": "Metalcoperta", "miracle-seed": "Miracolseme", "scope-lens": "Mirino",
    "muscle-band": "Muscolbanda", "black-glasses": "Occhialineri", "fairy-feather": "Piuma Fatata",
    "metronome": "Plessimetro", "quick-claw": "Rapidartigli", "heat-rock": "Rocciacalda",
    "kings-rock": "Roccia di Re", "icy-rock": "Rocciafredda", "damp-rock": "Rocciaumida",
    "smooth-rock": "Roccialiscia", "soft-sand": "Sabbia Soffice", "choice-scarf": "Stolascelta",
    "silk-scarf": "Sciarpa Seta", "spell-tag": "Spettrotarga", "poison-barb": "Velenaculeo",
    "white-herb": "Erbachiara",
  },
  "Bacche": {
    "kelpsy-berry": "Baccalga", "pinap-berry": "Baccananas", "watmel-berry": "Baccacomero",
    "oran-berry": "Baccarancia", "babiri-berry": "Baccababiri", "custap-berry": "Baccacrela",
    "coba-berry": "Baccababa", "lum-berry": "Baccaprugna", "nanab-berry": "Baccabana",
    "chesto-berry": "Baccastagna", "sitrus-berry": "Baccacedro", "chilan-berry": "Baccacinlan",
    "chople-berry": "Baccarosmel", "colbur-berry": "Baccaxan", "rawst-berry": "Baccafrago",
    "pomeg-berry": "Baccagrana", "grepa-berry": "Baccauva", "haban-berry": "Baccahaban",
    "kasib-berry": "Baccacitrus", "kebia-berry": "Baccakebia", "wiki-berry": "Baccakiwi",
    "razz-berry": "Baccalampon", "leppa-berry": "Baccamela", "liechi-berry": "Baccalici",
    "nomel-berry": "Baccalemon", "qualot-berry": "Baccaloquat", "hondew-berry": "Baccamelon",
    "belue-berry": "Baccartillo", "bluk-berry": "Baccamora", "occa-berry": "Baccacao",
    "passho-berry": "Baccapasflo", "payapa-berry": "Baccapayapa", "pecha-berry": "Baccapesca",
    "persim-berry": "Baccaki", "wepear-berry": "Baccapera", "tamato-berry": "Baccamodoro",
    "rindo-berry": "Baccarindo", "roseli-berry": "Baccarcadè", "shuca-berry": "Baccanaca",
    "tanga-berry": "Baccaitan", "wacan-berry": "Baccaparmen", "yache-berry": "Baccamoya",
  },
};
