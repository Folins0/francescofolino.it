// Overlay "Scout" (Professoressa Pokémon): mascotte in basso a destra.
// Sprite reale in img/scout-sprite.png, griglia 4 colonne x 3 righe.
const SCOUT_FRAME = 110; // px, deve combaciare con .scout-sprite in scout.css
const SCOUT_EXPRESSIONS = {
  idle: { row: 0, col: 0 },
  neutral: { row: 0, col: 0 },
  happy: { row: 0, col: 1 },
  speaking: { row: 0, col: 2 },
  talking: { row: 0, col: 2 },
  laughing: { row: 0, col: 3 },
  thinking: { row: 1, col: 0 },
  curious: { row: 1, col: 1 },
  worried: { row: 1, col: 2 },
  serious: { row: 1, col: 3 },
  skeptical: { row: 2, col: 0 },
  annoyed: { row: 2, col: 1 },
  surprised: { row: 2, col: 2 },
  smug: { row: 2, col: 3 },
};

const scoutOverlay = document.getElementById('overlay-scout');
const scoutSprite = document.getElementById('scout-sprite');
const scoutBubble = document.getElementById('scout-bubble');
let scoutBubbleTimer = null;

function setExpression(emotion) {
  if (!scoutSprite) return;
  const frame = SCOUT_EXPRESSIONS[emotion] || SCOUT_EXPRESSIONS.idle;
  scoutSprite.style.backgroundPosition = `-${frame.col * SCOUT_FRAME}px -${frame.row * SCOUT_FRAME}px`;

  // Piccolo "pop" per rendere percepibile il cambio espressione (la
  // sprite-sheet non permette un crossfade reale tra frame).
  scoutSprite.classList.remove('scout-pop');
  void scoutSprite.offsetWidth; // forza il reflow per poter ripartire dallo stesso stato
  scoutSprite.classList.add('scout-pop');
  setTimeout(() => scoutSprite.classList.remove('scout-pop'), 150);
}

function show() {
  if (!scoutOverlay) return;
  scoutOverlay.classList.remove('scout-hidden');
  scoutOverlay.setAttribute('aria-hidden', 'false');
}

function hide() {
  if (!scoutOverlay) return;
  scoutOverlay.classList.add('scout-hidden');
  scoutOverlay.setAttribute('aria-hidden', 'true');
}

function say(text, durationMs = 3000) {
  if (!scoutBubble) return;
  clearTimeout(scoutBubbleTimer);
  scoutBubble.textContent = text;
  scoutBubble.classList.add('visible');
  scoutBubbleTimer = setTimeout(() => scoutBubble.classList.remove('visible'), durationMs);
}

window.Scout = { show, hide, setExpression, say };
window.setExpression = setExpression; // retrocompatibilità con l'uso già presente in orchestrator/app

setExpression('idle');
