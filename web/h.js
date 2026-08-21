/* =====================================================================
   SEBEHODNOCENÍ HRÁČE — veřejná stránka za odkazem /h/<token>

   Odkaz se dá vyplnit opakovaně: každé odeslání je nový záznam s datem,
   takže je z čeho složit řadu v čase. Přepsat starší vyplnění nejde.

   Hráč tady nikdy neuvidí hodnocení trenéra ani svoje předchozí hodnoty —
   ani ta vlastní ne (§7.2): loňská sedmička přitáhne novou k sobě stejně
   jako cizí. Ví jen, kolikáté vyplnění to bude. Hlídá to Worker, tahle
   stránka o žádných starších číslech neví.
   ===================================================================== */

import { MAX } from './src/sablony.js';
import { esc } from './src/list.js';
import { t, jazyk, nastavJazyk, druhyJazyk, kotvy, ja, locale, osloveni } from './src/i18n.js';

/* Token je poslední část adresy /h/<token>. Adresa se nepřepisuje —
   Worker vrací h.html přímo na téhle cestě (viz assets.html_handling). */
const token = location.pathname.split('/').filter(Boolean).pop() ?? '';
const obsah = document.getElementById('obsah');
const $ = s => document.querySelector(s);

let data = null;   // co vrátil server; drží se kvůli překreslení při přepnutí jazyka

/* ===================== vzhled, jazyk, hodiny, verze ===================== */

function vzhled() { return document.documentElement.getAttribute('data-theme') || 'light'; }

function nastavVzhled(novy) {
    document.documentElement.setAttribute('data-theme', novy);
    try { localStorage.setItem('hodnoceni.theme', novy); } catch { /* nevadí */ }
    $('#themeBtn').textContent = novy === 'dark' ? t('shell.vzhled.svetly') : t('shell.vzhled.tmavy');
    $('#themeBtn').title = t('shell.vzhled.tip');
}

function hodiny() {
    const ted = new Date();
    const prvek = $('#hodiny');
    prvek.textContent = ted.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
    prvek.title = t('shell.hodiny.tip');
}

async function verze() {
    try {
        const v = await (await fetch('/api/version')).json();
        $('#verze').textContent = `${t('shell.verze')} ${v.commit}`;
        $('#verze').title = `${v.commitFull}\n${t('shell.sestaveno')}: ${new Date(v.builtAt).toLocaleString(locale())}`;
    } catch { $('#verze').textContent = ''; }
}

/* ===================== formulář ===================== */

function stupnice(nazev) {
    let h = '<div class="stupnice">';
    for (let i = 1; i <= MAX; i++) {
        h += `<input type="radio" name="${nazev}" id="${nazev}-${i}" value="${i}">`
           + `<label for="${nazev}-${i}">${i}</label>`;
    }
    return h + '</div>';
}

function zapamatujOdpovedi() {
    const stav = {};
    for (const klic of data?.osy ?? []) {
        const vybrano = obsah.querySelector(`input[name="osa-${klic}"]:checked`);
        if (vybrano) stav[klic] = vybrano.value;
    }
    return { hodnoty: stav, poznamka: $('#poznamka')?.value ?? '' };
}

function obnovOdpovedi(ulozene) {
    for (const [klic, hodnota] of Object.entries(ulozene.hodnoty)) {
        const prvek = obsah.querySelector(`#osa-${klic}-${hodnota}`);
        if (prvek) prvek.checked = true;
    }
    if ($('#poznamka')) $('#poznamka').value = ulozene.poznamka;
}

