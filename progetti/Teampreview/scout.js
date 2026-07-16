// Overlay "Solana" (ex Professoressa Pokémon): mascotte in basso a destra.
// Sprite reale in img/scout-sprite.png, griglia 4 colonne x 3 righe.
const SCOUT_FRAME_W = 165; // px, deve combaciare con .scout-sprite in scout.css
const SCOUT_FRAME_H = 220;
// Margine tagliato su ogni lato del frame mostrato: la sprite ha un'animazione
// "breathe" che la scala via CSS transform, e vicino al bordo esatto del
// frame il texture sampling della GPU può pescare qualche pixel del frame
// adiacente nella griglia (si vede un pezzo di spalla/capelli). I frame hanno
// un margine sfocato ampio attorno al soggetto, quindi tagliarne pochi px è
// sicuro e invisibile.
const SCOUT_FRAME_INSET = 3;
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

const SCOUT_TYPE_SPEED = 30; // ms per carattere
// Il flap della bocca è a tempo fisso, indipendente dal typewriter: se
// legato ai caratteri (ogni N char * SCOUT_TYPE_SPEED) diventa troppo veloce
// e la sprite sembra glitchare invece di "parlare".
const SCOUT_MOUTH_FLAP_MS = 180;

const scoutOverlay = document.getElementById('overlay-scout');
const scoutSprite = document.getElementById('scout-sprite');
const scoutBubble = document.getElementById('scout-bubble');
const scoutMenu = document.getElementById('scout-menu');
let scoutTypeTimer = null; // interval del typewriter in corso
let scoutMouthTimer = null; // interval del flap bocca in corso
let scoutIdleTimer = null; // timeout che riporta Solana a "idle" a fine typing

// Cambia solo il frame mostrato, senza il flash di "pop" (usato da setExpression).
function setFrame(emotion) {
  if (!scoutSprite) return;
  const frame = SCOUT_EXPRESSIONS[emotion] || SCOUT_EXPRESSIONS.idle;
  scoutSprite.style.backgroundPosition = `-${frame.col * SCOUT_FRAME_W + SCOUT_FRAME_INSET}px -${frame.row * SCOUT_FRAME_H + SCOUT_FRAME_INSET}px`;
}

