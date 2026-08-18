/* =====================================================================
   SESTAVENÍ TISKOVÉHO LISTU — jedna šablona = jedna A4
   (kumulovaně: jeden hráč = jedna A4 se všemi svými šablonami vedle sebe)

   Rámec: FA Four Corner Model
     - technicko-taktický roh          -> radar graf (čísla)
     - fyzický / psychický / sociální  -> slovní bloky (bez čísel)

   Co na list NEPATŘÍ (ZADANI §7.5): šipky trendu, věty typu
   „zhoršil ses", data jiných hráčů. Tohle si čtrnáctiletý odnese domů.

   List se tiskne vždy světlý, i když má aplikace tmavý vzhled — je to
   papír, ne obrazovka.
   ===================================================================== */

import { radar, vzorekRady } from './radar.js';
import { MAX } from './sablony.js';
import { t, osy, osyProZaznam, kotvy, ja, locale } from './i18n.js';

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

/**
 * Značka šablony do hlavičky. Na listu musí být na první pohled vidět, jestli
 * je to brankářská, polní nebo leader šestice — samotné popisky os to říkají
 * až po přečtení. Barvu drží třída `sab-*` (styl.css), název stojí vedle ní:
 * na černobílém tisku a barvoslepému čtenáři musí list dál dávat smysl.
 */
function znacka(sablona) {
    return `<span class="sab-znacka sab-${esc(sablona)}">${t('sablona.' + sablona)}</span>`;
}

/** Popisek druhého polygonu podle režimu, který vrátil server. */
function popisekPorovnani(h) {
    if (h.porovnaniRezim === 'hrac') return t('list.hracSeVidi');
    if (h.porovnaniRezim === 'minule') return h.porovnaniObdobi || t('list.minule');
    return '';
}

/**
 * Osy, které má druhý pohled navíc proti osám tohohle listu — a věta o nich.
 *
 * Vzniká to přidáním osy uprostřed sezóny: graf se kreslí šesticí, se kterou
 * vzniklo hodnocení trenéra, kdežto hráč vyplňoval sebehodnocení už o sedmi
 * osách. Jeho sedmá známka pak nemá kam padnout a **tiše z listu zmizí** —
 * hráč vyplní kondici a na papíře po ní není ani stopa.
 *
 * Vynechat ji z grafu je správně (vrchol, který v hodnocení trenéra není, by
 * musel ležet ve středu, tedy na nule). Zamlčet ji správně není.
 */
function osyNavic(h, seznamOs) {
    if (!h.porovnani) return [];
    const naListu = new Set(seznamOs.map(o => o.klic));
    return Object.keys(h.porovnani)
        .filter(klic => !naListu.has(klic) && Number.isFinite(Number(h.porovnani[klic])))
        .map(klic => `${t('osa.' + klic)} ${h.porovnani[klic]}/${MAX}`);
}

/** Věta o osách navíc, nebo prázdno. */
function poznamkaOsyNavic(h, seznamOs) {
    const navic = osyNavic(h, seznamOs);
    return navic.length
        ? `<p class="note-unfilled">${t('list.osyNavic', esc(popisekPorovnani(h)), esc(navic.join(' · ')))}</p>`
        : '';
}

/**
 * Období do hlavičky. Nese ho list, ne nastavení: při tisku celé historie leží
 * na hromádce papíry z několika období a každý musí říkat to své. Starší volání
 * (a listy z doby před tím) `obdobi` neposílají — pak platí to z nastavení.
 */
function obdobiListu(h, nas) {
    return h.obdobi || nas.obdobi;
}

/**
 * Vrátí HTML jedné A4 stránky.
 * @param {Object} h   {jmeno, prezdivka, post, obdobi, sablona, hodnoceni, porovnani,
 *                      porovnaniRezim, porovnaniObdobi, fyzicky, hlavou, parta, cile[]}
 * @param {Object} nas {klub, kategorie, sezona, obdobi, latka, cileNadpis}
 */
