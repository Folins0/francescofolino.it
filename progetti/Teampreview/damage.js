// damage.js
// Dati e formule di battaglia (Fase 2): matrice efficacia di tipo, nature,
// calcolo statistiche finali e calcolo danno. Tutto hardcoded/deterministico,
// nessuna chiamata di rete: la matrice tipi e le nature cambiano raramente
// e non hanno un endpoint PokéAPI comodo da consumare 18x18 volte.

const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark",
  "steel", "fairy",
];

// attaccante -> { difensore: moltiplicatore }. Assente = 1x (neutro).
const TYPE_CHART = {
  normal:    { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:      { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:     { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric:  { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:     { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:       { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting:  { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:    { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:    { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:    { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:   { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:       { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:      { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:     { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:    { dragon: 2, steel: 0.5, fairy: 0 },
  dark:      { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:     { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:     { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

/** Moltiplicatore complessivo di una mossa di tipo moveType contro un difensore (1 o 2 tipi). */
function typeEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce((mult, defType) => {
    const row = TYPE_CHART[moveType];
    const factor = row && defType in row ? row[defType] : 1;
    return mult * factor;
  }, 1);
}

// Le 25 nature: stat aumentata/diminuita del 10%. Chiavi = nomi stat PokéAPI,
// le stesse già usate in mon.stats/mon.ev/mon.iv.
const NATURES = {
  Hardy: {}, Docile: {}, Serious: {}, Bashful: {}, Quirky: {},
  Lonely:  { plus: "attack", minus: "defense" },
  Brave:   { plus: "attack", minus: "speed" },
  Adamant: { plus: "attack", minus: "special-attack" },
  Naughty: { plus: "attack", minus: "special-defense" },
  Bold:    { plus: "defense", minus: "attack" },
  Relaxed: { plus: "defense", minus: "speed" },
  Impish:  { plus: "defense", minus: "special-attack" },
  Lax:     { plus: "defense", minus: "special-defense" },
  Timid:   { plus: "speed", minus: "attack" },
  Hasty:   { plus: "speed", minus: "defense" },
  Jolly:   { plus: "speed", minus: "special-attack" },
  Naive:   { plus: "speed", minus: "special-defense" },
  Modest:  { plus: "special-attack", minus: "attack" },
  Mild:    { plus: "special-attack", minus: "defense" },
  Quiet:   { plus: "special-attack", minus: "speed" },
  Rash:    { plus: "special-attack", minus: "special-defense" },
  Calm:    { plus: "special-defense", minus: "attack" },
  Gentle:  { plus: "special-defense", minus: "defense" },
  Sassy:   { plus: "special-defense", minus: "speed" },
  Careful: { plus: "special-defense", minus: "special-attack" },
};

const STAT_KEYS = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
const STAT_LABELS = { hp: "HP", attack: "Atk", defense: "Def", "special-attack": "SpA", "special-defense": "SpD", speed: "Spe" };
const LEVEL = 50; // VGC standard

/** Stat finale a un dato livello, formula standard (HP separata dalle altre). */
function calcStat(statKey, base, iv, ev, level, natureName) {
  const core = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100);
  if (statKey === "hp") return core + level + 10;

  let stat = core + 5;
  const nature = NATURES[natureName];
  if (nature?.plus === statKey) stat = Math.floor(stat * 1.1);
  else if (nature?.minus === statKey) stat = Math.floor(stat * 0.9);
  return stat;
}

/**
 * Danno min/max (random factor 0.85–1.00) di una mossa fisica/speciale.
 * Ritorna null se la mossa non ha potenza (mossa di stato).
 */
function calcDamage({ level, power, atk, def, attackerTypes, moveType, defenderTypes }) {
  if (!power) return null;

  const stab = attackerTypes.includes(moveType) ? 1.5 : 1;
  const eff = typeEffectiveness(moveType, defenderTypes);
  const base = Math.floor((2 * level / 5 + 2) * power * atk / def / 50) + 2;

  return {
    min: Math.floor(base * stab * eff * 0.85),
    max: Math.floor(base * stab * eff),
    eff,
  };
}
