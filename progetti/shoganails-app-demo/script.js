// Demo statica per il portfolio: nessuna chiamata di rete, solo dati finti e stato locale.

document.querySelectorAll('.voce-nav').forEach(function (bottone) {
    bottone.addEventListener('click', function () {
        document.querySelectorAll('.voce-nav').forEach(function (b) { b.classList.remove('attiva'); });
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('attiva'); });
        bottone.classList.add('attiva');
        document.getElementById('tab-' + bottone.dataset.tab).classList.add('attiva');
    });
});

var richieste = [
    { nome: 'Giulia Bianchi', servizio: 'Ricostruzione gel', quando: 'Ven 24 lug · 15:00' },
    { nome: 'Sara Conti', servizio: 'Manicure classica', quando: 'Sab 25 lug · 10:30' },
    { nome: 'Elena Ferrari', servizio: 'Nail art', quando: 'Sab 25 lug · 16:00' },
];

var prenotazioniConfermate = [
    { nome: 'Marta Rossi', servizio: 'Pedicure spa', quando: 'Gio 23 lug · 11:00' },
];

function disegnaRichieste() {
    var lista = document.getElementById('lista-richieste');
    lista.innerHTML = '';
    if (!richieste.length) {
        lista.innerHTML = '<p class="vuoto">Nessuna richiesta in attesa</p>';
        return;
    }
    richieste.forEach(function (r, i) {
        var riga = document.createElement('div');
        riga.className = 'richiesta-riga';
        riga.innerHTML =
            '<div class="richiesta-info">' +
            '<div class="richiesta-nome">' + r.nome + '</div>' +
            '<div class="richiesta-dettagli">' + r.servizio + ' · ' + r.quando + '</div>' +
            '</div>';

        var conferma = document.createElement('button');
        conferma.className = 'azione conferma';
        conferma.textContent = 'Conferma';
        conferma.addEventListener('click', function () {
            prenotazioniConfermate.push(r);
            richieste.splice(i, 1);
            disegnaRichieste();
            disegnaCalendario();
        });

        var rifiuta = document.createElement('button');
        rifiuta.className = 'azione rifiuta';
        rifiuta.textContent = 'Rifiuta';
        rifiuta.addEventListener('click', function () {
            richieste.splice(i, 1);
            disegnaRichieste();
        });

        riga.appendChild(conferma);
        riga.appendChild(rifiuta);
        lista.appendChild(riga);
    });
}

function disegnaCalendario() {
    var lista = document.getElementById('lista-calendario');
    lista.innerHTML = '';
    if (!prenotazioniConfermate.length) {
        lista.innerHTML = '<p class="vuoto">Nessuna prenotazione confermata</p>';
        return;
    }
    prenotazioniConfermate.forEach(function (p) {
        var riga = document.createElement('div');
        riga.className = 'prenotazione-riga';
        riga.innerHTML =
            '<div class="prenotazione-info">' +
            '<div class="richiesta-nome">' + p.nome + '</div>' +
            '<div class="prenotazione-dettagli">' + p.servizio + ' · ' + p.quando + '</div>' +
            '</div>';
        lista.appendChild(riga);
    });
}

disegnaRichieste();
disegnaCalendario();

document.getElementById('bottone-carica').addEventListener('click', function () {
    var stato = document.getElementById('stato-ia');
    var slot = document.getElementById('slot-settimana');
    stato.hidden = false;
    slot.hidden = true;
    stato.textContent = "L'IA sta leggendo il foglio turni...";

    setTimeout(function () {
        stato.hidden = true;
        slot.hidden = false;
        slot.innerHTML = [
            ['Lunedì', '9:00 – 18:00'],
            ['Martedì', '9:00 – 18:00'],
            ['Mercoledì', 'Chiuso'],
            ['Giovedì', '9:00 – 18:00'],
            ['Venerdì', '9:00 – 19:00'],
            ['Sabato', '9:00 – 15:00'],
        ].map(function (giorno) {
            return '<div class="slot-riga"><span>' + giorno[0] + '</span><span>' + giorno[1] + '</span></div>';
        }).join('');
    }, 1200);
});

var foto = ['💅', '💖', '✨', '🌸'];

function disegnaFoto() {
    var griglia = document.getElementById('griglia-foto');
    griglia.innerHTML = '';
    foto.forEach(function (emoji, i) {
        var item = document.createElement('div');
        item.className = 'foto-item';
        item.textContent = emoji;

        var rimuovi = document.createElement('button');
        rimuovi.className = 'foto-rimuovi';
        rimuovi.textContent = '✕';
        rimuovi.addEventListener('click', function () {
            foto.splice(i, 1);
            disegnaFoto();
        });

        item.appendChild(rimuovi);
        griglia.appendChild(item);
    });
}

disegnaFoto();

var emojiExtra = ['🎀', '🌷', '💫', '🌺', '💎'];
document.getElementById('bottone-aggiungi-foto').addEventListener('click', function () {
    foto.push(emojiExtra[Math.floor(Math.random() * emojiExtra.length)]);
    disegnaFoto();
});
