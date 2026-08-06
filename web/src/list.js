/* =====================================================================
   SESTAVENÍ TISKOVÉHO LISTU — jeden hráč = jedna A4

   Rámec: FA Four Corner Model
     - technicko-taktický roh          -> radar graf (čísla)
     - fyzický / psychický / sociální  -> slovní bloky (bez čísel)

   Co na list NEPATŘÍ (ZADANI §7.5): šipky trendu, věty typu
   „zhoršil ses", data jiných hráčů. Tohle si čtrnáctiletý odnese domů.

   List se tiskne vždy světlý, i když má aplikace tmavý vzhled — je to
   papír, ne obrazovka.
   ===================================================================== */

import { radar } from './radar.js';
import { t, osy, kotvy, locale } from './i18n.js';

/** Escapuje text z databáze, aby `&` nebo `<` v komentáři nerozbily HTML. */
export function esc(hodnota) {
    return String(hodnota ?? '').replace(/[&<>"']/g, z => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[z]);
}

/** Pozice hráče (klidně několik) plus volná poznámka, např. „Kapitán". */
function popisPostu(h) {
    const pozice = (h.pozice ?? []).map(p => t('pozice.' + p)).join(' · ');
    return [pozice, h.post].filter(Boolean).join(' — ');
}

/** Popisek druhého polygonu podle režimu, který vrátil server. */
function popisekPorovnani(h) {
    if (h.porovnaniRezim === 'hrac') return t('list.hracSeVidi');
    if (h.porovnaniRezim === 'minule') return h.porovnaniObdobi || t('list.minule');
    return '';
}

/**
 * Vrátí HTML jedné A4 stránky.
 * @param {Object} h   {jmeno, prezdivka, post, sablona, hodnoceni, porovnani,
 *                      porovnaniRezim, porovnaniObdobi, fyzicky, hlavou, parta, cile[]}
 * @param {Object} nas {klub, kategorie, sezona, obdobi, latka, cileNadpis}
 */
export function list(h, nas) {
    const seznamOs = osy(h.sablona);
    if (!seznamOs.length) throw new Error(t('list.neznamaSablona', h.jmeno, h.sablona));

    const datum = new Date().toLocaleDateString(locale());

    return `
    <div class="page">
        <div class="header">
            <div>
                <div class="club">${esc(nas.klub)}</div>
                <h1>${t('list.nadpis')}</h1>
            </div>
            <div class="meta">
                ${esc(nas.kategorie)} &bull; ${t('list.sezona')} ${esc(nas.sezona)}<br>
                ${esc(nas.obdobi)}<br>
                ${t('list.vystaveno')}: ${datum}
            </div>
        </div>

        <div class="playerbar">
            <span class="name">${esc(h.jmeno)}${h.prezdivka ? ' &bdquo;' + esc(h.prezdivka) + '&ldquo;' : ''}</span>
            <span class="role">${esc(popisPostu(h))}</span>
        </div>

        ${h.hodnoceni ? '' : `<p class="note-unfilled">${t('list.nevyplneno')}</p>`}

        <div class="chart-wrap">${radar(seznamOs, h.hodnoceni, h.porovnani)}</div>
        <div class="legend">
            <span><i class="swatch" style="background:#2196F3;opacity:.6"></i> ${t('list.trener')}</span>
            ${h.porovnani ? `<span><i class="swatch" style="background:#9e9e9e;opacity:.5"></i> ${esc(popisekPorovnani(h))}</span>` : ''}
        </div>

        <div class="blocks">
            <div class="block fyz">
                <h4>${t('blok.fyzicky')}</h4>
                <p>${esc(h.fyzicky) || '&mdash;'}</p>
            </div>
            <div class="block hlava">
                <h4>${t('blok.hlavou')}</h4>
                <p>${esc(h.hlavou) || '&mdash;'}</p>
            </div>
            <div class="block parta">
                <h4>${t('blok.parta')}</h4>
                <p>${esc(h.parta) || '&mdash;'}</p>
            </div>
        </div>

        <div class="goals">
            <h4>&#127919; ${esc(nas.cileNadpis)}</h4>
            <ol>${(h.cile || []).map(c => '<li>' + esc(c) + '</li>').join('')}</ol>
        </div>

        <div class="scale">
            <b>${t('list.jakCist')}</b>
            ${kotvy().map(k => `<span><b>${k[0]}</b> &ndash; ${k[1]}</span>`).join('')}
        </div>

        <div class="footer">
            <div>${t('list.paticka', esc(nas.latka))}</div>
            <div class="sign">${t('list.podpis')}</div>
        </div>
    </div>`;
}

/** Vykreslí listy více hráčů za sebou (jeden hráč = jedna stránka). */
export function vykresli(listy, nastaveni, cil) {
    cil.innerHTML = listy.map(h => list(h, nastaveni)).join('');
    return listy.length;
}
