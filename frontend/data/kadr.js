/* =====================================================================
   KÁDR A HODNOCENÍ — jediný soubor, který se ve fázi 1 ručně edituje.
   Zbytek (src/*.js) je vykreslovací logika, do té sahat netřeba.

   Jak přidat hráče: zkopíruj jeden blok { ... } a přepiš. Čárky mezi
   bloky hlídej, jinak se stránka nevykreslí a nahoře vyskočí červená
   hláška s číslem řádku.

   POZOR na pořadí (ZADANI §7.2): hodnoty za předchozí období se při
   zadávání nekoukají. Nejdřív oznámkuj naslepo, teprve pak dopiš
   `predchozi`. Viditelná loňská hodnota přitáhne novou k sobě.
   ===================================================================== */

const NASTAVENI = {
    klub:       'SK ŘÍČMANICE',
    kategorie:  'Starší žáci',
    sezona:     '2025/2026',
    obdobi:     'závěrečné hodnocení sezóny',
    latka:      'starší žák',                 // proti čemu se hodnotí (ne proti kádru)
    cileNadpis: 'Na čem makáme do zimy'
};

/* ---------------------------------------------------------------------
   hodnoceni  = aktuální (modrý polygon); null => list se vytiskne
                prázdný s červenou poznámkou (užitečné jako podklad)
   predchozi  = minulé období (šedý čárkovaný obrys); null => nekreslí se
   sablona    = 'pole' | 'brankar' (viz src/sablony.js)
   aktivni    = false => hráč se netiskne (odešel, dlouhodobé zranění)

   Osy šablony 'pole':    prava, leva, hlavicky, prihravka, braneni, skenovani
   Osy šablony 'brankar': chytani, misto, nohama, vykopy, mimo, organizace
   Škála 1–10, kotvy viz src/sablony.js.
--------------------------------------------------------------------- */

const HRACI = [
    {
        jmeno: 'Vzorový Jan',
        prezdivka: 'Vzorek',
        post: 'Střední záložník',
        sablona: 'pole',
        hodnoceni: { prava: 7, leva: 4, hlavicky: 5, prihravka: 7, braneni: 5, skenovani: 4 },
        predchozi: { prava: 6, leva: 3, hlavicky: 4, prihravka: 5, braneni: 5, skenovani: 3 },
        fyzicky: 'Vytrvalost na dobré úrovni, ve druhém poločase neodpadá. V růstové fázi, v soubojích zatím tahá za kratší konec. To se srovná.',
        hlavou: 'Po chybě se rychle vrátí do hry a nehroutí se. Když se nedaří, začne to zkoušet sám místo kombinace. Na tom pracujeme.',
        parta: 'V kabině tahoun, mladší kluky bere mezi sebe. Na hřišti mluví málo, přitom by mu ostatní naslouchali.',
        cile: [
            'Rozhlédnout se DŘÍV, než ke mně míč dorazí. Dvakrát před každým příjmem.',
            'Levá noha: každý trénink 5 minut navíc, přihrávka do 10 metrů.',
            'Nahlas řídit spoluhráče kolem sebe, minimálně při standardkách.'
        ]
    },
    {
        jmeno: 'Vzorový Petr',
        prezdivka: 'Vzorák',
        post: 'Brankář',
        sablona: 'brankar',
        hodnoceni: { chytani: 7, misto: 5, nohama: 6, vykopy: 4, mimo: 4, organizace: 6 },
        predchozi: { chytani: 6, misto: 4, nohama: 4, vykopy: 4, mimo: 3, organizace: 5 },
        fyzicky: 'Odraz a rychlost do strany slušné. Chybí síla v dolní části zad, projeví se to na délce výkopu.',
        hlavou: 'Po inkasované brance chvíli vypadne z koncentrace. Ve druhém poločase zpomalí rozehrávku a začne kopat dlouhé míče.',
        parta: 'Spolehlivý, chodí včas, nestěžuje si. Obraně věří, ale nedává jí to najevo hlasem.',
        cile: [
            'Rozehrávku po zemi držet i ve druhém poločase. Nezastavovat míč a nekopat na náhodu.',
            'Výběr místa při centru: krok dopředu, ne vzad.',
            'Hlásit obraně tlak zezadu dřív, než k ní míč dorazí.'
        ]
    }

    /* --- SEM PATŘÍ REÁLNÝ KÁDR (19 hráčů) ---------------------------
       Vzorové bloky nahoře pak smaž. Šablona prázdného listu:

    ,{
        jmeno: '',
        prezdivka: '',
        post: '',
        sablona: 'pole',
        hodnoceni: null,
        predchozi: null,
        fyzicky: '',
        hlavou: '',
        parta: '',
        cile: []
    }
    ----------------------------------------------------------------- */
];
