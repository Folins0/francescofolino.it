var datiCostellazioni = {
  "Ariete":        { desc: "L'Ariete è una costellazione dello zodiaco visibile in autunno nell'emisfero nord. Rappresenta il montone dal vello d'oro della mitologia greca", img: "images/ariete.svg" },
  "Toro":          { desc: "Il Toro ospita le Pleiadi e l'ammasso delle Iadi. È visibile in inverno ed è una delle costellazioni più antiche conosciute dall'umanità", img: "images/toro.svg" },
  "Gemelli":       { desc: "I Gemelli sono caratterizzati dalle due stelle brillanti Castore e Polluce. Sono visibili in inverno nell'emisfero nord", img: "images/gemelli.svg" },
  "Cancro":        { desc: "Il Cancro è la più debole delle costellazioni zodiacali. Contiene l'ammasso stellare Presepe, visibile a occhio nudo in condizioni ottimali", img: "images/cancro.svg" },
  "Leone":         { desc: "Il Leone è una costellazione maestosa con la brillante stella Regolo. La sua forma ricorda effettivamente un leone sdraiato", img: "images/leone.svg" },
  "Vergine":       { desc: "La Vergine è la costellazione zodiacale più grande. Contiene Spica, una delle stelle più luminose del cielo, e l'Ammasso della Vergine", img: "images/vergine.svg" },
  "Bilancia":      { desc: "La Bilancia era in antichità considerata parte dello Scorpione. È l'unica costellazione zodiacale che rappresenta un oggetto inanimato", img: "images/bilancia.svg" },
  "Scorpione":     { desc: "Lo Scorpione è una delle costellazioni più belle del cielo estivo. La sua stella principale, Antares, è una supergigante rossa", img: "images/scorpione.svg" },
  "Sagittario":    { desc: "Il Sagittario punta con la sua freccia verso il centro della Via Lattea. È ricchissimo di nebulose e ammassi stellari", img: "images/sagittario.svg" },
  "Capricorno":    { desc: "Il Capricorno è una piccola costellazione zodiacale visibile a fine estate. Nella mitologia rappresenta una capra con coda di pesce", img: "images/capricorno.svg" },
  "Acquario":      { desc: "L'Acquario è una vasta costellazione autunnale. Contiene la Nebulosa Elica, una delle nebulose planetarie più vicine alla Terra", img: "images/acquario.svg" },
  "Pesci":         { desc: "I Pesci sono una costellazione zodiacale poco luminosa. In astrologia segnano l'inizio della primavera astronomica (equinozio vernale)", img: "images/pesci.svg" },
  "Orione":        { desc: "Orione è forse la costellazione più riconoscibile del cielo. La sua Nebulosa e la cintura di tre stelle sono iconiche in tutto il mondo", img: "images/orione.svg" },
  "Orsa Maggiore": { desc: "L'Orsa Maggiore contiene il Grande Carro, usato da secoli per orientarsi. Le sue stelle Dubhe e Merak indicano la Stella Polare", img: "images/orsa-maggiore.svg" },
  "Orsa Minore":   { desc: "L'Orsa Minore contiene la Stella Polare (Polaris), fondamentale per l'orientamento. È visibile tutto l'anno dall'emisfero nord", img: "images/ursa-minor.svg" },
  "Cassiopea":     { desc: "Cassiopea ha una caratteristica forma a W o M nel cielo. È circumpolare alle latitudini temperate del nord e sempre visibile", img: "images/cassiopea.svg" },
  "Cigno":         { desc: "Il Cigno, detto anche Croce del Nord, è splendido in estate. La sua stella principale Deneb è una delle più luminose della Via Lattea", img: "images/cigno.svg" },
  "Croce del Sud": { desc: "La Croce del Sud è il simbolo dell'emisfero australe. È la costellazione più piccola del cielo ma tra le più famose e riconoscibili", img: "images/croce-del-sud.svg" }
};

function creaModale() {
    var modale = document.createElement("div");
    modale.id = "modale-costellazione";
    modale.innerHTML = `
        <div class="modale-sfondo"></div>
        <div class="modale-contenuto">
            <button class="modale-chiudi" aria-label="Chiudi">&times;</button>
            <img id="modale-img" src="" alt="Immagine costellazione">
            <h2 id="modale-titolo"></h2>
            <p id="modale-desc"></p>
        </div>
    `;
    document.body.appendChild(modale);

    modale.querySelector(".modale-sfondo").addEventListener("click", chiudiModale);
    modale.querySelector(".modale-chiudi").addEventListener("click", chiudiModale);
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") chiudiModale();
    });
}

