// lista dei pianeti
var pianeti = [
    {
        nome: "Sole", simbolo: "☉", colore: "#FFD700",
        significato: "Cerchio con punto centrale: energia che irradia dal nucleo",
        img: "images/sole.jpg",
        desc: "Il Sole è la stella al centro del nostro sistema solare. È una sfera di plasma composta per il 74% di idrogeno e per il 24% di elio, tenuta insieme dalla propria gravità",
        dati: [
            "Diametro: 1.392.700 km (109 volte la Terra)",
            "Temperatura superficiale: circa 5.500°C",
            "Temperatura del nucleo: circa 15 milioni °C",
            "Età: circa 4,6 miliardi di anni",
            "Curiosità: contiene il 99,86% della massa dell'intero sistema solare"
        ],
        nota: null
    },
    {
        nome: "Mercurio", simbolo: "☿", colore: "#b5b5b5",
        significato: "Croce, cerchio e mezzaluna: materia, spirito e anima",
        img: "images/mercurio.jpg",
        desc: "Il pianeta più piccolo e più vicino al Sole. Le sue temperature variano da -180°C di notte a 430°C di giorno",
        dati: [
            "Distanza dal Sole: 57,9 milioni di km",
            "Diametro: 4.879 km",
            "Periodo orbitale: 88 giorni terrestri",
            "Lune: nessuna",
            "Curiosità: un giorno su Mercurio dura più di un suo anno"
        ],
        nota: null
    },
    {
        nome: "Venere", simbolo: "♀", colore: "#e8c97a",
        significato: "Specchio di Venere: cerchio (spirito) sopra la croce (materia)",
        img: "images/venere.jpg",
        desc: "Il pianeta più caldo del sistema solare grazie al suo effetto serra estremo. Ruota in senso opposto agli altri pianeti",
        dati: [
            "Distanza dal Sole: 108,2 milioni di km",
            "Diametro: 12.104 km",
            "Periodo orbitale: 225 giorni terrestri",
            "Lune: nessuna",
            "Curiosità: il Sole su Venere sorge a ovest e tramonta a est"
        ],
        nota: null
    },
    {
        nome: "Terra", simbolo: "♁", colore: "#3a7bd5",
        significato: "Croce dei quattro punti cardinali inscritta in un cerchio",
        img: "images/terra.jpg",
        desc: "Il nostro pianeta, l'unico conosciuto ad ospitare vita. Coperto per il 71% di acqua",
        dati: [
            "Distanza dal Sole: 149,6 milioni di km",
            "Diametro: 12.742 km",
            "Periodo orbitale: 365,25 giorni",
            "Lune: 1 (la Luna)",
            "Curiosità: è l'unico pianeta con tettonica a placche attiva"
        ],
        nota: null
    },
    {
        nome: "Marte", simbolo: "♂", colore: "#c1440e",
        significato: "Scudo e lancia del dio della guerra",
        img: "images/marte.jpg",
        desc: "Il Pianeta Rosso, obiettivo principale dell'esplorazione umana futura. Ospita il vulcano più alto del sistema solare",
        dati: [
            "Distanza dal Sole: 227,9 milioni di km",
            "Diametro: 6.779 km",
            "Periodo orbitale: 687 giorni terrestri",
            "Lune: 2 (Phobos e Deimos)",
            "Curiosità: un giorno su Marte dura 24h e 37 minuti"
        ],
        nota: null
    },
    {
        nome: "Giove", simbolo: "♃", colore: "#c88b3a",
        significato: "Aquila stilizzata di Giove, dio dei fulmini e del cielo",
        img: "images/giove.jpg",
        desc: "Il gigante del sistema solare. La sua Grande Macchia Rossa è una tempesta attiva da secoli",
        dati: [
            "Distanza dal Sole: 778,5 milioni di km",
            "Diametro: 139.820 km",
            "Periodo orbitale: 11,9 anni terrestri",
            "Lune: 95 confermate",
            "Curiosità: la Grande Macchia Rossa esiste da almeno 350 anni"
        ],
        nota: null
    },
    {
        nome: "Saturno", simbolo: "♄", colore: "#e4d191",
        significato: "Falce di Saturno, dio del tempo e del raccolto",
        img: "images/saturno.jpg",
        desc: "Famoso per i suoi magnifici anelli di ghiaccio e roccia. È il pianeta meno denso del sistema solare",
        dati: [
            "Distanza dal Sole: 1,43 miliardi di km",
            "Diametro: 116.460 km",
            "Periodo orbitale: 29,5 anni terrestri",
            "Lune: 146 confermate",
            "Curiosità: i suoi anelli hanno uno spessore di soli 10-100 metri"
        ],
        nota: null
    },
    {
        nome: "Urano", simbolo: "⛢", colore: "#7de8e8",
        significato: "Unisce il simbolo di Marte e il sole: scoperto da William Herschel",
        img: "images/urano.jpg",
        desc: "Il gigante di ghiaccio che ruota su un fianco. Il suo asse è inclinato di 98°",
        dati: [
            "Distanza dal Sole: 2,87 miliardi di km",
            "Diametro: 50.724 km",
            "Periodo orbitale: 84 anni terrestri",
            "Lune: 28 confermate",
            "Curiosità: è l'unico pianeta a ruotare quasi su un fianco"
        ],
        nota: null
    },
    {
        nome: "Nettuno", simbolo: "♆", colore: "#5b7fde",
        significato: "Tridente del dio del mare e delle tempeste",
        img: "images/nettuno.jpg",
        desc: "Il pianeta più lontano e più ventoso del sistema solare. I suoi venti raggiungono i 2.100 km/h",
        dati: [
            "Distanza dal Sole: 4,5 miliardi di km",
            "Diametro: 49.244 km",
            "Periodo orbitale: 165 anni terrestri",
            "Lune: 16 confermate",
            "Curiosità: Nettuno non è mai stato osservato ad occhio nudo"
        ],
        nota: null
    },
    {
        nome: "Plutone", simbolo: "♇", colore: "#c8a882",
        significato: "Monogramma PL: da Pluto e Percival Lowell (suo scopritore)",
        img: "images/plutone.jpg",
        desc: "Plutone è un pianeta nano situato nella fascia di Kuiper, oltre l'orbita di Nettuno. Per decenni è stato considerato il nono pianeta del sistema solare, fino alla storica decisione del 2006",
        dati: [
            "Distanza dal Sole: 5,9 miliardi di km (media)",
            "Diametro: 2.377 km",
            "Periodo orbitale: 248 anni terrestri",
            "Lune: 5 (la principale è Caronte)",
            "Esplorato dalla sonda New Horizons nel luglio 2015"
        ],
        nota: "Perché Plutone non è più un pianeta? Nel 2006 l'Unione Astronomica Internazionale (UAI) ha ridefinito il concetto di \"pianeta\": per essere tale, un corpo celeste deve orbitare attorno al Sole, avere una forma sferica per via della propria gravità, e aver ripulito la propria orbita da altri detriti. Plutone soddisfa solo i primi due criteri: la sua orbita nella fascia di Kuiper è condivisa con molti altri oggetti di dimensioni simili. Per questo è stato riclassificato come pianeta nano, insieme a Cerere ed Eris"
    }
];

