/* =====================================================================
   ŠABLONY OS + ŠKÁLA
   Jediná definice pro celý projekt — importuje ji frontend i Worker.

   POZOR: šablonu neměnit uprostřed sezóny. Jiný počet vrcholů = jiný
   tvar polygonu a hodnocení už nejde porovnat s předchozím obdobím.
   Stará hodnocení se vykreslují šablonou, se kterou byla pořízena
   (sloupec evaluations.sablona).
   ===================================================================== */

export const MAX = 10;   // maximum škály
export const KRUHY = 5;  // počet soustředných úrovní mřížky (po 2 bodech)

export const SABLONY = {
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
   Tisknou se na list a zobrazují se i ve formuláři hráče. */
export const KOTVY = [
    ['1–3', 'začínám, jen v klidu bez tlaku'],
    ['4–5', 'umím na tréninku, v zápase kolísá'],
    ['6–7', 'spolehlivé i v zápase'],
    ['8–9', 'silná stránka, opora týmu'],
    ['10',  'nadstandard pro kategorii']
];

/* Formulace os v první osobě — pro sebehodnocení hráče. Stejná osa,
   jiná věta: hráč má odpovídat na „umím to", ne známkovat sám sebe. */
export const JA = {
    prava:      'Pravou nohou trefím, co chci — i pod tlakem.',
    leva:       'Levou nohou přihraju na deset metrů tak, jak chci.',
    hlavicky:   'Ve vzduchu si věřím, hlavičku trefím čistě.',
    prihravka:  'První dotek mi sedne a přihrávka dojde tam, kam mířím.',
    braneni:    'V souboji jeden na jednoho míč uhájím nebo ho seberu.',
    skenovani:  'Než ke mně míč dorazí, vím, kdo je kolem mě.',
    chytani:    'Střelu chytím a míč si udržím.',
    misto:      'Stojím tam, kde mám — střelec na mě nemá úhel.',
    nohama:     'Rozehrávka po zemi mi jde i pod tlakem.',
    vykopy:     'Výkop doletí tam, kam chci, a k našemu hráči.',
    mimo:       'Vyjdu si pro centr a míč seberu.',
    organizace: 'Řídím obranu hlasem a je mi rozumět.'
};

/* Kondice a rychlost mezi osami záměrně nejsou — u téhle věkové
   kategorie měří biologický věk, ne odvedenou práci. Patří do
   slovního bloku „Fyzicky". */

/** Vrátí klíče os dané šablony, nebo prázdné pole u neznámé šablony. */
export function klice(sablona) {
    return (SABLONY[sablona] || []).map(o => o.klic);
}

/**
 * Ověří, že hodnoty odpovídají šabloně a jsou celá čísla 1..10.
 * Volá se na serveru (Worker), ne jen v UI.
 * @returns {string|null} text chyby, nebo null když je vše v pořádku
 */
export function zkontrolujHodnoty(sablona, hodnoty) {
    const ocekavane = klice(sablona);
    if (!ocekavane.length) return `Neznámá šablona: ${sablona}`;
    if (!hodnoty || typeof hodnoty !== 'object') return 'Chybí hodnoty';

    for (const k of ocekavane) {
        const v = hodnoty[k];
        if (!Number.isInteger(v) || v < 1 || v > MAX) {
            return `Osa „${k}" musí být celé číslo 1 až ${MAX} (přišlo: ${JSON.stringify(v)})`;
        }
    }
    const navic = Object.keys(hodnoty).filter(k => !ocekavane.includes(k));
    if (navic.length) return `Neznámé osy pro šablonu ${sablona}: ${navic.join(', ')}`;
    return null;
}
