// info aggiuntive e foto per ogni missione (stesso ordine degli slides)
var missioniExtra = [
    // 0 Sputnik
    {
        info: "Sputnik 1 pesava 83.6 kg e trasmetteva segnali radio su 20 e 40 MHz. Rimase in orbita per 3 mesi prima di rientrare nell'atmosfera il 4 gennaio 1958. Il suo lancio colse di sorpresa il mondo occidentale, dando il via alla corsa agli armamenti spaziali",
        foto: []
    },
    // 1 Vostok
    {
        info: "La capsula Vostok 1 non era dotata di propulsori di atterraggio: Gagarin si eiettò a 7 km di quota e atterrò con un paracadute separato. Il volo durò esattamente 108 minuti. L'URSS tenne segreti molti dettagli per oltre vent'anni",
        foto: []
    },
    // 2 Apollo 11
    {
        info: "Il LM Eagle atterrò con soli 30 secondi di carburante rimasti. Armstrong scelse manualmente il sito di atterraggio per evitare un campo di massi. La NASA stimò le probabilità di successo della missione al 50%",
        foto: [
            { src: "images/apollo-f1.jpg", alt: "Buzz Aldrin lavora vicino al modulo lunare Eagle sulla superficie della Luna" },
            { src: "images/apollo-f2.jpg", alt: "Impronta di stivale impressa nel suolo lunare" }
        ]
    },
    // 3 Mir
    {
        info: "Mir ha ospitato 104 cosmonauti e astronauti. Il record di permanenza ininterrotta è di Valeri Polyakov: 437 giorni consecutivi nello spazio. La stazione ha resistito a un incendio e a una collisione con il cargo rifornimento Progress",
        foto: []
    },
    // 4 Hubble
    {
        info: "Hubble ha uno specchio da 2.4 m, lucidato con un errore di soli 10 nanometri. Lanciato con un difetto ottico, fu riparato nel 1993 da una missione di servicing in orbita. Ha prodotto oltre 1.5 milioni di osservazioni scientifiche",
        foto: [
            { src: "images/hubble-f1.jpg", alt: "Cassiopeia A: residuo di supernova in falsi colori" },
            { src: "images/hubble-f2.jpg", alt: "Giove e i frammenti della cometa Shoemaker-Levy 9 in rotta di collisione, 1994" },
            { src: "images/hubble-f3.jpg", alt: "Galassia di Andromeda (M31)" }
        ]
    },
    // 5 ISS
    {
        info: "La ISS ha un'area abitabile di 388 m², percorre circa 16 orbite al giorno a 7.7 km/s. Pesa oltre 420 tonnellate e ha richiesto 40 lanci per essere assemblata. Produce energia con 8 pannelli solari da 73 m ciascuno",
        foto: []
    },
    // 6 Mars Express
    {
        info: "Mars Express ha scoperto un lago di acqua liquida salata sotto il polo sud marziano a 1.5 km di profondità. È in orbita attorno a Marte da oltre 20 anni, stabilendo il record di longevità per le missioni europee interplanetarie",
        foto: []
    },
    // 7 Rosetta
    {
        info: "Rosetta ha viaggiato 6.4 miliardi di km in 10 anni, usando tre fionde gravitazionali attorno alla Terra e una attorno a Marte. La sonda è andata in ibernazione per 31 mesi. Il lander Philae rimbalzò due volte prima di fermarsi sulla cometa",
        foto: [
            { src: "images/rosetta-f1.jpg", alt: "La cometa 67P/Churyumov-Gerasimenko vista a circa 285 km di distanza" },
            { src: "images/rosetta-f2.jpg", alt: "Superficie della cometa 67P: terreno roccioso e irregolare" },
            { src: "images/rosetta-f3.jpg", alt: "Il lander Philae in discesa verso la cometa 67P" }
        ]
    },
    // 8 Curiosity
    {
        info: "Curiosity pesa 899 kg ed è alimentato a plutonio radioattivo (RTG), senza dipendere dalla luce solare. Ha percorso oltre 32 km su Marte. Il suo laser vaporizza le rocce a distanza per analizzarne la composizione chimica",
        foto: [
            { src: "images/curiosity-f1.jpg", alt: "Monte Sharp (Aeolis Mons) nel cratere Gale" },
            { src: "images/curiosity-f2.jpg", alt: "Selfie del rover accanto alla duna di sabbia Namib" }
        ]
    },
    // 9 Chang'e 4
    {
        info: "Il lato nascosto della Luna non è mai visibile dalla Terra per via della rotazione sincrona. Chang'e 4 comunica tramite il satellite relè Queqiao, posizionato al punto di Lagrange L2. Il rover Yutu-2 ha percorso oltre 1.7 km",
        foto: []
    },
    // 10 Tianwen-1
    {
        info: "Tianwen significa 'domande al cielo', dal poema classico di Qu Yuan. La missione ha inserito in orbita un satellite, depositato un lander e fatto muovere il rover Zhurong per oltre 1.9 km — tutto al primo tentativo cinese su Marte",
        foto: []
    },
    // 11 James Webb
    {
        info: "Il JWST ha uno specchio da 6.5 m composto da 18 esagoni d'oro. Osserva nell'infrarosso da 1.5 milioni di km, al punto L2 Terra-Luna. Il suo parasole ha le dimensioni di un campo da tennis. Vita operativa stimata: oltre 20 anni",
        foto: [
            { src: "images/jwst-f1.jpg", alt: "Galassia spirale NGC 1637 nell'infrarosso" },
            { src: "images/jwst-f2.jpg", alt: "I Pilastri della Creazione nella nebulosa dell'Aquila" }
        ]
    }
];

