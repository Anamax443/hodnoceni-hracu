/* =====================================================================
   ŠABLONY OS + ŠKÁLA
   Jediná definice pro celý projekt. Ve fázi 2 tenhle soubor použije
   i Worker (převod na ESM = doplnit `export` k deklaracím, nic víc).

   POZOR: šablonu neměnit uprostřed sezóny. Jiný počet vrcholů = jiný
   tvar polygonu a hodnocení už nejde porovnat s předchozím obdobím.
   ===================================================================== */

const MAX = 10;   // maximum škály
const KRUHY = 5;  // počet soustředných úrovní mřížky (po 2 bodech)

const SABLONY = {
    pole: [
        { klic: 'prava',     popis: 'Technika pravá noha' },
        { klic: 'leva',      popis: 'Technika levá noha' },
        { klic: 'hlavicky',  popis: 'Hlavičkování' },
        { klic: 'prihravka', popis: 'Přihrávka a první dotek' },
        { klic: 'braneni',   popis: 'Bránění 1v1' },
        { klic: 'skenovani', popis: 'Skenování a poziční hra' }
    ],
    brankar: [
        { klic: 'chytani',    popis: 'Chytání a zákroky' },
        { klic: 'misto',      popis: 'Výběr místa a postavení' },
        { klic: 'nohama',     popis: 'Hra nohama (rozehrávka)' },
        { klic: 'vykopy',     popis: 'Výkopy a dlouhá rozehrávka' },
        { klic: 'mimo',       popis: 'Hra mimo bránu a centry' },
        { klic: 'organizace', popis: 'Organizace a komunikace' }
    ]
};

/* Pevné kotvy škály 1–10, aby hodnocení nedriftovalo mezi sezónami.
   Tiskne se na list a (ve fázi 3) zobrazuje i ve formuláři hráče. */
const KOTVY = [
    ['1–3', 'začínám, jen v klidu bez tlaku'],
    ['4–5', 'umím na tréninku, v zápase kolísá'],
    ['6–7', 'spolehlivé i v zápase'],
    ['8–9', 'silná stránka, opora týmu'],
    ['10',  'nadstandard pro kategorii']
];

/* Kondice a rychlost mezi osami záměrně nejsou — u téhle věkové
   kategorie měří biologický věk, ne odvedenou práci. Patří do
   slovního bloku „Fyzicky". */
