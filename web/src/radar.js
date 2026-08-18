/* =====================================================================
   RADAR — inline SVG, bez knihovny, generický pro libovolný počet os
   (5 os = pětiúhelník, 6 = šestiúhelník, 8 = osmiúhelník).

   Geometrie převzata beze změny z docs/vzor-list.html — referenční
   tiskový výstup. Když se tady něco změní, musí se změnit i tam.
   (Barvu si graf bere z šablony, viz níž; vzor je list hráče v poli,
   takže zůstává modrý a jako reference platí dál.)

   Na jednom listu jsou dnes DVA polygony (trenér a druhý pohled). Rozlišuje
   je typ čáry a tvar značky, ne barva — viz STYLY_RAD níž. Kdyby jich mělo
   být víc (dva trenéři a hráč), stačí sáhnout do té tabulky; nečitelné je
   tři polygony rozlišovat odstínem, ne tvarem.
   ===================================================================== */

/* Barva polygonu jde ze šablony (proměnné `--sab-*` v styl.css), aby graf
   držel stejný odstín jako hlavička listu. Zapisuje se přes `style`, ne přes
   `fill="..."`: prezentační atributy `var()` spolehlivě neumí. Záložní hodnota
   je modrá hráče v poli, takže SVG vytažené ze stránky vypadá pořád stejně. */
const VYPLN = 'var(--sab-zaklad, #2196F3)';
const OBRYS = 'var(--sab-tmava, #1565C0)';

/* Barva porovnávací řady. Šedá i na obrazovce — je to „ten druhý pohled",
   ne další šablona. */
const SEDA = '#757575';

/* =====================================================================
   ROZLIŠENÍ ŘAD MUSÍ PŘEŽÍT ČERNOBÍLOU TISKÁRNU

   Barva ani odstín šedi na to nestačí: dva poloprůhledné polygony vyjdou
   po převodu do šedi skoro stejně a na kopírce úplně. Rozlišení proto nese
   TVAR — typ čáry a tvar bodu. Obojí je čitelné i na faxu.

   Pořadí v poli = pořadí řad na listu. Přidat další řadu znamená přidat
   řádek; graf, značky i vzorek v legendě se z něj poskládají samy.
   ===================================================================== */
export const STYLY_RAD = [
    { cara: null,      bod: 'kruh',        sirka: 2.5, vypln: 0.18 },  // trenér — plná
    { cara: '7,4',     bod: 'ctverec',     sirka: 2,   vypln: 0 },     // hráč / minule — čárkovaná
    { cara: '1.5,3',   bod: 'kosoctverec', sirka: 2,   vypln: 0 },     // tečkovaná
    { cara: '9,3,2,3', bod: 'trojuhelnik', sirka: 2,   vypln: 0 }      // čerchovaná
];

import { MAX, KRUHY } from './sablony.js';
import { uroven } from './i18n.js';

/**
 * Značka bodu. Kreslí se bílou výplní s obrysem, aby zůstala čitelná i tam,
 * kde se řady kříží nebo leží přes sebe — plná značka by pod sebou schovala
 * druhou. Výjimka je kruh trenéra: ten je plný, protože je to hlavní řada.
 */
function bodRady(tvar, x, y, barva) {
    const X = x.toFixed(1), Y = y.toFixed(1), r = 3.2;
    const obrys = `fill="#ffffff" stroke="${barva}" stroke-width="1.6"`;

    if (tvar === 'ctverec') {
        return `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" `
            + `width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" ${obrys}/>`;
    }
    if (tvar === 'kosoctverec') {
        const d = r + 0.6;
        return `<polygon points="${X},${(y - d).toFixed(1)} ${(x + d).toFixed(1)},${Y} `
            + `${X},${(y + d).toFixed(1)} ${(x - d).toFixed(1)},${Y}" ${obrys}/>`;
    }
    if (tvar === 'trojuhelnik') {
        const d = r + 0.8;
        return `<polygon points="${X},${(y - d).toFixed(1)} ${(x + d).toFixed(1)},${(y + d * 0.8).toFixed(1)} `
            + `${(x - d).toFixed(1)},${(y + d * 0.8).toFixed(1)}" ${obrys}/>`;
    }
    return `<circle cx="${X}" cy="${Y}" r="${r}" style="fill:${barva}"/>`;
}

/**
 * Vzorek řady do legendy — kousek čáry se značkou uprostřed, tedy přesně to,
 * co je v grafu. Barevné čtverečky, které tu byly dřív, po převodu do šedi
 * splynuly a legenda přestala platit zrovna na papíře, kde je potřeba nejvíc.
 *
 * @param {number} poradi index do STYLY_RAD
 * @param {string} barva  CSS barva (klidně var(--sab-tmava))
 */
export function vzorekRady(poradi, barva = SEDA) {
    const s = STYLY_RAD[poradi] ?? STYLY_RAD[0];
    return `<svg class="vzorek" width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">`
        + `<line x1="1" y1="5" x2="27" y2="5" stroke="${barva}" stroke-width="${s.sirka}"`
        + `${s.cara ? ` stroke-dasharray="${s.cara}"` : ''} stroke-linecap="butt"/>`
        + bodRady(s.bod, 14, 5, barva)
        + `</svg>`;
}

