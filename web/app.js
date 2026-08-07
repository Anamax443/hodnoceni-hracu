/* =====================================================================
   APLIKACE PRO TRENÉRA

   Autorizace je ve Workeru, ne tady. Tenhle kód jen kreslí; když se
   session rozpadne, API vrátí 401 a aplikace se vrátí na přihlášení.

   Server vrací klíče (os, režimů), texty se překládají tady — proto se
   po přepnutí jazyka jen překreslí, nic se znovu nenačítá z databáze.
   ===================================================================== */

import { SABLONY, MAX, POZICE } from './src/sablony.js';
import { esc } from './src/list.js';
import { t, jazyk, nastavJazyk, druhyJazyk, osy, kotvy, locale } from './src/i18n.js';

const $ = s => document.querySelector(s);
const stav = { nastaveni: {}, lide: [], zalozka: 'lide', prihlasen: false, kdo: null, kdoId: null };

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

    if (odpoved.status === 401) { ukazPrihlaseni(); throw new Error(t('chyba.odhlasen')); }
    if (!odpoved.ok) throw new Error(data?.chyba || t('chyba.server', odpoved.status));
    return data;
}

/* ===================== vzhled, jazyk, hodiny, verze ===================== */

const ULOZ_THEME = 'hodnoceni.theme';

function vzhled() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

function nastavVzhled(novy) {
    document.documentElement.setAttribute('data-theme', novy);
    try { localStorage.setItem(ULOZ_THEME, novy); } catch { /* nevadí */ }
    $('#themeBtn').textContent = novy === 'dark' ? t('shell.vzhled.svetly') : t('shell.vzhled.tmavy');
    $('#themeBtn').title = t('shell.vzhled.tip');
}

function hodiny() {
    const ted = new Date();
    const prvek = $('#hodiny');
    prvek.textContent = ted.toLocaleDateString(locale(), { day: 'numeric', month: 'numeric' })
        + ' ' + ted.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    prvek.title = t('shell.hodiny.tip');
}

async function verze() {
    const prvek = $('#verze');
    try {
        const v = await (await fetch('/api/version')).json();
        const sestaveno = new Date(v.builtAt).toLocaleString(locale());
        prvek.textContent = `${t('shell.verze')} ${v.commit}`;
        prvek.title = `${v.commitFull}\n${v.branch}\n${t('shell.sestaveno')}: ${sestaveno}`;
    } catch {
        prvek.textContent = `${t('shell.verze')} ?`;
        prvek.title = '';
    }
}

/** Texty v hlavičce a záložkách — volá se i po přepnutí jazyka. */
function prekresliShell() {
    document.documentElement.lang = jazyk();
    $('#hl-app').textContent = t('shell.app');
    $('#login-nadpis').textContent = t('shell.app');
    $('#login-popis').textContent = t('login.popis');
    $('#login-kdo-label').textContent = t('login.kdo');
    $('#login-kdo-napoveda').textContent = t('login.kdo.napoveda');
    $('#login-heslo-label').textContent = t('login.heslo');
    $('#prihlasit').textContent = t('login.prihlasit');
    $('#prihlasit').title = t('login.prihlasit.tip');
    $('#zapomenute').textContent = t('login.zapomenute');
    $('#zapomenute').title = t('login.zapomenute.tip');
    $('#obnova-nadpis').textContent = t('login.zapomenute');
    $('#obnova-popis').textContent = t('login.obnova.popis');
    $('#obnova-email-label').textContent = t('login.obnova.email');
    $('#obnova-poslat').textContent = t('login.obnova.poslat');
    $('#obnova-poslat').title = t('login.obnova.poslat.tip');
    $('#obnova-zpet').textContent = t('login.obnova.zpet');
    $('#odhlasit').textContent = t('shell.odhlasit');
    $('#odhlasit').title = t('shell.odhlasit.tip');
    $('#jazykBtn').textContent = t('jazyk.dalsi');
    $('#jazykBtn').title = t('shell.jazyk.tip');
    $('#verze').title = t('shell.verze.tip');

    document.querySelectorAll('#zalozky button').forEach(b => {
        b.textContent = t('nav.' + b.dataset.z);
        b.title = t('nav.' + b.dataset.z + '.tip');
    });

    nastavVzhled(vzhled());
    hodiny();
    verze();

    if (stav.prihlasen) {
        $('#hl-klub').textContent = '⚽ ' + (stav.nastaveni.klub || '');
        $('#hl-obdobi').textContent = `${t('shell.obdobi')}: ${stav.nastaveni.obdobi || ''}`
            + ' · ' + t('shell.prihlasen', stav.kdo || t('shell.spolecne'));
    }
}

/* ===================== přihlášení ===================== */

function ukazPrihlaseni() {
    stav.prihlasen = false;
    $('#prihlaseni').hidden = false;
    $('#aplikace').hidden = true;
    $('#odhlasit').hidden = true;
    $('#hl-obdobi').textContent = '';
    prepniObnovu(false);
}

/** Přepne mezi přihlašovacím formulářem a žádostí o obnovu hesla. */
function prepniObnovu(zapnout) {
    $('#prihlaseni').querySelector('.login').hidden = zapnout;
    $('#obnova-karta').hidden = !zapnout;
    $('#obnova-hlaska').innerHTML = '';
}

async function poslatObnovu() {
    const tlacitko = $('#obnova-poslat');
    tlacitko.disabled = true;
    try {
        // O existenci účtu se mlčí (jinak by šlo zjišťovat, kdo účet má), ale
        // špatný tvar vstupu a sepnutá brzda se říct musí — dřív obojí vypadalo
        // jako úspěch a člověk marně čekal na odkaz, který nikam neodešel.
        const kdo = $('#obnova-email').value;
        await api('/api/obnova', { telo: { login: kdo, email: kdo, lang: jazyk() } });
        $('#obnova-hlaska').innerHTML = `<div class="hlaska info">${t('login.obnova.odeslano')}</div>`;
    } catch (e) {
        $('#obnova-hlaska').innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
    }
    tlacitko.disabled = false;
}