document.addEventListener("DOMContentLoaded", function () {
    const slides = document.querySelectorAll(".missione-slide");
    const scroll = document.getElementById("missioni-scroll");
    const dotsNav = document.getElementById("missioni-dots");
    var counter = document.getElementById("missione-counter");
    var hint = document.getElementById("scroll-hint");
    var btnSu = document.getElementById("btn-torna-su");

    var modalOverlay = document.getElementById("modal-info-overlay");
    var modalTitolo = document.getElementById("modal-info-titolo");
    var modalTesto = document.getElementById("modal-info-testo");
    var modalChiudi = document.getElementById("modal-info-chiudi");

    let lightboxOverlay = document.getElementById("lightbox-overlay");
    let lightboxImg = document.getElementById("lightbox-img");
    let lightboxCaption = document.getElementById("lightbox-caption");
    let lightboxChiudi = document.getElementById("lightbox-chiudi");
    let lightboxPrev = document.getElementById("lightbox-prev");
    let lightboxNext = document.getElementById("lightbox-next");

    var lightboxFoto = [];
    var lightboxIdx = 0;

    // --- lightbox ---
    function mostraFoto(idx) {
        lightboxIdx = idx;
        var f = lightboxFoto[idx];
        lightboxImg.src = f.src;
        lightboxImg.alt = f.alt;
        lightboxCaption.textContent = f.alt;
        lightboxPrev.disabled = idx <= 0;
        lightboxNext.disabled = idx >= lightboxFoto.length - 1;
    }
    function apriLightbox(foto, idx) {
        lightboxFoto = foto;
        lightboxOverlay.classList.add("aperta");
        mostraFoto(idx);
    }
    function chiudiLightbox() {
        lightboxOverlay.classList.remove("aperta");
        lightboxFoto = [];
    }
    lightboxPrev.addEventListener("click", function() { if (lightboxIdx > 0) mostraFoto(lightboxIdx - 1); });
    lightboxNext.addEventListener("click", function() { if (lightboxIdx < lightboxFoto.length - 1) mostraFoto(lightboxIdx + 1); });
    lightboxChiudi.addEventListener("click", chiudiLightbox);
    lightboxOverlay.addEventListener("click", function(e) {
        if (e.target === lightboxOverlay) chiudiLightbox();
    });

    // --- modal info ---
    function apriModal(titolo, testo) {
        modalTitolo.textContent = titolo;
        modalTesto.textContent = testo;
        modalOverlay.classList.add("aperto");
    }
    function chiudiModal() { modalOverlay.classList.remove("aperto"); }
    modalChiudi.addEventListener("click", chiudiModal);
    modalOverlay.addEventListener("click", function(e) {
        if (e.target === modalOverlay) chiudiModal();
    });
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") { chiudiModal(); chiudiLightbox(); }
        if (lightboxOverlay.classList.contains("aperta")) {
            if (e.key === "ArrowLeft" && lightboxIdx > 0) mostraFoto(lightboxIdx - 1);
            if (e.key === "ArrowRight" && lightboxIdx < lightboxFoto.length - 1) mostraFoto(lightboxIdx + 1);
        }
    });

    // --- carosello ---
    function creaCarosello(contenuto, foto) {
        if (!foto.length) return;
        var VISIBILI = 2;
        var offset = 0;

        var wrap = document.createElement("div");
        wrap.className = "missione-carousel";

        var btnP = document.createElement("button");
        btnP.className = "car-btn"; btnP.textContent = "‹"; btnP.type = "button";

        var track = document.createElement("div");
        track.className = "car-track";

        foto.forEach(function(f, fi) {
            var img = document.createElement("img");
            img.src = f.src; img.alt = f.alt;
            img.className = "car-thumb";
            img.addEventListener("click", function() { apriLightbox(foto, fi); });
            track.appendChild(img);
        });

        var btnN = document.createElement("button");
        btnN.className = "car-btn"; btnN.textContent = "›"; btnN.type = "button";

        wrap.appendChild(btnP);
        wrap.appendChild(track);
        wrap.appendChild(btnN);
        contenuto.appendChild(wrap);

        var thumbs = track.querySelectorAll(".car-thumb");

        function aggiornaCar() {
            thumbs.forEach(function(t, i) {
                t.style.display = (i >= offset && i < offset + VISIBILI) ? "block" : "none";
            });
            btnP.disabled = offset <= 0;
            btnN.disabled = offset + VISIBILI >= foto.length;
        }

        btnP.addEventListener("click", function() { if (offset > 0) { offset--; aggiornaCar(); } });
        btnN.addEventListener("click", function() { if (offset + VISIBILI < foto.length) { offset++; aggiornaCar(); } });
        aggiornaCar();
    }

    // inietta ? button e carosello in ogni slide
    slides.forEach(function(slide, i) {
        var extra = missioniExtra[i];
        if (!extra) return;

        var content = slide.querySelector(".missione-content");
        var meta = content.querySelector(".missione-meta");
        var titolo = content.querySelector("h2").textContent;

        // pulsante ?
        var btnInfo = document.createElement("button");
        btnInfo.className = "btn-info-missione";
        btnInfo.type = "button";
        btnInfo.setAttribute("aria-label", "Info aggiuntive su " + titolo);
        btnInfo.textContent = "?";
        btnInfo.addEventListener("click", function() { apriModal(titolo, extra.info); });
        meta.appendChild(btnInfo);

        // carosello
        creaCarosello(content, extra.foto);
    });

    // pallini di navigazione laterali
    slides.forEach(function (_, i) {
        var btn = document.createElement("button");
        btn.setAttribute("aria-label", "Missione " + (i + 1));
        btn.addEventListener("click", function () {
            slides[i].scrollIntoView({ behavior: "smooth" });
        });
        dotsNav.appendChild(btn);
    });

    var dots = dotsNav.querySelectorAll("button");

    function aggiorna(i) {
        dots.forEach(function (d, di) { d.classList.toggle("attivo", di === i); });
        counter.textContent = String(i + 1).padStart(2, "0") + " / " + slides.length;
        hint.style.opacity = i === 0 ? "1" : "0";
        btnSu.classList.toggle("visibile", i > 0);
    }

    btnSu.addEventListener("click", function () {
        slides[0].scrollIntoView({ behavior: "smooth" });
    });

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            entry.target.classList.toggle("visibile", entry.isIntersecting);
            if (entry.isIntersecting) {
                aggiorna(Array.from(slides).indexOf(entry.target));
            }
        });
    }, { root: scroll, threshold: 0.5 });

    slides.forEach(function (s) { observer.observe(s); });

    aggiorna(0);
});