function vykresli() {
    document.documentElement.lang = jazyk();
    $('#hl-nadpis').textContent = '⚽ ' + t('self.nadpis');
    $('#jazykBtn').textContent = t('jazyk.dalsi');
    $('#jazykBtn').title = t('shell.jazyk.tip');
    nastavVzhled(vzhled());
    hodiny();

    if (!data) return;
    $('#hl-jmeno').textContent = data.jmeno;
    // Barva i název šablony sedí s tiskovým listem, který hráč dostane potom.
    $('#hl-sablona').innerHTML = data.sablona
        ? `<span class="znacka sab-${esc(data.sablona)}">${t('sablona.' + data.sablona)}</span>`
        : '';

    obsah.innerHTML = `
        <div class="karta">
            <h2>${t('self.ahoj', esc(osloveni(data.jmeno, data.prezdivka)))}</h2>
            <p class="popis">${t('self.popis')}</p>
            ${data.pouziti ? `<div class="hlaska info">${
                t('self.pokolikate', data.pouziti + 1)}${data.naposledy
                    ? ' ' + t('self.naposledy', esc(new Date(data.naposledy + 'Z').toLocaleDateString(locale())))
                    : ''} ${t('self.znovu.proc')}</div>` : ''}
            <div class="kotvy">${kotvy().map(k => `<span><b>${k[0]}</b> – ${k[1]}</span>`).join('')}</div>
        </div>

        <div class="karta">
            ${data.osy.map(klic => `
                <div class="osa">
                    <div class="nazev">${t('osa.' + klic)}<br><span class="ja">${ja(klic)}</span></div>
                    ${stupnice('osa-' + klic)}
                </div>`).join('')}
        </div>

        <div class="karta">
            <div class="pole">
                <label for="poznamka">${t('self.otazka')}</label>
                <textarea id="poznamka" maxlength="500" placeholder="${t('self.placeholder')}"></textarea>
            </div>
            <button class="hl" id="odeslat" title="${t('self.odeslat.tip')}">${t('self.odeslat')}</button>
        </div>`;

    $('#odeslat').onclick = odesli;
}

async function odesli(e) {
    const tlacitko = e.currentTarget;
    const hodnoty = {};
    const chybi = [];
    for (const klic of data.osy) {
        const vybrano = obsah.querySelector(`input[name="osa-${klic}"]:checked`);
        if (!vybrano) chybi.push(t('osa.' + klic));
        else hodnoty[klic] = Number(vybrano.value);
    }
    if (chybi.length) { alert(t('self.chybi', chybi.join(', '))); return; }

    tlacitko.disabled = true;
    try {
        const r = await fetch(`/api/self/${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ hodnoty, poznamka: $('#poznamka').value })
        });
        const v = await r.json();
        if (!r.ok) throw new Error(v?.chyba || t('chyba.server', r.status));

        // Odkaz zůstává v platnosti, takže po odeslání nekončí cesta — hráč se
        // sem může vrátit za měsíc a vyplnit znovu. Ať to ví.
        data.pouziti = v.poradi ?? (data.pouziti ?? 0) + 1;
        data.naposledy = null;
        obsah.innerHTML = `
            <div class="karta">
                <div class="hlaska ok">${t('self.hotovo')}</div>
                <p class="popis">${t('self.hotovo.znovu')}</p>
                <button class="vedlejsi" id="znovu" title="${t('self.znovu.tip')}">${t('self.znovu')}</button>
            </div>`;
        $('#znovu').onclick = () => vykresli();
    } catch (err) {
        tlacitko.disabled = false;
        alert(err.message);
    }
}

/* ===================== start ===================== */

$('#themeBtn').onclick = () => nastavVzhled(vzhled() === 'dark' ? 'light' : 'dark');
$('#jazykBtn').onclick = () => {
    // rozepsané odpovědi se při přepnutí jazyka nesmí ztratit
    const ulozene = data && obsah.querySelector('.stupnice') ? zapamatujOdpovedi() : null;
    nastavJazyk(druhyJazyk());
    vykresli();
    verze();
    if (ulozene) obnovOdpovedi(ulozene);
};
setInterval(hodiny, 1000);

vykresli();
verze();

try {
    const odpoved = await fetch(`/api/self/${encodeURIComponent(token)}`);
    const telo = await odpoved.json();
    if (!odpoved.ok) throw new Error(telo?.chyba || t('chyba.odkaz'));
    data = telo;
    vykresli();
} catch (e) {
    obsah.innerHTML = `<div class="karta"><div class="hlaska chyba">${esc(e.message)}</div></div>`;
}