async function prihlas() {
    const heslo = $('#heslo').value;
    const login = $('#login-jmeno').value;
    $('#prihlaseni-chyba').innerHTML = '';
    try {
        const r = await api('/api/login', { telo: { login, heslo } });
        stav.kdo = r.jmeno ?? null;
        stav.kdoId = r.id ?? null;
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
    stav.prihlasen = true;

    $('#prihlaseni').hidden = true;
    $('#aplikace').hidden = false;
    $('#odhlasit').hidden = false;

    prekresliShell();
    await prekresli();
}

async function prekresli() {
    document.querySelectorAll('#zalozky button')
        .forEach(b => b.classList.toggle('aktivni', b.dataset.z === stav.zalozka));

    const obsah = $('#obsah');
    obsah.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
    try {
        const kresli = { lide, hodnotit, shoda, listy, porovnani, odkazy, nastaveni }[stav.zalozka];
        await kresli(obsah);
    } catch (e) {
        obsah.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
    }
}

function hlaska(kam, typ, text) {
    kam.insertAdjacentHTML('afterbegin', `<div class="hlaska ${typ}">${esc(text)}</div>`);
}

const hraciAktivni = () => stav.lide.filter(o => o.role === 'hrac' && o.aktivni);

/* Přezdívka se ukazuje všude, kde se vypisují jména — v kádru jsou tři Trnkové
   a bez ní se pletou. */
const jmenoHtml = o => `${esc(o.jmeno)}${o.prezdivka ? ` <span class="popis">„${esc(o.prezdivka)}"</span>` : ''}`;
const jmenoText = o => o.prezdivka ? `${o.jmeno} „${o.prezdivka}"` : o.jmeno;

/* ===================== záložka: Lidé ===================== */

async function lide(kam) {
    const nazvyPozic = o => (o.pozice ?? []).map(p => t('pozice.' + p)).join(' · ');

    const radek = o => `
        <tr>
            <td>${jmenoHtml(o)}</td>
            <td>${esc(nazvyPozic(o) || t('lide.bezPozic'))}${o.post ? ` <span class="popis">${esc(o.post)}</span>` : ''}</td>
            <td><span class="znacka ${o.role}">${o.role === 'trener' ? t('lide.trener') : t('lide.hrac')}</span></td>
            <td>${o.role === 'hrac' ? t('sablona.' + o.sablona) : '—'}</td>
            <td>${o.aktivni ? '' : `<span class="znacka neaktivni">${t('lide.neaktivni')}</span>`}</td>
            <td><button class="vedlejsi" data-upravit="${o.id}" title="${t('lide.upravit.tip')}">${t('lide.upravit')}</button></td>
        </tr>`;

    kam.innerHTML = `
        <div class="karta">
            <h2>${t('lide.nadpis')}</h2>
            <p class="popis">${t('lide.popis')}</p>
            <table>
                <thead><tr><th>${t('lide.jmeno')}</th><th>${t('lide.pozice')}</th><th>${t('lide.role')}</th>
                    <th>${t('lide.sablona')}</th><th></th><th></th></tr></thead>
                <tbody>${stav.lide.map(radek).join('') || `<tr><td colspan="6">${t('lide.prazdno')}</td></tr>`}</tbody>
            </table>
        </div>

        <div class="karta" id="formular-osoby">
            <h2 id="nadpis-osoby">${t('lide.nova')}</h2>
            <input type="hidden" id="osoba-id" value="">
            <div class="radek">
                <div class="pole"><label for="o-jmeno">${t('lide.jmeno.label')}</label>
                    <input type="text" id="o-jmeno"></div>
                <div class="pole"><label for="o-prezdivka">${t('lide.prezdivka')}</label>
                    <input type="text" id="o-prezdivka"></div>
            </div>
            <div class="pole">
                <label>${t('lide.pozice.label')}</label>
                <div class="pozice-vyber">${POZICE.map(p => `
                    <label class="volba"><input type="checkbox" class="o-pozice" value="${p}"> ${t('pozice.' + p)}</label>
                `).join('')}</div>
                <div class="popis">${t('lide.pozice.napoveda')}</div>
            </div>
            <div class="radek">
                <div class="pole"><label for="o-login">${t('lide.login')}</label>
                    <input type="text" id="o-login" autocomplete="off">
                    <div class="popis">${t('lide.login.napoveda')}</div></div>
                <div class="pole"><label for="o-post">${t('lide.post.label')}</label>
                    <input type="text" id="o-post">
                    <div class="popis">${t('lide.post.napoveda')}</div></div>
                <div class="pole"><label for="o-role">${t('lide.role.label')}</label>
                    <select id="o-role">
                        <option value="hrac">${t('lide.hrac')}</option>
                        <option value="trener">${t('lide.trener')}</option>
                    </select></div>
                <div class="pole"><label for="o-sablona">${t('lide.sablona.label')}</label>
                    <select id="o-sablona">${Object.keys(SABLONY)
                        .map(s => `<option value="${s}">${t('sablona.' + s)}</option>`).join('')}</select>
                    <div class="popis">${t('lide.sablona.napoveda')}</div></div>
            </div>
            <div class="pole"><label><input type="checkbox" id="o-aktivni" checked style="width:auto"> ${t('lide.aktivni')}</label></div>
            <div class="pole">
                <label><input type="checkbox" id="o-povinne" style="width:auto"> ${t('lide.povinne')}</label>
                <div class="popis">${t('lide.povinne.napoveda')}</div>
            </div>

            <h2 style="margin-top:18px">${t('lide.notifikace')}</h2>
            <p class="popis">${t('lide.notifikace.popis')}</p>
            <div class="radek">
                <div class="pole"><label for="o-email">${t('lide.email')}</label>
                    <input type="text" id="o-email" autocomplete="off">
                    <div class="popis">${t('lide.email.napoveda')}</div>
                    <label style="margin-top:5px"><input type="checkbox" id="o-notif-email" style="width:auto"> ${t('lide.notifEmail')}</label>
                </div>
                <div class="pole"><label for="o-chatid">${t('lide.chatid')}</label>
                    <input type="text" id="o-chatid" autocomplete="off">
                    <div class="popis">${t('lide.chatid.napoveda')}</div>
                    <label style="margin-top:5px"><input type="checkbox" id="o-notif-telegram" style="width:auto"> ${t('lide.notifTelegram')}</label>
                </div>
                <div class="pole"><label for="o-telefon">${t('lide.telefon')}</label>
                    <input type="text" id="o-telefon" autocomplete="off" placeholder="+420777123456">
                    <div class="popis">${t('lide.telefon.napoveda')}</div>
                    <label style="margin-top:5px"><input type="checkbox" id="o-notif-sms" style="width:auto"> ${t('lide.notifSms')}</label>
                </div>
            </div>
            <p>
                <button class="vedlejsi" id="dotahnout-chat" title="${t('lide.dotahnout.tip')}">${t('lide.dotahnout')}</button>
                <button class="vedlejsi" id="zkusebni-zprava" title="${t('lide.zkusebni.tip')}">${t('lide.zkusebni')}</button>
                <button class="vedlejsi" id="zkusebni-sms-nanecisto" title="${t('lide.smsNanecisto.tip')}">${t('lide.smsNanecisto')}</button>
                <button class="vedlejsi" id="zkusebni-sms" title="${t('lide.zkusebniSms.tip')}">${t('lide.zkusebniSms')}</button>
                <button class="vedlejsi" id="poslat-pozvanku" title="${t('lide.pozvanka.tip')}">${t('lide.pozvanka')}</button>
            </p>
            <div id="chat-vysledek"></div>

            <button class="hl" id="ulozit-osobu" title="${t('lide.ulozit.tip')}">${t('lide.ulozit')}</button>
            <button class="vedlejsi" id="nova-osoba" title="${t('lide.novy.tip')}">${t('lide.novy')}</button>
        </div>`;

    const vyprazdni = () => {
        $('#osoba-id').value = '';
        $('#nadpis-osoby').textContent = t('lide.nova');
        ['o-jmeno', 'o-prezdivka', 'o-post'].forEach(id => { $('#' + id).value = ''; });
        $('#o-role').value = 'hrac';
        $('#o-sablona').value = 'pole';
        $('#o-aktivni').checked = true;
        kam.querySelectorAll('.o-pozice').forEach(c => { c.checked = false; });
        $('#o-login').value = '';
        $('#o-email').value = '';
        $('#o-chatid').value = '';
        $('#o-notif-email').checked = false;
        $('#o-notif-telegram').checked = false;
        $('#o-telefon').value = '';
        $('#o-notif-sms').checked = false;
        $('#o-povinne').checked = false;
        $('#chat-vysledek').innerHTML = '';
        delete $('#formular-osoby').dataset.id;
    };

    $('#dotahnout-chat').onclick = async () => {
        const cil = $('#chat-vysledek');
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            const r = await api('/api/telegram/chaty');
            if (!r.chaty.length) {
                cil.innerHTML = `<div class="hlaska pozor">${esc(t('lide.zadneChaty'))}</div>`;
                return;
            }
            cil.innerHTML = `<div class="hlaska info">${r.chaty.map(c =>
                `<button class="vedlejsi" data-chat="${esc(c.chat_id)}">${esc(c.jmeno)} — ${esc(c.chat_id)}</button>`
            ).join(' ')}</div>`;
            cil.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => {
                $('#o-chatid').value = b.dataset.chat;
                $('#o-notif-telegram').checked = true;
            });
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

    $('#poslat-pozvanku').onclick = async () => {
        const cil = $('#chat-vysledek');
        const id = $('#formular-osoby').dataset.id;
        if (!id) { cil.innerHTML = `<div class="hlaska chyba">${t('lide.upravit')}?</div>`; return; }
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            const r = await api(`/api/players/${id}/pozvanka`, { telo: {} });
            cil.innerHTML = `<div class="hlaska info">${r.zpravy.map(esc).join('<br>')}</div>`;
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

    // Nanečisto ověří klíče, kanál i tvar čísla, ale nic neodešle a nic nestojí.
    const zkusSms = (nanecisto) => async () => {
        const cil = $('#chat-vysledek');
        const cislo = $('#o-telefon').value.trim();
        if (!cislo) { cil.innerHTML = `<div class="hlaska chyba">${t('lide.telefon')}?</div>`; return; }
        try {
            const r = await api('/api/sms/test', { telo: { telefon: cislo, nanecisto } });
            cil.innerHTML = `<div class="hlaska ${r.ok ? 'ok' : 'chyba'}">${esc(r.popis)}</div>`;
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };
    $('#zkusebni-sms').onclick = zkusSms(false);
    $('#zkusebni-sms-nanecisto').onclick = zkusSms(true);

    $('#zkusebni-zprava').onclick = async () => {
        const cil = $('#chat-vysledek');
        const chat = $('#o-chatid').value.trim();
        if (!chat) { cil.innerHTML = `<div class="hlaska chyba">${t('lide.chatid')}?</div>`; return; }
        try {
            const r = await api('/api/telegram/test', { telo: { chat_id: chat } });
            cil.innerHTML = `<div class="hlaska ${r.ok ? 'ok' : 'chyba'}">${esc(r.popis)}</div>`;
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

    kam.querySelectorAll('[data-upravit]').forEach(b => b.onclick = () => {
        const o = stav.lide.find(x => x.id === Number(b.dataset.upravit));
        $('#osoba-id').value = o.id;
        $('#nadpis-osoby').textContent = t('lide.uprava', o.jmeno);
        $('#o-jmeno').value = o.jmeno;
        $('#o-prezdivka').value = o.prezdivka || '';
        $('#o-post').value = o.post || '';
        $('#o-role').value = o.role;
        $('#o-sablona').value = o.sablona;
        $('#o-aktivni').checked = !!o.aktivni;
        kam.querySelectorAll('.o-pozice').forEach(c => { c.checked = (o.pozice ?? []).includes(c.value); });
        $('#o-login').value = o.login || '';
        $('#o-email').value = o.email || '';
        $('#o-chatid').value = o.telegram_chat_id || '';
        $('#o-notif-email').checked = !!o.notif_email;
        $('#o-notif-telegram').checked = !!o.notif_telegram;
        $('#o-telefon').value = o.telefon || '';
        $('#o-notif-sms').checked = !!o.notif_sms;
        $('#o-povinne').checked = !!o.hodnoceni_povinne;
        $('#chat-vysledek').innerHTML = o.role === 'trener'
            ? `<div class="hlaska ${o.ma_heslo ? 'ok' : 'pozor'}">${o.ma_heslo ? t('lide.maHeslo') : t('lide.bezHesla')}</div>`
            : '';
        $('#formular-osoby').dataset.id = o.id;
        $('#formular-osoby').scrollIntoView({ behavior: 'smooth' });
    });

    $('#nova-osoba').onclick = vyprazdni;

    $('#ulozit-osobu').onclick = async () => {
        const id = $('#osoba-id').value;
        const telo = {
            jmeno: $('#o-jmeno').value,
            prezdivka: $('#o-prezdivka').value,
            post: $('#o-post').value,
            login: $('#o-login').value,
            email: $('#o-email').value,
            telegram_chat_id: $('#o-chatid').value,
            telefon: $('#o-telefon').value,
            notif_email: $('#o-notif-email').checked,
            notif_telegram: $('#o-notif-telegram').checked,
            notif_sms: $('#o-notif-sms').checked,
            hodnoceni_povinne: $('#o-povinne').checked,
            pozice: [...kam.querySelectorAll('.o-pozice:checked')].map(c => c.value),
            role: $('#o-role').value,
            sablona: $('#o-sablona').value,
            aktivni: $('#o-aktivni').checked
        };
        try {
            await api(id ? `/api/players/${id}` : '/api/players', { telo, method: id ? 'PATCH' : 'POST' });
            stav.lide = await api('/api/players');
            await prekresli();
            hlaska($('#obsah'), 'ok', id ? t('lide.ulozeno') : t('lide.pridano'));
        } catch (e) {
            hlaska($('#formular-osoby'), 'chyba', e.message);
        }
    };
}

/* ===================== záložka: Hodnotit ===================== */

function stupnice(nazev) {
    let h = '<div class="stupnice">';
    for (let i = 1; i <= MAX; i++) {
        h += `<input type="radio" name="${nazev}" id="${nazev}-${i}" value="${i}">`
           + `<label for="${nazev}-${i}">${i}</label>`;
    }
    return h + '</div>';
}

const kotvyHtml = () =>
    `<div class="kotvy">${kotvy().map(k => `<span><b>${k[0]}</b> – ${k[1]}</span>`).join('')}</div>`;

async function hodnotit(kam) {
    const hraci = hraciAktivni();
    const treneri = stav.lide.filter(o => o.role === 'trener');

    kam.innerHTML = `
        <div class="karta">
            <h2>${t('hodnotit.nadpis')}</h2>
            <p class="popis">${t('hodnotit.popis', esc(stav.nastaveni.obdobi))}</p>
            <div class="radek">
                <div class="pole"><label for="h-hrac">${t('hodnotit.hrac')}</label>
                    <select id="h-hrac">
                        <option value="">${t('hodnotit.vyber')}</option>
                        ${hraci.map(h => `<option value="${h.id}">${esc(jmenoText(h))}</option>`).join('')}
                    </select></div>
                <div class="pole"><label for="h-autor">${t('hodnotit.hodnoti')}</label>
                    <select id="h-autor">
                        <option value="">${t('hodnotit.neuvedeno')}</option>
                        ${treneri.map(x => `<option value="${x.id}">${esc(x.jmeno)}</option>`).join('')}
                    </select></div>
            </div>
        </div>
        <div id="formular"></div>`;

    $('#h-hrac').onchange = () => formularHodnoceni($('#formular'), Number($('#h-hrac').value));
}

function formularHodnoceni(kam, hracId, sablona = null, predvyplneno = null) {
    if (!hracId) { kam.innerHTML = ''; return; }
    const hrac = stav.lide.find(o => o.id === hracId);
    const vybranaSablona = sablona ?? hrac.sablona;
    const seznamOs = osy(vybranaSablona);
    const pozice = (hrac.pozice ?? []).map(p => t('pozice.' + p)).join(' · ');

    kam.innerHTML = `
        <div class="karta">
            <div class="hlaska pozor">${t('hodnotit.naslepo')}</div>
            <h2>${jmenoHtml(hrac)}${pozice ? ` <span class="popis">— ${esc(pozice)}</span>` : ''}</h2>
            <div class="pole" style="max-width:320px">
                <label for="h-sablona">${t('hodnotit.sablona')}</label>
                <select id="h-sablona">${Object.keys(SABLONY)
                    .map(s => `<option value="${s}"${s === vybranaSablona ? ' selected' : ''}>${t('sablona.' + s)}</option>`).join('')}</select>
                <div class="popis">${t('hodnotit.sablona.napoveda')}</div>
            </div>
            ${kotvyHtml()}
            <div style="margin-top:10px">
                ${seznamOs.map(o => `
                    <div class="osa">
                        <div class="nazev">${esc(o.popis)}</div>
                        ${stupnice('osa-' + o.klic)}
                    </div>`).join('')}
            </div>
        </div>

        <div class="karta">
            <h2>${t('hodnotit.bloky')}</h2>
            <p class="popis">${t('hodnotit.bloky.popis')}</p>
            <div class="pole"><label for="h-fyzicky">${t('blok.fyzicky')}</label><textarea id="h-fyzicky"></textarea></div>
            <div class="pole"><label for="h-hlavou">${t('blok.hlavou')}</label><textarea id="h-hlavou"></textarea></div>
            <div class="pole"><label for="h-parta">${t('blok.parta')}</label><textarea id="h-parta"></textarea></div>
        </div>

        <div class="karta">
            <h2>${esc(stav.nastaveni.cileNadpis)}</h2>
            <p class="popis">${t('hodnotit.cile.popis')}</p>
            <div class="pole"><input type="text" id="h-cil1" placeholder="${t('hodnotit.cil', 1)}"></div>
            <div class="pole"><input type="text" id="h-cil2" placeholder="${t('hodnotit.cil', 2)}"></div>
            <div class="pole"><input type="text" id="h-cil3" placeholder="${t('hodnotit.cil', 3)}"></div>
            <button class="hl" id="ulozit-hodnoceni" title="${t('hodnotit.ulozit.tip')}">${t('hodnotit.ulozit')}</button>
        </div>`;

    // Slovní bloky a cíle přežijí přepnutí šablony — mění se osy, ne text.
    const texty = () => ({
        fyzicky: $('#h-fyzicky').value, hlavou: $('#h-hlavou').value, parta: $('#h-parta').value,
        cile: [$('#h-cil1').value, $('#h-cil2').value, $('#h-cil3').value]
    });
    if (predvyplneno) {
        $('#h-fyzicky').value = predvyplneno.fyzicky;
        $('#h-hlavou').value = predvyplneno.hlavou;
        $('#h-parta').value = predvyplneno.parta;
        predvyplneno.cile.forEach((c, i) => { $('#h-cil' + (i + 1)).value = c; });
    }

    $('#h-sablona').onchange = e => formularHodnoceni(kam, hracId, e.target.value, texty());

    $('#ulozit-hodnoceni').onclick = async () => {
        const hodnoty = {};
        const chybi = [];
        for (const o of seznamOs) {
            const vybrano = kam.querySelector(`input[name="osa-${o.klic}"]:checked`);
            if (!vybrano) chybi.push(o.popis);
            else hodnoty[o.klic] = Number(vybrano.value);
        }
        if (chybi.length) { hlaska(kam, 'chyba', t('hodnotit.chybi', chybi.join(', '))); return; }

        const telo = {
            player_id: hracId,
            obdobi: stav.nastaveni.obdobi,
            sablona: vybranaSablona,
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
                    <div class="hlaska ok">${t('hodnotit.ulozeno', esc(hrac.jmeno), esc(stav.nastaveni.obdobi))}</div>
                    <button class="vedlejsi" id="na-list" title="${t('hodnotit.naList.tip')}">${t('hodnotit.naList')}</button>
                    <button class="vedlejsi" id="dalsi" title="${t('hodnotit.dalsi.tip')}">${t('hodnotit.dalsi')}</button>
                </div>`;
            $('#na-list').onclick = () => otevriListy({ ids: String(hracId), porovnani: 'zadne' });
            $('#dalsi').onclick = () => { stav.zalozka = 'hodnotit'; prekresli(); };
        } catch (e) {
            hlaska(kam, 'chyba', e.message);
        }
    };
}

/* ===================== záložka: Shoda mezi trenéry ===================== */

async function shoda(kam) {
    const hraci = hraciAktivni();
    kam.innerHTML = `
        <div class="karta">
            <h2>${t('shoda.nadpis')}</h2>
            <p class="popis">${t('shoda.popis', esc(stav.nastaveni.tolerance))}</p>
            <div class="radek">
                <div class="pole"><label for="s-hrac">${t('hodnotit.hrac')}</label>
                    <select id="s-hrac">
                        <option value="">${t('hodnotit.vyber')}</option>
                        ${hraci.map(h => `<option value="${h.id}">${esc(jmenoText(h))}</option>`).join('')}
                    </select></div>
                <div class="pole"><label for="s-sablona">${t('hodnotit.sablona')}</label>
                    <select id="s-sablona">${Object.keys(SABLONY)
                        .map(s => `<option value="${s}">${t('sablona.' + s)}</option>`).join('')}</select></div>
            </div>
        </div>
        <div id="s-vysledek"></div>`;

    const nacti = async () => {
        const id = Number($('#s-hrac').value);
        const cil = $('#s-vysledek');
        if (!id) { cil.innerHTML = ''; return; }
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            const s = await api(`/api/shoda?player_id=${id}&sablona=${$('#s-sablona').value}`
                + `&obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`);
            vykresliShodu(cil, s, id);
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };
    $('#s-hrac').onchange = nacti;
    $('#s-sablona').onchange = nacti;
}

function vykresliShodu(kam, s, hracId) {
    if (s.cekaNaTebe) {
        kam.innerHTML = `<div class="karta"><div class="hlaska pozor">${t('shoda.cekaNaTebe')}</div></div>`;
        return;
    }
    if (!s.odevzdali.length) {
        kam.innerHTML = `<div class="karta"><div class="hlaska info">${t('shoda.zadnaData')}</div></div>`;
        return;
    }

    const popisky = Object.fromEntries(osy(s.sablona).map(o => [o.klic, o.popis]));
    const treneri = s.odevzdali.filter(o => o.povinny);

    const radky = s.osy.map(o => {
        const bunky = treneri.map(tr => {
            const h = o.hodnoty.find(x => x.trener === tr.jmeno);
            return `<td class="cisla">${h ? h.hodnota : '—'}</td>`;
        }).join('');
        const shodli = o.hodnoty.length > 1 ? o.souhlasi : true;
        return `
            <tr class="${shodli ? '' : 'resit'}">
                <td>${esc(popisky[o.klic] || o.klic)}</td>
                ${bunky}
                <td>${o.hodnoty.length < 2 ? '<span class="ne">—</span>'
                    : shodli ? `<span class="ano">${t('shoda.souhlasi')}</span>`
                             : `<span class="rozdil-plus">${t('shoda.rozchazi')} (${o.rozptyl})</span>`}</td>
                <td class="cisla">${stupniceMala(o.klic, o.navrh)}</td>
            </tr>`;
    }).join('');

    kam.innerHTML = `
        <div class="karta">
            ${s.chybi.length
                ? `<div class="hlaska pozor">${t('shoda.chybi', esc(s.chybi.join(', ')))}</div>`
                : `<div class="hlaska ok">${t('shoda.vsichni')}</div>`}
            ${s.nesoulad ? `<div class="hlaska pozor">${t('shoda.nesoulad', s.nesoulad)}</div>` : ''}
            ${s.uzavrena ? `<p class="popis">${t('shoda.uzavrena',
                esc(new Date(s.uzavrena.datum + 'Z').toLocaleString(locale())))}</p>` : ''}
            <table>
                <thead><tr><th>${t('porovnani.osa')}</th>
                    ${treneri.map(tr => `<th class="cisla">${esc(tr.jmeno)}</th>`).join('')}
                    <th>${t('porovnani.kRozhovoru')}</th><th class="cisla">${t('shoda.navrh')}</th></tr></thead>
                <tbody>${radky}</tbody>
            </table>
        </div>

        <div class="karta">
            <h2>${t('shoda.texty')}</h2>
            ${s.odevzdali.map(o => `
                <div class="osa">
                    <div class="nazev">${esc(o.jmeno)}${o.povinny ? '' : ` <span class="popis">(${t('lide.trener')})</span>`}</div>
                    <p class="popis"><b>${t('blok.fyzicky')}:</b> ${esc(o.fyzicky) || '—'}<br>
                       <b>${t('blok.hlavou')}:</b> ${esc(o.hlavou) || '—'}<br>
                       <b>${t('blok.parta')}:</b> ${esc(o.parta) || '—'}<br>
                       <b>${esc(stav.nastaveni.cileNadpis)}:</b> ${o.cile.length ? esc(o.cile.join(' · ')) : '—'}</p>
                </div>`).join('')}
        </div>

        <div class="karta" id="s-finalni">
            <h2>${t('shoda.finalni')}</h2>
            <div class="pole"><label for="s-fyzicky">${t('blok.fyzicky')}</label><textarea id="s-fyzicky"></textarea></div>
            <div class="pole"><label for="s-hlavou">${t('blok.hlavou')}</label><textarea id="s-hlavou"></textarea></div>
            <div class="pole"><label for="s-parta">${t('blok.parta')}</label><textarea id="s-parta"></textarea></div>
            <div class="pole"><label for="s-cil1">${esc(stav.nastaveni.cileNadpis)}</label>
                <input type="text" id="s-cil1" placeholder="${t('hodnotit.cil', 1)}"></div>
            <div class="pole"><input type="text" id="s-cil2" placeholder="${t('hodnotit.cil', 2)}"></div>
            <div class="pole"><input type="text" id="s-cil3" placeholder="${t('hodnotit.cil', 3)}"></div>
            <div class="pole"><label for="s-poznamka">${t('shoda.poznamka')}</label>
                <textarea id="s-poznamka"></textarea>
                <div class="popis">${t('shoda.poznamka.napoveda')}</div></div>
            <button class="hl" id="s-ulozit" title="${t('shoda.ulozit.tip')}">${t('shoda.ulozit')}</button>
        </div>`;

    // Texty prvního povinného trenéra jako výchozí — finalizující je přepíše.
    const zdroj = treneri[0] ?? s.odevzdali[0];
    if (zdroj) {
        $('#s-fyzicky').value = zdroj.fyzicky ?? '';
        $('#s-hlavou').value = zdroj.hlavou ?? '';
        $('#s-parta').value = zdroj.parta ?? '';
        (zdroj.cile ?? []).forEach((c, i) => { if (i < 3) $('#s-cil' + (i + 1)).value = c; });
    }

    $('#s-ulozit').onclick = async () => {
        const hodnoty = {};
        const chybi = [];
        for (const o of s.osy) {
            const vybrano = kam.querySelector(`select.vysledek[data-osa="${o.klic}"]`);
            if (!vybrano?.value) chybi.push(popisky[o.klic] || o.klic);
            else hodnoty[o.klic] = Number(vybrano.value);
        }
        if (chybi.length) { hlaska($('#s-finalni'), 'chyba', t('shoda.chybiOsy') + ' ' + chybi.join(', ')); return; }

        try {
            await api('/api/shoda', { telo: {
                player_id: hracId, obdobi: stav.nastaveni.obdobi, sablona: s.sablona, hodnoty,
                fyzicky: $('#s-fyzicky').value, hlavou: $('#s-hlavou').value, parta: $('#s-parta').value,
                cile: [$('#s-cil1').value, $('#s-cil2').value, $('#s-cil3').value],
                poznamka_shody: $('#s-poznamka').value
            } });
            hlaska($('#s-finalni'), 'ok', t('shoda.ulozeno'));
        } catch (e) {
            hlaska($('#s-finalni'), 'chyba', e.message);
        }
    };
}

/** Kompaktní volba 1..10 do tabulky shody. Deset tlačítek by řádek roztrhalo. */
function stupniceMala(klic, predvyplneno) {
    const volby = Array.from({ length: MAX }, (_, i) => i + 1)
        .map(i => `<option value="${i}"${predvyplneno === i ? ' selected' : ''}>${i}</option>`).join('');
    return `<select class="vysledek" data-osa="${klic}"><option value="">—</option>${volby}</select>`;
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
            <h2>${t('listy.nadpis')}</h2>
            <p class="popis">${t('listy.popis')}</p>
            <div class="radek">
                <div class="pole"><label for="l-obdobi">${t('listy.obdobi')}</label>
                    <input type="text" id="l-obdobi" value="${esc(stav.nastaveni.obdobi)}"></div>
                <div class="pole"><label for="l-porovnani">${t('listy.polygon')}</label>
                    <select id="l-porovnani">
                        <option value="minule">${t('listy.polygon.minule')}</option>
                        <option value="hrac">${t('listy.polygon.hrac')}</option>
                        <option value="zadne">${t('listy.polygon.zadne')}</option>
                    </select></div>
            </div>
            <p class="popis">${t('listy.dva')}</p>
        </div>

        <div class="karta">
            <h2>${t('listy.kdo')}</h2>
            <table>
                <thead><tr><th class="cisla"><input type="checkbox" id="vsichni" checked title="${t('listy.vsichni.tip')}"></th>
                    <th>${t('hodnotit.hrac')}</th><th class="cisla">${t('lide.trener')}</th><th class="cisla">${t('lide.hrac')}</th></tr></thead>
                <tbody>${prehled.hraci.filter(h => h.aktivni).map(h => `
                    <tr>
                        <td class="cisla"><input type="checkbox" class="vyber" value="${h.id}" checked></td>
                        <td>${jmenoHtml(h)}</td>
                        <td class="cisla">${h.ma_trener ? '<span class="ano">✓</span>' : '<span class="ne">—</span>'}</td>
                        <td class="cisla">${h.ma_hrac ? '<span class="ano">✓</span>' : '<span class="ne">—</span>'}</td>
                    </tr>`).join('')}</tbody>
            </table>
            <p style="margin-top:14px">
                <button class="hl" id="otevrit-listy" title="${t('listy.otevrit.tip')}">${t('listy.otevrit')}</button>
            </p>
        </div>`;

    $('#vsichni').onchange = e =>
        kam.querySelectorAll('.vyber').forEach(c => { c.checked = e.target.checked; });

    $('#otevrit-listy').onclick = () => {
        const ids = [...kam.querySelectorAll('.vyber:checked')].map(c => c.value);
        if (!ids.length) { hlaska(kam, 'chyba', t('listy.nikdo')); return; }
        otevriListy({ ids: ids.join(','), porovnani: $('#l-porovnani').value, obdobi: $('#l-obdobi').value });
    };
}

/* ===================== záložka: Porovnání ===================== */

async function porovnani(kam) {
    const hraci = hraciAktivni();
    kam.innerHTML = `
        <div class="karta">
            <h2>${t('porovnani.nadpis')}</h2>
            <p class="popis">${t('porovnani.popis', esc(stav.nastaveni.tolerance))}</p>
            <div class="pole"><label for="p-hrac">${t('hodnotit.hrac')}</label>
                <select id="p-hrac">
                    <option value="">${t('hodnotit.vyber')}</option>
                    ${hraci.map(h => `<option value="${h.id}">${esc(jmenoText(h))}</option>`).join('')}
                </select></div>
        </div>
        <div id="vysledek"></div>`;

    $('#p-hrac').onchange = async () => {
        const id = Number($('#p-hrac').value);
        const cil = $('#vysledek');
        if (!id) { cil.innerHTML = ''; return; }
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            const [p, tr] = await Promise.all([
                api(`/api/porovnani?player_id=${id}&obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`),
                api(`/api/trend?player_id=${id}`)
            ]);
            cil.innerHTML = tabulkaPorovnani(p) + tabulkaTrendu(tr);
            await pripojHistorii(cil, id);
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };
}

/* ===================== historie verzí ===================== */

async function pripojHistorii(kam, hracId) {
    const verze = await api(`/api/historie?player_id=${hracId}`);

    const jmenoAutora = v => v.autor === 'hrac' ? t('historie.autor.hrac')
        : v.autor === 'shoda' ? t('historie.autor.shoda')
        : `${t('historie.autor.trener')}${v.autorJmeno ? ' — ' + v.autorJmeno : ''}`;

    kam.insertAdjacentHTML('beforeend', `
        <div class="karta" id="historie">
            <h2>${t('historie.nadpis')}</h2>
            <p class="popis">${t('historie.popis')}</p>
            <table>
                <thead><tr><th class="cisla"></th><th>${t('historie.datum')}</th>
                    <th>${t('listy.obdobi')}</th><th>${t('historie.autor')}</th>
                    <th>${t('lide.sablona')}</th><th></th></tr></thead>
                <tbody>${verze.length ? verze.map(v => `
                    <tr>
                        <td class="cisla"><input type="checkbox" class="verze" value="${v.id}"
                            data-sablona="${v.sablona}" data-popis="${esc(new Date(v.datum + 'Z').toLocaleString(locale()))}"></td>
                        <td>${esc(new Date(v.datum + 'Z').toLocaleString(locale()))}</td>
                        <td>${esc(v.obdobi)}</td>
                        <td>${esc(jmenoAutora(v))}</td>
                        <td>${t('sablona.' + v.sablona)}</td>
                        <td><button class="vedlejsi" data-tisk="${v.id}" title="${t('historie.tisk.tip')}">${t('historie.tisk')}</button></td>
                    </tr>`).join('') : `<tr><td colspan="6">${t('historie.prazdno')}</td></tr>`}</tbody>
            </table>
            ${verze.length > 1 ? `<p style="margin-top:12px">
                <button class="vedlejsi" id="porovnat-verze" title="${t('historie.porovnat.tip')}">${t('historie.porovnat')}</button>
            </p><div id="posun"></div>` : ''}
        </div>`);

    kam.querySelectorAll('[data-tisk]').forEach(b => b.onclick = () =>
        window.open(`listy.html?verze=${b.dataset.tisk}`, '_blank'));

    const tlacitko = $('#porovnat-verze');
    if (!tlacitko) return;
    tlacitko.onclick = () => {
        const vybrane = [...kam.querySelectorAll('.verze:checked')];
        const cil = $('#posun');
        if (vybrane.length !== 2) { cil.innerHTML = `<div class="hlaska chyba">${t('historie.vyberDve')}</div>`; return; }
        if (vybrane[0].dataset.sablona !== vybrane[1].dataset.sablona) {
            cil.innerHTML = `<div class="hlaska pozor">${t('historie.ruznaSablona')}</div>`;
            return;
        }
        // Starší vlevo: seznam je od nejnovější, takže druhý vybraný je ten dřívější.
        const [novy, stary] = vybrane.map(v => verze.find(x => x.id === Number(v.value)));
        cil.innerHTML = tabulkaPosunu(stary, novy);
    };
}

function tabulkaPosunu(stary, novy) {
    const popisky = Object.fromEntries(osy(novy.sablona).map(o => [o.klic, o.popis]));
    const radky = Object.keys(popisky).map(klic => {
        const a = stary.hodnoty[klic] ?? 0, b = novy.hodnoty[klic] ?? 0;
        const zmena = b - a;
        // Stejné pásmo šumu jako u trendu: posun o 1 bod není signál.
        const smer = Math.abs(zmena) >= 2 ? (zmena > 0 ? '↑' : '↓') : '→';
        return `<tr><td>${esc(popisky[klic])}</td><td class="cisla">${a}</td>
                    <td class="cisla">${b}</td><td class="cisla">${smer}</td></tr>`;
    }).join('');

    return `
        <table style="margin-top:10px">
            <thead><tr><th>${t('porovnani.osa')}</th>
                <th class="cisla">${esc(new Date(stary.datum + 'Z').toLocaleDateString(locale()))}</th>
                <th class="cisla">${esc(new Date(novy.datum + 'Z').toLocaleDateString(locale()))}</th>
                <th class="cisla"></th></tr></thead>
            <tbody>${radky}</tbody>
        </table>
        <p class="popis">${t('trend.pasmo')}</p>`;
}

function tabulkaPorovnani(p) {
    if (!p.hotovo) {
        if (p.jinaSablona) {
            return `<div class="karta"><div class="hlaska pozor">${t('porovnani.jinaSablona')}</div></div>`;
        }
        const co = [];
        if (!p.maTrener) co.push(t('porovnani.chybi.trener'));
        if (!p.maHrac) co.push(t('porovnani.chybi.hrac'));
        return `<div class="karta"><div class="hlaska info">${t('porovnani.chybi', esc(p.obdobi), co.join(t('porovnani.a')))}</div></div>`;
    }

    const popisky = Object.fromEntries(osy(p.sablona || sablonaZOs(p.osy)).map(o => [o.klic, o.popis]));

    const radky = p.osy.map(o => `
        <tr class="${o.resit ? 'resit' : ''}">
            <td>${esc(popisky[o.klic] || o.klic)}</td>
            <td class="cisla">${o.trener}</td>
            <td class="cisla">${o.hrac}</td>
            <td class="cisla">${o.rozdil > 0 ? `<span class="rozdil-plus">+${o.rozdil}</span>`
                              : o.rozdil < 0 ? `<span class="rozdil-minus">${o.rozdil}</span>` : '0'}</td>
            <td>${o.resit
                    ? (o.rozdil > 0 ? t('porovnani.slepeMisto') : t('porovnani.sebeduvera'))
                    : `<span class="ne">${t('porovnani.vToleranci')}</span>`}</td>
        </tr>`).join('');

    return `
        <div class="karta">
            <h2>${t('porovnani.rozdily', esc(p.obdobi))}
                ${p.sablona ? `<span class="popis">— ${t('porovnani.sablona', t('sablona.' + p.sablona))}</span>` : ''}</h2>
            ${p.pocetResit > 3 ? `<div class="hlaska pozor">${t('porovnani.upozorneni', p.pocetResit)}</div>` : ''}
            <table>
                <thead><tr><th>${t('porovnani.osa')}</th><th class="cisla">${t('lide.trener')}</th>
                    <th class="cisla">${t('lide.hrac')}</th><th class="cisla">${t('porovnani.rozdil')}</th>
                    <th>${t('porovnani.kRozhovoru')}</th></tr></thead>
                <tbody>${radky}</tbody>
            </table>
            <p class="popis" style="margin-top:10px">${t('porovnani.legenda')}</p>
            ${p.poznamkaHrace ? `<div class="hlaska info"><b>${t('porovnani.napsal')}</b> ${esc(p.poznamkaHrace)}</div>` : ''}
        </div>`;
}

/** Odvodí šablonu z klíčů os, které vrátil server. */
function sablonaZOs(seznam) {
    const klic = seznam[0]?.klic;
    return Object.keys(SABLONY).find(s => SABLONY[s].includes(klic)) || 'pole';
}

function tabulkaTrendu(tr) {
    if (!tr.maTrend) {
        return `<div class="karta"><h2>${t('trend.nadpis')}</h2><p class="popis">${t('trend.malo')}</p></div>`;
    }
    const popisky = Object.fromEntries(osy(sablonaZOs(tr.osy)).map(o => [o.klic, o.popis]));

    return `
        <div class="karta">
            <h2>${t('trend.nadpis')} <span class="popis">${t('trend.jenTrener')}</span></h2>
            <p class="popis"><b>${t('trend.souhrn', esc(tr.odkud), esc(tr.kam), tr.nahoru, tr.dolu, tr.stejne)}</b><br>${t('trend.pasmo')}</p>
            <table>
                <thead><tr><th>${t('porovnani.osa')}</th><th class="cisla">${esc(tr.odkud)}</th>
                    <th class="cisla">${esc(tr.kam)}</th><th class="cisla"></th></tr></thead>
                <tbody>${tr.osy.map(o => `
                    <tr><td>${esc(popisky[o.klic] || o.klic)}</td><td class="cisla">${o.driv}</td>
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
            <h2>${t('odkazy.nadpis')}</h2>
            <p class="popis">${t('odkazy.popis')}</p>
            <div class="radek">
                <div class="pole"><label for="t-dni">${t('odkazy.platnost')}</label>
                    <input type="number" id="t-dni" value="30" min="1" max="365"></div>
                <div class="pole" style="align-self:end">
                    <button class="hl" id="generovat" title="${t('odkazy.generovat.tip')}">${t('odkazy.generovat')}</button></div>
            </div>
        </div>

        <div class="karta">
            <h2>${t('odkazy.obdobi', esc(stav.nastaveni.obdobi))}</h2>
            <table>
                <thead><tr><th>${t('hodnotit.hrac')}</th><th>${t('odkazy.sablona')}</th><th>${t('odkazy.stav')}</th>
                    <th>${t('odkazy.platiDo')}</th><th>${t('odkazy.odkaz')}</th><th></th></tr></thead>
                <tbody>${seznam.length ? seznam.map(x => `
                    <tr>
                        <td>${jmenoHtml(x)}</td>
                        <td>${t('sablona.' + (x.sablona || 'pole'))}</td>
                        <td>${x.pouzit ? `<span class="ano">${t('odkazy.vyplneno')}</span>` : `<span class="ne">${t('odkazy.ceka')}</span>`}</td>
                        <td>${x.platny_do ? esc(new Date(x.platny_do).toLocaleDateString(locale())) : '—'}</td>
                        <td class="odkaz-pole">${esc(zaklad)}/h/${esc(x.token.slice(0, 8))}…</td>
                        <td>
                            <button class="vedlejsi" data-kopirovat="${esc(x.token)}" title="${t('odkazy.kopirovat.tip')}">${t('odkazy.kopirovat')}</button>
                            <button class="vedlejsi zrusit" data-zrusit="${esc(x.token)}" title="${t('odkazy.zneplatnit.tip')}">${t('odkazy.zneplatnit')}</button>
                        </td>
                    </tr>`).join('') : `<tr><td colspan="6">${t('odkazy.prazdno')}</td></tr>`}</tbody>
            </table>
        </div>`;

    $('#generovat').onclick = async () => {
        try {
            const r = await api('/api/tokens', { telo: { obdobi: stav.nastaveni.obdobi, dni: Number($('#t-dni').value) } });
            await prekresli();
            hlaska($('#obsah'), 'ok', t('odkazy.vytvoreno', r.vytvoreno));
        } catch (e) { hlaska(kam, 'chyba', e.message); }
    };

    kam.querySelectorAll('[data-kopirovat]').forEach(b => b.onclick = async () => {
        const odkaz = `${zaklad}/h/${b.dataset.kopirovat}`;
        try {
            await navigator.clipboard.writeText(odkaz);
            b.textContent = t('odkazy.zkopirovano');
            setTimeout(() => { b.textContent = t('odkazy.kopirovat'); }, 1500);
        } catch {
            prompt(t('odkazy.rucne'), odkaz);
        }
    });

    kam.querySelectorAll('[data-zrusit]').forEach(b => b.onclick = async () => {
        if (!confirm(t('odkazy.potvrdit'))) return;
        try {
            await api(`/api/tokens/${encodeURIComponent(b.dataset.zrusit)}`, { method: 'DELETE' });
            await prekresli();
        } catch (e) { hlaska(kam, 'chyba', e.message); }
    });
}

/* ===================== záložka: Nastavení ===================== */

const KLICE_NASTAVENI = ['tolerance', 'obdobi', 'sezona', 'klub', 'kategorie', 'latka', 'cileNadpis'];
const MA_NAPOVEDU = ['tolerance', 'obdobi', 'sezona', 'latka', 'cileNadpis'];

async function nastaveni(kam) {
    kam.innerHTML = `
        <div class="karta">
            <h2>${t('nastaveni.nadpis')}</h2>
            <p class="popis">${t('nastaveni.popis')}</p>
            ${KLICE_NASTAVENI.map(klic => `
                <div class="pole">
                    <label for="n-${klic}">${t('nastaveni.' + klic)}</label>
                    <input type="${klic === 'tolerance' ? 'number' : 'text'}" id="n-${klic}"
                           value="${esc(stav.nastaveni[klic] ?? '')}"${klic === 'tolerance' ? ' min="0" max="9"' : ''}>
                    ${MA_NAPOVEDU.includes(klic) ? `<div class="popis">${t('nastaveni.' + klic + '.napoveda')}</div>` : ''}
                </div>`).join('')}
            <button class="hl" id="ulozit-nastaveni" title="${t('nastaveni.ulozit.tip')}">${t('nastaveni.ulozit')}</button>
        </div>

        <div class="karta" id="karta-hesla">
            <h2>${t('heslo.nadpis')}</h2>
            <p class="popis">${t('heslo.popis')}</p>
            <div id="obnova-info"></div>
            <div class="pole"><label for="h-stare">${t('heslo.stare')}</label>
                <input type="password" id="h-stare" autocomplete="current-password"></div>
            <div class="pole"><label for="h-nove">${t('heslo.nove')}</label>
                <input type="password" id="h-nove" autocomplete="new-password"></div>
            <div class="pole"><label for="h-nove2">${t('heslo.nove2')}</label>
                <input type="password" id="h-nove2" autocomplete="new-password"></div>
            <button class="hl" id="zmenit-heslo" title="${t('heslo.ulozit.tip')}">${t('heslo.ulozit')}</button>
        </div>

        <div class="karta" id="karta-notifikaci">
            <h2>${t('notif.nadpis')}</h2>
            <p class="popis">${t('notif.popis')}</p>
            <div class="pole"><label><input type="checkbox" id="n-zapnuto" style="width:auto"
                ${stav.nastaveni.notifZapnuto === '1' ? 'checked' : ''}> ${t('notif.zapnuto')}</label></div>
            <div class="radek">
                <div class="pole"><label for="n-cas">${t('notif.cas')}</label>
                    <input type="text" id="n-cas" value="${esc(stav.nastaveni.notifCas ?? '19:00')}" placeholder="19:00">
                    <div class="popis">${t('notif.cas.napoveda')}</div></div>
                <div class="pole"><label for="n-dnyZmeny">${t('notif.dnyZmeny')}</label>
                    <input type="number" id="n-dnyZmeny" min="1" max="60" value="${esc(stav.nastaveni.notifDnyZmeny ?? '3')}">
                    <div class="popis">${t('notif.dnyZmeny.napoveda')}</div></div>
                <div class="pole"><label for="n-dnyTicho">${t('notif.dnyTicho')}</label>
                    <input type="number" id="n-dnyTicho" min="1" max="180" value="${esc(stav.nastaveni.notifDnyTicho ?? '14')}">
                    <div class="popis">${t('notif.dnyTicho.napoveda')}</div></div>
            </div>
            <div class="pole"><label><input type="checkbox" id="n-sms" style="width:auto"
                ${stav.nastaveni.smsAktivni === '1' ? 'checked' : ''}> ${t('notif.smsAktivni')}</label>
                <div class="popis">${t('notif.smsAktivni.napoveda')}</div></div>
            <div id="notif-stav"></div>
            <button class="hl" id="ulozit-notif" title="${t('nastaveni.ulozit.tip')}">${t('nastaveni.ulozit')}</button>
            <button class="vedlejsi" id="poslat-ted" title="${t('notif.poslatTed.tip')}">${t('notif.poslatTed')}</button>
            <div id="notif-vysledek"></div>
        </div>`;

    // Stav rozesílky a kanálů — ať je vidět, jestli má souhrn komu chodit.
    Promise.all([api('/api/notifikace/stav'), api('/api/kanaly')]).then(([s, k]) => {
        const cil = $('#notif-stav');
        if (!cil) return;
        const prijemci = s.prijemci.map(p => `${p.jmeno} (${p.kanaly.join(' + ')})`).join(', ');
        cil.innerHTML = `
            <div class="hlaska ${prijemci ? 'info' : 'pozor'}">
                ${t('notif.ceka', s.ceka)}<br>
                ${t('notif.hodiny', s.hodinaTed, s.hodinaCil)}<br>
                ${t('notif.posledni', s.posledni ? new Date(s.posledni).toLocaleString(locale()) : t('notif.nikdy'))}<br>
                ${prijemci ? t('notif.prijemci', esc(prijemci)) : t('notif.bezPrijemcu')}<br>
                <b>${t('notif.kanaly')}:</b><br>
                Telegram — ${esc(k.telegram.popis)}<br>
                e-mail — ${esc(k.email.popis)}<br>
                SMS — ${esc(k.sms.popis)} (${k.sms.zaDen}/${k.sms.strop} za 24 h)
            </div>`;
    }).catch(() => { /* informativní */ });

    // Log odeslané komunikace — ať „nic mi nepřišlo" nekončí u wrangler tail.
    api('/api/komunikace').then(zaznamy => {
        const stav = { ok: 'ano', chyba: 'rozdil-plus', preskoceno: 'ne' };
        kam.insertAdjacentHTML('beforeend', `
            <div class="karta">
                <h2>${t('komunikace.nadpis')}</h2>
                <p class="popis">${t('komunikace.popis')}</p>
                <table>
                    <thead><tr><th>${t('komunikace.cas')}</th><th>${t('komunikace.kanal')}</th>
                        <th>${t('komunikace.platforma')}</th>
                        <th>${t('komunikace.komu')}</th><th>${t('komunikace.typ')}</th>
                        <th>${t('komunikace.vysledek')}</th></tr></thead>
                    <tbody>${zaznamy.length ? zaznamy.map(z => `
                        <tr>
                            <td>${esc(new Date(z.cas + 'Z').toLocaleString(locale()))}</td>
                            <td>${esc(z.kanal)}</td>
                            <td>${esc(z.platforma || '—')}</td>
                            <td>${esc(z.jmeno || z.adresa || '—')}</td>
                            <td>${t('komunikace.typ.' + z.typ)}</td>
                            <td><span class="${stav[z.vysledek] ?? ''}">${t('komunikace.' + z.vysledek)}</span>${
                                z.kod ? ` <span class="popis">${esc(z.kod)}</span>` : ''}${
                                // Důvod patří rovnou do tabulky — „chyba 400" sama o sobě nic neřekne.
                                z.podrobnosti ? `<br><span class="popis" title="${esc(z.podrobnosti)}">${esc(z.podrobnosti.slice(0, 120))}</span>` : ''}</td>
                        </tr>`).join('') : `<tr><td colspan="6">${t('komunikace.prazdno')}</td></tr>`}</tbody>
                </table>
            </div>`);
    }).catch(() => { /* informativní */ });

    $('#ulozit-notif').onclick = async () => {
        const telo = {
            notifZapnuto: $('#n-zapnuto').checked ? '1' : '0',
            notifCas: $('#n-cas').value,
            notifDnyZmeny: $('#n-dnyZmeny').value,
            notifDnyTicho: $('#n-dnyTicho').value,
            smsAktivni: $('#n-sms').checked ? '1' : '0'
        };
        try {
            stav.nastaveni = await api('/api/settings', { telo, method: 'PUT' });
            hlaska($('#karta-notifikaci'), 'ok', t('nastaveni.ulozeno'));
        } catch (e) { hlaska($('#karta-notifikaci'), 'chyba', e.message); }
    };

    $('#poslat-ted').onclick = async () => {
        const cil = $('#notif-vysledek');
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            const r = await api('/api/notifikace/ted', { telo: {} });
            cil.innerHTML = `<div class="hlaska info">${r.zpravy.map(esc).join('<br>') || '—'}</div>`;
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

    // Kam chodí obnova hesla — ať je vidět, jestli je vůbec zapojená.
    api('/api/obnova-adresy').then(o => {
        const info = $('#obnova-info');
        if (!info) return;
        if (!o.adresy.length) info.innerHTML = `<div class="hlaska pozor">${t('heslo.obnovaNikam')}</div>`;
        else if (!o.mailFunguje) info.innerHTML = `<div class="hlaska pozor">${t('heslo.mailNefunguje')}</div>`;
        else info.innerHTML = `<div class="hlaska info">${t('heslo.obnovaKam', esc(o.adresy.join(', ')))}</div>`;
    }).catch(() => { /* informativní, bez toho se obejdeme */ });

    $('#zmenit-heslo').onclick = async () => {
        const karta = $('#karta-hesla');
        if ($('#h-nove').value !== $('#h-nove2').value) {
            hlaska(karta, 'chyba', t('heslo.nesouhlasi'));
            return;
        }
        try {
            await api('/api/heslo', { telo: { stare: $('#h-stare').value, nove: $('#h-nove').value } });
            ['h-stare', 'h-nove', 'h-nove2'].forEach(id => { $('#' + id).value = ''; });
            hlaska(karta, 'ok', t('heslo.zmeneno'));
        } catch (e) {
            hlaska(karta, 'chyba', e.message);
        }
    };

    $('#ulozit-nastaveni').onclick = async () => {
        const telo = Object.fromEntries(KLICE_NASTAVENI.map(k => [k, $('#n-' + k).value]));
        try {
            stav.nastaveni = await api('/api/settings', { telo, method: 'PUT' });
            prekresliShell();
            await prekresli();
            hlaska($('#obsah'), 'ok', t('nastaveni.ulozeno'));
        } catch (e) { hlaska(kam, 'chyba', e.message); }
    };
}

/* ===================== start ===================== */

$('#prihlasit').onclick = prihlas;
$('#heslo').onkeydown = e => { if (e.key === 'Enter') prihlas(); };
$('#zapomenute').onclick = () => prepniObnovu(true);
$('#obnova-zpet').onclick = () => prepniObnovu(false);
$('#obnova-poslat').onclick = poslatObnovu;
$('#obnova-email').onkeydown = e => { if (e.key === 'Enter') poslatObnovu(); };
$('#odhlasit').onclick = async () => { await api('/api/logout', { telo: {} }); ukazPrihlaseni(); };
$('#themeBtn').onclick = () => nastavVzhled(vzhled() === 'dark' ? 'light' : 'dark');
$('#jazykBtn').onclick = async () => {
    nastavJazyk(druhyJazyk());
    prekresliShell();
    if (stav.prihlasen) await prekresli();
};

document.querySelectorAll('#zalozky button').forEach(b => b.onclick = () => {
    stav.zalozka = b.dataset.z;
    prekresli();
});

setInterval(hodiny, 1000);

(async () => {
    prekresliShell();
    const ja = await api('/api/me');
    stav.kdo = ja.jmeno ?? null;
    stav.kdoId = ja.id ?? null;
    if (ja.prihlasen) await spust();
    else ukazPrihlaseni();
})();
