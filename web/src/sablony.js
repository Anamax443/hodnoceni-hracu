/* =====================================================================
   ŠABLONY OS + ŠKÁLA — datová část
   Jediná definice pro celý projekt; importuje ji frontend i Worker.

   Tady jsou jen KLÍČE os a validace. Všechny texty (popisy os, kotvy
   škály, formulace v první osobě) jsou v i18n.js, protože existují
   česky i anglicky. Klíče se nepřekládají — jsou to klíče v databázi.

   POZOR: šablonu neměnit uprostřed sezóny. Jiný počet vrcholů = jiný
   tvar polygonu a hodnocení už nejde porovnat s předchozím obdobím.
   Stará hodnocení se vykreslují šablonou, se kterou byla pořízena
   (sloupec evaluations.sablona).
   ===================================================================== */

export const MAX = 10;   // maximum škály
export const KRUHY = 5;  // počet soustředných úrovní mřížky (po 2 bodech)

export const SABLONY = {
    pole:    ['prava', 'leva', 'hlavicky', 'prihravka', 'braneni', 'skenovani'],
    brankar: ['chytani', 'misto', 'nohama', 'vykopy', 'mimo', 'organizace']
};

/* Kondice a rychlost mezi osami záměrně nejsou — u téhle věkové
   kategorie měří biologický věk, ne odvedenou práci. Patří do
   slovního bloku „Fyzicky". */

/** Vrátí klíče os dané šablony, nebo prázdné pole u neznámé šablony. */
export function klice(sablona) {
    return SABLONY[sablona] ?? [];
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