function apriModale(nome) {
    var dati = datiCostellazioni[nome];
    if (!dati) return;

    document.getElementById("modale-titolo").textContent = nome;
    document.getElementById("modale-desc").textContent = dati.desc;
    document.getElementById("modale-img").src = dati.img;
    document.getElementById("modale-img").alt = "Mappa della costellazione " + nome;
    document.getElementById("modale-costellazione").classList.add("visibile");
}

function chiudiModale() {
    document.getElementById("modale-costellazione").classList.remove("visibile");
}

function inizializzaModale() {
    var cards = document.querySelectorAll(".zodiac-grid .card");
    cards.forEach(function(card) {
        var h3 = card.querySelector("h3");
        var nome = h3.childNodes[0].textContent.trim();
        card.style.cursor = "pointer";
        card.addEventListener("click", function() {
            apriModale(nome);
        });
    });
}

function inizializzaLuceRossa() {
    var btn = document.createElement("button");
    btn.id = "btn-luce-rossa";
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>';
    btn.title = "Attiva la luce rossa: gli occhi rimangono adattati al buio durante l'osservazione notturna";

    var nav = document.querySelector("nav");
    var burger = nav.querySelector(".nav-burger");
    if (burger) {
        nav.insertBefore(btn, burger);
        burger.style.marginLeft = "0.5rem";
    } else {
        nav.appendChild(btn);
    }

    btn.addEventListener("click", function() {
        var attiva = document.body.classList.toggle("luce-rossa");
        btn.title = attiva
            ? "Torna alla modalità normale"
            : "Attiva la luce rossa: gli occhi rimangono adattati al buio durante l'osservazione notturna";
    });
}

const domande = [
    { testo: "In quale mese è meglio osservare l'Ariete?", opzioni: ["Gennaio", "Marzo", "Novembre", "Agosto"], corretta: 2 },
    { testo: "Quale costellazione contiene le Pleiadi?", opzioni: ["Orione", "Toro", "Gemelli", "Vergine"], corretta: 1 },
    { testo: "Qual è la stella principale del Leone?", opzioni: ["Spica", "Antares", "Regolo", "Polluce"], corretta: 2 },
    { testo: "Quale costellazione è visibile tutto l'anno dall'emisfero nord?", opzioni: ["Scorpione", "Orsa Minore", "Sagittario", "Capricorno"], corretta: 1 },
    { testo: "Lo Scorpione ha come stella principale...", opzioni: ["Deneb", "Betelgeuse", "Spica", "Antares"], corretta: 3 },
    { testo: "Quale costellazione è la più piccola del cielo?", opzioni: ["Cancro", "Capricorno", "Croce del Sud", "Bilancia"], corretta: 2 },
    { testo: "Quali stelle del Grande Carro indicano la Stella Polare?", opzioni: ["Castore e Polluce", "Dubhe e Merak", "Deneb e Vega", "Spica e Regolo"], corretta: 1 },
    { testo: "Quale costellazione contiene la Nebulosa Elica?", opzioni: ["Pesci", "Acquario", "Capricorno", "Bilancia"], corretta: 1 },
    { testo: "Qual è la stella principale del Cigno?", opzioni: ["Vega", "Altair", "Deneb", "Polluce"], corretta: 2 },
    { testo: "Orione è riconoscibile soprattutto per...", opzioni: ["Le sue quattro stelle rosse", "La cintura di tre stelle", "Il colore blu intenso", "L'alone di nebulosa visibile a occhio nudo"], corretta: 1 },
    { testo: "La Vergine è la costellazione zodiacale più...", opzioni: ["Luminosa", "Antica", "Grande", "Piccola"], corretta: 2 },
    { testo: "Cassiopea ha una caratteristica forma a...", opzioni: ["X", "W o M", "L", "Z"], corretta: 1 },
    { testo: "In quale emisfero è simbolo la Croce del Sud?", opzioni: ["Nord", "Est", "Ovest", "Sud"], corretta: 3 },
    { testo: "Quale costellazione punta con la freccia verso il centro della Via Lattea?", opzioni: ["Scorpione", "Sagittario", "Aquila", "Cigno"], corretta: 1 },
    { testo: "Il Cancro contiene l'ammasso stellare chiamato...", opzioni: ["Pleiadi", "Iadi", "Presepe", "Omega Centauri"], corretta: 2 },
    { testo: "Quale costellazione era in antichità parte dello Scorpione?", opzioni: ["Vergine", "Sagittario", "Capricorno", "Bilancia"], corretta: 3 },
    { testo: "La stella Spica appartiene a quale costellazione?", opzioni: ["Leone", "Vergine", "Bilancia", "Gemelli"], corretta: 1 },
    { testo: "Qual è l'unica costellazione zodiacale che rappresenta un oggetto inanimato?", opzioni: ["Capricorno", "Pesci", "Bilancia", "Cancro"], corretta: 2 }
];

