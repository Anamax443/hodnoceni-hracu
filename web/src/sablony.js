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
    pole:    ['prava', 'leva', 'hlavicky', 'prihravka', 'braneni', 'skenovani', 'kondice'],
    brankar: ['chytani', 'misto', 'nohama', 'vykopy', 'mimo', 'organizace', 'kondice'],
    /* Vůdcovství se známkuje zvlášť, ne jako další osa u všech. Takhle dostane
       hráč druhý list vedle svého herního — stejně jako Ferda, který je
       hodnocený jako brankář i jako hráč v poli. Není to hodnocení povahy:
       každá osa popisuje chování, které je vidět. */
    leader:  ['vedeni', 'priklad', 'tlak', 'fairplay', 'podpora', 'odpovednost', 'kondice']
};

/* KONDICE je sedmá osa u všech šablon — rozhodnutí z 9. 8. 2026.
   Dřív tu záměrně nebyla, ze dvou důvodů; oba stojí za to znát, protože
   platí dál a je to vědomě přijatá daň:

   1. U téhle věkové kategorie kondice měří i biologický věk, ne jen
      odvedenou práci. Kdo povyroste o deset centimetrů, může mít lepší
      známku než ten, co dřel — a ten list si čtrnáctiletý odnese domů.
      Proto se u ní o to víc hodí říct slovy, co za číslem stojí; slovní
      blok „Fyzicky" zůstává a nezaniká.
   2. Sedm vrcholů místo šesti mění tvar polygonu. Hodnocení pořízená
      před tímhle datem mají šest os a vykreslují se dál jako šestiúhelník
      (osy se berou ze záznamu, ne ze šablony — viz `osyZaznamu`), takže
      nelžou. Porovnat starou šestici s novou sedmicí ale nejde a aplikace
      se o to nepokouší. */

/* Pozice, na kterých hráč může hrát. Klidně několik najednou — hráč
   bývá použitelný na levém beku i na křídle. Je to popisné, tiskne se
   to na list; se šablonou os to nesouvisí (tu vybírá trenér u hodnocení).
   Zvláštní případ je brankář: kdo chytá, dává smysl hodnotit brankářskou
   šablonou — ale i on může být oznámkovaný jako hráč v poli. */
export const POZICE = [
    'brankar',
    'pravy_bek', 'stoper', 'levy_bek',
    'defenzivni_zaloznik', 'stredni_zaloznik', 'ofenzivni_zaloznik',
    'prave_kridlo', 'leve_kridlo',
    'hrotovy_utocnik'
];

/* =====================================================================
   POPISKY PRO EXPORT

   Výjimka z pravidla „server texty nevrací": soubor pro Excel nečte
   aplikace, ale člověk. `trener`, `pole` a `stredni_zaloznik` jsou klíče
   do databáze a v tabulce pro trenéra nemají co dělat.

   Import bere obojí — popisek i klíč — takže starší soubory dál fungují.
   ===================================================================== */

export const POPISKY = {
    cs: {
        role: { hrac: 'hráč', trener: 'trenér' },
        sablona: { pole: 'hráč v poli', brankar: 'brankář', leader: 'leader' },
        pozice: {
            brankar: 'brankář', pravy_bek: 'pravý bek', stoper: 'stoper', levy_bek: 'levý bek',
            defenzivni_zaloznik: 'defenzivní záložník', stredni_zaloznik: 'střední záložník',
            ofenzivni_zaloznik: 'ofenzivní záložník', prave_kridlo: 'pravé křídlo',
            leve_kridlo: 'levé křídlo', hrotovy_utocnik: 'hrotový útočník'
        },
        ano: 'ano', ne: 'ne'
    },
    en: {
        role: { hrac: 'player', trener: 'coach' },
        sablona: { pole: 'outfield', brankar: 'goalkeeper', leader: 'leader' },
        pozice: {
            brankar: 'goalkeeper', pravy_bek: 'right back', stoper: 'centre back',
            levy_bek: 'left back', defenzivni_zaloznik: 'defensive midfielder',
            stredni_zaloznik: 'centre midfielder', ofenzivni_zaloznik: 'attacking midfielder',
            prave_kridlo: 'right winger', leve_kridlo: 'left winger', hrotovy_utocnik: 'striker'
        },
        ano: 'yes', ne: 'no'
    }
};

/** Popisek klíče pro export. Neznámý klíč se vrátí, jak přišel. */
export function popis(skupina, klic, jazyk = 'cs') {
    const slovnik = POPISKY[jazyk] ?? POPISKY.cs;
    return slovnik[skupina]?.[klic] ?? klic ?? '';
}

/** Porovnání bez ohledu na velikost písmen a diakritiku — lidi píšou různě. */
function holy(text) {
    return String(text ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Zpátky z popisku na klíč. Bere popisek v obou jazycích i samotný klíč,
 * aby prošly i soubory vyexportované dřív.
 */
export function klicZPopisu(skupina, text) {
    const hledane = holy(text);
    if (!hledane) return '';
    for (const jazyk of Object.keys(POPISKY)) {
        for (const [klic, popisek] of Object.entries(POPISKY[jazyk][skupina] ?? {})) {
            if (holy(popisek) === hledane || holy(klic) === hledane) return klic;
        }
    }
    return text.trim();
}

/** Ověří pole pozic. Prázdné je v pořádku — pozice nejsou povinné. */
export function zkontrolujPozice(pozice) {
    if (!Array.isArray(pozice)) return 'Pozice musí být seznam.';
    if (pozice.length > POZICE.length) return 'Příliš mnoho pozic.';
    const nezname = pozice.filter(p => !POZICE.includes(p));
    if (nezname.length) return `Neznámé pozice: ${nezname.join(', ')}`;
    return null;
}

/** Vrátí klíče os dané šablony, nebo prázdné pole u neznámé šablony. */
export function klice(sablona) {
    return SABLONY[sablona] ?? [];
}

/**
 * Osy, kterými se vykresluje KONKRÉTNÍ uložený záznam.
 *
 * Bere je ze šablony, ale nechá jen ty, které v uložených hodnotách opravdu
 * jsou. Hodnocení pořízené dřív, než osa přibyla, ji tak neukáže jako nulu —
 * a nula je na desetibodové škále nejhorší možná známka. Na listu, který si
 * čtrnáctiletý odnese domů, by to nebyla nepřesnost, ale lež.
 *
 * Radar je generický na počet os, takže starší záznam se prostě vykreslí
 * jako šestiúhelník vedle novějšího sedmiúhelníku.
 */
export function osyZaznamu(sablona, hodnoty) {
    const vsechny = klice(sablona);
    if (!hodnoty || typeof hodnoty !== 'object') return vsechny;
    const jsou = vsechny.filter(k => Number.isFinite(Number(hodnoty[k])) && hodnoty[k] !== null && hodnoty[k] !== '');
    // Prázdný průnik znamená rozbitý záznam, ne starý — ať se radar nezhroutí.
    return jsou.length ? jsou : vsechny;
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
