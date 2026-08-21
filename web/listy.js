/* Tiskové listy sestavené z databáze. Parametry v URL:
   ?obdobi=2025/2026 zima|vse&porovnani=minule|hrac|zadne&ids=vse|1,2,3
   `obdobi=vse` vytiskne celou historii — hráč pak dostane papír za každé
   období, ve kterém hodnocení má.
   `pohled=sebehodnoceni` tiskne místo hodnocení trenéra řadu vyplnění od
   hráče, jak šla po sobě.                                                */

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
const sVysvetlivkami = p.get('vysvetlivky') === '1';
const pohled = p.get('pohled') === 'sebehodnoceni' ? 'sebehodnoceni' : 'hodnoceni';

function nakresli() {
    popisky();
    if (!data) return;

    // Období v hlavičce každého listu nese list sám. Tenhle popisek je pro
    // stavový řádek a pro stránku vysvětlivek, která je jedna pro celou hromádku
    // — a při tisku historie k žádnému jednomu období nepatří.
    const nas = data.vsechnaObdobi
        ? { ...data.nastaveni,
            obdobi: t('tisk.vsechnaObdobi', new Set(data.listy.map(h => h.obdobi)).size) }
        : data.nastaveni;

    const pocet = vykresli(data.listy, nas, $('#output'), kumulovane, sVysvetlivkami, pohled);

    if (pohled === 'sebehodnoceni') {
        // „Bez hodnocení" tady znamená „hráč zatím nic nevyplnil" — jiná věta
        // než u trenérského listu, ať nevypadá, že chybí známky trenéra.
        const bez = data.listy.filter(h => !(h.sebehodnoceni ?? []).length).length;
        $('#stav').textContent = t('tisk.stavProgres', nas.obdobi, pocet)
            + (bez ? t('tisk.bezSebehodnoceni', bez) : '');
        return;
    }

    const bez = data.listy.filter(h => !h.hodnoceni).length;
    $('#stav').textContent = t('tisk.stav', nas.obdobi, pocet)
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
            ids: p.get('ids') || 'vse',
            ...(pohled === 'sebehodnoceni' ? { pohled } : {})
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
