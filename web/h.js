/* =====================================================================
   SEBEHODNOCENÍ HRÁČE — veřejná stránka za jednorázovým odkazem /h/<token>

   Hráč tady nikdy neuvidí hodnocení trenéra ani svoje předchozí hodnoty.
   Hlídá to Worker (§7.1, §7.2), tahle stránka o nich ani neví.
   ===================================================================== */

import { MAX } from './src/sablony.js';
import { esc } from './src/list.js';

/* Token je poslední část adresy /h/<token>. Adresa se nepřepisuje —
   Worker vrací h.html přímo na téhle cestě (viz assets.html_handling). */
const token = location.pathname.split('/').filter(Boolean).pop() ?? '';
const obsah = document.getElementById('obsah');

function stupnice(nazev) {
    let h = '<div class="stupnice">';
    for (let i = 1; i <= MAX; i++) {
        h += `<input type="radio" name="${nazev}" id="${nazev}-${i}" value="${i}">`
           + `<label for="${nazev}-${i}">${i}</label>`;
    }
    return h + '</div>';
}

function chyba(text) {
    obsah.innerHTML = `<div class="karta"><div class="hlaska chyba">${esc(text)}</div></div>`;
}

try {
    const odpoved = await fetch(`/api/self/${encodeURIComponent(token)}`);
    const data = await odpoved.json();
    if (!odpoved.ok) throw new Error(data?.chyba || 'Odkaz neplatí.');

    document.getElementById('hl-jmeno').textContent = data.jmeno;

    if (data.pouzit) {
        obsah.innerHTML = `<div class="karta"><div class="hlaska ok">
            Sebehodnocení už jsi odeslal. Díky — trenér ho má.</div></div>`;
    } else {
        obsah.innerHTML = `
            <div class="karta">
                <h2>Ahoj ${esc(data.prezdivka || data.jmeno)}</h2>
                <p class="popis">Tohle není zkoušení a nikdo kromě trenéra to neuvidí. Odpovídej,
                   jak to cítíš — čím upřímněji, tím užitečnější to bude. Vyplňuje se jednou,
                   podruhé už to nepůjde.</p>
                <div class="kotvy">${data.kotvy.map(k => `<span><b>${esc(k[0])}</b> – ${esc(k[1])}</span>`).join('')}</div>
            </div>

            <div class="karta">
                ${data.osy.map(o => `
                    <div class="osa">
                        <div class="nazev">${esc(o.popis)}<br><span class="ja">${esc(o.ja)}</span></div>
                        ${stupnice('osa-' + o.klic)}
                    </div>`).join('')}
            </div>

            <div class="karta">
                <div class="pole">
                    <label for="poznamka">Na čem chceš pracovat? (nepovinné)</label>
                    <textarea id="poznamka" maxlength="500" placeholder="Klidně jednou větou."></textarea>
                </div>
                <button class="hl" id="odeslat" title="Odešle sebehodnocení trenérovi">Odeslat</button>
            </div>`;

        document.getElementById('odeslat').onclick = async (e) => {
            const tlacitko = e.currentTarget;
            const hodnoty = {};
            const chybi = [];
            for (const o of data.osy) {
                const vybrano = obsah.querySelector(`input[name="osa-${o.klic}"]:checked`);
                if (!vybrano) chybi.push(o.popis);
                else hodnoty[o.klic] = Number(vybrano.value);
            }
            if (chybi.length) {
                alert(`Ještě chybí: ${chybi.join(', ')}.`);
                return;
            }

            tlacitko.disabled = true;
            try {
                const r = await fetch(`/api/self/${encodeURIComponent(token)}`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ hodnoty, poznamka: document.getElementById('poznamka').value })
                });
                const v = await r.json();
                if (!r.ok) throw new Error(v?.chyba || 'Nepodařilo se uložit.');

                obsah.innerHTML = `<div class="karta"><div class="hlaska ok">
                    <b>Díky, hotovo.</b><br>Trenér to má. Až budete mít oba vyplněno, projdete si spolu,
                    kde se vaše pohledy liší — to je na tom to nejzajímavější.</div></div>`;
            } catch (err) {
                tlacitko.disabled = false;
                alert(err.message);
            }
        };
    }
} catch (e) {
    chyba(e.message);
}
