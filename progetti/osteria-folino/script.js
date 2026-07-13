var slideIndex = 0;
var slides = document.querySelectorAll('.slide');
var dotsContainer = document.querySelector('.dots');
var dots = [];
var slideTimer;

slides.forEach(function (_, i) {
    var dot = document.createElement('span');
    dot.className = 'dot';
    dot.addEventListener('click', function () { goToSlide(i); });
    dotsContainer.appendChild(dot);
    dots.push(dot);
});

function showSlide(n) {
    slides[slideIndex].classList.remove('active');
    dots[slideIndex].classList.remove('active');
    slideIndex = (n + slides.length) % slides.length;
    slides[slideIndex].classList.add('active');
    dots[slideIndex].classList.add('active');
}

function autoAdvance() {
    clearInterval(slideTimer);
    slideTimer = setInterval(function () { showSlide(slideIndex + 1); }, 6000);
}

function plusSlides(n) {
    showSlide(slideIndex + n);
    autoAdvance();
}

function goToSlide(n) {
    showSlide(n);
    autoAdvance();
}

showSlide(0);
autoAdvance();

var slideshowEl = document.querySelector('.slideshow-container');
slideshowEl.addEventListener('mouseenter', function () { clearInterval(slideTimer); });
slideshowEl.addEventListener('mouseleave', autoAdvance);

document.querySelector('.menu-toggle').addEventListener('click', function() {
    document.querySelector('.nav-menu').classList.toggle('show');
});

// Su mobile il pannello si chiude quando si sceglie una voce.
document.querySelectorAll('.menu-items a').forEach(function (link) {
    link.addEventListener('click', function () {
        document.querySelector('.nav-menu').classList.remove('show');
    });
});

// Scroll-reveal delicato sulle sezioni (la home ha già la sua animazione).
// Il contenuto viene nascosto solo se IntersectionObserver è disponibile, così
// senza JS (o su browser vecchi) le sezioni restano comunque visibili.
var sezioni = document.querySelectorAll('section');
if ('IntersectionObserver' in window) {
    var daRivelare = [];
    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visibile');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    sezioni.forEach(function (sezione) {
        if (sezione.id !== 'home') {
            sezione.classList.add('reveal');
            daRivelare.push(sezione);
            revealObserver.observe(sezione);
        }
    });

    // Rete di sicurezza: se l'observer non scatta (rendering anomalo), il
    // contenuto non deve restare invisibile. Dopo un attimo rivela tutto.
    setTimeout(function () {
        daRivelare.forEach(function (sezione) { sezione.classList.add('visibile'); });
    }, 2500);
}

// Evidenzia nella nav la sezione al centro dello schermo.
var navLinks = document.querySelectorAll('.menu-items a');
var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
            link.classList.toggle('attivo', link.getAttribute('href') === '#' + entry.target.id);
        });
    });
}, { rootMargin: '-40% 0px -55% 0px' });

sezioni.forEach(function (sezione) { navObserver.observe(sezione); });

// ponytail: numero placeholder, sostituire con il numero WhatsApp reale del ristorante
var NUMERO_WHATSAPP_RISTORANTE = "39XXXXXXXXXX";

// Il bottone flottante compare da solo appena il numero vero sostituisce il placeholder.
if (NUMERO_WHATSAPP_RISTORANTE.indexOf('X') === -1) {
    var bottoneFlottante = document.getElementById('whatsapp-flottante');
    bottoneFlottante.href = 'https://wa.me/' + NUMERO_WHATSAPP_RISTORANTE;
    bottoneFlottante.hidden = false;
}

