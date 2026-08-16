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
import { dokumentaceHtml } from './src/dokumentace.js';
import { ZDROJ_FA, ZDROJ_ES, ZDROJ_ES_EN, ZDROJ_FA_VIDEO, ZDROJ_ES_VIDEO } from './src/zdroje.js';

const $ = s => document.querySelector(s);
/* `uprava` je jednorázová schránka mezi záložkami: Historie do ní položí verzi,
   kterou chce trenér opravit, a Hodnotit ji hned po překreslení vybere. */
const stav = { nastaveni: {}, lide: [], zalozka: 'uvod', prihlasen: false, kdo: null, kdoId: null, uprava: null,
    naHodnoceni: null, konektivita: null };

/* Abeceda GSM 03.38. Zpráva složená jen z těchhle znaků se vejde do 160 znaků
   na segment; jediný znak mimo ni (pomlčka „–", české uvozovky, výpustka „…")
   přepne celou SMS na UCS-2 a segment spadne na 70 znaků — tedy dvojnásobná
   cena za totéž. Odstranění diakritiky tyhle znaky nechytí, jsou to písmena
   jiná než latinka s háčkem. */
const GSM7 = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?'
    + '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
/* Rozšiřovací tabulka: znak projde, ale zabere v segmentu dvě místa. */
const GSM7_ROZSIRENI = '^{}\\[~]|€';

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

    const prikaz = $('#prikaz-vstup');
    if (prikaz) {
        prikaz.placeholder = t('prikaz.napoveda');
        $('#prikaz-spustit').textContent = t('prikaz.spustit');
        $('#prikaz-spustit').title = t('prikaz.spustit.tip');
    }

    // Hamburger nese jméno otevřené záložky, ať je i po zavření menu vidět, kde jsi.
    const menuBtn = $('#menuBtn');
    if (menuBtn) {
        menuBtn.textContent = t('nav.' + stav.zalozka);
        menuBtn.title = t($('#zalozky')?.classList.contains('otevreno') ? 'nav.menu.zavrit' : 'nav.menu.tip');
    }

    nastavVzhled(vzhled());
    hodiny();
    verze();

    if (stav.prihlasen) {
        $('#hl-klub-text').textContent = stav.nastaveni.klub || '';
        $('#hl-obdobi').textContent = `${t('shell.obdobi')}: ${stav.nastaveni.obdobi || ''}`
            + ' · ' + t('shell.prihlasen', stav.kdo || t('shell.spolecne'));
        vykresliKonektivitu();
    }
}

/* ===================== konektivita v liště =====================

   Ukazuje, jestli kanály odpovídají, aby se na to nemuselo chodit do
   Nastavení. `/api/stav` je schválně levné: Telegram getMe a token GoSMS
   nic nestojí, kdežto dotaz na jazykový model ujídá denní limit — proto
   se u modelu hlásí jen nastavení a skutečnou zkoušku drží tlačítko
   v Nastavení. Výsledek se drží v `stav.konektivita`, ať se při každém
   překreslení lišty (jazyk, vzhled, přepnutí záložky) nevolá znovu.      */

const ZNACKY_STAVU = { ok: '●', nastaveno: '●', vypnuto: '○', chyba: '✕', chybi: '✕' };

function vykresliKonektivitu() {
    const kam = $('#konektivita');
    if (!kam) return;
    const data = stav.konektivita;
    if (!data) { kam.hidden = true; return; }

    kam.hidden = false;
    kam.innerHTML = ['ai', 'sms', 'telegram', 'email'].map(klic => {
        const k = data[klic] ?? { stav: 'chybi', popis: '' };
        return `<button class="kanal st-${esc(k.stav)}" data-kanal="${klic}"`
            + ` title="${esc(t('konektivita.' + klic) + ' — ' + k.popis)}">`
            + `${ZNACKY_STAVU[k.stav] ?? '?'} ${esc(t('konektivita.' + klic))}</button>`;
    }).join('');

    // Klik vede tam, kde se s tím dá něco udělat — do Nastavení.
    kam.querySelectorAll('[data-kanal]').forEach(b => b.onclick = () => {
        stav.zalozka = 'nastaveni';
        prekresli();
    });
}

/**
 * Načte stav kanálů. Volá se po přihlášení a po každém skutečném volání modelu —
 * stav modelu se totiž nezjišťuje zkušebním dotazem (ten by ujídal denní limit),
 * ale z toho, jak dopadlo poslední použití. Kdyby model přestal odpovídat,
 * musí se to v liště objevit hned, ne až po dalším přihlášení.
 */
async function nactiKonektivitu() {
    try {
        stav.konektivita = await api('/api/stav');
    } catch {
        stav.konektivita = null;   // informativní prvek nesmí shodit aplikaci
    }
    vykresliKonektivitu();
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

    // Až po vykreslení: stav kanálů je informace navíc, nemá zdržovat start.
    nactiKonektivitu();
}

