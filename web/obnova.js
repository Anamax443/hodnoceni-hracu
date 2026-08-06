/* =====================================================================
   NASTAVENÍ NOVÉHO HESLA za jednorázovým odkazem /obnova/<token>

   Stránka nikdy neukazuje staré heslo ani neříká, komu odkaz patřil.
   Platnost a jednorázovost hlídá Worker.
   ===================================================================== */

import { esc } from './src/list.js';
import { t, jazyk, nastavJazyk, druhyJazyk, locale } from './src/i18n.js';

const token = location.pathname.split('/').filter(Boolean).pop() ?? '';
const obsah = document.getElementById('obsah');
const $ = s => document.querySelector(s);

let platny = null;   // null = ještě nevíme

function vzhled() { return document.documentElement.getAttribute('data-theme') || 'light'; }

function nastavVzhled(novy) {
    document.documentElement.setAttribute('data-theme', novy);
    try { localStorage.setItem('hodnoceni.theme', novy); } catch { /* nevadí */ }
    $('#themeBtn').textContent = novy === 'dark' ? t('shell.vzhled.svetly') : t('shell.vzhled.tmavy');
    $('#themeBtn').title = t('shell.vzhled.tip');
}

function hodiny() {
    const prvek = $('#hodiny');
    prvek.textContent = new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
    prvek.title = t('shell.hodiny.tip');
}

async function verze() {
    try {
        const v = await (await fetch('/api/version')).json();
        $('#verze').textContent = `${t('shell.verze')} ${v.commit}`;
        $('#verze').title = `${v.commitFull}\n${t('shell.sestaveno')}: ${new Date(v.builtAt).toLocaleString(locale())}`;
    } catch { $('#verze').textContent = ''; }
}

function vykresli() {
    document.documentElement.lang = jazyk();
    $('#hl-nadpis').textContent = '⚽ ' + t('shell.app');
    $('#jazykBtn').textContent = t('jazyk.dalsi');
    $('#jazykBtn').title = t('shell.jazyk.tip');
    nastavVzhled(vzhled());
    hodiny();

    if (platny === null) {
        obsah.innerHTML = `<div class="karta login"><p class="popis">${t('shell.nacitam')}</p></div>`;
        return;
    }
    if (!platny) {
        obsah.innerHTML = `<div class="karta login">
            <div class="hlaska chyba">${t('obnova.neplatny')}</div>
            <button class="vedlejsi" onclick="location.href='/'">${t('obnova.naPrihlaseni')}</button>
        </div>`;
        return;
    }

    obsah.innerHTML = `
        <div class="karta login">
            <h2>${t('obnova.nadpis')}</h2>
            <p class="popis">${t('obnova.popis')}</p>
            <div class="pole">
                <label for="nove">${t('heslo.nove')}</label>
                <input type="password" id="nove" autocomplete="new-password">
            </div>
            <div class="pole">
                <label for="nove2">${t('heslo.nove2')}</label>
                <input type="password" id="nove2" autocomplete="new-password">
            </div>
            <button class="hl" id="nastavit" title="${t('obnova.nastavit.tip')}">${t('obnova.nastavit')}</button>
            <div id="hlaska"></div>
        </div>`;

    $('#nastavit').onclick = nastav;
    $('#nove2').onkeydown = e => { if (e.key === 'Enter') nastav(); };
}

async function nastav() {
    const heslo = $('#nove').value;
    const znovu = $('#nove2').value;
    const hlaska = $('#hlaska');
    hlaska.innerHTML = '';

    if (heslo !== znovu) {
        hlaska.innerHTML = `<div class="hlaska chyba">${t('heslo.nesouhlasi')}</div>`;
        return;
    }

    try {
        const r = await fetch(`/api/obnova/${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ heslo })
        });
        const v = await r.json();
        if (!r.ok) throw new Error(v?.chyba || t('chyba.server', r.status));

        obsah.innerHTML = `<div class="karta login">
            <div class="hlaska ok">${t('obnova.hotovo')}</div>
            <button class="hl" onclick="location.href='/'">${t('obnova.naPrihlaseni')}</button>
        </div>`;
    } catch (e) {
        hlaska.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
    }
}

$('#themeBtn').onclick = () => nastavVzhled(vzhled() === 'dark' ? 'light' : 'dark');
$('#jazykBtn').onclick = () => { nastavJazyk(druhyJazyk()); vykresli(); verze(); };
setInterval(hodiny, 1000);

vykresli();
verze();

try {
    const r = await fetch(`/api/obnova/${encodeURIComponent(token)}`);
    platny = (await r.json())?.platny === true;
} catch {
    platny = false;
}
vykresli();
