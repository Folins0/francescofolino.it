// Demo statica per il portfolio: nessuna chiamata di rete, solo UI finta.
document.getElementById('form-prenota').addEventListener('submit', function (e) {
    e.preventDefault();
    document.getElementById('form-prenota').hidden = true;
    document.getElementById('prenota-successo').hidden = false;
});
