/* Vzhled se nastaví dřív, než se stránka vykreslí — jinak by při tmavém
   vzhledu problikla bílá. Zbytek ovládá app.js.

   Samostatný soubor schválně: dokud tenhle kód seděl přímo v HTML, musela by
   ho CSP povolit přes 'unsafe-inline', což je přesně ta díra, kvůli které se
   CSP zavádí. Proto se načítá jako obyčejný skript z vlastní domény.
   Je bez `defer` a `type=module` — musí doběhnout před vykreslením stránky. */
(function () {
    var t;
    try { t = localStorage.getItem('hodnoceni.theme'); } catch (e) {}
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
})();
