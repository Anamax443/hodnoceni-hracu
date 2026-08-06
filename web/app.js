/* =====================================================================
   APLIKACE PRO TRENÉRA

   Autorizace je ve Workeru, ne tady. Tenhle kód jen kreslí; když se
   session rozpadne, API vrátí 401 a aplikace se vrátí na přihlášení.
   ===================================================================== */

import { SABLONY, KOTVY, MAX } from './src/sablony.js';
import { esc } from './src/list.js';

const $ = s => document.querySelector(s);
const stav = { nastaveni: {}, lide: [], zalozka: 'lide' };

/* ===================== komunikace ===================== */

async function api(cesta, volby = {}) {
    const opt = { credentials: 'same-origin', ...volby };
    if (opt.telo !== undefined) {
        opt.method = opt.method || 'POST';
        opt.headers = { 'content-type': 'application/json' };
        opt.body = JSON.stringify(opt.telo);
        delete opt.telo;
    }
    const odpoved = await fetch(cesta, opt);
    const text = await odpoved.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* ne-JSON necháme null */ }

    if (odpoved.status === 401) { ukazPrihlaseni(); throw new Error('Odhlášeno — přihlas se znovu.'); }
    if (!odpoved.ok) throw new Error(data?.chyba || `Server odpověděl ${odpoved.status}.`);
    return data;
}

/* ===================== přihlášení ===================== */

function ukazPrihlaseni() {
    $('#prihlaseni').hidden = false;
    $('#aplikace').hidden = true;
}

async function prihlas() {
    const heslo = $('#heslo').value;
    $('#prihlaseni-chyba').innerHTML = '';
    try {
        await api('/api/login', { telo: { heslo } });
        $('#heslo').value = '';
        await spust();
    } catch (e) {
        $('#prihlaseni-chyba').innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
    }
}

/* ===================== kostra ===================== */

async function spust() {
    stav.nastaveni = await api('/api/settings');
    stav.lide = await api('/api/players');

    $('#prihlaseni').hidden = true;
    $('#aplikace').hidden = false;
    $('#hl-klub').textContent = stav.nastaveni.klub;
    $('#hl-obdobi').textContent = `období: ${stav.nastaveni.obdobi}`;

    await prekresli();
}

async function prekresli() {
    document.querySelectorAll('#zalozky button')
        .forEach(b => b.classList.toggle('aktivni', b.dataset.z === stav.zalozka));

    const obsah = $('#obsah');
    obsah.innerHTML = '<p class="popis">Načítám…</p>';
    try {
        const kresli = { lide, hodnotit, listy, porovnani, odkazy, nastaveni }[stav.zalozka];
        await kresli(obsah);
    } catch (e) {
        obsah.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
    }
}

function hlaska(kam, typ, text) {
    kam.insertAdjacentHTML('afterbegin', `<div class="hlaska ${typ}">${esc(text)}</div>`);
}

const hraciAktivni = () => stav.lide.filter(o => o.role === 'hrac' && o.aktivni);

/* ===================== záložka: Lidé ===================== */

