/* Tiskové listy sestavené z databáze. Parametry v URL:
   ?obdobi=2025/2026 zima&porovnani=minule|hrac|zadne&ids=vse|1,2,3   */

import { vykresli, esc } from './src/list.js';
import { t, jazyk, nastavJazyk, druhyJazyk, locale } from './src/i18n.js';

const $ = s => document.querySelector(s);
const p = new URLSearchParams(location.search);
let data = null;

async function verze() {
    try {
        const v = await (await fetch('/api/version')).json();
        $('#verze').textContent = `${t('shell.verze')} ${v.commit}`;
        $('#verze').title = `${v.commitFull}\n${t('shell.sestaveno')}: ${new Date(v.builtAt).toLocaleString(locale())}`;
    } catch { $('#verze').textContent = ''; }
}

function popisky() {
    document.documentElement.lang = jazyk();
    $('#tisk').textContent = t('tisk.vytisknout');
    $('#tisk').title = t('tisk.tip');
    $('#jazykBtn').textContent = t('jazyk.dalsi');
    $('#jazykBtn').title = t('shell.jazyk.tip');
}

const kumulovane = p.get('kumulovane') === '1';

function nakresli() {
    popisky();
    if (!data) return;
    const pocet = vykresli(data.listy, data.nastaveni, $('#output'), kumulovane);
    const bez = data.listy.filter(h => !h.hodnoceni).length;
    $('#stav').textContent = t('tisk.stav', data.nastaveni.obdobi, pocet)
        + (bez ? t('tisk.bez', bez) : '')
        + (kumulovane ? t('tisk.kumulovane') : '');
}

$('#tisk').onclick = () => window.print();
$('#jazykBtn').onclick = () => { nastavJazyk(druhyJazyk()); nakresli(); verze(); };

popisky();
verze();

try {
    // ?verze=<id> vytiskne jednu konkrétní starší verzi hodnocení.
    const dotaz = p.get('verze')
        ? new URLSearchParams({ verze: p.get('verze') })
        : new URLSearchParams({
            obdobi: p.get('obdobi') || '',
            porovnani: p.get('porovnani') || 'minule',
            ids: p.get('ids') || 'vse'
        });

    const odpoved = await fetch(`/api/listy?${dotaz}`, { credentials: 'same-origin' });
    if (odpoved.status === 401) throw new Error(t('tisk.neprihlasen'));
    const telo = await odpoved.json();
    if (!odpoved.ok) throw new Error(telo?.chyba || t('chyba.server', odpoved.status));

    data = telo;
    nakresli();

} catch (e) {
    $('#chyba').innerHTML = `<div class="chyba"><b>${t('tisk.chyba')}</b><br>${esc(e.message)}</div>`;
    $('#stav').textContent = t('tisk.stavChyba');
}
