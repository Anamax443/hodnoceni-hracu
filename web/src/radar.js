/* =====================================================================
   RADAR — inline SVG, bez knihovny, generický pro libovolný počet os
   (5 os = pětiúhelník, 6 = šestiúhelník, 8 = osmiúhelník).

   Geometrie převzata beze změny z docs/vzor-list.html — referenční
   tiskový výstup. Když se tady něco změní, musí se změnit i tam.
   (Barvu si graf bere z šablony, viz níž; vzor je list hráče v poli,
   takže zůstává modrý a jako reference platí dál.)

   Na jednom listu jsou maximálně DVA polygony. Tři jsou nečitelné.
   ===================================================================== */

/* Barva polygonu jde ze šablony (proměnné `--sab-*` v styl.css), aby graf
   držel stejný odstín jako hlavička listu. Zapisuje se přes `style`, ne přes
   `fill="..."`: prezentační atributy `var()` spolehlivě neumí. Záložní hodnota
   je modrá hráče v poli, takže SVG vytažené ze stránky vypadá pořád stejně. */
const VYPLN = 'var(--sab-zaklad, #2196F3)';
const OBRYS = 'var(--sab-tmava, #1565C0)';

import { MAX, KRUHY } from './sablony.js';

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
            svg += `<text x="${l.x.toFixed(1)}" y="${(yStart + radky.length * 10 + 1).toFixed(1)}" text-anchor="${anchor}" font-size="11.5" font-weight="bold" font-family="Arial" style="fill:${OBRYS}">${hodnota}/10</text>`;
        }
    }

    // --- porovnávací hodnocení: šedý čárkovaný obrys pod aktuálním ---
    if (porovnani) {
        const h = osy.map(o => porovnani[o.klic] ?? 0);
        svg += `<polygon points="${polygon(cx, cy, R, h, n)}" fill="#9e9e9e" fill-opacity="0.15" stroke="#757575" stroke-width="1.5" stroke-dasharray="4,3"/>`;
    }

    // --- aktuální hodnocení ---
    if (hodnoceni) {
        const h = osy.map(o => hodnoceni[o.klic] ?? 0);
        svg += `<polygon points="${polygon(cx, cy, R, h, n)}" fill-opacity="0.40" stroke-width="2.5" style="fill:${VYPLN};stroke:${OBRYS}"/>`;
        h.forEach((v, i) => {
            const p = bod(cx, cy, R * v / MAX, i, n);
            svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" style="fill:${OBRYS}"/>`;
        });
    }

    svg += '</svg>';
    return svg;
}