function setExpression(emotion) {
  if (!scoutSprite) return;
  setFrame(emotion);

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

// durationMs = tempo minimo di attesa dopo la fine del typing prima che
// Solana torni a "idle" (non è più la durata di visibilità del fumetto).
// emotion = espressione da mostrare mentre parla: cambia subito, prima che
// il fumetto/testo compaia, non dopo. Con "speaking" la bocca "sbatte" a
// intervalli fissi (SCOUT_MOUTH_FLAP_MS) per un effetto di parlato naturale.
function say(text, durationMs = 3000, emotion = 'speaking') {
  if (!scoutBubble) return;

  // un say() in corso viene interrotto subito: niente testo mischiato tra due chiamate
  clearInterval(scoutTypeTimer);
  clearInterval(scoutMouthTimer);
  clearTimeout(scoutIdleTimer);

  setExpression(emotion); // prima l'espressione, poi il fumetto/testo
  scoutBubble.textContent = '';
  scoutBubble.classList.add('visible');

  if (!text) {
    setExpression('idle');
    return;
  }

  const animateMouth = emotion === 'speaking';
  if (animateMouth) {
    let mouthOpen = true;
    scoutMouthTimer = setInterval(() => {
      mouthOpen = !mouthOpen;
      setFrame(mouthOpen ? 'speaking' : 'idle');
    }, SCOUT_MOUTH_FLAP_MS);
  }

  let i = 0;
  scoutTypeTimer = setInterval(() => {
    scoutBubble.textContent += text[i];
    scoutBubble.scrollTop = scoutBubble.scrollHeight;
    i++;
    if (i >= text.length) {
      clearInterval(scoutTypeTimer);
      scoutTypeTimer = null;
      clearInterval(scoutMouthTimer);
      scoutMouthTimer = null;
      scoutIdleTimer = setTimeout(() => setExpression('idle'), durationMs);
    }
  }, SCOUT_TYPE_SPEED);
}

// Interrompe il fumetto in corso e lo nasconde, senza nascondere l'intero
// overlay (a differenza di hide()): usata quando l'utente tocca la sprite
// mentre Solana sta ancora parlando, per "silenziarla" a comando invece di
// aspettare il timeout automatico.
function hideBubble() {
  if (!scoutBubble) return;
  clearInterval(scoutTypeTimer);
  clearInterval(scoutMouthTimer);
  clearTimeout(scoutIdleTimer);
  scoutTypeTimer = null;
  scoutMouthTimer = null;
  scoutBubble.classList.remove('visible');
  setExpression('idle');
}

window.Solana = { show, hide, setExpression, say, hideBubble };
window.setExpression = setExpression; // retrocompatibilità con l'uso già presente in orchestrator/app

setExpression('idle');

// Menu di scelta al tocco della sprite: ogni voce chiama una funzione globale
// definita in app.js (stesso schema già usato per handleCoachAnalysis — gli
// script classici condividono lo scope globale, caricati prima di questo).
const SCOUT_MENU_ITEMS = [
  { label: 'Analizza il team', fn: 'handleCoachAnalysis' },
  { label: 'Mostra utilizzo nel meta', fn: 'handleMetaUsageScreen' },
  { label: 'Consigli su questa schermata', fn: 'handleScreenAdvice' },
  { label: 'Completa il team automaticamente', fn: 'handleAutoCompleteTeam' },
  { label: 'Vorrei un aiuto migliore', fn: 'handleExternalPrompt' },
];

function closeScoutMenu() {
  if (!scoutMenu) return;
  scoutMenu.classList.remove('visible');
  scoutMenu.setAttribute('aria-hidden', 'true');
}

function toggleScoutMenu() {
  if (!scoutMenu) return;
  const opening = !scoutMenu.classList.contains('visible');
  scoutMenu.classList.toggle('visible', opening);
  scoutMenu.setAttribute('aria-hidden', opening ? 'false' : 'true');
}

if (scoutMenu) {
  SCOUT_MENU_ITEMS.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'menuitem');
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      closeScoutMenu();
      const fn = window[item.fn];
      if (typeof fn === 'function') fn();
    });
    scoutMenu.appendChild(btn);
  });
}

if (scoutSprite) {
  // stopPropagation: evita che il click qui sotto (chiusura al tocco fuori
  // dal menu) si attivi nello stesso momento in cui il menu viene aperto.
  // Se Solana sta parlando, il primo tocco sulla sprite la zittisce (soluzione
  // più intuitiva di una x separata: si tocca lo stesso personaggio che sta
  // parlando per farlo tacere); solo a fumetto chiuso il tocco apre il menu.
  scoutSprite.addEventListener('click', (e) => {
    e.stopPropagation();
    if (scoutBubble.classList.contains('visible')) {
      hideBubble();
    } else {
      toggleScoutMenu();
    }
  });
}

document.addEventListener('click', (e) => {
  if (scoutMenu && scoutMenu.classList.contains('visible') && !scoutOverlay.contains(e.target)) {
    closeScoutMenu();
  }
});

// Avviso una tantum al primo avvio: fa scoprire che si può toccare Solana
// per chiedere aiuto, invece di dover trovare il bottone in fondo alla pagina.
const SCOUT_HINT_KEY = 'teampreview_solana_hint_seen';
if (!localStorage.getItem(SCOUT_HINT_KEY)) {
  setTimeout(() => {
    show();
    say('Ciao, sono Solana! Se ti serve una mano toccami pure quando vuoi: sono qui apposta.', 4500, 'happy');
    localStorage.setItem(SCOUT_HINT_KEY, '1');
  }, 1200);
}