var indiceDomanda = 0;
var punteggio = 0;
var domandePartita = [];

// algoritmo fisher-yates per mescolare le domande
function selezionaDomande(n) {
  var copia = domande.slice();
  for (var i = copia.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copia[i];
    copia[i] = copia[j];
    copia[j] = tmp;
  }
  return copia.slice(0, n);
}

function inizializzaQuiz() {
    domandePartita = selezionaDomande(7);

    const sezione = document.createElement("section");
    sezione.className = "container";
    sezione.id = "sezione-quiz";
    sezione.innerHTML = `
        <h2>Quiz: Conosci le costellazioni?</h2>
        <div id="quiz-box" class="card tips-card">
            <div class="card-body">
                <p id="quiz-progresso"></p>
                <p id="quiz-domanda"></p>
                <div id="quiz-opzioni"></div>
                <p id="quiz-feedback"></p>
                <button id="quiz-prossima" class="btn-primary" style="display:none;">Prossima domanda →</button>
            </div>
        </div>
        
    `;

    const footer = document.querySelector("footer");
    document.body.insertBefore(sezione, footer);
    mostraDomanda();

    document.getElementById("quiz-prossima").addEventListener("click", function() {
        indiceDomanda++;
        if (indiceDomanda < domandePartita.length) {
            mostraDomanda();
        } else {
            mostraRisultato();
        }
    });
}

function mostraDomanda() {
    const d = domandePartita[indiceDomanda];
    var num_domanda = indiceDomanda + 1;
    document.getElementById("quiz-progresso").textContent = "Domanda " + num_domanda + " di " + domandePartita.length;
    document.getElementById("quiz-domanda").textContent = d.testo;
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-prossima").style.display = "none";

    const contenitore = document.getElementById("quiz-opzioni");
    contenitore.innerHTML = "";

    for (var i = 0; i < d.opzioni.length; i++) {
        var btn = document.createElement("button");
        btn.textContent = d.opzioni[i];
        btn.className = "btn-quiz-opzione";
        btn.setAttribute("data-indice", i);
        btn.addEventListener("click", function() {
            verificaRisposta(parseInt(this.getAttribute("data-indice")));
        });
        contenitore.appendChild(btn);
    }
}

function verificaRisposta(indiceSelezionato) {
    var d = domandePartita[indiceDomanda];
    var opzioni = document.querySelectorAll(".btn-quiz-opzione");
    opzioni.forEach(function(btn) { btn.disabled = true; });

    if (indiceSelezionato === d.corretta) {
        punteggio++;
        opzioni[indiceSelezionato].classList.add("corretta");
        document.getElementById("quiz-feedback").textContent = "Corretto!";
    } else {
        opzioni[indiceSelezionato].classList.add("sbagliata");
        opzioni[d.corretta].classList.add("corretta");
        document.getElementById("quiz-feedback").textContent = "Sbagliato — la risposta giusta era: " + d.opzioni[d.corretta];
    }

    document.getElementById("quiz-prossima").style.display = "inline-block";

    setTimeout(function() {
        document.getElementById("quiz-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
}

function mostraRisultato() {
    var box = document.getElementById("quiz-box").querySelector(".card-body");
    box.innerHTML = `
        <h3>Quiz completato!</h3>
        <p>Hai risposto correttamente a <strong>${punteggio}</strong> domande su <strong>${domandePartita.length}</strong></p>
        <p>${messaggioFinale(punteggio)}</p>
        <button id="quiz-riprova" class="btn-primary">Riprova</button>
    `;
    document.getElementById("quiz-riprova").addEventListener("click", function() {
        indiceDomanda = 0;
        punteggio = 0;
        document.getElementById("sezione-quiz").remove();
        inizializzaQuiz();
    });
}

function messaggioFinale(p) {
    if (p === domandePartita.length) return "Perfetto! Sei un vero esperto del cielo!";
    if (p >= domandePartita.length - 2) return "Ottimo risultato! Ci sei quasi";
    if (p >= Math.floor(domandePartita.length / 2)) return "Buono! Continua a studiare le stelle";
    return "Riprova — le costellazioni ti aspettano!";
}

document.addEventListener("DOMContentLoaded", function() {
    creaModale();
    inizializzaModale();
    inizializzaLuceRossa();
    inizializzaQuiz();
});
