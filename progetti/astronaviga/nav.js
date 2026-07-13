document.addEventListener("DOMContentLoaded", function() {
    var burger = document.querySelector(".nav-burger");
    var menu = document.querySelector("nav ul");
    if (!burger || !menu) return;

    burger.addEventListener("click", function() {
        var isOpen = menu.classList.toggle("aperto");
        burger.textContent = isOpen ? "✕" : "☰";
    });

    // chiudi il menu quando clicchi su un link, sennò rimane aperto
    menu.querySelectorAll("a").forEach(function(link) {
        link.addEventListener("click", function() {
            menu.classList.remove("aperto");
            burger.textContent = "☰";
        });
    });
});
