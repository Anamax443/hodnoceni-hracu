/* =====================================================================
   SESTAVENÍ TISKOVÉHO LISTU — jeden hráč = jedna A4

   Rámec: FA Four Corner Model
     - technicko-taktický roh          -> radar graf (čísla)
     - fyzický / psychický / sociální  -> slovní bloky (bez čísel)

   Co na list NEPATŘÍ (viz ZADANI §7.5): šipky trendu, věty typu
   „zhoršil ses", data jiných hráčů. Tohle si čtrnáctiletý odnese domů.
   ===================================================================== */

/* Data píše trenér ručně do souboru, ale ampersand nebo lomená závorka
   v komentáři by rozbily HTML. Escapuje se všechno, co jde dovnitř. */
function esc(hodnota) {
    return String(hodnota ?? '').replace(/[&<>"']/g, z => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[z]);
}

/**
 * Vrátí HTML jedné A4 stránky.
 * @param {Object} h   hráč z pole HRACI
 * @param {Object} nas NASTAVENI (klub, kategorie, sezóna, období)
 */
function list(h, nas) {
    const osy = SABLONY[h.sablona];
    if (!osy) throw new Error(`Hráč „${h.jmeno}" má neznámou šablonu: ${h.sablona}`);

    const nevyplneno = !h.hodnoceni;
    const datum = new Date().toLocaleDateString('cs-CZ');

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

        ${nevyplneno ? '<p class="note-unfilled">&#9888; Hodnocení zatím nevyplněno &ndash; doplň data v souboru data/kadr.js.</p>' : ''}

        <div class="chart-wrap">${radar(osy, h.hodnoceni, h.predchozi)}</div>
        <div class="legend">
            <span><i class="swatch" style="background:#2196F3;opacity:.6"></i> teď</span>
            ${h.predchozi ? '<span><i class="swatch" style="background:#9e9e9e;opacity:.5"></i> minule</span>' : ''}
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

/* Vykreslení celého kádru do stránky. Volá se z tisk.html. */
function vykresli(hraci, nastaveni, cil) {
    const aktivni = hraci.filter(h => h.aktivni !== false);
    cil.innerHTML = aktivni.map(h => list(h, nastaveni)).join('');
    return aktivni.length;
}