var indicePianeta = 0;

function costruisciTimeline() {
  var timeline = document.getElementById("timeline");

  var navicella = document.createElement("div");
  navicella.id = "navicella";
  var img = document.createElement("img");
  img.src = "images/navicella.svg";
  img.alt = "navicella";
  navicella.appendChild(img);
  timeline.appendChild(navicella);

  for (var i = 0; i < pianeti.length; i++) {
    // iife per catturare idx nel closure, sennò prende sempre l'ultimo
    (function(idx) {
      var p = pianeti[idx];

      var punto = document.createElement("div");
      punto.className = "timeline-punto";
      if (p.nota) punto.classList.add("timeline-punto-nano");

      var cerchio = document.createElement("div");
      cerchio.className = "timeline-cerchio";
      cerchio.style.borderColor = p.colore;

      var etichetta = document.createElement("span");
      etichetta.className = "timeline-etichetta";
      etichetta.textContent = p.nome;

      punto.appendChild(cerchio);
      punto.appendChild(etichetta);
      timeline.appendChild(punto);

      punto.addEventListener("click", function() {
        aggiornaPianeta(idx);
      });
    })(i);
  }

  aggiornaPianeta(0);
}

function aggiornaPianeta(nuovoIndice) {
    var vecchio = indicePianeta;
    indicePianeta = nuovoIndice;
    var p = pianeti[indicePianeta];
    var punti = document.querySelectorAll(".timeline-punto");

    punti.forEach(function(punto, i) {
        var cerchio = punto.querySelector(".timeline-cerchio");
        if (i === indicePianeta) {
            punto.classList.add("attivo");
            cerchio.style.backgroundColor = pianeti[i].colore;
        } else {
            punto.classList.remove("attivo");
            cerchio.style.backgroundColor = "transparent";
        }
    });

    var puntoAttivo = punti[indicePianeta];
    var navicella = document.getElementById("navicella");
    var offset_x = puntoAttivo.offsetLeft + puntoAttivo.querySelector(".timeline-cerchio").offsetWidth / 2;

    if (indicePianeta >= vecchio) {
        navicella.classList.remove("verso-sinistra");
        navicella.classList.add("verso-destra");
    } else {
        navicella.classList.remove("verso-destra");
        navicella.classList.add("verso-sinistra");
    }

    // sottrai metà larghezza per centrare la navicella sul punto
    navicella.style.left = (offset_x - navicella.offsetWidth / 2) + "px";

    document.getElementById("pianeta-nome").textContent = p.nome;
    document.getElementById("pianeta-nome").style.color = p.colore;
    document.getElementById("pianeta-desc").textContent = p.desc;
    document.getElementById("pianeta-img").style.backgroundImage = "url('" + p.img + "')";
    document.getElementById("pianeta-simbolo-icona").textContent = p.simbolo;
    document.getElementById("pianeta-simbolo-icona").style.color = p.colore;
    document.getElementById("pianeta-simbolo-testo").textContent = p.significato;

    var lista = document.getElementById("pianeta-dati");
    lista.innerHTML = "";
    p.dati.forEach(function(dato) {
        var li = document.createElement("li");
        var sep = dato.indexOf(": ");
        if (sep !== -1) {
            var label = dato.slice(0, sep);
            var valore = dato.slice(sep + 2);
            li.innerHTML = `<strong>${label}</strong>: ${valore}`;
        } else {
            li.textContent = dato;
        }
        lista.appendChild(li);
    });

    var box_nota = document.getElementById("pianeta-nota");
    if (p.nota) {
        box_nota.textContent = p.nota;
        box_nota.style.display = "block";
    } else {
        box_nota.style.display = "none";
    }

    document.getElementById("btn-precedente").disabled = (indicePianeta === 0);
    document.getElementById("btn-successivo").disabled = (indicePianeta === pianeti.length - 1);
}

document.addEventListener("DOMContentLoaded", function() {
  costruisciTimeline();

  document.getElementById("btn-precedente").addEventListener("click", function() {
    if (indicePianeta > 0) aggiornaPianeta(indicePianeta - 1);
  });

  document.getElementById("btn-successivo").addEventListener("click", function() {
    if (indicePianeta < pianeti.length - 1) aggiornaPianeta(indicePianeta + 1);
  });
});