export function list(h, nas) {
    // Osy podle TOHOTO záznamu, ne podle aktuální šablony: hodnocení pořízené
    // dřív, než osa přibyla, se vykreslí tou šesticí, se kterou vzniklo.
    const seznamOs = osyProZaznam(h.sablona, h.hodnoceni);
    if (!seznamOs.length) throw new Error(t('list.neznamaSablona', h.jmeno, h.sablona));

    // Druhý polygon se kreslí jen tehdy, když stojí na týchž osách. Jinak by
    // se šestice porovnávala se sedmicí a chybějící osa by spadla na nulu —
    // což na papíře vypadá jako nejhorší možná známka, ne jako „neměřeno".
    const porovnatelne = h.porovnani
        && seznamOs.every(o => Number.isFinite(Number(h.porovnani[o.klic])));
    const druhyPolygon = porovnatelne ? h.porovnani : null;
    const nesouhlasnaSablona = !!h.porovnani && !porovnatelne;

    const datum = new Date().toLocaleDateString(locale());

    return `
    <div class="page sab-${esc(h.sablona)}">
        <div class="header">
            <div>
                <div class="club">${esc(nas.klub)}</div>
                <h1>${t('list.nadpis')}</h1>
                ${znacka(h.sablona)}
            </div>
            <div class="meta">
                ${esc(nas.kategorie)} &bull; ${t('list.sezona')} ${esc(nas.sezona)}<br>
                ${esc(obdobiListu(h, nas))}<br>
                ${t('list.vystaveno')}: ${datum}
            </div>
        </div>

        <div class="playerbar">
            <span class="name">${esc(h.jmeno)}${h.prezdivka ? ' &bdquo;' + esc(h.prezdivka) + '&ldquo;' : ''}</span>
            <span class="role">${esc(popisPostu(h))}</span>
        </div>

        ${h.hodnoceni ? '' : `<p class="note-unfilled">${t('list.nevyplneno')}</p>`}

        <div class="chart-wrap">${radar(seznamOs, h.hodnoceni, druhyPolygon)}</div>
        <div class="legend">
            <span>${vzorekRady(0, 'var(--sab-tmava, #1565C0)')} ${t('list.trener')}</span>
            ${druhyPolygon ? `<span>${vzorekRady(1)} ${esc(popisekPorovnani(h))}</span>` : ''}
        </div>
        ${nesouhlasnaSablona ? `<p class="note-unfilled">${t('list.jinaSestice')}</p>` : ''}
        ${druhyPolygon ? poznamkaOsyNavic(h, seznamOs) : ''}

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
            ${kotvy().map(k => `<span><b>${k[0]} ${k[2]}</b> &ndash; ${k[1]}</span>`).join('')}
        </div>

        <div class="footer">
            <div>${t('list.paticka', esc(nas.latka))}</div>
            <div class="sign">${t('list.podpis')}</div>
        </div>
    </div>`;
}

/**
 * Slovní blok složený z několika šablon. Když ho vyplnil jen jeden list,
 * nechá se holý text; když víc, každý kus se podepíše svou šablonou, aby
 * bylo poznat, odkud je — a nic se cestou nezahodí.
 */
function slozeny(hraci, pole) {
    const casti = hraci
        .map(h => ({ sablona: h.sablona, text: String(h[pole] ?? '').trim() }))
        .filter(c => c.text);
    if (!casti.length) return '&mdash;';
    // Stejná věta u dvou šablon se na papír píše jednou. Podepisovat ji dvakrát
    // by vypadalo jako dvě různá zjištění.
    if (new Set(casti.map(c => c.text)).size === 1) return esc(casti[0].text);
    return casti.map(c => `<b>${t('sablona.' + c.sablona)}:</b> ${esc(c.text)}`).join('<br>');
}