// Piatto del mese: pubblicato dall'app RistoLive, letto qui al caricamento della pagina.
var SUPABASE_URL = "https://qpokmvewayalpfvpaxcb.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_lVv-w0zoF6_O-95aez-TAA_1VvtIK1N";
var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function caricaPiattoDelMese() {
    var contenitore = document.getElementById('piatto-contenuto');
    supabaseClient
        .from('featured_dish')
        .select('*')
        .order('creato_il', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(function (risposta) {
            var piatto = risposta.data;
            if (!piatto) return;

            var img = document.createElement('img');
            img.className = 'piatto-foto';
            img.src = piatto.foto_url;
            img.alt = piatto.nome;

            var nome = document.createElement('h3');
            nome.textContent = piatto.nome;
            var descrizione = document.createElement('p');
            descrizione.textContent = piatto.descrizione;

            var testo = document.createElement('div');
            testo.className = 'piatto-testo';
            testo.appendChild(nome);
            testo.appendChild(descrizione);

            contenitore.innerHTML = '';
            contenitore.appendChild(img);
            contenitore.appendChild(testo);
        });
}

caricaPiattoDelMese();

// Prenotazioni: disponibilità reale per fascia oraria + salvataggio su Supabase.
var campoData = document.getElementById('res-data');
var campoPersone = document.getElementById('res-persone');
var contenitoreFasce = document.getElementById('fasce-orarie');
var campoFasciaScelta = document.getElementById('res-fascia');
var bottoneSubmit = document.getElementById('res-submit');

campoData.min = new Date().toISOString().split('T')[0];

function selezionaFascia(bottone, orario) {
    contenitoreFasce.querySelectorAll('.fascia').forEach(function (b) {
        b.classList.remove('selezionata');
    });
    bottone.classList.add('selezionata');
    campoFasciaScelta.value = orario;
    bottoneSubmit.disabled = false;
}

function caricaFasceOrarie() {
    campoFasciaScelta.value = '';
    bottoneSubmit.disabled = true;

    if (!campoData.value) {
        contenitoreFasce.innerHTML = '<p class="fasce-suggerimento">Scegli prima una data</p>';
        return;
    }

    var persone = Number(campoPersone.value) || 1;
    contenitoreFasce.innerHTML = '<p class="fasce-suggerimento">Carico le fasce disponibili...</p>';

    supabaseClient
        .rpc('posti_disponibili', { giorno: campoData.value })
        .then(function (risposta) {
            var fasce = risposta.data || [];
            contenitoreFasce.innerHTML = '';

            if (!fasce.length) {
                contenitoreFasce.innerHTML = '<p class="fasce-suggerimento">Nessuna fascia disponibile per questa data</p>';
                return;
            }

            fasce.forEach(function (fascia) {
                var orario = fascia.orario.slice(0, 5);
                var bottone = document.createElement('button');
                bottone.type = 'button';
                bottone.className = 'fascia';
                bottone.textContent = orario + ' · ' + Math.max(fascia.posti_liberi, 0) + ' posti';

                if (fascia.posti_liberi < persone) {
                    bottone.disabled = true;
                    bottone.textContent = orario + ' · pieno';
                } else {
                    bottone.addEventListener('click', function () {
                        selezionaFascia(bottone, orario);
                    });
                }

                contenitoreFasce.appendChild(bottone);
            });
        });
}

campoData.addEventListener('change', caricaFasceOrarie);
campoPersone.addEventListener('change', caricaFasceOrarie);

document.getElementById('reservation-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = document.getElementById('res-nome').value;
    var telefono = document.getElementById('res-telefono').value;
    var persone = Number(campoPersone.value);
    var dataOra = new Date(campoData.value + 'T' + campoFasciaScelta.value).toISOString();

    bottoneSubmit.disabled = true;
    bottoneSubmit.textContent = 'Invio...';

    // ponytail: copia da portfolio, niente scrittura reale su Supabase — solo
    // la stessa risposta che darebbe un insert riuscito, per mostrare il flusso
    // completo senza inserire prenotazioni finte nel database vero
    new Promise(function (resolve) { setTimeout(function () { resolve({ error: null }); }, 500); })
        .then(function (risposta) {
            if (risposta.error) {
                bottoneSubmit.disabled = false;
                bottoneSubmit.textContent = 'Prenota';
                alert('Errore nell\'invio, riprova.');
                return;
            }

            var messaggio = "Ciao, vorrei prenotare un tavolo da Folino.%0A" +
                "Nome: " + nome + "%0A" +
                "Telefono: " + telefono + "%0A" +
                "Data: " + campoData.value + " alle " + campoFasciaScelta.value + "%0A" +
                "Persone: " + persone;

            document.getElementById('res-whatsapp-link').href =
                "https://wa.me/" + NUMERO_WHATSAPP_RISTORANTE + "?text=" + messaggio;
            document.getElementById('reservation-form').hidden = true;
            document.getElementById('reservation-successo').hidden = false;
        });
});