/* Barvy pro překryv víc hodnotitelů. Tvar (čára + značka) rozlišuje řady sám,
   tohle je druhý signál navíc — překryv se dívá na obrazovce, kde barva je,
   a čtyři obrysy v jednom odstínu se čtou hůř než čtyři barevné. Na papíře
   listu se tenhle graf nekreslí; tam platí dál pravidlo dvou polygonů. */
const BARVY_RAD = ['#1565C0', '#AD1457', '#00838F', '#EF6C00', '#4527A0', '#2E7D32'];

/** Barva a styl i-té řady překryvu. Víc řad než stylů = styly se opakují,
    ale barva je pořád jiná, takže se řady nespojí v jednu. */
export function stylRady(i) {
    return { ...STYLY_RAD[i % STYLY_RAD.length], barva: BARVY_RAD[i % BARVY_RAD.length] };
}

/** Souřadnice bodu na ose i (osa 0 = nahoře, dál po směru hodin) */
export function bod(cx, cy, r, i, n) {
    const uhel = (Math.PI * 2 * i / n) - Math.PI / 2;
    return { x: cx + r * Math.cos(uhel), y: cy + r * Math.sin(uhel) };
}

/** Sestaví "x,y x,y ..." pro <polygon> z pole hodnot */
export function polygon(cx, cy, R, hodnoty, n) {
    return hodnoty.map((h, i) => {
        const p = bod(cx, cy, R * h / MAX, i, n);
        return p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');
}

/** Zalomí dlouhý popisek osy na dva řádky */
export function zalom(text) {
    if (text.length <= 17) return [text];
    const slova = text.split(' ');
    let a = '', b = '';
    slova.forEach(s => {
        if (b === '' && (a + ' ' + s).trim().length <= 17) a = (a + ' ' + s).trim();
        else b = (b + ' ' + s).trim();
    });
    return b ? [a, b] : [a];
}

/**
 * Vykreslí radar.
 * @param {Array}  osy       pole {klic, popis} ze SABLONY
 * @param {Object} hodnoceni {klic: 1..10} — modrý výplňový polygon; null = prázdný graf
 * @param {Object} porovnani {klic: 1..10} — šedý čárkovaný obrys pod ním; null = nekreslí se
 * @returns {string} SVG
 */
export function radar(osy, hodnoceni, porovnani) {
    const n = osy.length;
    const W = 470, H = 300, cx = 235, cy = 148, R = 100;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Hodnocení hráče">`;

    // --- mřížka: soustředné n-úhelníky ---
    for (let k = KRUHY; k >= 1; k--) {
        const r = R * k / KRUHY;
        const body = [];
        for (let i = 0; i < n; i++) {
            const p = bod(cx, cy, r, i, n);
            body.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
        }
        svg += `<polygon points="${body.join(' ')}" fill="${k % 2 ? '#ffffff' : '#fafafa'}" stroke="#cccccc" stroke-width="1"/>`;
    }

    // --- paprsky a popisky os ---
    for (let i = 0; i < n; i++) {
        const p = bod(cx, cy, R, i, n);
        svg += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#cccccc" stroke-width="1"/>`;

        const l = bod(cx, cy, R + 22, i, n);
        let anchor = 'middle';
        if (l.x > cx + 6) anchor = 'start';
        if (l.x < cx - 6) anchor = 'end';

        const radky = zalom(osy[i].popis);
        const hodnota = hodnoceni ? hodnoceni[osy[i].klic] : null;
        const yStart = l.y - (radky.length - 1) * 5;

        radky.forEach((r, ri) => {
            svg += `<text x="${l.x.toFixed(1)}" y="${(yStart + ri * 10).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" font-family="Arial" fill="#444444">${r}</text>`;
        });
        if (hodnota !== null && hodnota !== undefined) {
            /* Vedle čísla stojí jméno úrovně. Samotná sedmička nikomu nic neříká,
               dokud si nedohledá pásmo v legendě pod grafem — a rodič, který list
               vidí jednou za půl roku, ho nedohledá. Jméno je proto rovnou u čísla;
               pásma i tak zůstávají v legendě, tohle je zkratka, ne náhrada. */
            const y = (yStart + radky.length * 10 + 1).toFixed(1);
            svg += `<text x="${l.x.toFixed(1)}" y="${y}" text-anchor="${anchor}" font-size="11.5" font-weight="bold" font-family="Arial" style="fill:${OBRYS}">${hodnota}/10`
                + `<tspan font-size="9" font-weight="normal" fill="#555555"> ${uroven(hodnota)}</tspan></text>`;
        }
    }

    /* Pořadí kreslení: NEJDŘÍV všechny výplně, teprve pak všechny čáry a značky.
       Když se polygon trenéra kreslil i s výplní až na porovnání, ležela
       čárkovaná čára hráče všude, kde je uvnitř, pod šedou plochou a ztrácela
       kontrast — na černobílém tisku nejvíc. Čára nesmí být pod výplní. */

    // --- výplň hlavní řady (bez obrysu, ten přijde až nakonec) ---
    if (hodnoceni) {
        const h = osy.map(o => hodnoceni[o.klic] ?? 0);
        svg += `<polygon points="${polygon(cx, cy, R, h, n)}" `
            + `fill-opacity="${STYLY_RAD[0].vypln}" stroke="none" style="fill:${VYPLN}"/>`;
    }

    /* --- porovnávací řada: čárkovaná čára se čtverečky, bez výplně ---
       Dvě poloprůhledné výplně přes sebe daly na papíře tři odstíny šedi,
       ve kterých nešlo poznat, čí je která. Tvar čáry a značek to unese sám. */
    if (porovnani) {
        const s = STYLY_RAD[1];
        const h = osy.map(o => porovnani[o.klic] ?? 0);
        svg += `<polygon points="${polygon(cx, cy, R, h, n)}" fill="none" `
            + `stroke="${SEDA}" stroke-width="${s.sirka}" stroke-dasharray="${s.cara}" stroke-linejoin="round"/>`;
        h.forEach((v, i) => {
            const p = bod(cx, cy, R * v / MAX, i, n);
            svg += bodRady(s.bod, p.x, p.y, SEDA);
        });
    }

    // --- obrys a značky hlavní řady, úplně navrchu ---
    if (hodnoceni) {
        const s = STYLY_RAD[0];
        const h = osy.map(o => hodnoceni[o.klic] ?? 0);
        svg += `<polygon points="${polygon(cx, cy, R, h, n)}" fill="none" `
            + `stroke-width="${s.sirka}" stroke-linejoin="round" style="stroke:${OBRYS}"/>`;
        h.forEach((v, i) => {
            const p = bod(cx, cy, R * v / MAX, i, n);
            svg += bodRady(s.bod, p.x, p.y, OBRYS);
        });
    }

    svg += '</svg>';
    return svg;
}

/**
 * Překryv LIBOVOLNÉHO počtu řad — samé obrysy, žádná výplň.
 *
 * Odlišnosti proti `radar()` výš, a všechny mají důvod:
 * - **žádná výplň.** Tady si nejsou řady nadřazená a podřízená, jsou to
 *   rovnocenné pohledy několika trenérů. Poloprůhledné plochy přes sebe navíc
 *   dají tolik odstínů, kolik je průsečíků, a graf zšedne.
 * - **u os nestojí číslo.** U dvou řad se dá číslo hlavní z nich napsat vedle
 *   popisku; u čtyř by tam musely být čtyři a to je tabulka, ne graf. Čísla
 *   zůstávají v tabulce pod grafem, kde jsou i tak.
 * - **rozlišuje tvar i barva** (viz `stylRady`).
 *
 * Chybějící hodnota se kreslí jako 0, ale jen tehdy, když ostatní osy řada má —
 * volající proto smí posílat jen řady, které mají hodnotu ke každé ose.
 *
 * @param {Array} osy   pole {klic, popis}
 * @param {Array} rady  [{hodnoty:{klic:1..10}, popis:string}] v pořadí kreslení
 */
export function radarVice(osy, rady) {
    const n = osy.length;
    const W = 470, H = 300, cx = 235, cy = 148, R = 100;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Překryv hodnocení">`;

    for (let k = KRUHY; k >= 1; k--) {
        const r = R * k / KRUHY;
        const body = [];
        for (let i = 0; i < n; i++) {
            const p = bod(cx, cy, r, i, n);
            body.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
        }
        svg += `<polygon points="${body.join(' ')}" fill="${k % 2 ? '#ffffff' : '#fafafa'}" stroke="#cccccc" stroke-width="1"/>`;
    }

    for (let i = 0; i < n; i++) {
        const p = bod(cx, cy, R, i, n);
        svg += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#cccccc" stroke-width="1"/>`;

        const l = bod(cx, cy, R + 22, i, n);
        let anchor = 'middle';
        if (l.x > cx + 6) anchor = 'start';
        if (l.x < cx - 6) anchor = 'end';

        const radky = zalom(osy[i].popis);
        const yStart = l.y - (radky.length - 1) * 5;
        radky.forEach((r, ri) => {
            svg += `<text x="${l.x.toFixed(1)}" y="${(yStart + ri * 10).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" font-family="Arial" fill="#444444">${r}</text>`;
        });
    }

    rady.forEach((rada, poradi) => {
        const s = stylRady(poradi);
        const h = osy.map(o => Number(rada.hodnoty?.[o.klic]) || 0);
        svg += `<polygon points="${polygon(cx, cy, R, h, n)}" fill="none" `
            + `stroke="${s.barva}" stroke-width="${s.sirka}" stroke-linejoin="round"`
            + `${s.cara ? ` stroke-dasharray="${s.cara}"` : ''}/>`;
        h.forEach((v, i) => {
            const p = bod(cx, cy, R * v / MAX, i, n);
            svg += bodRady(s.bod, p.x, p.y, s.barva);
        });
    });

    svg += '</svg>';
    return svg;
}
