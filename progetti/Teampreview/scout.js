// Overlay "scout": mascotte in basso a destra, espressioni pescate dallo sprite sheet 4x3.
const SCOUT_FRAME = 96; // px, deve combaciare con #overlay-scout in style.css
const SCOUT_EXPRESSIONS = {
  neutral:   { row: 0, col: 0 },
  happy:     { row: 0, col: 1 },
  talking:   { row: 0, col: 2 },
  laughing:  { row: 0, col: 3 },
  thinking:  { row: 1, col: 0 },
  curious:   { row: 1, col: 1 },
  worried:   { row: 1, col: 2 },
  serious:   { row: 1, col: 3 },
  skeptical: { row: 2, col: 0 },
  annoyed:   { row: 2, col: 1 },
  surprised: { row: 2, col: 2 },
  smug:      { row: 2, col: 3 },
};

function setExpression(emotion) {
  const overlay = document.getElementById('overlay-scout');
  if (!overlay) return;
  const frame = SCOUT_EXPRESSIONS[emotion] || SCOUT_EXPRESSIONS.neutral;
  overlay.style.backgroundPosition = `-${frame.col * SCOUT_FRAME}px -${frame.row * SCOUT_FRAME}px`;
}
window.setExpression = setExpression;

setExpression('neutral');
