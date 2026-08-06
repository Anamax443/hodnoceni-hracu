/* =====================================================================
   SESTAVENÍ TISKOVÉHO LISTU — jeden hráč = jedna A4

   Rámec: FA Four Corner Model
     - technicko-taktický roh          -> radar graf (čísla)
     - fyzický / psychický / sociální  -> slovní bloky (bez čísel)

   Co na list NEPATŘÍ (ZADANI §7.5): šipky trendu, věty typu
   „zhoršil ses", data jiných hráčů. Tohle si čtrnáctiletý odnese domů.
   ===================================================================== */

import { SABLONY, KOTVY } from './sablony.js';
import { radar } from './radar.js';

/** Escapuje text z databáze, aby `&` nebo `<` v komentáři nerozbily HTML. */
export function esc(hodnota) {
    return String(hodnota ?? '').replace(/[&<>"']/g, z => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[z]);
}

/**
 * Vrátí HTML jedné A4 stránky.
 * @param {Object} h   {jmeno, prezdivka, post, sablona, hodnoceni, porovnani,
 *                      porovnaniPopisek, fyzicky, hlavou, parta, cile[]}
 * @param {Object} nas {klub, kategorie, sezona, obdobi, latka, cileNadpis}
 */
export function list(h, nas) {
    const osy = SABLONY[h.sablona];
    if (!osy) throw new Error(`Hráč „${h.jmeno}" má neznámou šablonu: ${h.sablona}`);

    const nevyplneno = !h.hodnoceni;
    const datum = new Date().toLocaleDateString('cs-CZ');
    const popisekPorovnani = h.porovnaniPopisek || 'minule';

    return `
    <div class="page">
        <div class="header">
            <div>
                <div class="club">${esc(nas.klub)}</div>
                <h1>Hodnocení hráče</h1>
            </div>
            <div class="meta">
                ${esc(nas.kategorie)} &bull; sezóna ${esc(nas.sezona)}<br>
                ${esc(nas.obdobi)}<br>
                Vystaveno: ${datum}
            </div>
        </div>

        <div class="playerbar">
            <span class="name">${esc(h.jmeno)}${h.prezdivka ? ' &bdquo;' + esc(h.prezdivka) + '&ldquo;' : ''}</span>
            <span class="role">${esc(h.post)}</span>
        </div>

        ${nevyplneno ? '<p class="note-unfilled">&#9888; Hodnocení za tohle období zatím není vyplněné.</p>' : ''}

        <div class="chart-wrap">${radar(osy, h.hodnoceni, h.porovnani)}</div>
        <div class="legend">
            <span><i class="swatch" style="background:#2196F3;opacity:.6"></i> ${esc(h.hodnoceniPopisek || 'teď')}</span>
            ${h.porovnani ? `<span><i class="swatch" style="background:#9e9e9e;opacity:.5"></i> ${esc(popisekPorovnani)}</span>` : ''}
        </div>

        <div class="blocks">
            <div class="block fyz">
                <h4>Fyzicky</h4>
                <p>${esc(h.fyzicky) || '&mdash;'}</p>
            </div>
            <div class="block hlava">
                <h4>Hlavou</h4>
                <p>${esc(h.hlavou) || '&mdash;'}</p>
            </div>
            <div class="block parta">
                <h4>V partě</h4>
                <p>${esc(h.parta) || '&mdash;'}</p>
            </div>
        </div>

        <div class="goals">
            <h4>&#127919; ${esc(nas.cileNadpis)}</h4>
            <ol>${(h.cile || []).map(c => '<li>' + esc(c) + '</li>').join('')}</ol>
        </div>

        <div class="scale">
            <b>Jak číst čísla:</b>
            ${KOTVY.map(k => `<span><b>${k[0]}</b> &ndash; ${k[1]}</span>`).join('')}
        </div>

        <div class="footer">
            <div>Graf tě porovnává s tím, co má umět ${esc(nas.latka)}. Ne se spoluhráči.<br>
                 Tvary mezi sebou neporovnávejte, leváci a praváci mají zub na opačné straně.</div>
            <div class="sign">trenér</div>
        </div>
    </div>`;
}

/** Vykreslí listy více hráčů za sebou (jeden hráč = jedna stránka). */
export function vykresli(listy, nastaveni, cil) {
    cil.innerHTML = listy.map(h => list(h, nastaveni)).join('');
    return listy.length;
}