async function prekresli() {
    document.querySelectorAll('#zalozky button')
        .forEach(b => b.classList.toggle('aktivni', b.dataset.z === stav.zalozka));
    const menuBtn = $('#menuBtn');
    if (menuBtn) menuBtn.textContent = t('nav.' + stav.zalozka);

    const obsah = $('#obsah');
    obsah.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
    try {
        const kresli = { uvod, lide, hodnotit, shoda, listy, porovnani, analyzy, odkazy, nastaveni, dokumentace }[stav.zalozka];
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

/* Hráč může mít víc šablon najednou — Ferda chytá, hraje v poli a je kapitán.
   Každá šablona je vlastní řada, vlastní odkaz na sebehodnocení i vlastní list. */
const sablonyOsoby = o => (o?.sablony?.length ? o.sablony : [o?.sablona ?? 'pole']);
const nazvySablon = o => sablonyOsoby(o).map(s => t('sablona.' + s)).join(' · ');

/* Prameny pod slovními bloky. Komu nestačí věta pod polem, má kam dojít —
   a je vidět, že rozdělení na tři bloky není domácí výmysl: anglická škola
   dělí hráče na čtyři rohy, španělská na osm struktur. */
const zdrojeBloku = () => `<div class="popis zdroje">
    <div><b>${t('bloky.zdroje')}</b></div>
    <div>🇬🇧 <a href="${ZDROJ_FA}" target="_blank" rel="noopener">${t('bloky.zdroje.fa')}</a>
        · <a href="${ZDROJ_FA_VIDEO}" target="_blank" rel="noopener">${t('bloky.zdroje.video')}</a></div>
    <div>🇪🇸 <a href="${ZDROJ_ES}" target="_blank" rel="noopener">${t('bloky.zdroje.es')}</a>
        · <a href="${ZDROJ_ES_EN}" target="_blank" rel="noopener">${t('bloky.zdroje.esEn')}</a>
        · <a href="${ZDROJ_ES_VIDEO}" target="_blank" rel="noopener">${t('bloky.zdroje.video')}</a></div>
</div>`;

/* Barevný štítek šablony. Stejné odstíny jako na tiskovém listu (src/styl.css),
   ať trenér nemusí u každé tabulky luštit, jestli kouká na brankářskou nebo
   polní řadu. Barva je druhý signál — název šablony je v štítku pořád.
   `nazvySablon` zůstává čistý text, používá se tam, kde se výstup escapuje. */
const stitekSablony = s => `<span class="znacka sab-${esc(s)}">${t('sablona.' + s)}</span>`;
const stitkySablon = o => sablonyOsoby(o).map(stitekSablony).join(' ');

/* Tentýž štítek, ale v Lidech je zároveň zkratka: klik otevře hodnocení toho
   hráče rovnou touhle šesticí os. Ferda má tři štítky = tři různé řady, a než
   se k jeho brankářskému listu proklikat přes výběr hráče a výběr šablony,
   je rychlejší trefit se do štítku, který už na obrazovce je.
   Je to <button>, ne <span>, ať se tam dá dostat i tabulátorem. Vyřazený hráč
   ho nedostane: ve výběru hráčů k hodnocení není, tak by zkratka vedla do formuláře
   s prázdným rozbalovátkem. */
const stitekSablonyKlik = (hracId, s) => `
    <button class="znacka sab-${esc(s)} znacka-klik" data-hodnotit="${hracId}" data-sablona="${esc(s)}"
            title="${t('lide.sablona.klik.tip', t('sablona.' + s))}">${t('sablona.' + s)}</button>`;
const stitkySablonKlik = o => sablonyOsoby(o).map(s => stitekSablonyKlik(o.id, s)).join(' ');

/* Zkratky se zapojují stejně v Lidech i v Listech — obojí je tabulka, kde už
   ten štítek stejně je, takže je zbytečné psát navigaci dvakrát. */
function zapojZkratkyNaHodnoceni(kam) {
    kam.querySelectorAll('[data-hodnotit]').forEach(b => b.onclick = () => {
        stav.naHodnoceni = { id: Number(b.dataset.hodnotit), sablona: b.dataset.sablona };
        stav.zalozka = 'hodnotit';
        prekresli();
    });
}

/* ===================== záložka: Úvod =====================

   První obrazovka po přihlášení. Není to uvítací plakát: půl roku se s appkou
   nic neděje a pak přijde kolo hodnocení — a tehdy má být na jedno otevření
   vidět, kde kádr stojí a co udělat dál. Čísla se počítají z `/api/prehled`,
   tedy z týchž dat jako Listy; žádný další endpoint kvůli tomu nevznikl.     */

async function uvod(kam) {
    kam.innerHTML = `<div class="karta"><p class="popis">${t('shell.nacitam')}</p></div>`;

    let prehled;
    try {
        prehled = await api(`/api/prehled?obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`);
    } catch (e) {
        kam.innerHTML = `<div class="karta"><div class="hlaska chyba">${esc(e.message)}</div></div>`;
        return;
    }

    // Jednotka je LIST, ne hráč: kdo má tři šablony, má tři řady i tři papíry.
    const hraci = prehled.hraci.filter(h => h.aktivni);
    const listy = hraci.flatMap(h => (h.stavSablon ?? []).map(s => ({ hrac: h, ...s })));
    const sTrenerem = listy.filter(l => l.maTrener);
    const seSebe = listy.filter(l => l.maHrac);
    const bezOdkazu = listy.filter(l => !l.maHrac && !l.maOdkaz);

    const dlazdice = [
        { cislo: hraci.length, stitek: t('uvod.hracu') },
        { cislo: `${sTrenerem.length}/${listy.length}`, stitek: t('uvod.ohodnoceno') },
        { cislo: `${seSebe.length}/${listy.length}`, stitek: t('uvod.sebehodnoceni') },
        { cislo: listy.length - sTrenerem.length, stitek: t('uvod.zbyva') }
    ];

    /* Co dělat dál. Kroky se ukazují jen tehdy, když opravdu něco zbývá —
       seznam samých odškrtnutých úkolů nikdo nečte. */
    const kroky = [];
    if (!hraci.length) {
        kroky.push({ text: t('uvod.krok.kadr'), kam: 'lide', tlacitko: t('nav.lide') });
    } else {
        if (listy.length - sTrenerem.length > 0) {
            kroky.push({ text: t('uvod.krok.hodnotit', listy.length - sTrenerem.length), kam: 'hodnotit', tlacitko: t('nav.hodnotit') });
        }
        if (bezOdkazu.length) {
            kroky.push({ text: t('uvod.krok.odkazy', bezOdkazu.length), kam: 'odkazy', tlacitko: t('nav.odkazy') });
        }
        if (sTrenerem.length && seSebe.length) {
            kroky.push({ text: t('uvod.krok.porovnat'), kam: 'porovnani', tlacitko: t('nav.porovnani') });
        }
        if (sTrenerem.length) {
            kroky.push({ text: t('uvod.krok.listy'), kam: 'listy', tlacitko: t('nav.listy') });
        }
    }

    const ai = stav.konektivita?.ai;

    kam.innerHTML = `
        <div class="karta">
            <div class="uvod-hlavicka">
                <img id="uvod-znak" src="/logo.png" alt="">
                <div>
                    <div class="nazev">${esc(stav.nastaveni.klub || t('shell.app'))}</div>
                    <div class="popis" style="margin:2px 0 0">${t('uvod.podtitulek')}</div>
                    <div class="popis" style="margin:6px 0 0">${t('shell.obdobi')}: <b>${esc(stav.nastaveni.obdobi || '—')}</b>
                        · ${t('shell.prihlasen', esc(stav.kdo || t('shell.spolecne')))}</div>
                </div>
            </div>
        </div>

        <div class="karta">
            <h2>${t('uvod.stav')}</h2>
            <p class="popis">${t('uvod.stav.popis')}</p>
            <div class="dlazdice">
                ${dlazdice.map(d => `
                    <div><div class="cislo">${esc(String(d.cislo))}</div>
                         <div class="stitek">${d.stitek}</div></div>`).join('')}
            </div>
        </div>

        <div class="karta">
            <h2>${t('uvod.dal')}</h2>
            ${kroky.length ? `<ul class="kroky">${kroky.map(k => `
                <li><span class="text">${k.text}</span>
                    <button class="vedlejsi" data-kam="${k.kam}">${k.tlacitko} →</button></li>`).join('')}</ul>`
                : `<div class="hlaska ok">${t('uvod.hotovo')}</div>`}
        </div>

        <div class="karta">
            <h2>${t('uvod.model')}</h2>
            <p class="popis">${t('uvod.model.popis')}</p>
            <p>${ai
                ? `<b class="st-${esc(ai.stav)}">${ZNACKY_STAVU[ai.stav] ?? '○'} ${esc(t('konektivita.ai'))}</b> — ${esc(ai.popis)}`
                : `<span class="popis">${t('uvod.model.neznamy')}</span>`}</p>
            <button class="vedlejsi" data-kam="nastaveni">${t('nav.nastaveni')} →</button>
        </div>`;

    kam.querySelectorAll('[data-kam]').forEach(b => b.onclick = () => {
        stav.zalozka = b.dataset.kam;
        prekresli();
    });
    schovejChybejiciZnak(kam.querySelector('#uvod-znak'));
}

/* Logo je soubor, který si klub nahraje sám (`web/logo.png`). Když tam není,
   obrázek se schová — rozbitá ikona vedle názvu vypadá jako chyba aplikace,
   a přitom je to jen nenahraný soubor. */
function schovejChybejiciZnak(prvek) {
    if (!prvek) return;
    prvek.onerror = () => { prvek.hidden = true; };
    if (prvek.complete && !prvek.naturalWidth) prvek.hidden = true;
}

/* ===================== čtení nahraného souboru =====================

   Sešit .xlsx se rozbalí a převede na CSV už tady v prohlížeči: má
   DecompressionStream i DOMParser, takže server zůstává jednoduchý
   a umí pořád jen jeden formát.

   Modulová úroveň je tu schválně: soubor nahrávají DVĚ záložky — Lidé
   (kádr) a Listy (hodnocení). Dokud tyhle funkce bydlely uvnitř funkce
   záložky Lidé, spadl import hodnocení hned po kliknutí na chybu
   "textSouboru is not defined". Kontrola syntaxe to nechytí: volání
   nedefinované funkce je syntakticky v pořádku a projeví se až za běhu.
   Pomocník potřebný ve dvou záložkách nepatří do útrob jedné z nich.
   ===================================================================== */

/** Vyzobne ze ZIPu jmenovaný soubor. XLSX je ZIP, položky bývají deflate. */
const zeZipu = async (bajty, jmenoSouboru) => {
    const dv = new DataView(bajty.buffer, bajty.byteOffset, bajty.byteLength);
    // Konec centrálního adresáře se hledá od konce — může za ním být komentář.
    let konec = -1;
    for (let i = bajty.length - 22; i >= 0 && i > bajty.length - 65558; i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { konec = i; break; }
    }
    if (konec < 0) throw new Error(t('lide.import.nenizip'));

    const pocet = dv.getUint16(konec + 10, true);
    let pos = dv.getUint32(konec + 16, true);
    const dekoder = new TextDecoder('utf-8');

    for (let i = 0; i < pocet; i++) {
        const delkaJmena = dv.getUint16(pos + 28, true);
        const delkaExtra = dv.getUint16(pos + 30, true);
        const delkaKomentare = dv.getUint16(pos + 32, true);
        const metoda = dv.getUint16(pos + 10, true);
        const velikost = dv.getUint32(pos + 20, true);
        const posunHlavicky = dv.getUint32(pos + 42, true);
        const jmeno = dekoder.decode(bajty.subarray(pos + 46, pos + 46 + delkaJmena));

        if (jmeno === jmenoSouboru) {
            // Lokální hlavička má vlastní délky jména a extra pole.
            const lokJmeno = dv.getUint16(posunHlavicky + 26, true);
            const lokExtra = dv.getUint16(posunHlavicky + 28, true);
            const zacatek = posunHlavicky + 30 + lokJmeno + lokExtra;
            const data = bajty.subarray(zacatek, zacatek + velikost);
            if (metoda === 0) return dekoder.decode(data);
            const proud = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            return dekoder.decode(new Uint8Array(await new Response(proud).arrayBuffer()));
        }
        pos += 46 + delkaJmena + delkaExtra + delkaKomentare;
    }
    return null;
};

/** Sešit → řádky textů. Bere sdílené i vložené řetězce, díry doplní prázdnem. */
const xlsxNaRadky = async (soubor) => {
    const bajty = new Uint8Array(await soubor.arrayBuffer());
    const listXml = await zeZipu(bajty, 'xl/worksheets/sheet1.xml');
    if (!listXml) throw new Error(t('lide.import.nenilist'));
    const sdileneXml = await zeZipu(bajty, 'xl/sharedStrings.xml');

    const parser = new DOMParser();
    const sdilene = sdileneXml
        ? [...parser.parseFromString(sdileneXml, 'application/xml').getElementsByTagName('si')]
            .map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join(''))
        : [];

    const cisloSloupce = (adresa) => {
        const pismena = (adresa.match(/^[A-Z]+/) ?? [''])[0];
        let n = 0;
        for (const z of pismena) n = n * 26 + (z.charCodeAt(0) - 64);
        return n - 1;
    };

    const list = parser.parseFromString(listXml, 'application/xml');
    return [...list.getElementsByTagName('row')].map(radek => {
        const bunky = [];
        for (const c of radek.getElementsByTagName('c')) {
            const i = cisloSloupce(c.getAttribute('r') ?? '');
            const typ = c.getAttribute('t');
            let hodnota = '';
            if (typ === 's') {
                hodnota = sdilene[Number(c.getElementsByTagName('v')[0]?.textContent ?? -1)] ?? '';
            } else if (typ === 'inlineStr') {
                hodnota = [...c.getElementsByTagName('t')].map(t => t.textContent).join('');
            } else {
                hodnota = c.getElementsByTagName('v')[0]?.textContent ?? '';
            }
            while (bunky.length < i) bunky.push('');
            bunky[i] = hodnota ?? '';
        }
        return bunky;
    });
};

/** Řádky → CSV, protože import na serveru čte jediný formát. */
const radkyNaCsv = (radky) => radky
    .map(r => r.map(b => /[";\r\n]/.test(b) ? `"${b.replace(/"/g, '""')}"` : b).join(';'))
    .join('\r\n');

/* Excel ukládá CSV buď v UTF-8 (s BOM), nebo ve své staré kódové stránce.
   Kdybychom četli vždycky jako UTF-8, z háčků by po importu byly patvary.
   Rozhodne se to tady v prohlížeči — Worker umí dekódovat jen UTF-8.       */
const textSouboru = async (soubor) => {
    const bajty = new Uint8Array(await soubor.arrayBuffer());
    if (bajty[0] === 0xEF && bajty[1] === 0xBB && bajty[2] === 0xBF) {
        return new TextDecoder('utf-8').decode(bajty.subarray(3));
    }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bajty); }
    catch { return new TextDecoder('windows-1250').decode(bajty); }
};

/* ===================== záložka: Lidé ===================== */

async function lide(kam) {
    const nazvyPozic = o => (o.pozice ?? []).map(p => t('pozice.' + p)).join(' · ');

    const radek = o => `
        <tr>
            <td class="klik-jmeno" data-upravit="${o.id}" title="${t('lide.upravit.tip')}">${jmenoHtml(o)}</td>
            <td>${esc(nazvyPozic(o) || t('lide.bezPozic'))}${o.post ? ` <span class="popis">${esc(o.post)}</span>` : ''}</td>
            <td><span class="znacka ${o.role}">${o.role === 'trener' ? t('lide.trener') : t('lide.hrac')}</span></td>
            <td>${o.role !== 'hrac' ? '—'
                    : o.aktivni ? stitkySablonKlik(o) : stitkySablon(o)}</td>
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
            <p>
                <button class="hl" id="pridat-osobu" title="${t('lide.pridat.tip')}">${t('lide.pridat')}</button>
                <button class="vedlejsi" id="export-lide" title="${t('lide.export.tip')}">${t('lide.export')}</button>
                <button class="vedlejsi" id="export-lide-csv" title="${t('lide.exportCsv.tip')}">${t('lide.exportCsv')}</button>
                <button class="vedlejsi" id="import-lide" title="${t('lide.import.tip')}">${t('lide.import')}</button>
                <input type="file" id="import-soubor" accept=".xlsx,.csv,text/csv" hidden>
            </p>
            <div id="import-vysledek"></div>
        </div>

        <div class="karta" id="formular-osoby" hidden>
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
            </div>
            <div class="pole">
                <label>${t('lide.sablona.label')}</label>
                <div class="pozice-vyber">${Object.keys(SABLONY).map(s => `
                    <label class="volba"><input type="checkbox" class="o-sablona" value="${s}"> ${stitekSablony(s)}</label>
                `).join('')}</div>
                <div class="popis">${t('lide.sablona.napoveda')}</div>
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
            <button class="vedlejsi" id="zavrit-osobu" title="${t('lide.zavrit.tip')}">${t('lide.zavrit')}</button>
            <button class="vedlejsi zrusit" id="smazat-osobu" title="${t('lide.smazat.tip')}" hidden>${t('lide.smazat')}</button>
        </div>`;

    // Stažení přes odkaz, ne fetch — session cookie se pošle sama a soubor
    // skončí rovnou ve Staženém, bez blobů v paměti.
    // Jazyk se posílá s sebou: v souboru jsou popisky pro člověka, ne klíče.
    $('#export-lide').onclick = () => { location.href = `/api/players/export.xlsx?lang=${jazyk()}`; };
    $('#export-lide-csv').onclick = () => { location.href = `/api/players/export.csv?lang=${jazyk()}`; };

    $('#import-lide').onclick = () => $('#import-soubor').click();

    $('#import-soubor').onchange = async (e) => {
        const soubor = e.target.files?.[0];
        if (!soubor) return;
        const cil = $('#import-vysledek');
        cil.innerHTML = `<div class="hlaska info">${t('shell.nacitam')}</div>`;
        try {
            const jeXlsx = /\.xlsx$/i.test(soubor.name);
            const csv = jeXlsx ? radkyNaCsv(await xlsxNaRadky(soubor)) : await textSouboru(soubor);
            // Nejdřív nanečisto: řekne, co by se stalo, a teprve po potvrzení se zapisuje.
            const zkouska = await api('/api/players/import', { telo: { csv, nanecisto: true } });
            const shrnuti = t('lide.import.shrnuti', zkouska.radku, zkouska.pridano, zkouska.upraveno);
            const vypisChyb = zkouska.chyby.length
                ? `<br>${t('lide.import.chyby')}:<br>` + zkouska.chyby
                    .map(ch => `${t('lide.import.radek', ch.radek)} ${esc(ch.jmeno || '—')}: ${esc(ch.duvod)}`).join('<br>')
                : '';

            if (!confirm(`${shrnuti}\n\n${zkouska.chyby.length ? t('lide.import.chybyStrucne', zkouska.chyby.length) + '\n\n' : ''}${t('lide.import.potvrdit')}`)) {
                cil.innerHTML = `<div class="hlaska pozor">${t('lide.import.zruseno')}${vypisChyb}</div>`;
                e.target.value = '';
                return;
            }

            const r = await api('/api/players/import', { telo: { csv } });
            stav.lide = await api('/api/players');
            const zprava = `<div class="hlaska ${r.chyby.length ? 'pozor' : 'ok'}">`
                + t('lide.import.hotovo', r.pridano, r.upraveno)
                + (r.chyby.length
                    ? `<br>${t('lide.import.chyby')}:<br>` + r.chyby
                        .map(ch => `${t('lide.import.radek', ch.radek)} ${esc(ch.jmeno || '—')}: ${esc(ch.duvod)}`).join('<br>')
                    : '')
                + '</div>';
            await prekresli();                          // tabulka musí ukázat nový stav
            $('#import-vysledek').innerHTML = zprava;   // až po překreslení, jinak zmizí
        } catch (chyba) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(chyba.message)}</div>`;
        }
        e.target.value = '';   // ať jde nahrát tentýž soubor znovu
    };

    /* Formulář osoby je zavřený, dokud si ho někdo nevyžádá. Otevřený pod
       tabulkou vypadal jako rozepsaný záznam a nebylo poznat, jestli se něco
       zakládá, nebo upravuje. Otevře ho „Přidat osobu" a klik na jméno. */
    const ukazFormular = () => {
        const f = $('#formular-osoby');
        f.hidden = false;
        f.scrollIntoView({ behavior: 'smooth' });
    };
    const zavriFormular = () => { $('#formular-osoby').hidden = true; };

    const vyprazdni = () => {
        $('#osoba-id').value = '';
        $('#nadpis-osoby').textContent = t('lide.nova');
        ['o-jmeno', 'o-prezdivka', 'o-post'].forEach(id => { $('#' + id).value = ''; });
        $('#o-role').value = 'hrac';
        kam.querySelectorAll('.o-sablona').forEach(c => { c.checked = c.value === 'pole'; });
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
        // U nové osoby není co mazat — tlačítko se ukáže až u existující.
        $('#smazat-osobu').hidden = true;
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
        kam.querySelectorAll('.o-sablona').forEach(c => { c.checked = sablonyOsoby(o).includes(c.value); });
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
        $('#smazat-osobu').hidden = false;
        ukazFormular();
    });

    // Štítek šablony = zkratka na hodnocení právě touhle šesticí os. Formulář
    // se otevře na Hodnotit s vybraným hráčem i šablonou, takže odpadá klikání
    // dvěma rozbalovátky nad tím, co už je vidět v tabulce.
    zapojZkratkyNaHodnoceni(kam);

    $('#pridat-osobu').onclick = () => { vyprazdni(); ukazFormular(); };
    $('#nova-osoba').onclick = vyprazdni;          // v otevřeném formuláři = „a teď dalšího"
    $('#zavrit-osobu').onclick = () => { vyprazdni(); zavriFormular(); };

    /* Smazat jde jen ten, po kom nic nezůstalo — překlep v kádru, dvojitý import.
       Kdo má hodnocení nebo odkaz, se vyřazuje odškrtnutím „aktivní": jeho čísla
       jsou historie a ta se nemaže. Server to hlídá taky a řekne důvod. */
    $('#smazat-osobu').onclick = async () => {
        const id = $('#osoba-id').value;
        if (!id) return;
        const o = stav.lide.find(x => x.id === Number(id));
        if (!confirm(t('lide.smazat.potvrdit', o?.jmeno ?? ''))) return;
        try {
            await api(`/api/players/${id}`, { method: 'DELETE' });
            stav.lide = await api('/api/players');
            await prekresli();
            hlaska($('#obsah'), 'ok', t('lide.smazano', o?.jmeno ?? ''));
        } catch (e) {
            hlaska($('#formular-osoby'), 'chyba', e.message);
        }
    };

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
            sablony: [...kam.querySelectorAll('.o-sablona:checked')].map(c => c.value),
            aktivni: $('#o-aktivni').checked
        };
        if (telo.role === 'hrac' && !telo.sablony.length) {
            hlaska($('#formular-osoby'), 'chyba', t('lide.sablona.chybi'));
            return;
        }
        // Trenér se neznámkuje, ale sloupec musí něco mít — ať to není nic navíc k vyplňování.
        if (!telo.sablony.length) telo.sablony = ['pole'];
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

/* ===================== příkazový řádek =====================

   Napíšeš „Robin" a aplikace nabídne, co s ním. Rozřazení dělá tenhle kód,
   ne jazykový model: kádr je v prohlížeči, hledání jména je okamžité a
   nestojí ani token. Model se volá teprve tehdy, když si tohle neporadí —
   a jen když je v Nastavení zapnutý.                                        */

const holyText = s => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const AKCE_SLOVA = {
    hodnotit: ['hodnotit', 'hodnoceni', 'znamkovat', 'oznamkovat', 'znamky'],
    porovnat: ['porovnat', 'porovnej', 'porovnani', 'srovnat', 'srovnej', 'srovnani', 'vs', 'proti'],
    listy: ['list', 'listy', 'tisk', 'tisknout', 'vytisknout', 'papir'],
    odkaz: ['odkaz', 'odkazy', 'sebehodnoceni', 'token', 'poslat odkaz']
};

/** Najde v povelu hráče a zamýšlenou akci. Nic neodesílá. */
function rozeberPovel(text) {
    const slova = holyText(text).split(/[\s,;]+/).filter(Boolean);
    const kadr = stav.lide.filter(o => o.role === 'hrac' && o.aktivni);

    let akce = null;
    const zbytek = [];
    for (const slovo of slova) {
        const nalezena = Object.keys(AKCE_SLOVA).find(a => AKCE_SLOVA[a].includes(slovo));
        if (nalezena && !akce) akce = nalezena;
        else if (!nalezena) zbytek.push(slovo);
    }

    // Hráč se hledá podle příjmení, jména i přezdívky — trenér píše, jak mluví.
    const hraci = [];
    for (const slovo of zbytek) {
        if (slovo.length < 2) continue;
        const nalezeni = kadr.filter(h => {
            const casti = [...holyText(h.jmeno).split(/\s+/), holyText(h.prezdivka ?? '')].filter(Boolean);
            return casti.some(c => c.startsWith(slovo));
        });
        if (nalezeni.length === 1 && !hraci.some(h => h.id === nalezeni[0].id)) hraci.push(nalezeni[0]);
    }

    return { akce, hraci, nerozpoznano: zbytek.length && !hraci.length };
}

/** Provede akci: přepne záložku a předvybere, co má. */
async function provedPovel(akce, hraci) {
    const cil = $('#prikaz-vysledek');
    cil.innerHTML = '';

    if (akce === 'listy') {
        const ids = hraci.map(h => h.id).join(',');
        location.href = `/listy.html?obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`
            + `&porovnani=hrac&ids=${ids || 'vse'}`;
        return;
    }

    if (akce === 'hodnotit') {
        stav.zalozka = 'hodnotit';
        await prekresli();
        if (hraci[0]) {
            $('#h-hrac').value = String(hraci[0].id);
            $('#h-hrac').dispatchEvent(new Event('change'));
        }
        return;
    }

    if (akce === 'odkaz') {
        stav.zalozka = 'odkazy';
        await prekresli();
        return;
    }

    if (akce === 'porovnat') {
        stav.zalozka = 'porovnani';
        await prekresli();
        if (hraci.length >= 2) {
            // Dva a víc hráčů = srovnání mezi sebou, ne trenér vs. hráč.
            for (const h of hraci) {
                const volba = document.querySelector(`.s-hrac[value="${h.id}"]`);
                if (volba) volba.checked = true;
            }
            $('#s-porovnat')?.click();
        } else if (hraci[0]) {
            $('#p-hrac').value = String(hraci[0].id);
            $('#p-hrac').dispatchEvent(new Event('change'));
        }
    }
}

/** Nabídka, co s nalezenými hráči — když povel akci neurčil. */
function nabidkaPovelu(hraci, zdroj) {
    const jmena = hraci.map(h => esc(jmenoText(h))).join(', ');
    const akce = hraci.length >= 2
        ? ['porovnat', 'listy']
        : ['hodnotit', 'porovnat', 'listy'];

    return `<div class="hlaska info">
        ${t('prikaz.nasel', jmena)}
        <div style="margin-top:6px">
            ${akce.map(a => `<button class="vedlejsi" data-akce="${a}">${t('prikaz.akce.' + a)}</button>`).join(' ')}
        </div>
        <div class="popis" style="margin-top:4px">${t(zdroj === 'model' ? 'prikaz.zdroj.model' : 'prikaz.zdroj.lokalne')}</div>
    </div>`;
}

/** Jsou otázky na kádr zapnuté? Model musí být zapnutý a analýzy povolené zvlášť. */
const otazkyZapnute = () =>
    stav.nastaveni.aiAnalyzy === 'ano' && stav.nastaveni.aiPoskytovatel !== 'vypnuto';

/* Tázací slova bez diakritiky — `holyText` ji stejně shodí. */
const TAZACI_SLOVA = [
    'kdo', 'koho', 'komu', 'kym', 'kom',
    'co', 'ceho', 'cemu', 'cim', 'cem',
    'kolik', 'jak', 'jaky', 'jaka', 'jake', 'jakych', 'jakym',
    'proc', 'kde', 'kam', 'kdy', 'ktery', 'ktera', 'ktere', 'kterych', 'kterem'
];

/**
 * Vypadá to na otázku, ne na povel?
 *
 * Musí se to poznat DŘÍV, než parser povelů začne hledat jména. Ten totiž
 * páruje slova podle začátku, takže krátké slovo v otázce trefí hráče —
 * „u koho **je** největší rozpor" otevřelo kartu hráče „**Je**dna" místo
 * odpovědi. Tázací slovo nebo otazník je spolehlivější znamení než délka slova.
 */
function vypadaJakoOtazka(text) {
    if (text.trim().endsWith('?')) return true;
    return holyText(text).split(/[\s,;]+/).some(s => TAZACI_SLOVA.includes(s));
}

/**
 * Povel to nebyl — je to otázka na kádr. Odpoví se rovnou v příkazovém řádku.
 *
 * **Jedno pole na dotazy, dostupné odkudkoli.** Dřív byla pole dvě: nápadnější
 * lišta, která otázce nerozumí, a pole v Analýzách o kus níž. Kdo napsal
 * „kolik máme hráčů", dostal „tomuhle nerozumím" a nikam ho to neposlalo.
 * Lišta je nad každou záložkou, takže se ptát jde odkudkoli a nemusí se
 * nikam přepínat.
 *
 * Čísla, ze kterých odpověď vznikla, jsou v Analýzách — tlačítko pod odpovědí
 * tam vede. Věta bez čísel pod sebou je dojem, ne analýza.
 *
 * @returns {Promise<boolean>} false, když jsou otázky vypnuté (pak platí „nerozumím")
 */
async function odpovezNaOtazku(otazka, cil) {
    if (!otazkyZapnute()) return false;

    cil.innerHTML = `<div class="hlaska info">${t('analyzy.pocitam')}</div>`;
    try {
        const r = await api('/api/ai/analyza', {
            telo: { otazka, obdobi: stav.nastaveni.obdobi, popisky: popiskyProModel() }
        });
        nactiKonektivitu();   // výsledek volání je zároveň stav modelu pro lištu
        if (!r.ok) {
            cil.innerHTML = `<div class="hlaska pozor">${esc(r.popis || t('analyzy.nepovedlo'))}</div>`;
            return true;
        }
        /* Odstavce zachovat, ale nic z modelu nevykreslovat jako HTML — escapuje
           se jako první. Až na escapovaný text se pustí jediné povolené zdobení:
           `**tučně**`. Modely ho píšou i po zákazu v pokynu a holé hvězdičky
           v odpovědi vypadají jako chyba. Nic jiného se z markdownu nepřekládá. */
        const text = esc(r.odpoved)
            .replace(/\*\*([^*\n]{1,120})\*\*/g, '<strong>$1</strong>')
            .replace(/\n{2,}/g, '</p><p>')
            .replace(/\n/g, '<br>');
        cil.innerHTML = `<div class="hlaska info">
            <p>${text}</p>
            <p class="popis">
                ${t('analyzy.zdroj', esc(r.model), Math.round(r.trvaloMs / 100) / 10)}
                ${r.zaloha ? `<br>⚠️ ${esc(r.zaloha)} ${t('analyzy.zaloha')}` : ''}
                <br>${t('analyzy.overSi')}
            </p>
            <button class="vedlejsi" id="prikaz-cisla" title="${t('prikaz.ukazCisla.tip')}">${t('prikaz.ukazCisla')}</button>
        </div>`;
        $('#prikaz-cisla').onclick = async () => { stav.zalozka = 'analyzy'; await prekresli(); };
        return true;
    } catch (e) {
        cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        return true;
    }
}

async function spustPovel() {
    const vstup = $('#prikaz-vstup');
    const cil = $('#prikaz-vysledek');
    const text = vstup.value.trim();
    if (!text) { cil.innerHTML = ''; return; }

    // Otázka má přednost před hledáním jmen — viz `vypadaJakoOtazka`.
    if (vypadaJakoOtazka(text) && await odpovezNaOtazku(text, cil)) return;

    const { akce, hraci } = rozeberPovel(text);

    // Rozumíme-li povelu sami, model se nevolá vůbec.
    if (hraci.length && akce) { await provedPovel(akce, hraci); vstup.value = ''; return; }
    if (hraci.length) {
        cil.innerHTML = nabidkaPovelu(hraci, 'lokalne');
        cil.querySelectorAll('[data-akce]').forEach(b => b.onclick = async () => {
            vstup.value = '';
            await provedPovel(b.dataset.akce, hraci);
        });
        return;
    }

    // Až teď má smysl ptát se modelu — a jen když je zapnutý.
    cil.innerHTML = `<div class="hlaska info">${t('prikaz.ptamSe')}</div>`;
    try {
        const r = await api('/api/ai/prikaz', { telo: { text } });
        nactiKonektivitu();   // výsledek volání je zároveň stav modelu pro lištu
        if (!r.ok) {
            // `nevim` od rozřazovače neznamená konec — nejspíš to není povel,
            // ale otázka. Ostatní důvody (vypnutý model, chybějící binding)
            // se ukážou rovnou; ty otázka nespraví.
            if (r.akce === 'nevim' && await odpovezNaOtazku(text, cil)) return;
            cil.innerHTML = `<div class="hlaska pozor">${esc(r.popis || t('prikaz.nerozumim'))}</div>`;
            return;
        }
        if (r.akce && r.hraci.length) { await provedPovel(r.akce, r.hraci); vstup.value = ''; return; }
        if (r.hraci.length) {
            cil.innerHTML = nabidkaPovelu(r.hraci, 'model');
            cil.querySelectorAll('[data-akce]').forEach(b => b.onclick = async () => {
                vstup.value = '';
                await provedPovel(b.dataset.akce, r.hraci);
            });
            return;
        }
        // Není to povel → ber to jako otázku na kádr.
        if (await odpovezNaOtazku(text, cil)) return;
        cil.innerHTML = `<div class="hlaska pozor">${t('prikaz.nerozumim')}</div>`;
    } catch (e) {
        cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
    }
}

/* ===================== záložka: Dokumentace ===================== */

/* Text žije v src/dokumentace.js. Čísla o stavu projektu se do textu psát
   nesmějí — jednou opsaná zestárnou a začnou lhát (stálo tu „ani jeden odkaz,
   žádné sebehodnocení" ve chvíli, kdy hráči odkazy měli a jeden vyplnil).
   Text drží význam, čísla dotáhne `/api/stav-dat` z databáze. */
function dokumentace(kam) {
    kam.innerHTML = `
        <div class="karta dokumentace">
            <h2>${t('dokumentace.nadpis')}</h2>
            <p class="popis">${t('dokumentace.popis')}</p>
            ${dokumentaceHtml(jazyk())}
        </div>`;

    api('/api/stav-dat').then(c => {
        const cil = $('#dok-cisla');
        if (!cil) return;
        const radek = (klic, hodnota, zvyraznit = false) =>
            `<tr${zvyraznit ? ' class="resit"' : ''}><td>${t('dokCisla.' + klic)}</td>`
            + `<td class="cislo">${esc(hodnota)}</td></tr>`;

        cil.innerHTML = `<table>
            ${radek('osob', `${c.osob} (${c.hracu} ${t('dokCisla.aktivnichHracu')})`)}
            ${radek('trenerskych', `${c.trenerskych} — ${t('dokCisla.uHracu', c.hodnocenych, c.hracu)}`,
                c.hodnocenych < c.hracu)}
            ${radek('odkazu', `${c.odkazu} — ${t('dokCisla.zToho', c.odkazuPouzitych)}`)}
            ${radek('sebehodnoceni', `${c.sebehodnoceni} — ${t('dokCisla.uHracu', c.hracuVyplnilo, c.hracu)}`,
                c.hracuVyplnilo < c.hracu)}
        </table>
        <p class="popis">${c.sebehodnoceni
            ? t('dokCisla.mameRozhovor')
            : t('dokCisla.chybiRozhovor')}</p>`;
    }).catch(() => { /* informativní — bez čísel se dokumentace čte dál */ });
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
    `<div class="kotvy">${kotvy().map(k => `<span><b>${k[0]} ${k[2]}</b> – ${k[1]}</span>`).join('')}</div>`;

/* Podpis pod hodnocením. Kdo je přihlášený svým účtem, podepisuje se sám —
   server bere identitu ze session, takže nabídka jiného trenéra by lhala
   a zamkne se. U společného hesla aplikace nepozná, kdo sedí u klávesnice,
   a výběr zůstane na trenérovi; prázdný ale zůstat nesmí. */
function podepisSe(vyber) {
    const s = $(vyber);
    if (!s) return;
    if (!stav.kdoId || !stav.lide.some(o => o.id === stav.kdoId && o.role === 'trener')) return;
    s.value = String(stav.kdoId);
    s.disabled = true;
    s.title = t('hodnotit.hodnoti.prihlasen');
}

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
                        <option value="">${t('hodnotit.vyberAutora')}</option>
                        ${treneri.map(x => `<option value="${x.id}">${esc(x.jmeno)}</option>`).join('')}
                    </select>
                    <div class="popis">${t('hodnotit.hodnoti.napoveda')}</div></div>
            </div>
            <div id="h-predloha"></div>
        </div>
        <div id="formular"></div>

        <div class="karta">
            <h2>${t('hromadne.nadpis')}</h2>
            <p class="popis">${t('hromadne.popis')}</p>
            <button class="vedlejsi" id="hromadne-otevrit" title="${t('hromadne.otevrit.tip')}">${t('hromadne.otevrit')}</button>
            <div id="hromadne"></div>
        </div>`;

    podepisSe('#h-autor');

    $('#h-hrac').onchange = () => {
        formularHodnoceni($('#formular'), Number($('#h-hrac').value));
        nabidniUpravu();
    };
    $('#h-autor').onchange = () => nabidniUpravu();
    $('#hromadne-otevrit').onclick = () => formularHromadny($('#hromadne'));

    // Příchod z Historie tlačítkem „Upravit" — rovnou načíst tu verzi.
    const zHistorie = stav.uprava;
    stav.uprava = null;
    // Příchod z Lidí kliknutím na štítek šablony — ten hráč a právě ta šablona.
    const zLidi = stav.naHodnoceni;
    stav.naHodnoceni = null;

    if (zHistorie) {
        $('#h-hrac').value = String(zHistorie.player_id);
        upravVerzi(zHistorie);
        return;
    }
    if (zLidi) {
        $('#h-hrac').value = String(zLidi.id);
        formularHodnoceni($('#formular'), zLidi.id, zLidi.sablona);
        nabidniUpravu();
    }
}

/**
 * Nabídne úpravu hodnocení, které v tomhle období od tebe už je.
 * Ukazuje jen datum a šablonu — **žádná čísla**. Známkování naslepo tím
 * netrpí: kdo hodnotí, nabídku nepoužije; kdo opravuje překlep, nevyplňuje
 * šest známek a tři slovní bloky znovu jen kvůli jedné číslici.
 */
async function nabidniUpravu() {
    const box = $('#h-predloha');
    if (!box) return;
    box.innerHTML = '';

    const hracId = Number($('#h-hrac').value);
    if (!hracId) return;

    const autor = $('#h-autor').value;
    try {
        const { predloha } = await api(`/api/evaluations/predloha?player_id=${hracId}`
            + `&obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`
            + (autor ? `&autor_id=${autor}` : ''));
        if (!predloha) return;   // nic tu není = běžný stav, ne chyba

        box.innerHTML = `
            <div class="hlaska info" style="margin-top:10px">
                ${t('uprava.nabidka', esc(new Date(predloha.datum + 'Z').toLocaleString(locale())),
                    esc(t('sablona.' + predloha.sablona)))}
                <button class="vedlejsi" id="h-nacist" title="${t('uprava.nacist.tip')}"
                        style="margin-left:8px">${t('uprava.nacist')}</button>
            </div>`;
        $('#h-nacist').onclick = () => upravVerzi({ ...predloha, player_id: hracId });
    } catch (e) {
        // Ať je poznat rozdíl mezi „nic tu není" a „nepodařilo se to zjistit".
        box.innerHTML = `<p class="popis">${t('uprava.nabidka.chyba', esc(e.message))}</p>`;
    }
}

/** Načte konkrétní verzi hodnocení do formuláře jako úpravu. */
function upravVerzi(v) {
    const box = $('#h-predloha');
    if (box) box.innerHTML = '';
    if (v.autorId) $('#h-autor').value = String(v.autorId);

    formularHodnoceni($('#formular'), v.player_id, v.sablona, {
        fyzicky: v.fyzicky ?? '', hlavou: v.hlavou ?? '', parta: v.parta ?? '',
        cile: v.cile ?? [], hodnoty: v.hodnoty
    }, {
        id: v.id, datum: v.datum, obdobi: v.obdobi, sablona: v.sablona,
        autor: v.autorJmeno ?? stav.lide.find(o => o.id === v.autorId)?.jmeno ?? null
    });
}

/**
 * Hromadné hodnocení: jedna známka pro víc hráčů najednou.
 * Vyplní se jen osy, na kterých se kádr shoduje; zbytek zůstane, jak byl.
 */
function formularHromadny(kam) {
    if (kam.dataset.otevreno) { kam.innerHTML = ''; delete kam.dataset.otevreno; return; }
    kam.dataset.otevreno = '1';

    const vykresli = (sablona) => {
        const seznamOs = osy(sablona);
        // Nabízejí se jen hráči, kterým tahle šablona dává smysl — brankářskou
        // šestici nemá cenu nabízet celému kádru.
        const hraci = hraciAktivni().filter(h => sablonyOsoby(h).includes(sablona));

        kam.innerHTML = `
            <div class="pole" style="max-width:320px;margin-top:12px">
                <label for="hr-sablona">${t('hodnotit.sablona')}</label>
                <select id="hr-sablona">${Object.keys(SABLONY)
                    .map(s => `<option value="${s}"${s === sablona ? ' selected' : ''}>${t('sablona.' + s)}</option>`).join('')}</select>
            </div>
            <div class="pole" style="max-width:320px">
                <label for="hr-autor">${t('hodnotit.hodnoti')}</label>
                <select id="hr-autor">
                    <option value="">${t('hodnotit.vyberAutora')}</option>
                    ${stav.lide.filter(o => o.role === 'trener')
                        .map(x => `<option value="${x.id}"${x.id === stav.kdoId ? ' selected' : ''}>${esc(x.jmeno)}</option>`).join('')}
                </select>
                <div class="popis">${t('hromadne.autor.napoveda')}</div>
            </div>

            <h3 style="margin:14px 0 4px;font-size:14px">${t('hromadne.osy')}</h3>
            <p class="popis">${t('hromadne.osy.popis')}</p>
            ${seznamOs.map(o => `
                <div class="osa">
                    <div class="nazev">${esc(o.popis)}
                        <button class="vedlejsi" data-vycistit="${o.klic}" title="${t('hromadne.vycistit.tip')}"
                                style="padding:1px 7px;font-size:12px;margin-left:6px">${t('hromadne.vycistit')}</button>
                    </div>
                    ${stupnice('hr-' + o.klic)}
                </div>`).join('')}

            <h3 style="margin:16px 0 4px;font-size:14px">${t('hromadne.hraci')}</h3>
            <p class="popis">${t('hromadne.hraci.popis')}</p>
            <p>
                <button class="vedlejsi" id="hr-vse" title="${t('hromadne.vse.tip')}">${t('hromadne.vse')}</button>
                <button class="vedlejsi" id="hr-nic" title="${t('hromadne.nic.tip')}">${t('hromadne.nic')}</button>
            </p>
            <div class="pozice-vyber">
                ${hraci.map(h => `
                    <label class="volba"><input type="checkbox" class="hr-hrac" value="${h.id}"> ${esc(jmenoText(h))}</label>
                `).join('') || `<span class="popis">${t('hromadne.hraci.zadny')}</span>`}
            </div>

            <p style="margin-top:14px">
                <button class="hl" id="hr-ulozit" title="${t('hromadne.ulozit.tip')}">${t('hromadne.ulozit')}</button>
            </p>
            <div id="hr-vysledek"></div>`;

        podepisSe('#hr-autor');
        $('#hr-sablona').onchange = () => vykresli($('#hr-sablona').value);
        $('#hr-vse').onclick = () => kam.querySelectorAll('.hr-hrac').forEach(c => { c.checked = true; });
        $('#hr-nic').onclick = () => kam.querySelectorAll('.hr-hrac').forEach(c => { c.checked = false; });
        kam.querySelectorAll('[data-vycistit]').forEach(b => b.onclick = () => {
            kam.querySelectorAll(`input[name="hr-${b.dataset.vycistit}"]`).forEach(r => { r.checked = false; });
        });

        const posli = async (nanecisto) => {
            const hodnoty = {};
            for (const o of seznamOs) {
                const vybrane = kam.querySelector(`input[name="hr-${o.klic}"]:checked`);
                if (vybrane) hodnoty[o.klic] = Number(vybrane.value);
            }
            const player_ids = [...kam.querySelectorAll('.hr-hrac:checked')].map(c => Number(c.value));
            return api('/api/evaluations/hromadne', {
                telo: { sablona: $('#hr-sablona').value, obdobi: stav.nastaveni.obdobi, hodnoty, player_ids,
                        autor_id: $('#hr-autor').value || null, nanecisto }
            });
        };

        const seznam = (lidi) => lidi.map(x => esc(x.jmeno)).join(', ');

        $('#hr-ulozit').onclick = async () => {
            const cil = $('#hr-vysledek');
            if (!$('#hr-autor').value) {
                cil.innerHTML = `<div class="hlaska chyba">${t('hodnotit.autor.chybi')}</div>`;
                $('#hr-autor').focus();
                return;
            }
            cil.innerHTML = `<div class="hlaska info">${t('shell.nacitam')}</div>`;
            try {
                // Nanečisto řekne, komu to sedne a komu chybí základ — teprve pak se zapisuje.
                const zkouska = await posli(true);
                const otazka = t('hromadne.potvrdit', zkouska.ulozeno.length, zkouska.osy.length)
                    + (zkouska.ceka.length ? `\n\n${t('hromadne.ceka', zkouska.ceka.length)}` : '');
                if (!zkouska.ulozeno.length) {
                    cil.innerHTML = `<div class="hlaska pozor">${t('hromadne.nikdo')}${
                        zkouska.ceka.length ? `<br>${t('hromadne.ceka.kdo', seznam(zkouska.ceka))}` : ''}</div>`;
                    return;
                }
                if (!confirm(otazka)) {
                    cil.innerHTML = `<div class="hlaska pozor">${t('hromadne.zruseno')}</div>`;
                    return;
                }
                const r = await posli(false);
                cil.innerHTML = `<div class="hlaska ${r.ceka.length || r.chyby.length ? 'pozor' : 'ok'}">`
                    + t('hromadne.hotovo', r.ulozeno.length, seznam(r.ulozeno))
                    + (r.ceka.length ? `<br>${t('hromadne.ceka.kdo', seznam(r.ceka))}` : '')
                    + (r.chyby.length ? `<br>${r.chyby.map(ch => `${esc(ch.jmeno)}: ${esc(ch.duvod)}`).join('<br>')}` : '')
                    + '</div>';
            } catch (e) {
                cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
            }
        };
    };

    vykresli('pole');
}

/**
 * Formulář hodnocení. S `uprava` se z něj stane úprava existující verze:
 * hodnoty se předvyplní a uložení založí **další verzi** — původní řádek
 * zůstává, databáze je append-only.
 */
function formularHodnoceni(kam, hracId, sablona = null, predvyplneno = null, uprava = null) {
    if (!hracId) { kam.innerHTML = ''; return; }
    const hrac = stav.lide.find(o => o.id === hracId);
    const vybranaSablona = sablona ?? sablonyOsoby(hrac)[0];
    // Vybírat jde jen z toho, co má hráč zaškrtnuté v Lidech. Brankářská
    // šestice u hráče v poli není jen zbytečná volba — vznikla by z ní řada
    // a tiskový list, které nikdo nečeká a v Listech pak chybí u nich hodnocení.
    // Šablona načtené starší verze v nabídce zůstane i tehdy, když ji hráč
    // mezitím ztratil: opravit už pořízený záznam musí jít.
    const prirazene = sablonyOsoby(hrac);
    const nabidkaSablon = [...new Set([...prirazene, vybranaSablona])];
    const sablonaMimoNabidku = !prirazene.includes(vybranaSablona);
    const seznamOs = osy(vybranaSablona);
    const pozice = (hrac.pozice ?? []).map(p => t('pozice.' + p)).join(' · ');
    const obdobiZapisu = uprava?.obdobi || stav.nastaveni.obdobi;

    // Při úpravě se varování o známkování naslepo nehodí — čísla na obrazovce
    // jsou tvoje vlastní a jsou tam schválně. Místo něj musí být vidět, co se
    // upravuje a že se tím nic nepřepíše.
    const zahlavi = uprava
        ? `<div class="hlaska info">
                ${t('uprava.upozorneni', esc(new Date(uprava.datum + 'Z').toLocaleString(locale())),
                    esc(obdobiZapisu))}
                ${uprava.autor ? ` ${t('uprava.autor', esc(uprava.autor))}` : ''}
                <button class="vedlejsi" id="h-zrusit-upravu" title="${t('uprava.zrusit.tip')}"
                        style="margin-left:8px">${t('uprava.zrusit')}</button>
           </div>`
        : `<div class="hlaska pozor">${t('hodnotit.naslepo')}</div>`;

    kam.innerHTML = `
        <div class="karta">
            ${zahlavi}
            ${uprava && uprava.sablona !== vybranaSablona
                ? `<div class="hlaska pozor">${t('uprava.jinaSablona')}</div>` : ''}
            <h2>${jmenoHtml(hrac)}${pozice ? ` <span class="popis">— ${esc(pozice)}</span>` : ''}</h2>
            <div class="pole" style="max-width:320px">
                <label for="h-sablona">${t('hodnotit.sablona')}</label>
                <select id="h-sablona"${nabidkaSablon.length > 1 ? '' : ' disabled'}>${nabidkaSablon
                    .map(s => `<option value="${s}"${s === vybranaSablona ? ' selected' : ''}>${t('sablona.' + s)}</option>`).join('')}</select>
                <div class="popis">${t('hodnotit.sablona.prirazene', esc(nazvySablon(hrac)))}
                    ${nabidkaSablon.length > 1 ? t('hodnotit.sablona.napoveda') : t('hodnotit.sablona.jedina')}
                    ${sablonaMimoNabidku ? t('hodnotit.sablona.mimoNabidku') : ''}</div>
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
            <div class="pole"><label for="h-fyzicky">${t('blok.fyzicky')}</label><textarea id="h-fyzicky"></textarea>
                <div class="popis">${t('blok.fyzicky.napoveda')}</div></div>
            <div class="pole"><label for="h-hlavou">${t('blok.hlavou')}</label><textarea id="h-hlavou"></textarea>
                <div class="popis">${t('blok.hlavou.napoveda')}</div></div>
            <div class="pole"><label for="h-parta">${t('blok.parta')}</label><textarea id="h-parta"></textarea>
                <div class="popis">${t('blok.parta.napoveda')}</div></div>
            ${zdrojeBloku()}
        </div>

        <div class="karta">
            <h2>${esc(stav.nastaveni.cileNadpis)}</h2>
            <p class="popis">${t('hodnotit.cile.popis')}</p>
            <div class="pole"><input type="text" id="h-cil1" placeholder="${t('hodnotit.cil', 1)}"></div>
            <div class="pole"><input type="text" id="h-cil2" placeholder="${t('hodnotit.cil', 2)}"></div>
            <div class="pole"><input type="text" id="h-cil3" placeholder="${t('hodnotit.cil', 3)}"></div>
            <button class="hl" id="ulozit-hodnoceni"
                    title="${uprava ? t('uprava.ulozit.tip') : t('hodnotit.ulozit.tip')}">${
                        uprava ? t('uprava.ulozit') : t('hodnotit.ulozit')}</button>
        </div>`;

    const zadaneHodnoty = () => {
        const h = {};
        for (const o of seznamOs) {
            const vybrano = kam.querySelector(`input[name="osa-${o.klic}"]:checked`);
            if (vybrano) h[o.klic] = Number(vybrano.value);
        }
        return h;
    };

    const neprazdneTexty = () => ['h-fyzicky', 'h-hlavou', 'h-parta', 'h-cil1', 'h-cil2', 'h-cil3']
        .some(id => $('#' + id).value.trim());
    if (predvyplneno) {
        $('#h-fyzicky').value = predvyplneno.fyzicky;
        $('#h-hlavou').value = predvyplneno.hlavou;
        $('#h-parta').value = predvyplneno.parta;
        predvyplneno.cile.forEach((c, i) => { $('#h-cil' + (i + 1)).value = c; });
        for (const [klic, hodnota] of Object.entries(predvyplneno.hodnoty ?? {})) {
            const prvek = kam.querySelector(`#osa-${klic}-${hodnota}`);
            if (prvek) prvek.checked = true;
        }
    }

    // Přepnutí šablony = jiný list, jiná řada, jiný záznam. Slovní bloky a cíle
    // patří k té šabloně („výkopy od brány" na leader list nepatří), takže se
    // NEpřenášejí. Rozepsaný text by ale zmizel bez varování — na to se ptáme.
    $('#h-sablona').onchange = e => {
        if (neprazdneTexty() && !confirm(t('hodnotit.sablona.prepnout'))) {
            e.target.value = vybranaSablona;
            return;
        }
        formularHodnoceni(kam, hracId, e.target.value, null, uprava);
    };

    const zrusit = $('#h-zrusit-upravu');
    if (zrusit) zrusit.onclick = () => { formularHodnoceni(kam, hracId, vybranaSablona); nabidniUpravu(); };

    $('#ulozit-hodnoceni').onclick = async () => {
        const hodnoty = zadaneHodnoty();
        const chybi = seznamOs.filter(o => hodnoty[o.klic] === undefined).map(o => o.popis);
        if (chybi.length) { hlaska(kam, 'chyba', t('hodnotit.chybi', chybi.join(', '))); return; }
        // Hodnocení bez podpisu nemá cenu: za půl roku nikdo nedohledá, kdo ho psal,
        // a Shoda mezi trenéry by neměla co s čím porovnávat.
        if (!$('#h-autor').value) {
            hlaska(kam, 'chyba', t('hodnotit.autor.chybi'));
            $('#h-autor').focus();
            return;
        }

        const telo = {
            player_id: hracId,
            obdobi: obdobiZapisu,
            sablona: vybranaSablona,
            autor_id: $('#h-autor').value || null,
            hodnoty,
            fyzicky: $('#h-fyzicky').value,
            hlavou: $('#h-hlavou').value,
            parta: $('#h-parta').value,
            cile: [$('#h-cil1').value, $('#h-cil2').value, $('#h-cil3').value],
            uprava_id: uprava?.id ?? null
        };

        try {
            await api('/api/evaluations', { telo });
            kam.innerHTML = `
                <div class="karta">
                    <div class="hlaska ok">${uprava
                        ? t('uprava.ulozeno', esc(hrac.jmeno), esc(obdobiZapisu))
                        : t('hodnotit.ulozeno', esc(hrac.jmeno), esc(obdobiZapisu))}</div>
                    ${sablonyOsoby(hrac).filter(s => s !== vybranaSablona).map(s => `
                        <button class="vedlejsi" data-dalsi-sablona="${s}"
                                title="${t('hodnotit.dalsiSablona.tip')}">${t('hodnotit.dalsiSablona', t('sablona.' + s))}</button>`).join('')}
                    <button class="vedlejsi" id="na-list" title="${t('hodnotit.naList.tip')}">${t('hodnotit.naList')}</button>
                    <button class="vedlejsi" id="dalsi" title="${t('hodnotit.dalsi.tip')}">${t('hodnotit.dalsi')}</button>
                </div>`;
            // Hráč s víc šablonami má víc řad i víc listů — ať se na ně nezapomene.
            kam.querySelectorAll('[data-dalsi-sablona]').forEach(b => b.onclick = () =>
                formularHodnoceni(kam, hracId, b.dataset.dalsiSablona));
            // Období z uloženého záznamu, ne z Nastavení — úprava starší verze
            // se ukládá do svého období a list musí ukázat právě ji.
            $('#na-list').onclick = () => otevriListy({
                ids: String(hracId), porovnani: 'zadne', obdobi: obdobiZapisu
            });
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
            <p class="popis">${t('shoda.finalni.popis')}</p>
            <div class="pole"><label for="s-fyzicky">${t('blok.fyzicky')}</label><textarea id="s-fyzicky"></textarea>
                <div class="popis">${t('blok.fyzicky.napoveda')}</div></div>
            <div class="pole"><label for="s-hlavou">${t('blok.hlavou')}</label><textarea id="s-hlavou"></textarea>
                <div class="popis">${t('blok.hlavou.napoveda')}</div></div>
            <div class="pole"><label for="s-parta">${t('blok.parta')}</label><textarea id="s-parta"></textarea>
                <div class="popis">${t('blok.parta.napoveda')}</div></div>
            ${zdrojeBloku()}
            <div class="pole"><label for="s-cil1">${esc(stav.nastaveni.cileNadpis)}</label>
                <input type="text" id="s-cil1" placeholder="${t('hodnotit.cil', 1)}"></div>
            <div class="pole"><input type="text" id="s-cil2" placeholder="${t('hodnotit.cil', 2)}"></div>
            <div class="pole"><input type="text" id="s-cil3" placeholder="${t('hodnotit.cil', 3)}"></div>
            <div class="pole"><label for="s-poznamka">${t('shoda.poznamka')}</label>
                <textarea id="s-poznamka"></textarea>
                <div class="popis">${t('shoda.poznamka.napoveda')}</div></div>
            <div class="pole" style="max-width:320px">
                <label for="s-autor">${t('shoda.uzavira')}</label>
                <select id="s-autor">
                    <option value="">${t('hodnotit.vyberAutora')}</option>
                    ${stav.lide.filter(o => o.role === 'trener')
                        .map(x => `<option value="${x.id}"${x.id === stav.kdoId ? ' selected' : ''}>${esc(x.jmeno)}</option>`).join('')}
                </select>
                <div class="popis">${t('shoda.uzavira.napoveda')}</div></div>
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

    podepisSe('#s-autor');

    $('#s-ulozit').onclick = async () => {
        const hodnoty = {};
        const chybi = [];
        for (const o of s.osy) {
            const vybrano = kam.querySelector(`select.vysledek[data-osa="${o.klic}"]`);
            if (!vybrano?.value) chybi.push(popisky[o.klic] || o.klic);
            else hodnoty[o.klic] = Number(vybrano.value);
        }
        if (chybi.length) { hlaska($('#s-finalni'), 'chyba', t('shoda.chybiOsy') + ' ' + chybi.join(', ')); return; }
        // I uzavření shody je hodnocení — musí být podepsané, kdo ho uzavřel.
        if (!$('#s-autor').value) {
            hlaska($('#s-finalni'), 'chyba', t('hodnotit.autor.chybi'));
            $('#s-autor').focus();
            return;
        }

        try {
            await api('/api/shoda', { telo: {
                player_id: hracId, obdobi: stav.nastaveni.obdobi, sablona: s.sablona, hodnoty,
                fyzicky: $('#s-fyzicky').value, hlavou: $('#s-hlavou').value, parta: $('#s-parta').value,
                cile: [$('#s-cil1').value, $('#s-cil2').value, $('#s-cil3').value],
                poznamka_shody: $('#s-poznamka').value, autor_id: $('#s-autor').value || null
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

function otevriListy({ ids = 'vse', porovnani = 'minule', obdobi = stav.nastaveni.obdobi,
                       kumulovane = false, vysvetlivky = false } = {}) {
    const p = new URLSearchParams({ obdobi, porovnani, ids });
    if (kumulovane) p.set('kumulovane', '1');
    if (vysvetlivky) p.set('vysvetlivky', '1');
    window.open(`listy.html?${p}`, '_blank');
}

/**
 * Popisek období v nabídce. Vedle názvu je vidět, čím je v datech podložené —
 * období bez jediného listu vypadá v holém seznamu stejně jako to letošní,
 * a přitom by se z něj vytiskly samé prázdné papíry.
 */
function popisObdobi(o, aktualni) {
    const znacky = [o.obdobi === aktualni ? t('listy.obdobi.aktualni') : null,
                    o.listy ? t('listy.obdobi.pocet', o.listy) : t('listy.obdobi.prazdne')];
    return `${o.obdobi} · ${znacky.filter(Boolean).join(' · ')}`;
}

async function listy(kam) {
    kam.innerHTML = `<div class="karta"><p class="popis">${t('shell.nacitam')}</p></div>`;

    /* Období se vybírá z toho, co je v databázi. Volné pole svádělo k překlepu
       a překlep se neprojevil jako chyba: tisk prošel a vyjely prázdné listy,
       protože se hledalo období, které nikdo nikdy nezadal. */
    let seznamObdobi;
    try {
        seznamObdobi = await api('/api/obdobi');
    } catch (e) {
        kam.innerHTML = `<div class="karta"><div class="hlaska chyba">${esc(e.message)}</div></div>`;
        return;
    }
    let vybraneObdobi = stav.nastaveni.obdobi;

    kam.innerHTML = `
        <div class="karta">
            <h2>${t('listy.nadpis')}</h2>
            <p class="popis">${t('listy.popis')}</p>
            <div class="radek">
                <div class="pole"><label for="l-obdobi">${t('listy.obdobi')}</label>
                    <select id="l-obdobi" title="${t('listy.obdobi.tip')}">
                        ${seznamObdobi.obdobi.map(o => `
                            <option value="${esc(o.obdobi)}"${o.obdobi === vybraneObdobi ? ' selected' : ''}
                                >${esc(popisObdobi(o, seznamObdobi.aktualni))}</option>`).join('')}
                        <option value="vse">${t('listy.obdobi.vse')}</option>
                    </select>
                    <div class="popis">${t('listy.obdobi.napoveda')}</div></div>
                <div class="pole"><label for="l-porovnani">${t('listy.polygon')}</label>
                    <select id="l-porovnani">
                        <option value="minule">${t('listy.polygon.minule')}</option>
                        <option value="hrac">${t('listy.polygon.hrac')}</option>
                        <option value="zadne">${t('listy.polygon.zadne')}</option>
                    </select></div>
            </div>
            <p class="popis">${t('listy.dva')}</p>
            <div class="pole">
                <label><input type="checkbox" id="l-kumulovane" style="width:auto"> ${t('listy.kumulovane')}</label>
                <div class="popis">${t('listy.kumulovane.napoveda')}</div>
            </div>
            <div class="pole">
                <label><input type="checkbox" id="l-vysvetlivky" style="width:auto"> ${t('listy.vysvetlivky')}</label>
                <div class="popis">${t('listy.vysvetlivky.napoveda')}</div>
            </div>
        </div>

        <div class="karta">
            <h2>${t('listy.kdo')}</h2>
            <p class="popis">${t('listy.kdo.popis')}</p>
            <div id="l-kdo"><p class="popis">${t('shell.nacitam')}</p></div>
            <p style="margin-top:14px">
                <button class="hl" id="otevrit-listy" title="${t('listy.otevrit.tip')}">${t('listy.otevrit')}</button>
            </p>
        </div>

        <div class="karta">
            <h2>${t('davky.nadpis')}</h2>
            <p class="popis">${t('davky.popis')}</p>
            <p>
                <button class="vedlejsi" id="export-hodnoceni" title="${t('davky.export.tip')}">${t('davky.export')}</button>
                <button class="vedlejsi" id="import-hodnoceni" title="${t('davky.import.tip')}">${t('davky.import')}</button>
                <input type="file" id="import-hodnoceni-soubor" accept=".xlsx,.csv,text/csv" hidden>
            </p>
            <div id="davky-vysledek"></div>
            <p class="popis">${t('davky.pravidla')}</p>
        </div>`;

    /* Tabulka platí pro vybrané období, ne pro to z Nastavení: ✓ a pomlčka
       musí říkat stav toho, co se právě chystá na papír. Překreslí se proto
       s každou změnou nabídky — a zaškrtnutí se vrací do výchozího „všechno",
       protože jiné období může mít jiné řádky. */
    const nactiKdo = async () => {
        const cil = $('#l-kdo');
        const zaVse = vybraneObdobi === 'vse';
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        let prehled;
        try {
            prehled = await api(`/api/prehled?obdobi=${encodeURIComponent(vybraneObdobi)}`);
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
            return;
        }

        cil.innerHTML = `
            ${zaVse ? `<div class="hlaska info">${t('listy.kdo.vse')}</div>` : ''}
            <table>
                <thead><tr><th class="cisla"><input type="checkbox" id="vsichni" checked title="${t('listy.vsichni.tip')}"></th>
                    <th>${t('hodnotit.hrac')}</th><th>${t('lide.sablona')}</th>
                    <th class="cisla">${t('lide.trener')}</th><th class="cisla">${t('lide.hrac')}</th></tr></thead>
                <tbody>${prehled.hraci.filter(h => h.aktivni).map(h => {
                    // Řádek na každou přiřazenou šablonu: každá je vlastní list,
                    // takže musí být vidět, která z nich ještě chybí.
                    const stavy = h.stavSablon ?? [{ sablona: h.sablona, maTrener: h.ma_trener, maHrac: h.ma_hrac }];
                    // Fajfka není jen informace, ale i cesta k listu: co je hotové,
                    // to jde rovnou vytisknout. Pomlčka nikam nevede — není co ukázat.
                    const znacka = (ano, sablona, cim) => ano
                        ? `<button class="jakoodkaz ano" data-list="${h.id}:${esc(sablona)}" data-porovnani="${cim}"`
                          + ` title="${t('listy.otevritJeden.tip')}">✓</button>`
                        : '<span class="ne">—</span>';
                    // Zaškrtávátko je na KAŽDÉM řádku, ne na hráči: co list, to
                    // vlastní volba. Ferda má tři šablony a nemá smysl, aby se
                    // pokaždé tisklo všechno, když chce trenér jen brankářský list.
                    return stavy.map((s, i) => `
                    <tr>
                        <td class="cisla">
                            <input type="checkbox" class="vyber" value="${h.id}:${s.sablona}"
                                   title="${t('listy.vyber.tip')}" checked></td>
                        ${i === 0 ? `<td rowspan="${stavy.length}">${jmenoHtml(h)}</td>` : ''}
                        <td>${stitekSablonyKlik(h.id, s.sablona)}</td>
                        <td class="cisla">${znacka(s.maTrener, s.sablona, 'minule')}</td>
                        <td class="cisla">${znacka(s.maHrac, s.sablona, 'hrac')}</td>
                    </tr>`).join('');
                }).join('')}</tbody>
            </table>`;

        $('#vsichni').onchange = e =>
            cil.querySelectorAll('.vyber').forEach(c => { c.checked = e.target.checked; });

        // Řádek s pomlčkou u trenéra říká, který list ještě nemá hodnocení —
        // z téhle tabulky je proto nejblíž rovnou do formuláře té šablony.
        zapojZkratkyNaHodnoceni(cil);

        /* Klik na fajfku otevře ten jeden list — nejnovější hodnocení té šestice.
           Sloupec rozhoduje, co bude druhým polygonem: u hráčovy fajfky má smysl
           ukázat právě jeho sebehodnocení.

           Zapojuje se TADY, ne po `nactiKdo()`: tabulka se překresluje při každé
           změně období, takže jednorázové zapojení by po přepnutí přestalo platit. */
        cil.querySelectorAll('[data-list]').forEach(b => b.onclick = () => {
            otevriListy({
                ids: b.dataset.list,
                porovnani: b.dataset.porovnani,
                obdobi: vybraneObdobi,
                kumulovane: false   // jeden řádek = jedna šablona, není co kumulovat
            });
        });
    };

    $('#l-obdobi').onchange = () => { vybraneObdobi = $('#l-obdobi').value; nactiKdo(); };
    await nactiKdo();

    /* Export bere období z nabídky nahoře — „všechna" znamená celý archiv.
       Stažení přes odkaz, ne fetch: cookie se pošle sama a soubor skončí
       rovnou ve Staženém, bez blobů v paměti. */
    $('#export-hodnoceni').onclick = () => {
        const obdobi = vybraneObdobi && vybraneObdobi !== 'vse'
            ? `&obdobi=${encodeURIComponent(vybraneObdobi)}` : '';
        location.href = `/api/evaluations/export.csv?lang=${jazyk()}${obdobi}`;
    };

    $('#import-hodnoceni').onclick = () => $('#import-hodnoceni-soubor').click();

    $('#import-hodnoceni-soubor').onchange = async (e) => {
        const soubor = e.target.files?.[0];
        if (!soubor) return;
        const cil = $('#davky-vysledek');
        cil.innerHTML = `<div class="hlaska info">${t('shell.nacitam')}</div>`;
        try {
            const jeXlsx = /\.xlsx$/i.test(soubor.name);
            const csv = jeXlsx ? radkyNaCsv(await xlsxNaRadky(soubor)) : await textSouboru(soubor);

            // Nejdřív nanečisto — u hodnocení o to víc: zápis se nedá vzít zpět,
            // append-only znamená, že omylem nahraný řádek už v historii zůstane.
            const zkouska = await api('/api/evaluations/import', { telo: { csv, nanecisto: true } });

            /* Přeskočené řádky nejsou chyba — sebehodnocení v souboru být má,
               jen se nedá měnit. Vypisují se zvlášť, ať se v tom neztratí to,
               co se opravdu nepovedlo. */
            const seznam = (klic, polozky) => polozky.length
                ? `<br><b>${t(klic)}:</b><br>${polozky.map(esc).join('<br>')}` : '';
            const vypis = seznam('davky.chyby', zkouska.chyby) + seznam('davky.preskoceno', zkouska.preskoceno);
            const celkem = zkouska.pridano + zkouska.upraveno;

            if (!celkem) {
                const hlaska = zkouska.bezeZmeny
                    ? t('davky.bezeZmeny', zkouska.bezeZmeny)   // kolotoč export→import beze změn
                    : t('davky.nicKZapisu');
                cil.innerHTML = `<div class="hlaska ${zkouska.chyby.length ? 'pozor' : 'info'}">${hlaska}${vypis}</div>`;
                e.target.value = '';
                return;
            }
            if (!confirm(`${t('davky.potvrdit', zkouska.pridano, zkouska.upraveno)}\n\n`
                + (zkouska.bezeZmeny ? t('davky.bezeZmeny', zkouska.bezeZmeny) + '\n' : '')
                + (zkouska.chyby.length ? t('davky.chybStrucne', zkouska.chyby.length) + '\n' : '')
                + '\n' + zkouska.nahled.join('\n'))) {
                cil.innerHTML = `<div class="hlaska pozor">${t('davky.zruseno')}${vypis}</div>`;
                e.target.value = '';
                return;
            }

            const r = await api('/api/evaluations/import', { telo: { csv } });
            cil.innerHTML = `<div class="hlaska ${r.chyby.length ? 'pozor' : 'ok'}">`
                + t('davky.hotovo', r.pridano, r.upraveno)
                + seznam('davky.chyby', r.chyby) + seznam('davky.preskoceno', r.preskoceno)
                + '</div>';
            await nactiKdo();          // fajfky musí ukázat nový stav
        } catch (chyba) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(chyba.message)}</div>`;
        }
        e.target.value = '';
    };

    $('#otevrit-listy').onclick = () => {
        const ids = [...kam.querySelectorAll('.vyber:checked')].map(c => c.value);
        if (!ids.length) { hlaska(kam, 'chyba', t('listy.nikdo')); return; }
        otevriListy({
            ids: ids.join(','), porovnani: $('#l-porovnani').value,
            obdobi: $('#l-obdobi').value, kumulovane: $('#l-kumulovane').checked,
            vysvetlivky: $('#l-vysvetlivky').checked
        });
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
        <div id="vysledek"></div>

        <div class="karta">
            <h2>${t('srovnani.nadpis')}</h2>
            <p class="popis">${t('srovnani.popis')}</p>
            <div class="pole" style="max-width:320px">
                <label for="s-sablona">${t('hodnotit.sablona')}</label>
                <select id="s-sablona">${Object.keys(SABLONY)
                    .map(s => `<option value="${s}">${t('sablona.' + s)}</option>`).join('')}</select>
            </div>
            <div class="pozice-vyber" id="s-hraci">
                ${hraci.map(h => `
                    <label class="volba"><input type="checkbox" class="s-hrac" value="${h.id}"> ${esc(jmenoText(h))}</label>
                `).join('') || `<span class="popis">${t('lide.prazdno')}</span>`}
            </div>
            <p><button class="hl" id="s-porovnat" title="${t('srovnani.porovnat.tip')}">${t('srovnani.porovnat')}</button></p>
            <div id="s-vysledek"></div>
        </div>

        <div class="karta">
            <h2>${t('volne.nadpis')}</h2>
            <p class="popis">${t('volne.popis')}</p>
            <div class="pole" style="max-width:320px">
                <label for="v-sablona">${t('hodnotit.sablona')}</label>
                <select id="v-sablona">${Object.keys(SABLONY)
                    .map(s => `<option value="${s}">${t('sablona.' + s)}</option>`).join('')}</select>
                <div class="popis">${t('volne.sablona.napoveda')}</div>
            </div>
            <div id="v-nabidka"><p class="popis">${t('shell.nacitam')}</p></div>
            <p><button class="hl" id="v-porovnat" title="${t('volne.porovnat.tip')}">${t('volne.porovnat')}</button></p>
            <div id="v-vysledek"></div>
        </div>`;

    $('#s-porovnat').onclick = async () => {
        const cil = $('#s-vysledek');
        const ids = [...kam.querySelectorAll('.s-hrac:checked')].map(c => Number(c.value));
        if (ids.length < 2) {
            cil.innerHTML = `<div class="hlaska pozor">${t('srovnani.malo')}</div>`;
            return;
        }
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            const s = await api(`/api/srovnani?sablona=${$('#s-sablona').value}`
                + `&obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}&ids=${ids.join(',')}`);
            cil.innerHTML = tabulkaSrovnani(s);
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

    /* --- volné porovnání: co záznam, to sloupec --- */

    // Nabídka se plní z databáze, ne z kádru: vybírat jde jen to, co opravdu
    // existuje. Prázdné kolonky by jinak vypadaly jako chyba aplikace.
    const nactiNabidku = async () => {
        const cil = $('#v-nabidka');
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            const { zaznamy } = await api(`/api/zaznamy?sablona=${$('#v-sablona').value}`);
            if (!zaznamy.length) {
                cil.innerHTML = `<div class="hlaska pozor">${t('volne.prazdno')}</div>`;
                return;
            }
            cil.innerHTML = `<div class="pozice-vyber">${zaznamy.map(z => `
                <label class="volba"><input type="checkbox" class="v-zaznam" value="${z.id}">
                    ${esc(popisZaznamu(z))}</label>`).join('')}</div>`;
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

    $('#v-sablona').onchange = nactiNabidku;
    nactiNabidku();

    $('#v-porovnat').onclick = async () => {
        const cil = $('#v-vysledek');
        const ids = [...kam.querySelectorAll('.v-zaznam:checked')].map(c => Number(c.value));
        if (ids.length < 2) { cil.innerHTML = `<div class="hlaska pozor">${t('volne.malo')}</div>`; return; }
        if (ids.length > 8) { cil.innerHTML = `<div class="hlaska pozor">${t('volne.moc')}</div>`; return; }
        cil.innerHTML = `<p class="popis">${t('shell.nacitam')}</p>`;
        try {
            cil.innerHTML = tabulkaVolna(await api(`/api/porovnani-vice?ids=${ids.join(',')}`));
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

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

/**
 * Tabulka osa × hráč. Nejvyšší číslo v řádku je zvýrazněné, poslední sloupec
 * říká rozptyl — tam, kde je nula, se ti dva neliší a není o čem mluvit.
 */
function tabulkaSrovnani(s) {
    const maData = s.hraci.filter(h => h.hodnoty);
    if (maData.length < 2) {
        return `<div class="hlaska pozor">${t('srovnani.nikdo', esc(t('sablona.' + s.sablona)), esc(s.obdobi))}</div>`;
    }

    const chybi = s.hraci.filter(h => !h.hodnoty);
    const radek = o => `
        <tr class="${o.rozptyl >= 3 ? 'resit' : ''}">
            <td>${esc(t('osa.' + o.klic))}</td>
            ${maData.map(h => {
                const v = o.hodnoty[h.id];
                if (v === null || v === undefined) return `<td class="cisla">—</td>`;
                const nej = o.nejlepe !== null && v === o.nejlepe && o.rozptyl > 0;
                return `<td class="cisla">${nej ? `<b class="ano">${v}</b>` : v}</td>`;
            }).join('')}
            <td class="cisla">${o.rozptyl === null ? '—' : o.rozptyl}</td>
        </tr>`;

    return `
        <table>
            <thead><tr><th>${t('porovnani.osa')}</th>
                ${maData.map(h => `<th class="cisla">${esc(h.jmeno)}</th>`).join('')}
                <th class="cisla">${t('srovnani.rozptyl')}</th></tr></thead>
            <tbody>
                ${s.osy.map(radek).join('')}
                <tr><td><b>${t('srovnani.prumer')}</b></td>
                    ${maData.map(h => `<td class="cisla"><b>${h.prumer ?? '—'}</b></td>`).join('')}
                    <td class="cisla"></td></tr>
            </tbody>
        </table>
        <p class="popis">${t('srovnani.legenda')}</p>
        ${chybi.length ? `<div class="hlaska pozor">${t('srovnani.chybi', esc(chybi.map(h => h.jmeno).join(', ')))}</div>` : ''}`;
}

/* ===================== volné porovnání =====================

   Co záznam, to sloupec. Záznam = hráč × období × kdo hodnotil, takže vedle
   sebe můžou stát dvě období téhož hráče, dva hráči, trenér proti
   sebehodnocení i dva trenéři mezi sebou.

   Šablona zůstává tvrdou hranicí: brankářská a polní šestice nemají jedinou
   společnou osu, takže „Chytání 8" proti „Levá noha 3" by nebylo porovnání.  */

/** Popis záznamu do výběru i do hlavičky sloupce: kdo, kdy, od koho. */
function popisZaznamu(z) {
    const kdo = z.autor === 'hrac' ? t('historie.autor.hrac')
        : z.autor === 'shoda' ? t('historie.autor.shoda')
        : `${t('historie.autor.trener')}${z.autorJmeno ? ' ' + z.autorJmeno : ''}`;
    return `${jmenoText(z)} · ${z.obdobi} · ${kdo}`;
}

function tabulkaVolna(v) {
    const dva = v.zaznamy.length === 2;

    const radek = o => {
        // U dvou sloupců nese informaci znaménko, u tří a víc rozptyl.
        const zvyraznit = dva ? Math.abs(o.rozdil ?? 0) > Number(stav.nastaveni.tolerance) : (o.rozptyl ?? 0) >= 3;
        return `
        <tr class="${zvyraznit ? 'resit' : ''}">
            <td>${esc(t('osa.' + o.klic))}</td>
            ${v.zaznamy.map(z => {
                const h = o.hodnoty[z.id];
                if (h === null || h === undefined) return '<td class="cisla">—</td>';
                const nej = o.nejlepe !== null && h === o.nejlepe && (o.rozptyl ?? 0) > 0;
                return `<td class="cisla">${nej ? `<b class="ano">${h}</b>` : h}</td>`;
            }).join('')}
            <td class="cisla">${dva
                ? (o.rozdil === null ? '—'
                    : `<span class="${o.rozdil > 0 ? 'rozdil-plus' : o.rozdil < 0 ? 'rozdil-minus' : ''}">${o.rozdil > 0 ? '+' : ''}${o.rozdil}</span>`)
                : (o.rozptyl === null ? '—' : o.rozptyl)}</td>
        </tr>`;
    };

    return `
        <div class="scroll-x">
        <table>
            <thead><tr><th>${t('porovnani.osa')}</th>
                ${v.zaznamy.map(z => `<th class="cisla">${esc(popisZaznamu(z))}</th>`).join('')}
                <th class="cisla">${dva ? t('porovnani.rozdil') : t('srovnani.rozptyl')}</th></tr></thead>
            <tbody>
                ${v.osy.map(radek).join('')}
                <tr><td><b>${t('srovnani.prumer')}</b></td>
                    ${v.zaznamy.map(z => `<td class="cisla"><b>${z.prumer ?? '—'}</b></td>`).join('')}
                    <td class="cisla"></td></tr>
            </tbody>
        </table>
        </div>
        <p class="popis">${dva ? t('volne.legenda.dva') : t('volne.legenda.vic')}</p>`;
}

/* ===================== historie verzí ===================== */

async function pripojHistorii(kam, hracId) {
    const verze = await api(`/api/historie?player_id=${hracId}`);

    const jmenoAutora = v => v.autor === 'hrac' ? t('historie.autor.hrac')
        : v.autor === 'shoda' ? t('historie.autor.shoda')
        : `${t('historie.autor.trener')}${v.autorJmeno ? ' — ' + v.autorJmeno : ''}`;

    const cas = d => new Date(d + 'Z').toLocaleString(locale());

    // Úprava vypadá v seznamu stejně jako druhé samostatné hodnocení. Bez téhle
    // značky by nešlo poznat opravu překlepu od skutečně nového pohledu.
    const znackaUpravy = v => {
        if (!v.upravaId) return '';
        const zdroj = verze.find(x => x.id === v.upravaId);
        return `<div class="popis">${zdroj
            ? t('historie.uprava', esc(cas(zdroj.datum)))
            : t('historie.uprava.neznama')}</div>`;
    };

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
                            data-sablona="${v.sablona}" data-popis="${esc(cas(v.datum))}"></td>
                        <td>${esc(cas(v.datum))}${znackaUpravy(v)}</td>
                        <td>${esc(v.obdobi)}</td>
                        <td>${esc(jmenoAutora(v))}</td>
                        <td>${stitekSablony(v.sablona)}</td>
                        <td>${v.autor === 'trener'
                                ? `<button class="vedlejsi" data-upravit="${v.id}" title="${t('historie.upravit.tip')}">${t('historie.upravit')}</button> `
                                : ''}<button class="vedlejsi" data-tisk="${v.id}" title="${t('historie.tisk.tip')}">${t('historie.tisk')}</button></td>
                    </tr>`).join('') : `<tr><td colspan="6">${t('historie.prazdno')}</td></tr>`}</tbody>
            </table>
            ${verze.length > 1 ? `<p style="margin-top:12px">
                <button class="vedlejsi" id="porovnat-verze" title="${t('historie.porovnat.tip')}">${t('historie.porovnat')}</button>
            </p><div id="posun"></div>` : ''}
        </div>`);

    kam.querySelectorAll('[data-tisk]').forEach(b => b.onclick = () =>
        window.open(`listy.html?verze=${b.dataset.tisk}`, '_blank'));

    // Úprava se dělá tam, kde se hodnotí — formulář je jeden, jen předvyplněný.
    kam.querySelectorAll('[data-upravit]').forEach(b => b.onclick = () => {
        const v = verze.find(x => x.id === Number(b.dataset.upravit));
        if (!v) return;
        stav.uprava = { ...v, player_id: hracId };
        stav.zalozka = 'hodnotit';
        prekresli();
    });

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

    /* `rozdil === null` znamená, že známku nedal jeden z nich — typicky osa,
       která v době staršího hodnocení ještě neexistovala. Není to shoda ani
       rozpor, je to nezměřeno, a tak se to musí i napsat. */
    const radky = p.osy.map(o => `
        <tr class="${o.resit ? 'resit' : ''}">
            <td>${esc(popisky[o.klic] || o.klic)}</td>
            <td class="cisla">${o.trener ?? '—'}</td>
            <td class="cisla">${o.hrac ?? '—'}</td>
            <td class="cisla">${o.rozdil === null ? '—'
                              : o.rozdil > 0 ? `<span class="rozdil-plus">+${o.rozdil}</span>`
                              : o.rozdil < 0 ? `<span class="rozdil-minus">${o.rozdil}</span>` : '0'}</td>
            <td>${o.rozdil === null
                    ? `<span class="ne">${t('porovnani.neporovnatelne')}</span>`
                    : o.resit
                        ? (o.rozdil > 0 ? t('porovnani.slepeMisto') : t('porovnani.sebeduvera'))
                        : `<span class="ne">${t('porovnani.vToleranci')}</span>`}</td>
        </tr>`).join('');

    return `
        <div class="karta">
            <h2>${t('porovnani.rozdily', esc(p.obdobi))}
                ${p.sablona ? `<span class="popis">— ${t('porovnani.sablona', stitekSablony(p.sablona))}</span>` : ''}</h2>
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

/* ===================== záložka: Analýzy =====================

   Dvě vrstvy nad sebou a v tomhle pořadí:

   1. Spočítané podklady — průměry os za kádr, osy nad tolerancí, kdo chybí.
      Jsou přesné, zadarmo, okamžité a nic neopustí Worker. Ukazují se vždycky.
   2. Otázka jazykovému modelu. Model dostane TATÁŽ spočítaná čísla a jeho
      prací je formulace, ne výpočet. Vypnuto, dokud se to v Nastavení vědomě
      nezapne — posílá ven známky a posudky konkrétních nezletilých.

   Odpověď modelu se proto zobrazuje NAD podklady, ne místo nich: trenér si má
   každé tvrzení ověřit proti číslům. Věta bez čísel pod sebou je jen dojem.   */

/* Popisky os a šablon do dotazu pro model. Worker texty nedrží — vrací klíče
   a překládá se až tady, takže mu je musí poslat prohlížeč. */
function popiskyProModel() {
    const osy = {};
    for (const s of Object.keys(SABLONY)) for (const k of SABLONY[s]) osy[k] = t('osa.' + k);
    const sablony = Object.fromEntries(Object.keys(SABLONY).map(s => [s, t('sablona.' + s)]));
    return { osy, sablony };
}

function tabulkaPodkladu(p) {
    const osaText = k => t('osa.' + k);

    const slabiny = p.osyKadru.map(s => `
        <h3 style="margin:14px 0 4px;font-size:14px">${stitekSablony(s.sablona)}</h3>
        <table>
            <thead><tr><th>${t('analyzy.osa')}</th><th class="cisla">${t('analyzy.prumer')}</th>
                <th class="cisla">${t('analyzy.zPoctu')}</th></tr></thead>
            <tbody>${s.osy.map((o, i) => `
                <tr${i < 2 ? ' class="resit"' : ''}>
                    <td>${esc(osaText(o.klic))}</td>
                    <td class="cisla">${o.prumer}</td>
                    <td class="cisla">${o.hracu}</td>
                </tr>`).join('')}</tbody>
        </table>`).join('');

    const rozdily = p.rozdily.length ? `
        <table>
            <thead><tr><th>${t('hodnotit.hrac')}</th><th>${t('lide.sablona')}</th><th>${t('analyzy.osa')}</th>
                <th class="cisla">${t('lide.trener')}</th><th class="cisla">${t('lide.hrac')}</th>
                <th class="cisla">${t('porovnani.rozdil')}</th></tr></thead>
            <tbody>${p.rozdily.slice(0, 20).map(d => `
                <tr class="resit">
                    <td>${esc(d.jmeno)}</td>
                    <td>${stitekSablony(d.sablona)}</td>
                    <td>${esc(osaText(d.klic))}</td>
                    <td class="cisla">${d.trener}</td>
                    <td class="cisla">${d.hrac}</td>
                    <td class="cisla ${d.rozdil > 0 ? 'rozdil-plus' : 'rozdil-minus'}">${d.rozdil > 0 ? '+' : ''}${d.rozdil}</td>
                </tr>`).join('')}</tbody>
        </table>`
        : `<div class="hlaska pozor">${t('analyzy.bezRozdilu')}</div>`;

    const chybi = [
        p.chybi.bezHodnoceni.length ? `<li>${t('analyzy.bezHodnoceni', esc(p.chybi.bezHodnoceni.join(', ')))}</li>` : '',
        p.chybi.bezSebehodnoceni.length ? `<li>${t('analyzy.bezSebehodnoceni', esc(p.chybi.bezSebehodnoceni.join(', ')))}</li>` : ''
    ].filter(Boolean).join('');

    return `
        <div class="karta">
            <h2>${t('analyzy.pocty')}</h2>
            <p class="popis">${t('analyzy.pocty.popis', esc(p.obdobi), p.tolerance)}</p>
            <table>
                <tbody>
                    <tr><td>${t('analyzy.hracu')}</td><td class="cisla">${p.pocty.hracu}</td></tr>
                    <tr><td>${t('analyzy.listu')}</td><td class="cisla">${p.pocty.listu}</td></tr>
                    <tr><td>${t('analyzy.sHodnocenim')}</td><td class="cisla">${p.pocty.sHodnocenim}</td></tr>
                    <tr><td>${t('analyzy.seSebehodnocenim')}</td><td class="cisla">${p.pocty.seSebehodnocenim}</td></tr>
                    <tr><td><b>${t('analyzy.sObojim')}</b></td><td class="cisla"><b>${p.pocty.sObojim}</b></td></tr>
                </tbody>
            </table>
            ${chybi ? `<ul style="margin-top:10px">${chybi}</ul>` : ''}
        </div>

        <div class="karta">
            <h2>${t('analyzy.slabiny')}</h2>
            <p class="popis">${t('analyzy.slabiny.popis')}</p>
            ${slabiny || `<div class="hlaska pozor">${t('analyzy.bezHodnoceniVubec')}</div>`}
        </div>

        <div class="karta">
            <h2>${t('analyzy.rozdily')}</h2>
            <p class="popis">${t('analyzy.rozdily.popis', p.tolerance)}</p>
            ${rozdily}
        </div>`;
}

async function analyzy(kam) {
    const p = await api(`/api/analyzy?obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`);

    /* Žádné druhé pole na otázky. Ptá se jedním polem — příkazovým řádkem
       nahoře, který je nad každou záložkou. Tady jsou čísla, proti kterým se
       odpověď ověřuje. */
    kam.innerHTML = `
        <div class="karta">
            <h2>${t('analyzy.nadpis')}</h2>
            <p class="popis">${t('analyzy.popis')}</p>
            ${otazkyZapnute() ? `
                <div class="hlaska info">${t('analyzy.ptejSeNahore')}</div>
                <div class="popis">${t('analyzy.priklady')}</div>
                <p>${['analyzy.priklad1', 'analyzy.priklad2', 'analyzy.priklad3']
                    .map(k => `<button class="vedlejsi" data-priklad="${esc(t(k))}">${t(k)}</button>`).join(' ')}</p>
            ` : `<div class="hlaska pozor">${t('analyzy.vypnuto')}</div>`}
        </div>

        ${tabulkaPodkladu(p)}`;

    // Příklad se vloží do lišty a rovnou spustí — ať je vidět, kam se otázky píšou.
    kam.querySelectorAll('[data-priklad]').forEach(b => b.onclick = async () => {
        const vstup = $('#prikaz-vstup');
        vstup.value = b.dataset.priklad;
        vstup.scrollIntoView({ block: 'center' });
        await spustPovel();
    });
}

/* ===================== záložka: Odkazy ===================== */

async function odkazy(kam) {
    const seznam = await api(`/api/tokens?obdobi=${encodeURIComponent(stav.nastaveni.obdobi)}`);
    const zaklad = location.origin;

    /* Komu se bude generovat. Zaškrtávátko je na KAŽDÉ kombinaci hráč × šablona,
       stejně jako u tiskových listů — odkaz nese jednu šestici os, takže „vybrat
       hráče" je málo: Ferda potřebuje tři odkazy, ale nemusíš chtít všechny. */
    const hraci = stav.lide.filter(o => o.role === 'hrac' && o.aktivni);
    const cekaNaVyplneni = new Set(seznam.filter(x => !x.pouzit).map(x => `${x.player_id}:${x.sablona || 'pole'}`));

    kam.innerHTML = `
        <div class="karta">
            <h2>${t('odkazy.nadpis')}</h2>
            <p class="popis">${t('odkazy.popis')}</p>
            <div class="radek">
                <div class="pole"><label for="t-dni">${t('odkazy.platnost')}</label>
                    <input type="number" id="t-dni" value="30" min="1" max="365"></div>
            </div>

            <h3 style="margin:14px 0 4px;font-size:14px">${t('odkazy.komu')}</h3>
            <p class="popis">${t('odkazy.komu.popis')}</p>
            <table>
                <thead><tr>
                    <th class="cisla"><input type="checkbox" id="vsichni-komu" checked title="${t('listy.vsichni.tip')}"></th>
                    <th>${t('hodnotit.hrac')}</th><th>${t('odkazy.sablona')}</th><th>${t('odkazy.stav')}</th>
                </tr></thead>
                <tbody>${hraci.length ? hraci.map(o => {
                    const sablony = sablonyOsoby(o);
                    return sablony.map((s, i) => `
                    <tr>
                        <td class="cisla">
                            <input type="checkbox" class="komu" value="${o.id}:${s}"
                                   title="${t('odkazy.komu.tip')}" checked></td>
                        ${i === 0 ? `<td rowspan="${sablony.length}">${jmenoHtml(o)}</td>` : ''}
                        <td>${stitekSablonyKlik(o.id, s)}</td>
                        <td>${cekaNaVyplneni.has(`${o.id}:${s}`)
                            ? `<span class="ne">${t('odkazy.uzCeka')}</span>` : ''}</td>
                    </tr>`).join('');
                }).join('') : `<tr><td colspan="4">${t('odkazy.bezHracu')}</td></tr>`}</tbody>
            </table>
            <p style="margin-top:12px">
                <button class="hl" id="generovat" title="${t('odkazy.generovat.tip')}">${t('odkazy.generovat')}</button>
            </p>
        </div>

        <div class="karta">
            <h2>${t('odkazy.obdobi', esc(stav.nastaveni.obdobi))}</h2>
            <table>
                <thead><tr><th>${t('hodnotit.hrac')}</th><th>${t('odkazy.sablona')}</th><th>${t('odkazy.stav')}</th>
                    <th>${t('odkazy.platiDo')}</th><th>${t('odkazy.odkaz')}</th><th></th></tr></thead>
                <tbody>${seznam.length ? seznam.map(x => `
                    <tr>
                        <td>${jmenoHtml(x)}</td>
                        <td>${stav.lide.some(o => o.id === x.player_id && o.role === 'hrac' && o.aktivni)
                            ? stitekSablonyKlik(x.player_id, x.sablona || 'pole')
                            : stitekSablony(x.sablona || 'pole')}</td>
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

    $('#vsichni-komu').onchange = e =>
        kam.querySelectorAll('.komu').forEach(c => { c.checked = e.target.checked; });

    // Štítek šablony vede na hodnocení i odsud — v obou tabulkách. Odkaz nese
    // tutéž šesticí os, takže „vyplnil hráč, ještě to nemám" se řeší jedním klikem.
    zapojZkratkyNaHodnoceni(kam);

    $('#generovat').onclick = async () => {
        const ids = [...kam.querySelectorAll('.komu:checked')].map(c => c.value);
        if (!ids.length) { hlaska(kam, 'chyba', t('odkazy.nikdo')); return; }
        try {
            const r = await api('/api/tokens', {
                telo: { obdobi: stav.nastaveni.obdobi, dni: Number($('#t-dni').value), ids: ids.join(',') }
            });
            await prekresli();
            hlaska($('#obsah'), r.vytvoreno ? 'ok' : 'pozor', t('odkazy.vytvoreno', r.vytvoreno)
                + (r.preskoceno ? t('odkazy.preskoceno', r.preskoceno) : ''));
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

const KLICE_NASTAVENI = ['tolerance', 'obdobi', 'sezona', 'klub', 'kategorie', 'latka', 'cileNadpis', 'sestavy'];
const MA_NAPOVEDU = ['tolerance', 'obdobi', 'sezona', 'latka', 'cileNadpis', 'sestavy'];

async function nastaveni(kam) {
    /* Období zůstává volné pole — nové kolo se musí dát napsat, žádná nabídka
       ho dopředu nezná. Napovídá ale to, co už v datech je: „2026/2027 Zima"
       napsaná podruhé s velkým Z není překlep, který by aplikace poznala,
       ale nové období, do kterého se nespáruje ani jedno starší hodnocení. */
    let uzitaObdobi = [];
    try { uzitaObdobi = (await api('/api/obdobi')).obdobi.map(o => o.obdobi); } catch { /* nabídka je pohodlí, ne podmínka */ }

    kam.innerHTML = `
        <div class="karta">
            <h2>${t('nastaveni.nadpis')}</h2>
            <p class="popis">${t('nastaveni.popis')}</p>
            <datalist id="obdobi-nabidka">
                ${uzitaObdobi.map(o => `<option value="${esc(o)}"></option>`).join('')}
            </datalist>
            ${KLICE_NASTAVENI.map(klic => `
                <div class="pole">
                    <label for="n-${klic}">${t('nastaveni.' + klic)}</label>
                    <input type="${klic === 'tolerance' ? 'number' : 'text'}" id="n-${klic}"
                           value="${esc(stav.nastaveni[klic] ?? '')}"${klic === 'tolerance' ? ' min="0" max="9"' : ''}${
                            klic === 'obdobi' ? ' list="obdobi-nabidka" autocomplete="off"' : ''}>
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

            <!-- Úvod zprávy. Odesílatele drží brána, takže tohle je jediné místo,
                 podle kterého příjemce pozná, kdo mu píše. -->
            <div class="pole"><label for="n-sms-hlavicka">${t('notif.smsHlavicka')}</label>
                <input type="text" id="n-sms-hlavicka" maxlength="40" autocomplete="off"
                    value="${esc(stav.nastaveni.smsHlavicka ?? '')}"
                    placeholder="${esc(stav.nastaveni.klub ?? '')}">
                <div class="popis">${t('notif.smsHlavicka.napoveda')}</div>
                <div class="popis" id="n-sms-nahled"></div></div>

            <!-- Zkouška na libovolné číslo, bez vazby na kartotéku: ověřuje se brána,
                 ne hráč. Do Lidí se kvůli tomu nemusí zakládat falešná osoba. -->
            <div class="pole"><label for="n-sms-cislo">${t('notif.smsZkouska.cislo')}</label>
                <input type="text" id="n-sms-cislo" autocomplete="off" placeholder="+420777123456">
                <div class="popis">${t('notif.smsZkouska.napoveda')}</div></div>
            <p>
                <button class="vedlejsi" id="n-sms-nanecisto" title="${t('notif.smsZkouska.nanecisto.tip')}">${t('notif.smsZkouska.nanecisto')}</button>
                <button class="vedlejsi" id="n-sms-ostra" title="${t('notif.smsZkouska.ostra.tip')}">${t('notif.smsZkouska.ostra')}</button>
            </p>
            <div id="n-sms-vysledek"></div>

            <h3 style="margin:16px 0 4px;font-size:14px">${t('ai.nadpis')}</h3>
            <p class="popis">${t('ai.popis')}</p>
            <div class="radek">
                <div class="pole"><label for="n-ai">${t('ai.poskytovatel')}</label>
                    <select id="n-ai">
                        <option value="vypnuto"${stav.nastaveni.aiPoskytovatel === 'vypnuto' ? ' selected' : ''}>${t('ai.vypnuto')}</option>
                        <option value="workers"${stav.nastaveni.aiPoskytovatel === 'workers' ? ' selected' : ''}>${t('ai.workers')}</option>
                        <option value="claude"${stav.nastaveni.aiPoskytovatel === 'claude' ? ' selected' : ''}>${t('ai.claude')}</option>
                    </select>
                    <div class="popis">${t('ai.poskytovatel.napoveda')}</div></div>
            </div>
            <!-- Model podle úkolu. Nabídku plní /api/ai/modely, takže přidání
                 dalšího úkolu ve Workeru se sem promítne samo.
                 (Bez zpětných apostrofů — jsme uvnitř template literálu.) -->
            <div class="radek" id="ai-ukoly"></div>
            <div class="pole"><label><input type="checkbox" id="n-aiAnalyzy" style="width:auto"
                ${stav.nastaveni.aiAnalyzy === 'ano' ? 'checked' : ''}> ${t('ai.analyzy')}</label>
                <div class="popis">${t('ai.analyzy.napoveda')}</div></div>
            <p>
                <button class="vedlejsi" id="ai-zkouska" title="${t('ai.zkouska.tip')}">${t('ai.zkouska')}</button>
            </p>
            <div id="ai-vysledek"></div>
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
    // Sbalený a s vlastním posuvem: sto řádků by z Nastavení udělalo nekonečnou
    // stránku a na telefonu by se k ničemu pod ním nedalo dorolovat.
    api('/api/komunikace').then(zaznamy => {
        // Pozor: `stav` je tu globální stav aplikace, proto se třídy jmenují jinak.
        const tridaStavu = { ok: 'ano', chyba: 'rozdil-plus', preskoceno: 'ne' };

        const radek = (z) => `
            <tr>
                <td>${esc(new Date(z.cas + 'Z').toLocaleString(locale()))}</td>
                <td>${esc(z.kanal)}</td>
                <td>${esc(z.platforma || '—')}</td>
                <td>${esc(z.jmeno || z.adresa || '—')}</td>
                <td>${t('komunikace.typ.' + z.typ)}</td>
                <td><span class="${tridaStavu[z.vysledek] ?? ''}">${t('komunikace.' + z.vysledek)}</span>${
                    z.kod ? ` <span class="popis">${esc(z.kod)}</span>` : ''}${
                    // Důvod patří rovnou do tabulky — „chyba 400" sama o sobě nic neřekne.
                    z.podrobnosti ? `<br><span class="popis" title="${esc(z.podrobnosti)}">${esc(z.podrobnosti.slice(0, 120))}</span>` : ''}</td>
            </tr>`;

        // Hledá se i v přeložených popiskách, ať „chyba" nebo „přeskočeno" najde
        // to, co je vidět v tabulce, ne jen syrové hodnoty z databáze.
        const senoNaJehlu = (z) => [
            new Date(z.cas + 'Z').toLocaleString(locale()), z.kanal, z.platforma,
            z.jmeno, z.adresa, z.typ, t('komunikace.typ.' + z.typ),
            z.vysledek, t('komunikace.' + z.vysledek), z.kod, z.poznamka, z.podrobnosti
        ].filter(Boolean).join(' ').toLowerCase();

        kam.insertAdjacentHTML('beforeend', `
            <div class="karta">
                <details class="sbalene">
                    <summary><b>${t('komunikace.nadpis')}</b>
                        <span class="popis">${t('komunikace.pocet', zaznamy.length)}</span></summary>
                    <p class="popis">${t('komunikace.popis')}</p>
                    <div class="pole"><label for="k-hledat">${t('komunikace.hledat')}</label>
                        <input type="search" id="k-hledat" autocomplete="off"
                            placeholder="${t('komunikace.hledat.napoveda')}"></div>
                    <p>
                        <button class="vedlejsi" id="k-export" title="${t('komunikace.export.tip')}">${t('komunikace.export')}</button>
                        <span class="popis" id="k-nalezeno"></span>
                    </p>
                    <div class="log-scroll">
                        <table>
                            <thead><tr><th>${t('komunikace.cas')}</th><th>${t('komunikace.kanal')}</th>
                                <th>${t('komunikace.platforma')}</th>
                                <th>${t('komunikace.komu')}</th><th>${t('komunikace.typ')}</th>
                                <th>${t('komunikace.vysledek')}</th></tr></thead>
                            <tbody id="k-telo"></tbody>
                        </table>
                    </div>
                </details>
            </div>`);

        const vykresli = () => {
            const dotaz = ($('#k-hledat').value || '').trim().toLowerCase();
            const vybrane = dotaz ? zaznamy.filter(z => senoNaJehlu(z).includes(dotaz)) : zaznamy;
            $('#k-telo').innerHTML = vybrane.length
                ? vybrane.map(radek).join('')
                : `<tr><td colspan="6">${dotaz ? t('komunikace.nicNenalezeno') : t('komunikace.prazdno')}</td></tr>`;
            $('#k-nalezeno').textContent = dotaz
                ? t('komunikace.nalezeno', vybrane.length, zaznamy.length) : '';
        };
        vykresli();
        $('#k-hledat').oninput = vykresli;

        // Stažení přes odkaz, ne fetch — cookie se pošle sama a export jde
        // z databáze celý, ne jen těch sto řádků, co je vidět v tabulce.
        $('#k-export').onclick = () => { location.href = `/api/komunikace/export.csv?lang=${jazyk()}`; };
    }).catch(() => { /* informativní */ });

    // Nabídka modelů se plní podle poskytovatele — modely Workers AI a Claude
    // se nesmí míchat, ID jednoho u druhého nefunguje.
    api('/api/ai/modely').then(({ modely, ukoly }) => {
        const kam = $('#ai-ukoly');
        if (!kam) return;

        kam.innerHTML = ukoly.map(u => `
            <div class="pole">
                <label for="n-model-${esc(u.klic)}">${t('ai.ukol.' + u.klic)}</label>
                <select id="n-model-${esc(u.klic)}" class="ai-model" data-nastaveni="${esc(u.nastaveni)}"></select>
                <div class="popis">${t('ai.ukol.' + u.klic + '.napoveda')}</div>
            </div>`).join('');

        const naplnit = () => {
            const p = $('#n-ai').value === 'claude' ? 'claude' : 'workers';
            const vhodne = modely.filter(m => m.poskytovatel === p);
            for (const u of ukoly) {
                const vyber = $(`#n-model-${u.klic}`);
                vyber.innerHTML = vhodne.map(m =>
                    `<option value="${esc(m.id)}"${m.id === u.zvoleny ? ' selected' : ''}>${esc(m.popis)}</option>`
                ).join('');
                vyber.disabled = $('#n-ai').value === 'vypnuto';
            }
        };
        naplnit();
        $('#n-ai').onchange = naplnit;
    }).catch(() => { /* informativní */ });

    /* Živý náhled hlavičky. Worker ubírá diakritiku, ať se segment nezkrátí,
       jenže to samo nestačí: znaky mimo GSM-7 (pomlčka „–", české uvozovky,
       výpustka „…") odstranění diakritiky přežijí a přepnou celou zprávu na
       UCS-2 — segment spadne ze 160 na 70 znaků a cena se zdvojnásobí.
       Proto se počítá stejně, jako to spočítá brána, a viník se pojmenuje. */
    const nahledHlavicky = () => {
        const cil = $('#n-sms-nahled');
        if (!cil) return;
        const hlavicka = ($('#n-sms-hlavicka').value.trim() || stav.nastaveni.klub || '').trim();
        const ukazka = (hlavicka ? `${hlavicka}: ` : '') + t('notif.smsHlavicka.ukazka');
        const bez = ukazka.normalize('NFD').replace(/[̀-ͯ]/g, '');

        const mimo = [...new Set([...bez].filter(z => !GSM7.includes(z) && !GSM7_ROZSIRENI.includes(z)))];
        const ucs2 = mimo.length > 0;
        // Znaky z rozšiřovací tabulky (např. €) zabírají v GSM-7 dvě místa.
        const delka = ucs2 ? [...bez].length
            : [...bez].reduce((n, z) => n + (GSM7_ROZSIRENI.includes(z) ? 2 : 1), 0);
        // Víc segmentů = kus každého si vezme spojovací hlavička (153 / 67 místo 160 / 70).
        const segmenty = delka <= (ucs2 ? 70 : 160) ? 1 : Math.ceil(delka / (ucs2 ? 67 : 153));
        const drahe = ucs2 || segmenty > 1;

        cil.innerHTML = `${t('notif.smsHlavicka.nahled', esc(bez))}<br>`
            + `<b${drahe ? ' class="rozdil-plus"' : ''}>${t('notif.smsHlavicka.delka', delka, segmenty)}</b>`
            + (ucs2 ? `<br><span class="rozdil-plus">${t('notif.smsHlavicka.ucs2', esc(mimo.join(' ')))}</span>` : '');
    };
    $('#n-sms-hlavicka').oninput = nahledHlavicky;
    nahledHlavicky();

    /* Zkouška SMS na libovolné číslo — provozní nástroj, ne práce s kartotékou.
       Nanečisto jde na kontrolní endpoint brány: ověří klíče, kanál i tvar čísla,
       ale nic neodešle a nic nestojí. Ostrá zpráva stojí kredit, proto se ptáme. */
    const zkouskaSms = (nanecisto) => async () => {
        const cil = $('#n-sms-vysledek');
        const cislo = $('#n-sms-cislo').value.trim();
        if (!cislo) { cil.innerHTML = `<div class="hlaska chyba">${t('notif.smsZkouska.bezCisla')}</div>`; return; }

        if (!nanecisto) {
            // Zaškrtnutý přepínač sám o sobě nestačí: dokud se Nastavení neuloží,
            // platí pro Worker pořád stará hodnota a ostrá SMS by se zahodila.
            if ($('#n-sms').checked && stav.nastaveni.smsAktivni !== '1') {
                cil.innerHTML = `<div class="hlaska pozor">${t('notif.smsZkouska.neulozeno')}</div>`;
                return;
            }
            if (!confirm(t('notif.smsZkouska.potvrdit', cislo))) return;
        }

        cil.innerHTML = `<div class="hlaska info">${t('shell.nacitam')}</div>`;
        try {
            const r = await api('/api/sms/test', { telo: { telefon: cislo, nanecisto } });
            cil.innerHTML = `<div class="hlaska ${r.ok ? 'ok' : 'chyba'}">${esc(r.popis)}</div>`;
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };
    $('#n-sms-nanecisto').onclick = zkouskaSms(true);
    $('#n-sms-ostra').onclick = zkouskaSms(false);

    $('#ai-zkouska').onclick = async () => {
        const cil = $('#ai-vysledek');
        const vybery = [...document.querySelectorAll('.ai-model')];
        cil.innerHTML = `<div class="hlaska info">${t('shell.nacitam')}</div>`;
        try {
            /* Zkouší se model každého úkolu zvlášť — po rozdělení může jeden
               odpovídat a druhý ne (typicky uvažující model s malým stropem).
               Ověřuje se holou větou, nic o hráčích neodchází. */
            const radky = [];
            for (const v of vybery) {
                const r = await api(`/api/ai/stav?model=${encodeURIComponent(v.value)}`);
                radky.push(`<div class="hlaska ${r.ok ? 'ok' : 'pozor'}">`
                    + `<b>${esc(v.previousElementSibling.textContent)}:</b> ${esc(r.popis)}`
                    + (r.trvaloMs ? ` <span class="popis">(${r.trvaloMs} ms)</span>` : '') + '</div>');
            }
            cil.innerHTML = radky.join('');
        } catch (e) {
            cil.innerHTML = `<div class="hlaska chyba">${esc(e.message)}</div>`;
        }
    };

    $('#ulozit-notif').onclick = async () => {
        const telo = {
            notifZapnuto: $('#n-zapnuto').checked ? '1' : '0',
            notifCas: $('#n-cas').value,
            notifDnyZmeny: $('#n-dnyZmeny').value,
            notifDnyTicho: $('#n-dnyTicho').value,
            smsAktivni: $('#n-sms').checked ? '1' : '0',
            smsHlavicka: $('#n-sms-hlavicka').value.trim(),
            aiPoskytovatel: $('#n-ai').value,
            aiAnalyzy: $('#n-aiAnalyzy').checked ? 'ano' : 'ne'
        };
        // Model za každý úkol; klíč nastavení nese samo pole, takže přidání
        // dalšího úkolu ve Workeru se uloží bez zásahu sem.
        document.querySelectorAll('.ai-model').forEach(v => { telo[v.dataset.nastaveni] = v.value; });
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

// Znak klubu v liště i na přihlašovací stránce. Soubor `web/logo.png` si klub
// nahraje sám; dokud tam není, obrázky se schovají a zůstane samotný název.
schovejChybejiciZnak($('#hl-znak'));
schovejChybejiciZnak($('#login-znak'));

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

/* Na telefonu se záložky schovávají pod hamburger. Po volbě se menu zavře —
   jinak by zabralo půl obrazovky nad obsahem, kvůli kterému se klikalo. */
function menu(otevrit) {
    const tlacitko = $('#menuBtn');
    $('#zalozky').classList.toggle('otevreno', otevrit);
    tlacitko.setAttribute('aria-expanded', otevrit ? 'true' : 'false');
    tlacitko.title = t(otevrit ? 'nav.menu.zavrit' : 'nav.menu.tip');
}

$('#menuBtn').onclick = () => menu(!$('#zalozky').classList.contains('otevreno'));

$('#prikaz-spustit').onclick = spustPovel;
$('#prikaz-vstup').onkeydown = e => { if (e.key === 'Enter') spustPovel(); };

document.querySelectorAll('#zalozky button').forEach(b => b.onclick = () => {
    stav.zalozka = b.dataset.z;
    menu(false);
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