/**
 * Kumulovaný list: jeden hráč a jedno období, všechny jeho šablony na JEDNÉ stránce.
 * Radary zůstávají oddělené — brankářské a polní osy se do jednoho grafu
 * míchat nedají (jiný tvar, jiná řada). Slovní bloky a cíle se skládají
 * ze všech šablon, ať se nic neztratí.
 *
 * @param {Object[]} hraci  listy TÉHOŽ hráče, každý s jinou šablonou
 */
export function listKumulovany(hraci, nas) {
    if (hraci.length === 1) return list(hraci[0], nas);

    const prvni = hraci[0];
    const datum = new Date().toLocaleDateString(locale());
    const cile = hraci.flatMap(h => (h.cile || []).map(c => ({ sablona: h.sablona, text: c })));
    const vicCilu = new Set(cile.map(c => c.sablona)).size > 1;

    return `
    <div class="page kumul">
        <div class="header">
            <div>
                <div class="club">${esc(nas.klub)}</div>
                <h1>${t('list.nadpis')}</h1>
                <div class="sab-znacky">${hraci.map(h => znacka(h.sablona)).join('')}</div>
            </div>
            <div class="meta">
                ${esc(nas.kategorie)} &bull; ${t('list.sezona')} ${esc(nas.sezona)}<br>
                ${esc(obdobiListu(prvni, nas))}<br>
                ${t('list.vystaveno')}: ${datum}
            </div>
        </div>

        <div class="playerbar">
            <span class="name">${esc(prvni.jmeno)}${prvni.prezdivka ? ' &bdquo;' + esc(prvni.prezdivka) + '&ldquo;' : ''}</span>
            <span class="role">${esc(popisPostu(prvni))}</span>
        </div>

        <div class="charts">
            ${hraci.map(h => {
                // Totéž co u jednoho listu: osy podle záznamu a druhý polygon
                // jen tehdy, když stojí na týchž osách.
                const seznamOs = osyProZaznam(h.sablona, h.hodnoceni);
                if (!seznamOs.length) throw new Error(t('list.neznamaSablona', h.jmeno, h.sablona));
                const druhy = h.porovnani
                    && seznamOs.every(o => Number.isFinite(Number(h.porovnani[o.klic]))) ? h.porovnani : null;
                return `
                <div class="chart-one sab-${esc(h.sablona)}">
                    <div class="chart-title">${t('sablona.' + h.sablona)}</div>
                    <div class="chart-wrap">${radar(seznamOs, h.hodnoceni, druhy)}</div>
                    ${h.hodnoceni ? '' : `<p class="note-unfilled">${t('list.nevyplneno')}</p>`}
                    ${h.porovnani && !druhy ? `<p class="note-unfilled">${t('list.jinaSestice')}</p>` : ''}
                    ${druhy ? poznamkaOsyNavic(h, seznamOs) : ''}
                </div>`;
            }).join('')}
        </div>
        <!-- Legenda je společná pro všechny grafy na stránce, takže barvu
             šablony brát nemůže — kterou z nich by ukázala? Vzorek je proto
             neutrální; šablonu říká nadpis nad každým grafem. -->
        <div class="legend">
            <span>${vzorekRady(0)} ${t('list.trener')}</span>
            ${hraci.some(h => h.porovnani)
                ? `<span>${vzorekRady(1)} ${
                    esc(popisekPorovnani(hraci.find(h => h.porovnani)))}</span>`
                : ''}
        </div>

        <div class="blocks">
            <div class="block fyz">
                <h4>${t('blok.fyzicky')}</h4>
                <p>${slozeny(hraci, 'fyzicky')}</p>
            </div>
            <div class="block hlava">
                <h4>${t('blok.hlavou')}</h4>
                <p>${slozeny(hraci, 'hlavou')}</p>
            </div>
            <div class="block parta">
                <h4>${t('blok.parta')}</h4>
                <p>${slozeny(hraci, 'parta')}</p>
            </div>
        </div>

        <div class="goals">
            <h4>&#127919; ${esc(nas.cileNadpis)}</h4>
            <ol>${cile.map(c => `<li>${vicCilu
                ? `<b>${t('sablona.' + c.sablona)}:</b> ` : ''}${esc(c.text)}</li>`).join('')}</ol>
        </div>

        <div class="scale">
            <b>${t('list.jakCist')}</b>
            ${kotvy().map(k => `<span><b>${k[0]} ${k[2]}</b> &ndash; ${k[1]}</span>`).join('')}
        </div>

        <div class="footer">
            <div>${t('list.paticka', esc(nas.latka))}</div>
            <div class="sign">${t('list.podpis')}</div>
        </div>
    </div>`;
}