async function lide(kam) {
    const radek = o => `
        <tr>
            <td>${esc(o.jmeno)}${o.prezdivka ? ` <span class="popis">„${esc(o.prezdivka)}"</span>` : ''}</td>
            <td>${esc(o.post || '—')}</td>
            <td><span class="znacka ${o.role}">${o.role === 'trener' ? 'trenér' : 'hráč'}</span></td>
            <td>${o.role === 'hrac' ? esc(o.sablona) : '—'}</td>
            <td>${o.aktivni ? '' : '<span class="znacka neaktivni">neaktivní</span>'}</td>
            <td><button class="vedlejsi" data-upravit="${o.id}" title="Upravit údaje této osoby">Upravit</button></td>
        </tr>`;

    kam.innerHTML = `
        <div class="karta">
            <h2>Lidé v týmu</h2>
            <p class="popis">Hráči se hodnotí a tisknou se jim listy. Trenéři se nehodnotí — jsou tu proto,
               aby šlo zaznamenat, kdo hodnocení pořídil.</p>
            <table>
                <thead><tr><th>Jméno</th><th>Post</th><th>Role</th><th>Šablona</th><th></th><th></th></tr></thead>
                <tbody>${stav.lide.map(radek).join('') || '<tr><td colspan="6">Zatím tu nikdo není.</td></tr>'}</tbody>
            </table>
        </div>

        <div class="karta" id="formular-osoby">
            <h2 id="nadpis-osoby">Nová osoba</h2>
            <input type="hidden" id="osoba-id" value="">
            <div class="radek">
                <div class="pole"><label for="o-jmeno">Jméno a příjmení</label>
                    <input type="text" id="o-jmeno" placeholder="Novák Jan"></div>
                <div class="pole"><label for="o-prezdivka">Přezdívka</label>
                    <input type="text" id="o-prezdivka" placeholder="Nováček"></div>
            </div>
            <div class="radek">
                <div class="pole"><label for="o-post">Post / funkce</label>
                    <input type="text" id="o-post" placeholder="Střední záložník"></div>
                <div class="pole"><label for="o-role">Role</label>
                    <select id="o-role"><option value="hrac">hráč</option><option value="trener">trenér</option></select></div>
                <div class="pole"><label for="o-sablona">Šablona os</label>
                    <select id="o-sablona">${Object.keys(SABLONY).map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
            </div>
            <div class="pole"><label><input type="checkbox" id="o-aktivni" checked style="width:auto"> aktivní</label></div>
            <button class="hl" id="ulozit-osobu" title="Uloží osobu do databáze">Uložit</button>
            <button class="vedlejsi" id="nova-osoba" title="Vyprázdní formulář">Nová</button>
        </div>`;

    const vyprazdni = () => {
        $('#osoba-id').value = '';
        $('#nadpis-osoby').textContent = 'Nová osoba';
        ['o-jmeno', 'o-prezdivka', 'o-post'].forEach(id => { $('#' + id).value = ''; });
        $('#o-role').value = 'hrac';
        $('#o-sablona').value = 'pole';
        $('#o-aktivni').checked = true;
    };

    kam.querySelectorAll('[data-upravit]').forEach(b => b.onclick = () => {
        const o = stav.lide.find(x => x.id === Number(b.dataset.upravit));
        $('#osoba-id').value = o.id;
        $('#nadpis-osoby').textContent = `Úprava: ${o.jmeno}`;
        $('#o-jmeno').value = o.jmeno;
        $('#o-prezdivka').value = o.prezdivka || '';
        $('#o-post').value = o.post || '';
        $('#o-role').value = o.role;
        $('#o-sablona').value = o.sablona;
        $('#o-aktivni').checked = !!o.aktivni;
        $('#formular-osoby').scrollIntoView({ behavior: 'smooth' });
    });

    $('#nova-osoba').onclick = vyprazdni;

    $('#ulozit-osobu').onclick = async () => {
        const id = $('#osoba-id').value;
        const telo = {
            jmeno: $('#o-jmeno').value,
            prezdivka: $('#o-prezdivka').value,
            post: $('#o-post').value,
            role: $('#o-role').value,
            sablona: $('#o-sablona').value,
            aktivni: $('#o-aktivni').checked
        };
        try {
            await api(id ? `/api/players/${id}` : '/api/players', { telo, method: id ? 'PATCH' : 'POST' });
            stav.lide = await api('/api/players');
            await prekresli();
            hlaska($('#obsah'), 'ok', id ? 'Údaje uloženy.' : 'Osoba přidána.');
        } catch (e) {
            hlaska($('#formular-osoby'), 'chyba', e.message);
        }
    };
}

/* ===================== záložka: Hodnotit ===================== */

function stupnice(nazev, hodnota = null) {
    let h = '<div class="stupnice">';
    for (let i = 1; i <= MAX; i++) {
        const id = `${nazev}-${i}`;
        h += `<input type="radio" name="${nazev}" id="${id}" value="${i}"${hodnota === i ? ' checked' : ''}>`
           + `<label for="${id}">${i}</label>`;
    }
    return h + '</div>';
}

const kotvyHtml = () =>
    `<div class="kotvy">${KOTVY.map(k => `<span><b>${k[0]}</b> – ${k[1]}</span>`).join('')}</div>`;

async function hodnotit(kam) {
    const hraci = hraciAktivni();
    const treneri = stav.lide.filter(o => o.role === 'trener');

    kam.innerHTML = `
        <div class="karta">
            <h2>Hodnocení hráče</h2>
            <p class="popis">Období: <b>${esc(stav.nastaveni.obdobi)}</b>. Uloží se jako nový záznam —
               starší hodnocení se nikdy nepřepisuje.</p>
            <div class="radek">
                <div class="pole"><label for="h-hrac">Hráč</label>
                    <select id="h-hrac">
                        <option value="">— vyber hráče —</option>
                        ${hraci.map(h => `<option value="${h.id}">${esc(h.jmeno)}</option>`).join('')}
                    </select></div>
                <div class="pole"><label for="h-autor">Hodnotí</label>
                    <select id="h-autor">
                        <option value="">— neuvedeno —</option>
                        ${treneri.map(t => `<option value="${t.id}">${esc(t.jmeno)}</option>`).join('')}
                    </select></div>
            </div>
        </div>
        <div id="formular"></div>`;

    $('#h-hrac').onchange = () => formularHodnoceni($('#formular'), Number($('#h-hrac').value));
}

function formularHodnoceni(kam, hracId) {
    if (!hracId) { kam.innerHTML = ''; return; }
    const hrac = stav.lide.find(o => o.id === hracId);
    const osy = SABLONY[hrac.sablona];

    kam.innerHTML = `
        <div class="karta">
            <div class="hlaska pozor">Známkuje se naslepo. Předchozí hodnoty se schválně nezobrazují —
                viditelné loňské číslo přitáhne nové k sobě a datová řada přestane cokoliv říkat.
                Porovnání uvidíš až po uložení.</div>
            <h2>${esc(hrac.jmeno)} <span class="popis">— šablona ${esc(hrac.sablona)}</span></h2>
            ${kotvyHtml()}
            <div style="margin-top:10px">
                ${osy.map(o => `
                    <div class="osa">
                        <div class="nazev">${esc(o.popis)}</div>
                        ${stupnice('osa-' + o.klic)}
                    </div>`).join('')}
            </div>
        </div>

        <div class="karta">
            <h2>Slovní bloky</h2>
            <p class="popis">Tyhle tři rohy modelu se nikdy neznámkují číslem. Kondice a rychlost patří do „Fyzicky".</p>
            <div class="pole"><label for="h-fyzicky">Fyzicky</label><textarea id="h-fyzicky"></textarea></div>
            <div class="pole"><label for="h-hlavou">Hlavou</label><textarea id="h-hlavou"></textarea></div>
            <div class="pole"><label for="h-parta">V partě</label><textarea id="h-parta"></textarea></div>
        </div>

        <div class="karta">
            <h2>${esc(stav.nastaveni.cileNadpis)}</h2>
            <p class="popis">Dva až tři, konkrétní a ověřitelné. Hráč musí poznat, jestli je splnil.</p>
            <div class="pole"><input type="text" id="h-cil1" placeholder="1. cíl"></div>
            <div class="pole"><input type="text" id="h-cil2" placeholder="2. cíl"></div>
            <div class="pole"><input type="text" id="h-cil3" placeholder="3. cíl"></div>
            <button class="hl" id="ulozit-hodnoceni" title="Uloží hodnocení jako nový záznam">Uložit hodnocení</button>
        </div>`;

    $('#ulozit-hodnoceni').onclick = async () => {
        const hodnoty = {};
        const chybi = [];
        for (const o of osy) {
            const vybrano = kam.querySelector(`input[name="osa-${o.klic}"]:checked`);
            if (!vybrano) chybi.push(o.popis);
            else hodnoty[o.klic] = Number(vybrano.value);
        }
        if (chybi.length) {
            hlaska(kam, 'chyba', `Chybí známka: ${chybi.join(', ')}.`);
            return;
        }

        const telo = {
            player_id: hracId,
            obdobi: stav.nastaveni.obdobi,
            sablona: hrac.sablona,
            autor_id: $('#h-autor').value || null,
            hodnoty,
            fyzicky: $('#h-fyzicky').value,
            hlavou: $('#h-hlavou').value,
            parta: $('#h-parta').value,
            cile: [$('#h-cil1').value, $('#h-cil2').value, $('#h-cil3').value]
        };

        try {
            await api('/api/evaluations', { telo });
            kam.innerHTML = `
                <div class="karta">
                    <div class="hlaska ok">Hodnocení uloženo: <b>${esc(hrac.jmeno)}</b>, období ${esc(stav.nastaveni.obdobi)}.</div>
                    <button class="vedlejsi" id="na-list" title="Otevře tiskový list tohoto hráče">Otevřít tiskový list</button>
                    <button class="vedlejsi" id="dalsi" title="Vyhodnotit dalšího hráče">Další hráč</button>
                </div>`;
            $('#na-list').onclick = () => otevriListy({ ids: String(hracId) });
            $('#dalsi').onclick = () => { stav.zalozka = 'hodnotit'; prekresli(); };
        } catch (e) {
            hlaska(kam, 'chyba', e.message);
        }
    };
}

/* ===================== záložka: Listy ===================== */

function otevriListy({ ids = 'vse', porovnani = 'minule', obdobi = stav.nastaveni.obdobi } = {}) {
    const p = new URLSearchParams({ obdobi, porovnani, ids });
    window.open(`listy.html?${p}`, '_blank');
}

async function listy(kam) {
    const prehled = await api(`/api/prehled?obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`);

    kam.innerHTML = `
        <div class="karta">
            <h2>Tiskové listy</h2>
            <p class="popis">Jeden hráč = jedna A4. Listy se sestaví z databáze, otevřou se v nové záložce
               a odtud jdou na tiskárnu.</p>
            <div class="radek">
                <div class="pole"><label for="l-obdobi">Období</label>
                    <input type="text" id="l-obdobi" value="${esc(stav.nastaveni.obdobi)}"></div>
                <div class="pole"><label for="l-porovnani">Druhý polygon v grafu</label>
                    <select id="l-porovnani">
                        <option value="minule">trenér minule (vývoj)</option>
                        <option value="hrac">sebehodnocení hráče (k rozhovoru)</option>
                        <option value="zadne">žádný — jen aktuální</option>
                    </select></div>
            </div>
            <p class="popis">Na listu jsou maximálně dva polygony. Tři jsou nečitelné.</p>
        </div>

        <div class="karta">
            <h2>Kdo se vytiskne</h2>
            <table>
                <thead><tr><th class="cisla"><input type="checkbox" id="vsichni" checked title="Označit všechny"></th>
                    <th>Hráč</th><th class="cisla">trenér</th><th class="cisla">hráč</th></tr></thead>
                <tbody>${prehled.hraci.filter(h => h.aktivni).map(h => `
                    <tr>
                        <td class="cisla"><input type="checkbox" class="vyber" value="${h.id}" checked></td>
                        <td>${esc(h.jmeno)}</td>
                        <td class="cisla">${h.ma_trener ? '<span class="ano">✓</span>' : '<span class="ne">—</span>'}</td>
                        <td class="cisla">${h.ma_hrac ? '<span class="ano">✓</span>' : '<span class="ne">—</span>'}</td>
                    </tr>`).join('')}</tbody>
            </table>
            <p style="margin-top:14px">
                <button class="hl" id="otevrit-listy" title="Otevře tiskové listy vybraných hráčů">Otevřít listy k tisku</button>
            </p>
        </div>`;

    $('#vsichni').onchange = e =>
        kam.querySelectorAll('.vyber').forEach(c => { c.checked = e.target.checked; });

    $('#otevrit-listy').onclick = () => {
        const ids = [...kam.querySelectorAll('.vyber:checked')].map(c => c.value);
        if (!ids.length) { hlaska(kam, 'chyba', 'Nikdo není vybraný.'); return; }
        otevriListy({ ids: ids.join(','), porovnani: $('#l-porovnani').value, obdobi: $('#l-obdobi').value });
    };
}

/* ===================== záložka: Porovnání ===================== */

async function porovnani(kam) {
    const hraci = hraciAktivni();
    kam.innerHTML = `
        <div class="karta">
            <h2>Trenér vs. hráč</h2>
            <p class="popis">Řeší se jen osy, kde je rozdíl větší než tolerance
               (teď <b>${esc(stav.nastaveni.tolerance)}</b>, změna v Nastavení).</p>
            <div class="pole"><label for="p-hrac">Hráč</label>
                <select id="p-hrac">
                    <option value="">— vyber hráče —</option>
                    ${hraci.map(h => `<option value="${h.id}">${esc(h.jmeno)}</option>`).join('')}
                </select></div>
        </div>
        <div id="vysledek"></div>`;

    $('#p-hrac').onchange = async () => {
        const id = Number($('#p-hrac').value);
        const cil = $('#vysledek');
        if (!id) { cil.innerHTML = ''; return; }
        cil.innerHTML = '<p class="popis">Načítám…</p>';
        try {
            const [p, t] = await Promise.all([
                api(`/api/porovnani?player_id=${id}&obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`),
                api(`/api/trend?player_id=${id}`)
            ]);
            cil.innerHTML = tabulkaPorovnani(p) + tabulkaTrendu(t);
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };
}

function tabulkaPorovnani(p) {
    if (!p.hotovo) {
        const co = [];
        if (!p.maTrener) co.push('hodnocení trenéra');
        if (!p.maHrac) co.push('sebehodnocení hráče');
        return `<div class="karta"><div class="hlaska info">Za období ${esc(p.obdobi)} zatím chybí: ${esc(co.join(' a '))}.
                Porovnání se ukáže, až budou obě strany.</div></div>`;
    }

    const radky = p.osy.map(o => `
        <tr class="${o.resit ? 'resit' : ''}">
            <td>${esc(o.popis)}</td>
            <td class="cisla">${o.trener}</td>
            <td class="cisla">${o.hrac}</td>
            <td class="cisla">${o.rozdil > 0 ? `<span class="rozdil-plus">+${o.rozdil}</span>`
                              : o.rozdil < 0 ? `<span class="rozdil-minus">${o.rozdil}</span>` : '0'}</td>
            <td>${o.resit ? esc(o.vyklad) : '<span class="ne">v toleranci</span>'}</td>
        </tr>`).join('');

    return `
        <div class="karta">
            <h2>Rozdíly za období ${esc(p.obdobi)}</h2>
            ${p.upozorneni ? `<div class="hlaska pozor">${esc(p.upozorneni)}</div>` : ''}
            <table>
                <thead><tr><th>Osa</th><th class="cisla">trenér</th><th class="cisla">hráč</th>
                    <th class="cisla">rozdíl</th><th>k rozhovoru</th></tr></thead>
                <tbody>${radky}</tbody>
            </table>
            <p class="popis" style="margin-top:10px">
                <b>+</b> hráč si dal víc než trenér = slepé místo, chybí zpětná vazba.<br>
                <b>−</b> hráč si dal míň než trenér = sebedůvěra, může jít o něco mimo fotbal.
            </p>
            ${p.poznamkaHrace ? `<div class="hlaska info"><b>Hráč k tomu napsal:</b> ${esc(p.poznamkaHrace)}</div>` : ''}
        </div>`;
}

function tabulkaTrendu(t) {
    if (!t.osy?.length) {
        return `<div class="karta"><h2>Vývoj v čase</h2><p class="popis">${esc(t.souhrn)}</p></div>`;
    }
    return `
        <div class="karta">
            <h2>Vývoj v čase <span class="popis">— jen pro trenéra, na list hráče to nepatří</span></h2>
            <p class="popis">${esc(t.odkud)} → ${esc(t.kam)}: <b>${esc(t.souhrn)}</b>.
               Za změnu se považuje až rozdíl 2 body; posun o 1 bod u subjektivního hodnocení není signál.</p>
            <table>
                <thead><tr><th>Osa</th><th class="cisla">${esc(t.odkud)}</th><th class="cisla">${esc(t.kam)}</th><th class="cisla"></th></tr></thead>
                <tbody>${t.osy.map(o => `
                    <tr><td>${esc(o.popis)}</td><td class="cisla">${o.driv}</td>
                        <td class="cisla">${o.ted}</td><td class="cisla">${o.smer}</td></tr>`).join('')}</tbody>
            </table>
        </div>`;
}

/* ===================== záložka: Odkazy ===================== */

async function odkazy(kam) {
    const seznam = await api(`/api/tokens?obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`);
    const zaklad = location.origin;

    kam.innerHTML = `
        <div class="karta">
            <h2>Odkazy na sebehodnocení</h2>
            <p class="popis">Odkaz je jednorázový. Posílej ho konkrétnímu hráči, ne do týmové skupiny —
               kdo odkaz má, může sebehodnocení vyplnit za něj.</p>
            <div class="radek">
                <div class="pole"><label for="t-dni">Platnost (dní)</label>
                    <input type="number" id="t-dni" value="30" min="1" max="365"></div>
                <div class="pole" style="align-self:end">
                    <button class="hl" id="generovat" title="Vygeneruje odkaz pro každého aktivního hráče">
                        Vygenerovat pro všechny hráče</button></div>
            </div>
        </div>

        <div class="karta">
            <h2>Období ${esc(stav.nastaveni.obdobi)}</h2>
            <table>
                <thead><tr><th>Hráč</th><th>Stav</th><th>Platí do</th><th>Odkaz</th><th></th></tr></thead>
                <tbody>${seznam.length ? seznam.map(t => `
                    <tr>
                        <td>${esc(t.jmeno)}</td>
                        <td>${t.pouzit ? '<span class="ano">vyplněno</span>' : '<span class="ne">čeká</span>'}</td>
                        <td>${t.platny_do ? esc(new Date(t.platny_do).toLocaleDateString('cs-CZ')) : '—'}</td>
                        <td class="odkaz-pole">${esc(zaklad)}/h/${esc(t.token.slice(0, 8))}…</td>
                        <td>
                            <button class="vedlejsi" data-kopirovat="${esc(t.token)}" title="Zkopíruje celý odkaz do schránky">Kopírovat</button>
                            <button class="vedlejsi zrusit" data-zrusit="${esc(t.token)}" title="Odkaz přestane platit">Zneplatnit</button>
                        </td>
                    </tr>`).join('') : '<tr><td colspan="5">Pro tohle období zatím žádné odkazy.</td></tr>'}</tbody>
            </table>
        </div>`;

    $('#generovat').onclick = async () => {
        try {
            const r = await api('/api/tokens', { telo: { obdobi: stav.nastaveni.obdobi, dni: Number($('#t-dni').value) } });
            await prekresli();
            hlaska($('#obsah'), 'ok', `Vygenerováno odkazů: ${r.vytvoreno}.`);
        } catch (e) { hlaska(kam, 'chyba', e.message); }
    };

    kam.querySelectorAll('[data-kopirovat]').forEach(b => b.onclick = async () => {
        const odkaz = `${zaklad}/h/${b.dataset.kopirovat}`;
        try {
            await navigator.clipboard.writeText(odkaz);
            b.textContent = 'Zkopírováno';
            setTimeout(() => { b.textContent = 'Kopírovat'; }, 1500);
        } catch {
            prompt('Zkopíruj odkaz ručně:', odkaz);
        }
    });

    kam.querySelectorAll('[data-zrusit]').forEach(b => b.onclick = async () => {
        if (!confirm('Zneplatnit tenhle odkaz? Hráč pak potřebuje nový.')) return;
        try {
            await api(`/api/tokens/${encodeURIComponent(b.dataset.zrusit)}`, { method: 'DELETE' });
            await prekresli();
        } catch (e) { hlaska(kam, 'chyba', e.message); }
    });
}

/* ===================== záložka: Nastavení ===================== */

const POLE_NASTAVENI = [
    ['tolerance',  'Tolerance rozdílu (0–9)',
     'O kolik se smí lišit známka trenéra a hráče, aniž by se osa řešila. Větší rozdíl = téma k rozhovoru.'],
    ['obdobi',     'Období', 'Například „2025/2026 zima". Podle něj se páruje hodnocení trenéra a hráče.'],
    ['sezona',     'Sezóna', 'Tiskne se do hlavičky listu.'],
    ['klub',       'Klub', ''],
    ['kategorie',  'Kategorie', ''],
    ['latka',      'Proti čemu se hodnotí', 'Text v patičce listu: „co má umět starší žák".'],
    ['cileNadpis', 'Nadpis nad cíli', 'Například „Na čem makáme do zimy".']
];

async function nastaveni(kam) {
    kam.innerHTML = `
        <div class="karta">
            <h2>Nastavení</h2>
            <p class="popis">Tolerance a období řídí porovnání a párování hodnocení. Zbytek jde do hlavičky listu.</p>
            ${POLE_NASTAVENI.map(([klic, popisek, napoveda]) => `
                <div class="pole">
                    <label for="n-${klic}">${popisek}</label>
                    <input type="${klic === 'tolerance' ? 'number' : 'text'}" id="n-${klic}"
                           value="${esc(stav.nastaveni[klic] ?? '')}"${klic === 'tolerance' ? ' min="0" max="9"' : ''}>
                    ${napoveda ? `<div class="popis">${napoveda}</div>` : ''}
                </div>`).join('')}
            <button class="hl" id="ulozit-nastaveni" title="Uloží nastavení">Uložit</button>
        </div>`;

    $('#ulozit-nastaveni').onclick = async () => {
        const telo = Object.fromEntries(POLE_NASTAVENI.map(([k]) => [k, $('#n-' + k).value]));
        try {
            stav.nastaveni = await api('/api/settings', { telo, method: 'PUT' });
            $('#hl-klub').textContent = stav.nastaveni.klub;
            $('#hl-obdobi').textContent = `období: ${stav.nastaveni.obdobi}`;
            await prekresli();
            hlaska($('#obsah'), 'ok', 'Nastavení uloženo.');
        } catch (e) { hlaska(kam, 'chyba', e.message); }
    };
}

/* ===================== start ===================== */

$('#prihlasit').onclick = prihlas;
$('#heslo').onkeydown = e => { if (e.key === 'Enter') prihlas(); };
$('#odhlasit').onclick = async () => { await api('/api/logout', { telo: {} }); ukazPrihlaseni(); };

document.querySelectorAll('#zalozky button').forEach(b => b.onclick = () => {
    stav.zalozka = b.dataset.z;
    prekresli();
});

(async () => {
    const { prihlasen } = await api('/api/me');
    if (prihlasen) await spust();
    else ukazPrihlaseni();
})();