/**
 * Vysvětlivky os — samostatná stránka, ne dodatek k listu.
 *
 * Na listu je u každé osy číslo a jméno úrovně, ale ne to, co ta osa vlastně
 * měří. Vejít se to tam nemá: jeden hráč = jedna A4 je pravidlo, ne zvyk.
 * Kdo chce vysvětlivky (rodič, nový trenér), vytiskne si tuhle jednu stránku
 * ke všem listům dohromady.
 *
 * U každé osy stojí věta z pohledu hráče — tatáž, kterou vidí ve svém
 * sebehodnocení. Popisuje, jak vypadá zvládnutá osa, takže se z ní dá číst
 * i to, k čemu se známka vztahuje.
 */
export function vysvetlivky(sablony, nas) {
    return `
    <div class="page vysvetlivky">
        <div class="header">
            <div>
                <div class="club">${esc(nas.klub)}</div>
                <h1>${t('list.vysvetlivky')}</h1>
            </div>
            <div class="meta">${esc(nas.kategorie)} &bull; ${esc(nas.obdobi)}</div>
        </div>

        <p class="popis-listu">${t('list.vysvetlivky.popis')}</p>

        ${sablony.map(s => `
            <div class="vysvetlivky-sablona sab-${esc(s)}">
                <h4>${znacka(s)}</h4>
                <table class="osy-tabulka">
                    ${osy(s).map(o => `<tr>
                        <th>${esc(o.popis)}</th>
                        <td>${esc(ja(o.klic))}</td>
                    </tr>`).join('')}
                </table>
            </div>`).join('')}

        <div class="scale">
            <b>${t('list.jakCist')}</b>
            ${kotvy().map(k => `<span><b>${k[0]} ${k[2]}</b> &ndash; ${k[1]}</span>`).join('')}
        </div>

        <div class="footer">
            <div>${t('list.paticka', esc(nas.latka))}</div>
        </div>
    </div>`;
}

/**
 * Vykreslí listy. Bez `kumulovane` platí jeden list = jedna stránka (hráč ×
 * šablona); s ním má hráč jednu stránku se všemi svými šablonami.
 * `sVysvetlivkami` přidá na konec jednu stránku s významem os — nepočítá se
 * do návratové hodnoty, není to ničí list.
 */
export function vykresli(listy, nastaveni, cil, kumulovane = false, sVysvetlivkami = false) {
    const dodatek = sVysvetlivkami && listy.length
        ? vysvetlivky([...new Set(listy.map(h => h.sablona))], nastaveni)
        : '';

    if (!kumulovane) {
        cil.innerHTML = listy.map(h => list(h, nastaveni)).join('') + dodatek;
        return listy.length;
    }

    // Skupina je hráč A OBDOBÍ, ne jen hráč: kumulovat brankářskou šestici
    // z loňska s letošní polní na jednu stránku by udělalo z historie kaši.
    const podleHrace = new Map();
    for (const h of listy) {
        const klic = `${h.player_id}|${h.obdobi ?? ''}`;
        if (!podleHrace.has(klic)) podleHrace.set(klic, []);
        podleHrace.get(klic).push(h);
    }
    cil.innerHTML = [...podleHrace.values()].map(g => listKumulovany(g, nastaveni)).join('') + dodatek;
    return podleHrace.size;
}
