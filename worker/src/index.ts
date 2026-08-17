/* =====================================================================
   WORKER — API, autorizace a přístup k D1.

   Pravidla, která tady musí platit (ZADANI §7, §9):
   - veškerá autorizace je tady, ne v prohlížeči
   - hráč nesmí vidět hodnocení trenéra dřív, než odešle své (§7.1)
   - GET /api/self/:token nevrací hodnocení trenéra ani jiného hráče
   - hodnoty 1..10 se validují na serveru, ne jen v UI
   - hodnocení se nikdy nepřepisuje, každé uložení je nový řádek
   ===================================================================== */

/* Texty (popisy os, kotvy škály) sem nepatří — server vrací klíče
   a překládá až prohlížeč podle zvoleného jazyka (web/src/i18n.js). */
import { SABLONY, POZICE, MAX, klice, vsechnyOsy, zkontrolujHodnoty, zkontrolujPozice, popis, klicZPopisu } from '../../web/src/sablony.js';
/* Generuje scripts/gen-version.mjs při každém `npm run deploy` i `npm run dev`. */
import { VERZE } from './version';
import { DOKUMENTY } from './dokumenty';
import { xlsxSoubor, type Sloupec } from './xlsx';
import Anthropic from '@anthropic-ai/sdk';

interface EmailBinding {
    send(zprava: { to: string; from: { email: string; name?: string }; subject: string; text: string; html?: string }): Promise<unknown>;
}

export interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    ADMIN_HESLO: string;
    SESSION_KEY: string;
    EMAIL?: EmailBinding;      // Cloudflare Email Sending, binding [[send_email]]
    EMAIL_FROM?: string;
    OBNOVA_EMAILY?: string;    // čárkami oddělené adresy, na které smí jít obnova hesla
    TELEGRAM_BOT_TOKEN?: string;
    ZAKLADNI_URL?: string;     // adresa do odkazů v notifikacích (cron nemá request)
    SMS_PROVIDER?: string;     // 'console' (jen zaloguje) | 'gosms' | 'twilio'
    SMS_ODESILATEL?: string;   // alfanumerický odesílatel — používá jen twilio
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    GOSMS_CLIENT_ID?: string;
    GOSMS_CLIENT_SECRET?: string;
    GOSMS_KANAL?: string;      // ID kanálu z GoSMS (odesílatel je jejich, registrovaný)
    AI?: { run(model: string, vstup: unknown): Promise<any> };  // Workers AI, binding "ai"
    ANTHROPIC_API_KEY?: string;  // volitelný placený model; bez něj jede jen Workers AI
}

const MODUL = 'hodnoceni-hracu';
const SESSION_HODIN = 12;
const PASMO_SUMU = 2;         // §7.4: posun o 1 bod u subjektivního hodnocení není signál
const OBNOVA_MINUT = 15;      // platnost odkazu na obnovu hesla
const OBNOVA_MAX_ZA_OKNO = 3; // víc žádostí za 15 minut se nepošle (brzda na spamování schránky)
// Adresa v /.well-known/security.txt — kam má napsat ten, kdo najde díru.
// Je veřejná, takže sem patří schránka, která se opravdu čte.
const KONTAKT_BEZPECNOST = 'info@maxferit.cz';
// Krátký PIN je vědomý ústupek pohodlí (trenéři to ťukají na hřišti v mobilu).
// Únosné je to jen díky zámku po několika špatných pokusech — bez něj by se
// 10 000 kombinací zkusilo hrubou silou za pár vteřin. Viz PRIHLASENI_*.
const HESLO_MIN = 4;
const PRIHLASENI_OKNO_MINUT = 15;  // v jak dlouhém okně se špatné pokusy sčítají
const PRIHLASENI_MAX_UCET = 5;     // víc marných pokusů na jeden účet = zámek
const PRIHLASENI_MAX_IP = 15;      // a víc napříč účty z jedné adresy taky
// Strop workerd: „iteration counts above 100000 are not supported".
// Víc nejde, i když by OWASP chtěl výrazně víc.
const PBKDF2_ITERACE = 100_000;

/* ===================== pomocné ===================== */

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
    });
}

function chyba(zprava: string, status = 400): Response {
    return json({ chyba: zprava }, status);
}

function b64url(bajty: ArrayBuffer | Uint8Array): string {
    const u8 = bajty instanceof Uint8Array ? bajty : new Uint8Array(bajty);
    let s = '';
    for (const b of u8) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Časově konstantní porovnání dvou řetězců — ať se z doby odpovědi nedá nic vyčíst. */
function stejne(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let rozdil = 0;
    for (let i = 0; i < a.length; i++) rozdil |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return rozdil === 0;
}

/* ===================== heslo ===================== */

async function odvodHash(heslo: string, sul: Uint8Array, iterace: number): Promise<string> {
    const klic = await crypto.subtle.importKey('raw', new TextEncoder().encode(heslo), 'PBKDF2', false, ['deriveBits']);
    const bity = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: sul as BufferSource, iterations: iterace, hash: 'SHA-256' }, klic, 256
    );
    return b64url(bity);
}

function zB64url(text: string): Uint8Array {
    const doplneno = text.replace(/-/g, '+').replace(/_/g, '/');
    const surove = atob(doplneno);
    return Uint8Array.from(surove, z => z.charCodeAt(0));
}

interface Ucet {
    id: number; jmeno: string; login: string;
    heslo_hash: string | null; heslo_sul: string | null; heslo_iterace: number | null;
    email: string | null; telegram_chat_id: string | null; telefon: string | null;
}

/** Najde trenéra podle přihlašovacího jména (velikost písmen nerozhoduje). */
/**
 * Účet podle přihlašovacího jména NEBO e-mailu. Lidé si pamatují svůj e-mail,
 * ne vymyšlený login — dokud se braly jen loginy, e-mail tiše propadl do větve
 * společného hesla a člověk si omylem přenastavil něco úplně jiného.
 */
async function najdiUcet(env: Env, kdo: string): Promise<Ucet | null> {
    return env.DB.prepare(
        `SELECT id, jmeno, login, heslo_hash, heslo_sul, heslo_iterace,
                email, telegram_chat_id, telefon
           FROM players
          WHERE role = 'trener' AND aktivni = 1
            AND (lower(login) = lower(?) OR lower(email) = lower(?))`
    ).bind(kdo.trim(), kdo.trim()).first<Ucet>();
}

/** Uloží heslo konkrétnímu člověku. */
async function nastavHesloUctu(env: Env, playerId: number, heslo: string): Promise<void> {
    const sul = crypto.getRandomValues(new Uint8Array(16));
    const hash = await odvodHash(heslo, sul, PBKDF2_ITERACE);
    await env.DB.prepare(
        `UPDATE players SET heslo_hash = ?, heslo_sul = ?, heslo_iterace = ?,
                            heslo_zmeneno = datetime('now')
          WHERE id = ?`
    ).bind(hash, b64url(sul), PBKDF2_ITERACE, playerId).run();
}

/** Uloží společné heslo. Od téhle chvíle se secret ADMIN_HESLO ignoruje. */
async function nastavHeslo(env: Env, heslo: string): Promise<void> {
    const sul = crypto.getRandomValues(new Uint8Array(16));
    const hash = await odvodHash(heslo, sul, PBKDF2_ITERACE);
    await env.DB.prepare(
        `INSERT INTO auth (id, heslo_hash, heslo_sul, iterace, zmeneno)
         VALUES (1, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
            heslo_hash = excluded.heslo_hash,
            heslo_sul  = excluded.heslo_sul,
            iterace    = excluded.iterace,
            zmeneno    = excluded.zmeneno`
    ).bind(hash, b64url(sul), PBKDF2_ITERACE).run();
}

/**
 * Ověří heslo. Je-li v databázi hash, platí jen ten — secret ADMIN_HESLO
 * slouží pouze k prvnímu přihlášení, než se heslo poprvé nastaví z aplikace.
 * Kdyby se ztratilo i to: `DELETE FROM auth;` a secret zase platí.
 */
/* ===================== zámek proti hádání hesla ===================== */

/** Porovnání jmen bez ohledu na velikost písmen a diakritiku. */
function holyText(text: string): string {
    return String(text ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Kolik marných pokusů padlo na tenhle klíč za poslední okno. */
async function pokusyZaOkno(env: Env, klic: string): Promise<number> {
    const r = await env.DB.prepare(
        `SELECT COUNT(*) AS pocet FROM prihlaseni_pokusy
          WHERE klic = ? AND cas > datetime('now', ?)`
    ).bind(klic, `-${PRIHLASENI_OKNO_MINUT} minutes`).first<{ pocet: number }>();
    return r?.pocet ?? 0;
}

/**
 * Je přihlášení zamčené? Vrací hlášku pro člověka, ne jen true/false —
 * „špatné heslo" u zamčeného účtu by posílalo trenéra hádat dokola.
 */
async function zamceno(env: Env, klicUctu: string, klicIp: string): Promise<string | null> {
    const [ucet, ip] = await Promise.all([pokusyZaOkno(env, klicUctu), pokusyZaOkno(env, klicIp)]);
    if (ucet >= PRIHLASENI_MAX_UCET || ip >= PRIHLASENI_MAX_IP) {
        return `Moc špatných pokusů. Přihlášení je na ${PRIHLASENI_OKNO_MINUT} minut zamčené — `
            + 'počkej, nebo si nech poslat odkaz přes „Zapomenuté heslo".';
    }
    return null;
}

async function zapisNezdar(env: Env, klicUctu: string, klicIp: string, ip: string): Promise<void> {
    try {
        await env.DB.batch([
            env.DB.prepare('INSERT INTO prihlaseni_pokusy (klic, ip) VALUES (?, ?)').bind(klicUctu, ip),
            env.DB.prepare('INSERT INTO prihlaseni_pokusy (klic, ip) VALUES (?, ?)').bind(klicIp, ip),
            // Úklid starých řádků, ať tabulka neroste donekonečna.
            env.DB.prepare(`DELETE FROM prihlaseni_pokusy WHERE cas < datetime('now', '-1 day')`)
        ]);
    } catch (e) {
        console.warn('Zápis nezdařeného přihlášení selhal:', e instanceof Error ? e.message : String(e));
    }
}

/** Povedlo se — počitadlo se nuluje, ať se trenér nezamkne sám sebou. */
async function smazNezdary(env: Env, klicUctu: string, klicIp: string): Promise<void> {
    try {
        await env.DB.prepare('DELETE FROM prihlaseni_pokusy WHERE klic IN (?, ?)')
            .bind(klicUctu, klicIp).run();
    } catch { /* na úspěšném přihlášení to nesmí padnout */ }
}

/**
 * Ověří heslo konkrétního trenéra. Vrací i jeho id, aby se dalo uložit
 * do session — díky tomu aplikace ví, kdo je přihlášený.
 */
async function overUcet(env: Env, login: string, heslo: string):
    Promise<{ stav: 'ok'; ucet: Ucet } | { stav: 'spatne' | 'bezHesla' | 'neznamy' }> {
    const u = await najdiUcet(env, login);
    if (!u) return { stav: 'neznamy' };
    if (!u.heslo_hash || !u.heslo_sul || !u.heslo_iterace) return { stav: 'bezHesla' };

    const shoda = stejne(await odvodHash(heslo, zB64url(u.heslo_sul), u.heslo_iterace), u.heslo_hash);
    return shoda ? { stav: 'ok', ucet: u } : { stav: 'spatne' };
}

/**
 * Najde účty, kterým sedí zadané heslo — pro přihlášení SAMOTNÝM PINem, kdy
 * člověk nepíše jméno. Na hřišti se do mobilu ťukají čtyři číslice a psát
 * k tomu ještě jméno je na zimě v rukavicích otrava.
 *
 * Vrací pole schválně: kdyby dva lidé měli stejný PIN, nesmí se hádat, kdo to
 * je — přihlášení se odmítne a zeptá se na jméno. Tiše vybrat prvního by
 * znamenalo podepsat hodnocení cizím jménem.
 *
 * Cena: PBKDF2 se počítá pro každého trenéra s heslem zvlášť. Proto se prochází
 * jen aktivní trenéři (hráči účty nemají) — u tří lidí je to nic, u stovky by
 * se muselo jméno začít vyžadovat.
 */
async function najdiUcetPodleHesla(env: Env, heslo: string): Promise<Ucet[]> {
    const { results } = await env.DB.prepare(
        `SELECT id, jmeno, login, heslo_hash, heslo_sul, heslo_iterace, email, telegram_chat_id, telefon
           FROM players
          WHERE role = 'trener' AND aktivni = 1 AND heslo_hash IS NOT NULL`
    ).all<Ucet>();

    const sedi: Ucet[] = [];
    for (const u of results ?? []) {
        if (!u.heslo_sul || !u.heslo_iterace) continue;
        if (stejne(await odvodHash(heslo, zB64url(u.heslo_sul), u.heslo_iterace), u.heslo_hash!)) {
            sedi.push(u);
        }
    }
    return sedi;
}

async function overHeslo(env: Env, heslo: string): Promise<'ok' | 'spatne' | 'nenastaveno'> {
    const a = await env.DB.prepare('SELECT heslo_hash, heslo_sul, iterace FROM auth WHERE id = 1')
        .first<{ heslo_hash: string; heslo_sul: string; iterace: number }>();
    if (a) {
        return stejne(await odvodHash(heslo, zB64url(a.heslo_sul), a.iterace), a.heslo_hash)
            ? 'ok' : 'spatne';
    }
    // Žádné heslo v databázi ani v secretu = server není nastavený. To se
    // nesmí tvářit jako „špatné heslo", jinak se to hledá zbytečně dlouho.
    if (!env.ADMIN_HESLO) return 'nenastaveno';
    return stejne(heslo, env.ADMIN_HESLO) ? 'ok' : 'spatne';
}

function zkontrolujNoveHeslo(heslo: unknown): string | null {
    if (typeof heslo !== 'string' || heslo.length < HESLO_MIN) {
        return `Nové heslo musí mít aspoň ${HESLO_MIN} znaků.`;
    }
    if (heslo.length > 200) return 'Nové heslo je nesmyslně dlouhé.';
    return null;
}

/* ===================== session ===================== */

async function klic(tajemstvi: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw', new TextEncoder().encode(tajemstvi),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
    );
}

async function podepis(tajemstvi: string, data: string): Promise<string> {
    const sig = await crypto.subtle.sign('HMAC', await klic(tajemstvi), new TextEncoder().encode(data));
    return b64url(sig);
}

/** `kdo` = přihlášený trenér; u společného hesla zůstává null. */
async function vytvorSession(env: Env, kdo?: { id: number; jmeno: string }): Promise<string> {
    const platnost = Date.now() + SESSION_HODIN * 3600_000;
    const telo = b64url(new TextEncoder().encode(JSON.stringify({
        exp: platnost, id: kdo?.id ?? null, jmeno: kdo?.jmeno ?? null
    })));
    return `${telo}.${await podepis(env.SESSION_KEY, telo)}`;
}

interface Session { id: number | null; jmeno: string | null }

/** Vrátí session, nebo null. Podpis i platnost se ověřují vždy. */
async function overSession(env: Env, cookie: string | null): Promise<Session | null> {
    if (!cookie) return null;
    const sess = cookie.split(/;\s*/).find(c => c.startsWith('sess='))?.slice(5);
    if (!sess) return null;

    const [telo, sig] = sess.split('.');
    if (!telo || !sig) return null;
    if (!stejne(sig, await podepis(env.SESSION_KEY, telo))) return null;

    try {
        const data = JSON.parse(atob(telo.replace(/-/g, '+').replace(/_/g, '/')));
        if (typeof data.exp !== 'number' || data.exp <= Date.now()) return null;
        return { id: data.id ?? null, jmeno: data.jmeno ?? null };
    } catch {
        return null;
    }
}

function cookieHlavicka(hodnota: string, https: boolean, maxAge: number): string {
    return `sess=${hodnota}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`
        + (https ? '; Secure' : '');
}

/* ===================== nastavení ===================== */

const VYCHOZI_NASTAVENI: Record<string, string> = {
    tolerance: '2',
    obdobi: '2025/2026 zima',
    sezona: '2025/2026',
    klub: 'SK ŘÍČMANICE',
    kategorie: 'Starší žáci',
    latka: 'starší žák',
    cileNadpis: 'Na čem makáme do zimy',
    /* Rozestavení, která klub hraje. Je jich víc než jedno a mění se — proto
       volný seznam oddělený čárkou, ne pevná nabídka v kódu. Hodnocení to
       neovlivňuje (osy jsou stejné pro každou sestavu); slouží jako kontext
       pro jazykový model u analýz a jako společná paměť trenérů. */
    sestavy: '1-4-4-2',
    notifZapnuto: '1',         // hlavní vypínač souhrnů
    notifCas: '19:00',         // místní čas; cron běží každou hodinu a vybere si tu svou
    notifDnyZmeny: '3',        // když se něco změnilo: nejvýš jednou za N dní
    notifDnyTicho: '14',       // když se nic neděje: po N dnech přijde „nic se nezměnilo"
    notifPosledni: '',         // kdy naposledy něco odešlo
    // SMS je mimořádný nástroj: stojí peníze a lidi ruší. Výchozí stav je vypnuto
    // a zapíná se vědomě v Nastavení — přepínač u osoby sám o sobě nestačí.
    smsAktivni: '0',
    smsDenniStrop: '50',       // pojistka proti smyčce, i když je kanál zapnutý
    // Úvod každé SMS. Odesílatele drží brána (příjemce vidí GoSMS-info, ne klub),
    // takže tohle je jediné místo, podle kterého pozná, kdo mu píše.
    // Prázdné = použije se název klubu, ať přejmenování nezanechá starý text.
    smsHlavicka: '',
    // Jazykový model pro příkazový řádek. Výchozí 'vypnuto': v aplikaci jsou
    // údaje nezletilých a odesílat je ven se musí zapnout vědomě.
    aiPoskytovatel: 'vypnuto', // 'vypnuto' | 'workers' (zdarma) | 'claude' (placený)
    /* Model se volí PODLE ÚKOLU, ne jeden na všechno. Rozřazení povelu je
       klasifikace do čtyř kategorií — pouštět na ni uvažující model znamená,
       že si k „kterou záložku otevřít" napíše vnitřní úvahu a spotřebuje strop
       (naměřeno: gpt-oss 2,7 s a ~2000 tokenů proti Llamě pod vteřinu).
       Analýza naopak z rozumnějšího modelu těží. Viz AI_UKOLY. */
    aiModel: '@cf/meta/llama-3.1-8b-instruct-fp8',                  // analýzy
    /* Na povely NENÍ výchozí ten nejmenší. Naměřeno na jednom povelu
       („ukaž mi papíry pro Jednu", kádr 2 hráči): 3B zvolil špatnou akci,
       8B našel dva hráče místo jednoho a trval 1784 ms, 70B odpověděl správně
       za 477 ms a 120B taky správně, ale za 2135 ms. Nejmenší modely tu
       nešetří, jen se pletou — a 70B je zároveň nejrychlejší ze správných. */
    aiModelPovely: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',      // rozřazení povelů
    /* Analýzy nad plnými daty. Příkazovému řádku stačí jména kádru, ale
       analýza bez známek a posudků není analýza — musí je dostat celé.
       Je to jediné místo, kde z aplikace odcházejí ven údaje o konkrétním
       nezletilém hráči, proto vlastní vypínač a výchozí 'ne': zapnout se to
       musí vědomě, ne omylem přes nastavení modelu. Viz TECHNICAL §3d. */
    aiAnalyzy: 'ne'            // 'ne' | 'ano'
};

/**
 * Modely nabízené v Nastavení. Cloudflare katalog průběžně mění a vyřazuje
 * (llama-3.1-8b-instruct skončil 2026-05-30 a volání padalo na chybu 5028),
 * takže seznam je tady vidět a dá se opravit jedním commitem. Aktuální stav
 * účtu vypíše `npx wrangler ai models`.
 */
const AI_MODELY = [
    { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', poskytovatel: 'workers', popis: 'Llama 3.3 70B — na povely nejlepší poměr: správně a rychle (~0,5 s)' },
    { id: '@cf/meta/llama-3.1-8b-instruct-fp8', poskytovatel: 'workers', popis: 'Llama 3.1 8B — levný, ale u povelů si vymýšlí hráče navíc' },
    { id: '@cf/openai/gpt-oss-120b', poskytovatel: 'workers', popis: 'gpt-oss 120B — nejsilnější na analýzy, uvažuje nahlas (pomalý, žere tokeny)' },
    { id: '@cf/meta/llama-3.2-3b-instruct', poskytovatel: 'workers', popis: 'Llama 3.2 3B — nejrychlejší, ale plete si i akci; jen na zkoušení' },
    // Placené modely. Bez kreditu na účtu spadne volání na zálohu zdarma.
    { id: 'claude-opus-5', poskytovatel: 'claude', popis: 'Claude Opus 5 — nejlepší, placený' },
    { id: 'claude-sonnet-5', poskytovatel: 'claude', popis: 'Claude Sonnet 5 — levnější než Opus, placený' },
    { id: 'claude-haiku-4-5', poskytovatel: 'claude', popis: 'Claude Haiku 4.5 — nejlevnější Claude, na pokyny bohatě stačí' }
];

/** Výchozí model, když je vybraný poskytovatel, ale ne konkrétní model. */
function vychoziModel(poskytovatel: string): string {
    return AI_MODELY.find(m => m.poskytovatel === poskytovatel)?.id ?? AI_MODELY[0].id;
}

/**
 * Úkoly, které mají vlastní volbu modelu.
 *
 * Poskytovatel zůstává společný — ten rozhoduje, jestli se vůbec platí a kam
 * data odcházejí. Model se ale liší úkol od úkolu: na rozřazení povelu stačí
 * ten nejmenší, analýza z rozumnějšího těží.
 *
 * **Přidání dalšího úkolu = jeden řádek tady + klíč do `VYCHOZI_NASTAVENI`.**
 * Nabídka v Nastavení i uložení se poskládají samy, `popis` překládá prohlížeč.
 */
const AI_UKOLY = [
    { klic: 'povely',  nastaveni: 'aiModelPovely' },
    { klic: 'analyzy', nastaveni: 'aiModel' }
] as const;

/**
 * Model pro daný úkol. Když uložená volba nepatří zvolenému poskytovateli
 * (typicky po přepnutí Workers AI ↔ Claude), vezme se výchozí model toho
 * poskytovatele — jinak by volání spadlo na neznámém ID.
 */
function modelProUkol(nas: Record<string, string>, ukol: string): string {
    const klic = AI_UKOLY.find(u => u.klic === ukol)?.nastaveni ?? 'aiModel';
    const zvoleny = nas[klic];
    const sedi = AI_MODELY.find(m => m.id === zvoleny)?.poskytovatel === nas.aiPoskytovatel;
    return sedi ? zvoleny : vychoziModel(nas.aiPoskytovatel);
}

/**
 * Uvažující model? Ty „přemýšlí nahlas" a **vnitřní uvažování se počítá do
 * `max_tokens`**. S limitem nastaveným pro běžný model dojdou tokeny dřív, než
 * začnou psát odpověď: vrátí `content: null`, `finish_reason: 'length'` a
 * aplikace hlásí „model neodpověděl". Přesně tohle dělal `gpt-oss-120b`.
 */
const jeUvazujici = (model: string) => /gpt-oss/i.test(model);

/** Strop tokenů. Uvažujícím modelům se musí přidat, jinak nezbude na odpověď. */
const stropTokenu = (model: string, bezny: number) =>
    jeUvazujici(model) ? Math.max(bezny * 4, 2000) : bezny;

/**
 * Text z odpovědi Workers AI. Každá rodina modelů ho vrací jinde.
 *
 * Llama a spol. dávají `{response}`. `gpt-oss` odpovídá tvarem kompatibilním
 * s OpenAI (`choices[0].message.content`), případně ve tvaru Responses API
 * (`{output:[{content:[{type:'output_text',text}]}]}`). V obou případech vedle
 * odpovědi leží i **uvažování** (`reasoning`, `reasoning_text`) — to se vzít
 * NESMÍ, je to vnitřní monolog modelu, ne odpověď pro trenéra.
 */
function textZWorkersAI(r: any): string {
    if (typeof r === 'string') return r;
    if (typeof r?.response === 'string') return r.response;
    if (typeof r?.result?.response === 'string') return r.result.response;

    // Responses API (gpt-oss): jen bloky `message`, nikdy `reasoning`.
    const vystup = Array.isArray(r?.output) ? r.output : (Array.isArray(r?.result?.output) ? r.result.output : null);
    if (vystup) {
        const kusy: string[] = [];
        for (const blok of vystup) {
            if (blok?.type && blok.type !== 'message') continue;
            for (const c of (Array.isArray(blok?.content) ? blok.content : [])) {
                if (typeof c?.text === 'string' && c.type !== 'reasoning_text') kusy.push(c.text);
            }
        }
        if (kusy.length) return kusy.join('');
    }

    // Tvar kompatibilní s OpenAI chat.
    const zprava = r?.choices?.[0]?.message?.content;
    if (typeof zprava === 'string') return zprava;

    return '';
}

/**
 * Proč nepřišel text — srozumitelně. „Zkus jiný model" samo o sobě nepomůže;
 * nejčastější příčina (uvažující model vyčerpal limit) má vlastní hlášku,
 * zbytek se ukáže tak, jak přišel, ať je co reportovat.
 */
function procNicNeprislo(r: any, model: string): string {
    const duvod = r?.choices?.[0]?.finish_reason;
    const uvazoval = r?.choices?.[0]?.message?.reasoning || r?.choices?.[0]?.message?.reasoning_content;
    if (duvod === 'length' && uvazoval) {
        return `Model ${model} spotřeboval celý limit tokenů na vnitřní uvažování `
             + 'a na odpověď mu nezbylo místo. Zvyš strop, nebo vyber model, který neuvažuje.';
    }
    try {
        const klice = r && typeof r === 'object' ? Object.keys(r).join(', ') : typeof r;
        return `Model ${model} nevrátil text. Odpověď: ${klice} · ${JSON.stringify(r).slice(0, 300)}`;
    } catch {
        return `Model ${model} vrátil nečitelnou odpověď.`;
    }
}

/**
 * Má se kvůli téhle chybě přepnout na zálohu zdarma?
 *
 * Vyčerpaný kredit i vyčerpaný limit jsou provozní stavy, ne chyba zadání —
 * appka kvůli nim nesmí přestat fungovat. Chybu v požadavku (400) naopak
 * zálohou zakrývat nemá; ta se má ukázat.
 */
function claudeNaZalohu(e: unknown): string | null {
    if (e instanceof Anthropic.RateLimitError) return 'Claude hlásí vyčerpaný limit (429).';
    if (e instanceof Anthropic.APIConnectionError) return 'Claude je nedostupný.';
    if (e instanceof Anthropic.APIStatusError) {
        if (e.type === 'billing_error') return 'Na účtu Anthropic došel kredit.';
        if (e.status === 402 || e.status === 403) return 'Anthropic účet nemá kredit nebo oprávnění.';
        if (e.status >= 500) return 'Anthropic má výpadek.';
        // 400 „credit balance is too low" chodí jako invalid_request_error.
        if (/credit balance|insufficient|quota/i.test(e.message)) return 'Na účtu Anthropic došel kredit.';
    }
    return null;
}

/* =====================================================================
   PODKLADY PRO ANALÝZY

   Čísla počítá kód, ne jazykový model. Průměr, rozdíl a pořadí jsou
   aritmetika — kdyby je skládal model, občas by se spletl a nikdo by si
   toho nevšiml, protože věta zní stejně sebejistě správně i špatně.
   Model dostane hotová čísla a jeho prací je formulace, ne výpočet.
   (Totéž rozdělení jako u faxx-hr: co jde spočítat, se počítá.)

   Pravidla ze zadání, která tady platí dál:
   - §7.4: u TRENDU se nepočítá souhrnné číslo ani průměr os — jen šipky
     a kolik os kam. Pásmo šumu 2 body.
   - Průměr se počítá jen tam, kde už je zavedený (srovnání hráčů) a vždy
     jako orientační souhrn, ne známka na vysvědčení.
   - Nic z toho nejde na tištěný list. Je to interní pohled trenéra (§7.5).
   ===================================================================== */

/** Orientační průměr ze šestice os. `null`, když nejsou čísla. */
function prumerOs(hodnoty: Record<string, number> | null, osy: string[]): number | null {
    if (!hodnoty) return null;
    const cisla = osy.map(k => hodnoty[k]).filter(x => typeof x === 'number');
    if (!cisla.length) return null;
    return Math.round((cisla.reduce((a, b) => a + b, 0) / cisla.length) * 10) / 10;
}

async function podkladyProAnalyzu(env: Env, obdobi: string, nas: Record<string, string>) {
    const tolerance = Number(nas.tolerance ?? 2);

    const { results: hraci } = await env.DB.prepare(
        `SELECT id, jmeno, prezdivka, post, pozice, sablona, sablony FROM players
          WHERE role = 'hrac' AND aktivni = 1 ORDER BY jmeno`
    ).all<{ id: number; jmeno: string; prezdivka: string | null; post: string | null;
            pozice: string; sablona: string; sablony: string }>();

    const zaznamy = [];
    for (const h of (hraci ?? [])) {
        // Které šablony vzít: co má hráč přiřazené plus co v období opravdu
        // vzniklo. Přiřazená bez hodnocení musí být vidět taky — je to díra,
        // ne prázdné místo.
        const { results: pouzite } = await env.DB.prepare(
            `SELECT DISTINCT sablona FROM evaluations WHERE player_id = ? AND obdobi = ?`
        ).bind(h.id, obdobi).all<{ sablona: string }>();
        const sablony = [...new Set([...(pouzite ?? []).map(s => s.sablona), ...sablonyOsoby(h)])];

        for (const sablona of sablony) {
            const osyKlice = klice(sablona);
            if (!osyKlice.length) continue;

            // Uzavřená shoda trenérů vyhrává nad posledním hodnocením — stejné
            // pravidlo jako na tiskovém listu, ať analýza a papír neříkají jiné číslo.
            const trener = await posledni(env, h.id, obdobi, 'shoda', sablona)
                ?? await posledni(env, h.id, obdobi, 'trener', sablona);
            const hrac = await posledni(env, h.id, obdobi, 'hrac', sablona);
            const driv = await predchoziObdobi(env, h.id, obdobi, sablona);

            const osy = osyKlice.map(klic => {
                const t = trener?.hodnoty[klic] ?? null;
                const s = hrac?.hodnoty[klic] ?? null;
                // Znaménko, ne absolutní hodnota: + = hráč si dal víc než trenér.
                const rozdil = t !== null && s !== null ? s - t : null;
                const zmena = t !== null && driv?.hodnoty[klic] !== undefined
                    ? t - driv.hodnoty[klic] : null;
                return {
                    klic, trener: t, hrac: s, rozdil,
                    resit: rozdil !== null && Math.abs(rozdil) > tolerance,
                    driv: driv?.hodnoty[klic] ?? null,
                    // §7.4: pásmo šumu, posun o 1 bod není signál
                    smer: zmena === null ? null : (Math.abs(zmena) >= PASMO_SUMU ? (zmena > 0 ? '↑' : '↓') : '→')
                };
            });

            zaznamy.push({
                player_id: h.id, jmeno: h.jmeno, prezdivka: h.prezdivka, post: h.post,
                pozice: JSON.parse(h.pozice ?? '[]') as string[],
                sablona,
                maTrener: !!trener, maHrac: !!hrac,
                prumerTrener: prumerOs(trener?.hodnoty ?? null, osyKlice),
                prumerHrac: prumerOs(hrac?.hodnoty ?? null, osyKlice),
                osy,
                // Slovní bloky jsou součást podkladu — analýza nad samotnými
                // čísly by přišla o polovinu toho, co trenér napsal.
                fyzicky: trener?.fyzicky ?? '', hlavou: trener?.hlavou ?? '',
                parta: trener?.parta ?? '', cile: trener?.cile ?? [],
                poznamkaHrace: hrac?.poznamka ?? '',
                predchoziObdobi: driv?.obdobi ?? null
            });
        }
    }

    /* --- souhrny za kádr --- */

    // Průměr osy napříč kádrem v rámci JEDNÉ šablony. Míchat brankářské
    // a polní osy dohromady nedává smysl — jiná šestice, jiná řada.
    const podleSablon: Record<string, { klic: string; soucet: number; pocet: number }[]> = {};
    for (const z of zaznamy) {
        if (!z.maTrener) continue;
        podleSablon[z.sablona] ??= klice(z.sablona).map(klic => ({ klic, soucet: 0, pocet: 0 }));
        for (const o of z.osy) {
            if (o.trener === null) continue;
            const cil = podleSablon[z.sablona].find(x => x.klic === o.klic)!;
            cil.soucet += o.trener; cil.pocet++;
        }
    }
    const osyKadru = Object.entries(podleSablon).map(([sablona, osy]) => ({
        sablona,
        osy: osy.filter(o => o.pocet)
            .map(o => ({ klic: o.klic, prumer: Math.round((o.soucet / o.pocet) * 10) / 10, hracu: o.pocet }))
            .sort((a, b) => a.prumer - b.prumer)      // nejslabší nahoře, tam se trénuje
    }));

    // Kde se pohledy nejvíc rozcházejí. Řadí se podle velikosti rozdílu bez
    // ohledu na znaménko — slepé místo i podceňování jsou obojí téma.
    const rozdily = zaznamy.flatMap(z => z.osy
        .filter(o => o.resit)
        .map(o => ({ player_id: z.player_id, jmeno: z.jmeno, sablona: z.sablona, klic: o.klic,
                     trener: o.trener, hrac: o.hrac, rozdil: o.rozdil! })))
        .sort((a, b) => Math.abs(b.rozdil) - Math.abs(a.rozdil));

    const jmenoListu = (f: (z: typeof zaznamy[number]) => boolean) =>
        [...new Set(zaznamy.filter(f).map(z => z.jmeno))];

    return {
        obdobi, tolerance,
        // Sestavy, které klub hraje. Pro model je to kontext k pozicím: „pravý bek
        // v 1-4-4-2" je něco jiného než v 1-3-5-2, a bez toho by hádal.
        sestavy: (nas.sestavy ?? '').trim(),
        kategorie: (nas.kategorie ?? '').trim(),
        latka: (nas.latka ?? '').trim(),
        pocty: {
            hracu: (hraci ?? []).length,
            listu: zaznamy.length,
            sHodnocenim: zaznamy.filter(z => z.maTrener).length,
            seSebehodnocenim: zaznamy.filter(z => z.maHrac).length,
            sObojim: zaznamy.filter(z => z.maTrener && z.maHrac).length
        },
        chybi: {
            bezHodnoceni: jmenoListu(z => !z.maTrener),
            bezSebehodnoceni: jmenoListu(z => z.maTrener && !z.maHrac)
        },
        osyKadru,
        rozdily,
        zaznamy
    };
}

/**
 * Podklady zhuštěné do textu pro jazykový model.
 *
 * Proč ne JSON: model dostane stejná čísla v polovině tokenů a čte to líp.
 * Popisky os a šablon posílá PROHLÍŽEČ (`popisky`) — Worker texty nedrží,
 * vrací klíče a překládá se až v UI. Neznámý klíč se použije, jak přišel.
 */
function podkladyDoTextu(p: any, popisky?: { osy?: Record<string, string>; sablony?: Record<string, string> }): string {
    const osa = (k: string) => popisky?.osy?.[k] ?? k;
    const sab = (k: string) => popisky?.sablony?.[k] ?? k;
    const r: string[] = [];

    r.push(`OBDOBÍ: ${p.obdobi} · tolerance ${p.tolerance} body`);
    if (p.kategorie || p.latka) {
        r.push(`KATEGORIE: ${p.kategorie || '—'}`
            + (p.latka ? ` · hodnotí se proti laťce „co má umět ${p.latka}", ne proti kádru` : ''));
    }
    if (p.sestavy) r.push(`SESTAVY, KTERÉ TÝM HRAJE: ${p.sestavy} (pozice hráčů čti v nich)`);
    r.push(`POČTY: ${p.pocty.hracu} aktivních hráčů, ${p.pocty.listu} kombinací hráč+šablona, `
        + `${p.pocty.sHodnocenim} s hodnocením trenéra, ${p.pocty.seSebehodnocenim} se sebehodnocením hráče, `
        + `${p.pocty.sObojim} s obojím (jen u nich jde porovnávat pohledy).`);

    if (p.osyKadru.length) {
        r.push('', 'PRŮMĚRY OS ZA CELÝ KÁDR (od nejslabší, jen hodnocení trenéra, v rámci jedné šablony):');
        for (const s of p.osyKadru) {
            r.push(`  ${sab(s.sablona)}: ` + s.osy.map((o: any) => `${osa(o.klic)} ${o.prumer} (${o.hracu} hr.)`).join(' · '));
        }
    }

    r.push('', `OSY NAD TOLERANCÍ (rozdíl hráč − trenér, + = hráč si dal víc):`);
    if (!p.rozdily.length) r.push('  žádné — chybí sebehodnocení, není co porovnávat');
    for (const d of p.rozdily.slice(0, 40)) {
        r.push(`  ${d.jmeno} (${sab(d.sablona)}) ${osa(d.klic)}: trenér ${d.trener}, hráč ${d.hrac}, rozdíl ${d.rozdil > 0 ? '+' : ''}${d.rozdil}`);
    }

    if (p.chybi.bezHodnoceni.length) {
        r.push('', `BEZ HODNOCENÍ TRENÉRA: ${p.chybi.bezHodnoceni.join(', ')}`);
    }
    if (p.chybi.bezSebehodnoceni.length) {
        r.push(`BEZ SEBEHODNOCENÍ: ${p.chybi.bezSebehodnoceni.join(', ')}`);
    }

    r.push('', 'JEDNOTLIVÍ HRÁČI:');
    for (const z of p.zaznamy) {
        const kdo = `${z.jmeno}${z.prezdivka ? ` „${z.prezdivka}"` : ''} (${sab(z.sablona)})`;
        if (!z.maTrener) { r.push(`  ${kdo}: bez hodnocení trenéra`); continue; }

        /* Rozdíl se u KAŽDÉ osy vypisuje spočítaný, ne jen u těch nad tolerancí.
           Když ho model nemá, dopočítá si ho sám — a plete si znaménko
           (u „3/4" hlásil −1 místo +1). Hotové číslo mu tu možnost bere. */
        const cisla = z.osy.filter((o: any) => o.trener !== null)
            .map((o: any) => {
                const rozdil = o.rozdil !== null ? ` (${o.rozdil > 0 ? '+' : ''}${o.rozdil})` : '';
                return `${osa(o.klic)} ${o.trener}${o.hrac !== null ? `/${o.hrac}` : ''}${rozdil}${o.smer ? ` ${o.smer}` : ''}`;
            })
            .join(', ');
        r.push(`  ${kdo}: ${cisla}`);
        r.push(`    orientační průměr trenér ${z.prumerTrener ?? '—'}`
            + (z.prumerHrac !== null ? `, hráč ${z.prumerHrac}` : ', hráč nevyplnil')
            + (z.predchoziObdobi ? ` · šipky proti období ${z.predchoziObdobi}` : ''));
        if (z.pozice?.length) r.push(`    pozice: ${z.pozice.join(', ')}${z.post ? ` · ${z.post}` : ''}`);
        const slovne = [
            z.fyzicky && `Fyzicky: ${z.fyzicky}`,
            z.hlavou && `Hlavou: ${z.hlavou}`,
            z.parta && `V partě: ${z.parta}`
        ].filter(Boolean).join(' | ');
        if (slovne) r.push(`    ${slovne}`);
        if (z.cile?.length) r.push(`    cíle: ${z.cile.join(' / ')}`);
        if (z.poznamkaHrace) r.push(`    hráč o sobě napsal: ${z.poznamkaHrace}`);
    }

    r.push('', 'POZNÁMKA: hodnoty jsou 1–10. Zápis „8/6 (-2)" znamená trenér 8, hráč 6, rozdíl −2.',
        'Rozdíl je vždy hráč minus trenér a je už spočítaný — nepřepočítávej ho.',
        'Šipka ↑ ↓ → je posun proti minulému období, za změnu se počítá až rozdíl 2 bodů.');
    return r.join('\n');
}

async function nastaveni(env: Env): Promise<Record<string, string>> {
    const { results } = await env.DB.prepare('SELECT klic, hodnota FROM settings').all<{ klic: string; hodnota: string }>();
    const out = { ...VYCHOZI_NASTAVENI };
    for (const r of results ?? []) out[r.klic] = r.hodnota;
    return out;
}

/* ===================== hodnocení ===================== */

interface RadekHodnoceni {
    id: number; player_id: number; datum: string; obdobi: string; autor: string;
    autor_id: number | null; sablona: string; hodnoty: string;
    fyzicky: string | null; hlavou: string | null;
    parta: string | null; cile: string | null; poznamka: string | null;
    uprava_id: number | null;
}

function rozbal(r: RadekHodnoceni) {
    return {
        id: r.id,
        player_id: r.player_id,
        datum: r.datum,
        obdobi: r.obdobi,
        autor: r.autor,
        autorId: r.autor_id ?? null,
        upravaId: r.uprava_id ?? null,
        sablona: r.sablona,
        hodnoty: JSON.parse(r.hodnoty) as Record<string, number>,
        fyzicky: r.fyzicky,
        hlavou: r.hlavou,
        parta: r.parta,
        cile: r.cile ? (JSON.parse(r.cile) as string[]) : [],
        poznamka: r.poznamka
    };
}

/**
 * Poslední hodnocení daného autora pro hráče a období. Append-only => bereme nejnovější.
 * `sablona` omezí výběr na jednu šestici os — hráč může mít v jednom období
 * hodnocení jako brankář i jako hráč v poli a míchat je dohromady nedává smysl.
 */
async function posledni(env: Env, playerId: number, obdobi: string, autor: string, sablona?: string) {
    const r = sablona
        ? await env.DB.prepare(
            `SELECT * FROM evaluations
              WHERE player_id = ? AND obdobi = ? AND autor = ? AND sablona = ?
              ORDER BY id DESC LIMIT 1`
        ).bind(playerId, obdobi, autor, sablona).first<RadekHodnoceni>()
        : await env.DB.prepare(
            `SELECT * FROM evaluations
              WHERE player_id = ? AND obdobi = ? AND autor = ?
              ORDER BY id DESC LIMIT 1`
        ).bind(playerId, obdobi, autor).first<RadekHodnoceni>();
    return r ? rozbal(r) : null;
}

/**
 * Šablony osoby jako pole. Hráč, který chytá, hraje v poli a je kapitán, má
 * všechny tři — každá je vlastní řada, vlastní odkaz a vlastní list.
 * Bere i starší tvar (jediná `sablona`), ať projdou i data před migrací 013.
 */
/**
 * Hodnocení musí být podepsané — bez autora se neuloží. Vrací text chyby,
 * nebo `null`, když je autor v pořádku.
 *
 * Netýká se sebehodnocení hráče: to chodí přes token na vlastní adrese,
 * ukládá se s `autor='hrac'` a autorem je hráč sám, žádné id trenéra nemá.
 */
async function overTrenera(env: Env, autorId: number | null): Promise<string | null> {
    if (!autorId) return 'Chybí, kdo hodnotí — vyber trenéra.';
    const kdo = await env.DB.prepare('SELECT role FROM players WHERE id = ?')
        .bind(autorId).first<{ role: string }>();
    if (!kdo) return 'Vybraný hodnotitel v databázi není.';
    if (kdo.role !== 'trener') return 'Hodnotit může jen trenér.';
    return null;
}

function sablonyOsoby(r: any): string[] {
    try {
        const s = JSON.parse(r?.sablony ?? 'null');
        if (Array.isArray(s)) {
            const ciste = [...new Set(s.map(String))].filter(x => x in SABLONY);
            if (ciste.length) return ciste;
        }
    } catch { /* padáme na jedinou šablonu níž */ }
    return [r?.sablona && r.sablona in SABLONY ? r.sablona : 'pole'];
}

/**
 * Hodnota parametru `obdobi`, která znamená „napříč všemi". Stejné slovo jako
 * u `ids=vse`, ať se to nemusí pamatovat dvakrát. Období, které by se doopravdy
 * jmenovalo „vse", by tím zmizelo z tisku — v nabídce se proto pozná podle
 * popisku, ne podle hodnoty, a tohle je jediné místo, kde to slovo stojí.
 */
const VSECHNA_OBDOBI = 'vse';

/**
 * Rozebere parametr `ids` na výběr hráčů, případně i jejich šablon.
 *
 * Položka je buď samotné číslo hráče (= všechny jeho šablony; tak to fungovalo
 * dřív a tak to posílají starší odkazy i příkazový řádek), nebo `id:sablona`
 * pro jednu konkrétní řadu. Neznámá šablona se zahodí — radši nic než tiše
 * všechno. Vrací `null`, když se nefiltruje (`vse` nebo prázdno).
 *
 * Používá se u tiskových listů i u odkazů na sebehodnocení; obě místa mají
 * tutéž otázku „koho a kterou šablonu" a nemá smysl ji řešit dvakrát.
 */
function rozeberIds(ids: string | null | undefined): { id: number; sablona: string | null }[] | null {
    if (!ids || ids === 'vse') return null;
    return ids.split(',').flatMap(kus => {
        const [cast, sablona] = kus.split(':');
        const id = Number(cast);
        if (!id) return [];
        if (sablona === undefined) return [{ id, sablona: null as string | null }];
        return sablona in SABLONY ? [{ id, sablona: sablona as string | null }] : [];
    });
}

/**
 * Které šablony vzít u konkrétního hráče podle výběru z `ids`.
 * Hráč zadaný aspoň jednou bez šablony dostane všechny své.
 */
function sablonyZVyberu(vyber: { id: number; sablona: string | null }[] | null, playerId: number): Set<string> | null {
    const zadane = vyber?.filter(v => v.id === playerId) ?? [];
    return zadane.length && zadane.every(v => v.sablona)
        ? new Set(zadane.map(v => v.sablona as string))
        : null;
}

/** Řádek osoby z D1 → objekt pro API (pozice a šablony jako pole, ne JSON řetězec). */
function osobaVen(r: any) {
    let pozice: string[] = [];
    try { pozice = JSON.parse(r.pozice ?? '[]'); } catch { pozice = []; }
    const sablony = sablonyOsoby(r);
    // `sablona` zůstává = první ze seznamu; starší klienti a ruční SQL tak dál sedí.
    return { ...r, pozice, sablony, sablona: sablony[0], aktivni: !!r.aktivni };
}

/**
 * Poslední trenérské hodnocení z JINÉHO (dřívějšího) období, stejnou šablonou.
 *
 * `predDatem` omezí hledání na to, co vzniklo dřív. Při tisku aktuálního období
 * to není potřeba (nic novějšího neexistuje), ale při tisku celé historie ano:
 * u listu za loňskou zimu by se jinak jako „minule" nabídlo letošní jaro
 * a šipka vývoje by ukazovala pozpátku.
 */
async function predchoziObdobi(env: Env, playerId: number, obdobi: string, sablona: string,
                               predDatem?: string | null) {
    const r = await env.DB.prepare(
        `SELECT * FROM evaluations
          WHERE player_id = ? AND obdobi <> ? AND autor = 'trener' AND sablona = ?
                ${predDatem ? 'AND datum < ?' : ''}
          ORDER BY id DESC LIMIT 1`
    ).bind(...[playerId, obdobi, sablona, ...(predDatem ? [predDatem] : [])])
     .first<RadekHodnoceni>();
    return r ? rozbal(r) : null;
}

/* ===================== shoda mezi trenéry ===================== */

/**
 * Porovná hodnocení povinných trenérů pro jednoho hráče, období a šablonu.
 *
 * Naslepo platí i mezi trenéry: kdo je povinný a ještě neodevzdal, cizí čísla
 * nevidí. Jinak by se k nim přisunul a shoda by byla falešná (§7.2 o úroveň výš).
 */
async function shoda(env: Env, playerId: number, obdobi: string, sablona: string, kdo: Session) {
    const nas = await nastaveni(env);
    const tolerance = Number(nas.tolerance) || 0;

    const { results: povinni } = await env.DB.prepare(
        `SELECT id, jmeno FROM players
          WHERE role = 'trener' AND aktivni = 1 AND hodnoceni_povinne = 1 ORDER BY jmeno`
    ).all<{ id: number; jmeno: string }>();

    // Poslední hodnocení každého trenéra (i nepovinného — ať je vidět, kdo se vyjádřil).
    const { results: vsechna } = await env.DB.prepare(
        `SELECT e.autor_id, e.hodnoty, e.fyzicky, e.hlavou, e.parta, e.cile, p.jmeno,
                MAX(e.id) AS posledni_id
           FROM evaluations e JOIN players p ON p.id = e.autor_id
          WHERE e.player_id = ? AND e.obdobi = ? AND e.sablona = ? AND e.autor = 'trener'
          GROUP BY e.autor_id`
    ).bind(playerId, obdobi, sablona).all<any>();

    const odevzdali = (vsechna ?? []).map(r => ({
        id: r.autor_id as number, jmeno: r.jmeno as string,
        hodnoty: JSON.parse(r.hodnoty) as Record<string, number>,
        fyzicky: r.fyzicky as string | null, hlavou: r.hlavou as string | null,
        parta: r.parta as string | null,
        cile: r.cile ? (JSON.parse(r.cile) as string[]) : []
    }));

    const chybi = (povinni ?? []).filter(p => !odevzdali.some(o => o.id === p.id));

    // Blind guard: povinný trenér, který ještě neodevzdal, nevidí nic cizího.
    if (kdo.id && (povinni ?? []).some(p => p.id === kdo.id)
        && !odevzdali.some(o => o.id === kdo.id)) {
        return {
            obdobi, sablona, tolerance, cekaNaTebe: true,
            chybi: chybi.map(c => c.jmeno), osy: [], odevzdali: [], hotovo: false
        };
    }

    const osy = klice(sablona).map(klic => {
        const hodnoty = odevzdali
            .filter(o => (povinni ?? []).some(p => p.id === o.id))     // shoda se počítá z povinných
            .map(o => ({ trener: o.jmeno, hodnota: o.hodnoty[klic] ?? null }))
            .filter(h => h.hodnota !== null) as { trener: string; hodnota: number }[];

        if (!hodnoty.length) return { klic, hodnoty, rozptyl: null, souhlasi: false, navrh: null };

        const cisla = hodnoty.map(h => h.hodnota);
        const rozptyl = Math.max(...cisla) - Math.min(...cisla);
        const souhlasi = rozptyl <= tolerance;
        // Návrh jen tam, kde se shodli — jinak by to bylo číslo, kterému nevěří ani jeden.
        const navrh = souhlasi ? Math.round(cisla.reduce((s, c) => s + c, 0) / cisla.length) : null;
        return { klic, hodnoty, rozptyl, souhlasi, navrh };
    });

    const uzavrena = await posledni(env, playerId, obdobi, 'shoda', sablona);

    return {
        obdobi, sablona, tolerance, cekaNaTebe: false,
        chybi: chybi.map(c => c.jmeno),
        odevzdali: odevzdali.map(o => ({
            id: o.id, jmeno: o.jmeno, povinny: (povinni ?? []).some(p => p.id === o.id),
            fyzicky: o.fyzicky, hlavou: o.hlavou, parta: o.parta, cile: o.cile
        })),
        osy,
        nesoulad: osy.filter(o => o.hodnoty.length > 1 && !o.souhlasi).length,
        hotovo: !chybi.length && osy.every(o => o.souhlasi),
        uzavrena: uzavrena ? { hodnoty: uzavrena.hodnoty, datum: uzavrena.datum } : null
    };
}

/* ===================== souhrnné notifikace ===================== */

/** Zapíše, že se něco stalo. Rozesílá se až souhrnně (cron), ne hned. */
async function zapisUdalost(env: Env, typ: 'hodnoceni' | 'sebehodnoceni',
                            playerId: number, obdobi: string, autorId: number | null) {
    try {
        await env.DB.prepare(
            'INSERT INTO udalosti (typ, player_id, obdobi, autor_id) VALUES (?, ?, ?, ?)'
        ).bind(typ, playerId, obdobi, autorId).run();
    } catch (e) {
        // Notifikace nesmí shodit uložení hodnocení — to je to podstatné.
        console.warn('Událost se nezapsala:', e instanceof Error ? e.message : String(e));
    }
}

/** Hodina v Praze (cron běží v UTC, nastavení je v místním čase). */
function prazskaHodina(kdy: Date): number {
    return Number(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Prague', hour: '2-digit', hour12: false
    }).format(kdy));
}

interface Prijemce {
    id: number; jmeno: string; email: string | null; telegram_chat_id: string | null;
    telefon: string | null;
    notif_email: number; notif_telegram: number; notif_sms: number;
}

/**
 * Sestaví text souhrnu. Jen „kdo a co" — žádné známky, žádné slovní bloky.
 * Prázdný seznam událostí není chyba: pak je to zpráva „nic se nezměnilo",
 * aby bylo poznat, že aplikace žije a jen se nic neděje.
 */
async function textSouhrnu(env: Env, udalosti: any[], nas: Record<string, string>,
                           zaklad: string, dnuTicha: number): Promise<string> {
    const sebe = udalosti.filter(u => u.typ === 'sebehodnoceni').map(u => u.jmeno);
    const trener = udalosti.filter(u => u.typ === 'hodnoceni')
        .map(u => u.autor ? `${u.jmeno} (${u.autor})` : u.jmeno);

    const stav = await env.DB.prepare(
        `SELECT
            (SELECT COUNT(*) FROM players WHERE role='hrac' AND aktivni=1) AS celkem,
            (SELECT COUNT(DISTINCT player_id) FROM evaluations WHERE obdobi=? AND autor='trener') AS odTrenera,
            (SELECT COUNT(DISTINCT player_id) FROM evaluations WHERE obdobi=? AND autor='hrac')   AS odHracu`
    ).bind(nas.obdobi, nas.obdobi).first<{ celkem: number; odTrenera: number; odHracu: number }>();

    const radky = [`${nas.klub} — hodnocení hráčů`, ''];

    if (udalosti.length) {
        if (sebe.length) radky.push(`Nová sebehodnocení (${sebe.length}): ${sebe.join(', ')}`);
        if (trener.length) radky.push(`Nová hodnocení trenéra (${trener.length}): ${trener.join(', ')}`);
    } else {
        radky.push(dnuTicha
            ? `Za posledních ${dnuTicha} dní se nic nezměnilo — žádné nové hodnocení ani sebehodnocení.`
            : 'Zatím se nic nezměnilo — žádné nové hodnocení ani sebehodnocení.');
        radky.push('Tohle není chyba, aplikace běží. Píše se to proto, abys poznal rozdíl');
        radky.push('mezi „nikdo nic nedělá" a „něco se rozbilo".');
    }

    radky.push('');
    radky.push(`Období ${nas.obdobi}: od trenéra ${stav?.odTrenera ?? 0} z ${stav?.celkem ?? 0}, `
        + `sebehodnocení ${stav?.odHracu ?? 0} z ${stav?.celkem ?? 0}.`);
    radky.push(zaklad);
    return radky.join('\n');
}

/**
 * Rozešle souhrn nerozeslaných událostí. `vynutit` obejde kontrolu času
 * (tlačítko „poslat teď"). Vrací lidsky čitelné řádky o tom, co se stalo —
 * ať je i bez znalosti vnitřností poznat, proč se něco (ne)poslalo.
 */
async function rozesliSouhrn(env: Env, zaklad: string, vynutit = false): Promise<string[]> {
    const zpravy: string[] = [];
    const nas = await nastaveni(env);

    const { results: udalostiRaw } = await env.DB.prepare(
        `SELECT u.id, u.typ, u.obdobi, p.jmeno, a.jmeno AS autor
           FROM udalosti u
           JOIN players p ON p.id = u.player_id
           LEFT JOIN players a ON a.id = u.autor_id
          WHERE u.odeslano = 0
          ORDER BY u.id`
    ).all<any>();
    const udalosti = udalostiRaw ?? [];

    const ted = new Date();
    const odMinule = nas.notifPosledni
        ? (ted.getTime() - new Date(nas.notifPosledni).getTime()) / 86400_000
        : Infinity;
    const dnuTicha = Number.isFinite(odMinule) ? Math.floor(odMinule) : 0;

    if (!vynutit) {
        if (nas.notifZapnuto !== '1') return ['Souhrny jsou v nastavení vypnuté.'];

        if (prazskaHodina(ted) !== Number((nas.notifCas || '19:00').split(':')[0])) return [];

        // Dva nezávislé intervaly: jak často psát, když se něco děje,
        // a po jaké době ticha se ozvat s tím, že se neděje nic.
        const potrebaZmeny = udalosti.length > 0 && odMinule >= Number(nas.notifDnyZmeny || '3');
        const potrebaTicha = udalosti.length === 0 && odMinule >= Number(nas.notifDnyTicho || '14');

        if (!potrebaZmeny && !potrebaTicha) {
            return udalosti.length
                ? [`Čeká ${udalosti.length} změn, ale od posledního souhrnu neuběhlo `
                    + `${nas.notifDnyZmeny} dní — pošle se později.`]
                : [];
        }
    }

    const { results: prijemci } = await env.DB.prepare(
        `SELECT id, jmeno, email, telegram_chat_id, telefon, notif_email, notif_telegram, notif_sms
           FROM players
          WHERE role = 'trener' AND aktivni = 1
            AND ((notif_email = 1 AND email IS NOT NULL)
              OR (notif_telegram = 1 AND telegram_chat_id IS NOT NULL)
              OR (notif_sms = 1 AND telefon IS NOT NULL))`
    ).all<Prijemce>();

    if (!prijemci?.length) {
        zpravy.push(`Je ${udalosti.length} nových událostí, ale nikdo nemá zapnutou notifikaci.`);
        return zpravy;
    }

    const text = await textSouhrnu(env, udalosti, nas, zaklad);
    let uspech = 0;

    for (const p of prijemci) {
        if (p.notif_telegram && p.telegram_chat_id) {
            const r = await posliTelegram(env, p.telegram_chat_id, text);
            zpravy.push(`Telegram → ${p.jmeno}: ${r.ok ? 'odesláno' : 'selhalo — ' + r.popis}`);
            await zalogujKomunikaci(env, {
                kanal: 'telegram', platforma: 'telegram-bot', playerId: p.id,
                adresa: p.telegram_chat_id, typ: 'souhrn',
                vysledek: r.ok ? 'ok' : 'chyba', podrobnosti: r.ok ? null : r.popis
            });
            if (r.ok) uspech++;
        }
        if (p.notif_email && p.email) {
            const ok = await posliMail(env, p.email, `${nas.klub} — hodnocení hráčů, souhrn`, text);
            zpravy.push(`E-mail → ${p.jmeno} (${p.email}): ${ok ? 'přijato k odeslání' : 'selhalo, viz log'}`);
            await zalogujKomunikaci(env, {
                kanal: 'email', platforma: 'cloudflare-email', playerId: p.id,
                adresa: p.email, typ: 'souhrn', vysledek: ok ? 'ok' : 'chyba'
            });
            if (ok) uspech++;
        }
        if (p.notif_sms && p.telefon) {
            // Do SMS jde jen první řádek souhrnu — každý segment stojí peníze.
            const r = await posliSmsHlidane(env, p.telefon,
                text.split('\n').filter(Boolean).slice(1, 3).join(' ') + ` ${zaklad}`, 'souhrn', p.id);
            zpravy.push(`SMS → ${p.jmeno} (${p.telefon}): ${r.popis}`);
            if (r.ok) uspech++;
        }
    }

    // Události označíme za vyřízené, jen když se aspoň někomu povedlo doručit —
    // jinak by se ztratily a nikdo by se o nich nedozvěděl.
    if (uspech) {
        await env.DB.batch([
            env.DB.prepare('UPDATE udalosti SET odeslano = 1 WHERE odeslano = 0'),
            env.DB.prepare(
                `INSERT INTO settings (klic, hodnota) VALUES ('notifPosledni', ?)
                 ON CONFLICT(klic) DO UPDATE SET hodnota = excluded.hodnota`
            ).bind(new Date().toISOString())
        ]);
    } else {
        zpravy.push('Nepodařilo se doručit nikomu, události zůstávají nevyřízené na příště.');
    }

    return zpravy;
}

/* ===================== router ===================== */

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Bezpečnostní hlavičky přidává jedno místo pro všechny odpovědi —
        // včetně souborů z asset serveru, ten si je sám nepřidá.
        return sBezpecnostnimiHlavickami(await smerovac(request, env));
    },

    /* Cron běží každou hodinu; jestli je zrovna ta správná, rozhodne Worker
       podle času v Nastavení (v pražské zóně). Cloudflare umí jen UTC. */
    async scheduled(_udalost: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil((async () => {
            const zpravy = await rozesliSouhrn(env, env.ZAKLADNI_URL || 'https://hodnoceni.maxferit.cz');
            for (const z of zpravy) console.log('Souhrn:', z);
        })());
    }
} satisfies ExportedHandler<Env>;

/** Vlastní směrování požadavků. Odpověď ještě projde `sBezpecnostnimiHlavickami`. */
async function smerovac(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cesta = url.pathname;
    const https = url.protocol === 'https:';

    try {
        /* ---------- health a verze ---------- */
        if (cesta === '/health') {
            return json({ status: 'ok', module: MODUL, timestamp: new Date().toISOString() });
        }
        if (cesta === '/.well-known/security.txt') {
            return securityTxt(url);
        }
        if (cesta === '/api/version') {
            // Verze je zapečená v bundlu, ne čtená z assetu — ten na custom
            // doméně držela cache zóny a lišta ukazovala předchozí commit.
            // no-store navíc brání tomu, aby se držela samotná odpověď.
            return json(VERZE, 200, { 'cache-control': 'no-store' });
        }

        /* ---------- stránka sebehodnocení ----------
           Token zůstává v adrese, stránku si Worker vytáhne sám.
           Proto má asset server vypnuté html_handling — jinak by
           /h.html přesměroval na /h a token by z URL zmizel.      */
        if (cesta === '/h' || cesta.startsWith('/h/')) {
            return soubor(env, request, url, '/h.html');
        }

        /* ---------- veřejné API pro hráče ---------- */
        if (cesta.startsWith('/api/self/')) {
            return await self(request, env, cesta.slice('/api/self/'.length));
        }

        /* ---------- obnova zapomenutého hesla (veřejné) ---------- */
        if (cesta === '/obnova' || cesta.startsWith('/obnova/')) {
            return soubor(env, request, url, '/obnova.html');
        }
        if (cesta === '/api/obnova' && request.method === 'POST') {
            return await zadostOObnovu(request, env, url);
        }
        if (cesta.startsWith('/api/obnova/')) {
            return await obnovaHesla(request, env, cesta.slice('/api/obnova/'.length));
        }

        /* ---------- přihlášení ---------- */
        if (cesta === '/api/login' && request.method === 'POST') {
            const { login, heslo } = await request.json<{ login?: string; heslo?: string }>();

            // Heslo smí být krátký PIN, takže prodleva sama nestačí — marné
            // pokusy se počítají a po pár zkouškách se přihlášení zamkne.
            const ip = request.headers.get('cf-connecting-ip') ?? 'neznama';
            const klicUctu = login && login.trim()
                ? `ucet:${login.trim().toLowerCase()}`
                : 'ucet:@spolecne';
            const klicIp = `ip:${ip}`;

            const zamek = await zamceno(env, klicUctu, klicIp);
            if (zamek) return chyba(zamek, 429);

            // Prodleva u nezdaru: aplikace je veřejná a chrání data nezletilých,
            // hádání hesla ve smyčce tím přestane být praktické.
            const nezdar = async (zprava: string, kod = 401, zapocitat = true) => {
                if (zapocitat) await zapisNezdar(env, klicUctu, klicIp, ip);
                await new Promise(hotovo => setTimeout(hotovo, 700));
                return chyba(zprava, kod);
            };
            if (!heslo) return nezdar('Chybí heslo.', 401, false);

            if (login && login.trim()) {
                const v = await overUcet(env, login, heslo);
                if (v.stav === 'neznamy' || v.stav === 'spatne') {
                    return nezdar('Špatné přihlašovací jméno nebo heslo.');
                }
                if (v.stav === 'bezHesla') {
                    // Účet bez hesla není špatný pokus — nemá se čím trefit.
                    return nezdar('Tenhle účet ještě nemá nastavené heslo. '
                        + 'Použij „Zapomenuté heslo" a přijde ti odkaz na jeho nastavení.', 409, false);
                }
                await smazNezdary(env, klicUctu, klicIp);
                return json({ prihlasen: true, jmeno: v.ucet.jmeno, id: v.ucet.id }, 200, {
                    'set-cookie': cookieHlavicka(
                        await vytvorSession(env, { id: v.ucet.id, jmeno: v.ucet.jmeno }),
                        https, SESSION_HODIN * 3600)
                });
            }

            /* Bez přihlašovacího jména se zkouší dvojí: nejdřív přechodné
               společné heslo, potom OSOBNÍ PIN. Pořadí je důležité —
               společné heslo je jedno a známé, osobní PIN identifikuje
               člověka a musí přebít jen tehdy, když to společné není. */
            const vysledek = await overHeslo(env, heslo);
            if (vysledek === 'nenastaveno') {
                return chyba('Na serveru není nastavené žádné heslo (chybí secret ADMIN_HESLO '
                    + 'a v databázi není uložené společné heslo). Aplikace se takhle nedá odemknout.', 500);
            }

            if (vysledek === 'ok') {
                await smazNezdary(env, klicUctu, klicIp);
                return json({ prihlasen: true, jmeno: null, id: null }, 200, {
                    'set-cookie': cookieHlavicka(await vytvorSession(env), https, SESSION_HODIN * 3600)
                });
            }

            /* Osobní PIN pozná člověka sám. Podepsané hodnocení tak nese
               jméno i tehdy, když se trenér přihlásil jen čtyřmi číslicemi. */
            const trefy = await najdiUcetPodleHesla(env, heslo);
            if (trefy.length > 1) {
                // Hádat, kdo to je, se nesmí — podepsalo by se cizím jménem.
                return nezdar('Tenhle PIN má nastavený víc lidí. Přihlas se i přihlašovacím '
                    + 'jménem, ať je jasné, kdo hodnocení podepisuje.', 409, false);
            }
            if (trefy.length === 1) {
                const u = trefy[0];
                await smazNezdary(env, klicUctu, klicIp);
                return json({ prihlasen: true, jmeno: u.jmeno, id: u.id }, 200, {
                    'set-cookie': cookieHlavicka(
                        await vytvorSession(env, { id: u.id, jmeno: u.jmeno }),
                        https, SESSION_HODIN * 3600)
                });
            }

            return nezdar('Špatné heslo.');
        }
        if (cesta === '/api/logout' && request.method === 'POST') {
            return json({ prihlasen: false }, 200, { 'set-cookie': cookieHlavicka('', https, 0) });
        }
        if (cesta === '/api/me') {
            const s = await overSession(env, request.headers.get('cookie'));
            return json({ prihlasen: !!s, jmeno: s?.jmeno ?? null, id: s?.id ?? null });
        }

        /* ---------- dokumentace jako samostatné stránky ----------
           Za přihlášením schválně: osobní údaje v ní nejsou, ale provozní
           podrobnosti (ID kanálu, verze, otevřené díry v GDPR) na veřejný
           web nepatří. Proto neleží ve `web/`, odkud by je ASSETS
           servírovalo komukoliv. */
        if (cesta === '/dok' || cesta.startsWith('/dok/')) {
            const s = await overSession(env, request.headers.get('cookie'));
            if (!s) {
                // Přihlašovací stránka je v kořeni; návrat sem řeší člověk
                // sám, odkaz na dokument si otevře znovu.
                return new Response(null, { status: 302, headers: { location: '/' } });
            }
            return dokumentStranka(cesta.slice('/dok'.length).replace(/^\//, ''));
        }

        /* ---------- admin API ---------- */
        if (cesta.startsWith('/api/')) {
            const s = await overSession(env, request.headers.get('cookie'));
            if (!s) return chyba('Nepřihlášen.', 401);
            return await admin(request, env, url, s);
        }

        /* ---------- statické soubory ---------- */
        return soubor(env, request, url, cesta === '/' ? '/index.html' : cesta);

    } catch (e) {
        const zprava = e instanceof Error ? e.message : String(e);
        console.error('Chyba požadavku', cesta, zprava);
        return chyba(`Chyba serveru: ${zprava}`, 500);
    }
}

/* ===================== bezpečnostní hlavičky ===================== */

/**
 * Hlavičky, které má nést každá odpověď. Nastavují se jen tam, kde ještě
 * nejsou, aby si je konkrétní odpověď mohla přepsat.
 *
 * CSP: skripty smí jen z vlastní domény — proto je i přepínač vzhledu
 * v `/theme.js` a ne inline v HTML (viz web/theme.js). Styly naopak
 * 'unsafe-inline' potřebují: aplikace skládá HTML s atributem `style=`
 * na desítkách míst a stránky dokumentace mají styl přímo v hlavičce.
 * Bez 'unsafe-inline' by se rozsypal vzhled, ne bezpečnost.
 *
 * Dvě věci do stránky vkládá sama zóna Cloudflare, ne aplikace:
 *  - beacon Web Analytics ze `static.cloudflareinsights.com` (proto je
 *    v `script-src`; data posílá na vlastní doménu, `connect-src 'self'` stačí)
 *  - bootstrap bot detekce, a ten je **inline** — proto nonce. Cloudflare si
 *    ho vyzobne z týhle hlavičky a svým skriptům ho doplní; bez toho by se
 *    musela povolit všechna inline skripty a CSP by ztratila smysl.
 * Nonce proto musí být v každé odpovědi jiný.
 */
function bezpecnostniHlavicky(): Record<string, string> {
    const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
    return {
        'content-security-policy': [
            "default-src 'self'",
            `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "connect-src 'self'",
            "font-src 'self'",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            // Pojistka, ne oprava: dnes aplikace žádnou http:// adresu nenačítá.
            // Kdyby se někdy do obsahu dostala, prohlížeč ji sáhne přes https
            // místo aby ji zablokoval. Lokálnímu vývoji to nevadí — 127.0.0.1
            // je „potentially trustworthy" a neupgraduje se.
            'upgrade-insecure-requests'
        ].join('; '),
        // frame-ancestors výše platí pro moderní prohlížeče, tohle pro ty staré.
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        // Odkaz na sebehodnocení nese token přímo v adrese — na cizí web se smí
        // dostat nanejvýš samotná doména, nikdy celá cesta i s tokenem.
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        // Starý XSS Auditor měl vlastní díry a moderní prohlížeče ho nemají;
        // explicitní 0 zajistí, že ho nezapne ani zastaralý prohlížeč.
        'x-xss-protection': '0'
    };
}

function sBezpecnostnimiHlavickami(odpoved: Response): Response {
    const hlavicky = new Headers(odpoved.headers);
    for (const [jmeno, hodnota] of Object.entries(bezpecnostniHlavicky())) {
        if (!hlavicky.has(jmeno)) hlavicky.set(jmeno, hodnota);
    }
    // Hlavičky odpovědi z fetch() (asset server) jsou jen ke čtení,
    // musí vzniknout nová odpověď.
    return new Response(odpoved.body, {
        status: odpoved.status,
        statusText: odpoved.statusText,
        headers: hlavicky
    });
}

/**
 * Kontakt pro nálezce chyb podle RFC 9116 (/.well-known/security.txt).
 * Platnost se dopočítává za běhu — pevné datum by jednou tiše propadlo
 * a soubor by přestal platit, aniž by si toho někdo všiml.
 */
function securityTxt(url: URL): Response {
    const platnost = new Date(Date.now() + 365 * 24 * 3600 * 1000)
        .toISOString().replace(/\.\d{3}Z$/, 'Z');
    const telo = [
        '# Našel jsi v téhle aplikaci bezpečnostní problém? Napiš, prosím, sem.',
        `Contact: mailto:${KONTAKT_BEZPECNOST}`,
        `Expires: ${platnost}`,
        'Preferred-Languages: cs, en',
        `Canonical: ${url.origin}/.well-known/security.txt`,
        ''
    ].join('\n');
    return new Response(telo, {
        headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=86400'
        }
    });
}

/**
 * Vrátí statický soubor z ./web, aniž by se měnila adresa v prohlížeči.
 * Hlavičky požadavku se předávají dál kvůli `if-none-match` — bez nich by
 * asset server nikdy neodpověděl 304 a prohlížeč by tahal app.js pokaždé znovu.
 */
function soubor(env: Env, request: Request, url: URL, cesta: string): Promise<Response> {
    return env.ASSETS.fetch(new Request(new URL(cesta, url), {
        method: 'GET',
        headers: request.headers
    }));
}

/* ===================== dokumentace jako stránky ===================== */

/** Escapuje text do HTML. Samotné tělo dokumentu escapuje už generátor. */
function escHtml(hodnota: unknown): string {
    return String(hodnota ?? '').replace(/[&<>"']/g, z => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[z] as string));
}

/** Kotva z nadpisu — musí dávat stejný výsledek jako `scripts/gen-dokumenty.mjs`. */
function kotvaNadpisu(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

const DOK_STYL = `
:root { --txt:#1b2431; --tlum:#5b6b7f; --linka:#dde3ea; --pozadi:#fff; --panel:#f6f8fa; --odkaz:#0b5cab; }
@media (prefers-color-scheme: dark) {
  :root { --txt:#e6edf5; --tlum:#9fb0c4; --linka:#2a3746; --pozadi:#131a22; --panel:#1a232e; --odkaz:#7ab8f5; }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--pozadi); color:var(--txt);
       font:16px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
.obal { max-width: 980px; margin: 0 auto; padding: 24px 20px 80px; }
a { color: var(--odkaz); }
.rozcestnik { background: var(--panel); border:1px solid var(--linka); border-radius:10px;
              padding:14px 16px; margin-bottom:22px; }
.rozcestnik h2 { margin:0 0 8px; font-size:14px; text-transform:uppercase;
                 letter-spacing:.6px; color:var(--tlum); }
.rozcestnik ul { list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:6px; }
.rozcestnik a { display:inline-block; padding:5px 11px; border:1px solid var(--linka);
                border-radius:999px; text-decoration:none; font-size:14px; background:var(--pozadi); }
.rozcestnik a.tady { background:var(--odkaz); color:#fff; border-color:var(--odkaz); font-weight:600; }
.obsah { background:var(--panel); border:1px solid var(--linka); border-radius:10px;
         padding:14px 16px; margin:0 0 26px; }
.obsah h2 { margin:0 0 8px; font-size:14px; text-transform:uppercase;
            letter-spacing:.6px; color:var(--tlum); }
.obsah ol { margin:0; padding-left:20px; columns:2; column-gap:26px; }
.obsah li { margin:2px 0; break-inside:avoid; }
h1 { font-size:26px; margin:0 0 4px; }
.zdroj { color:var(--tlum); font-size:13px; margin:0 0 20px; font-family:Consolas,monospace; }
/* Odkaz na soubor, který se na web nepřevádí (migrace, vzorový list).
   Modrý podtržený odkaz vedoucí na 404 je horší než obyčejný text. */
.bezodkazu { font-family:Consolas,monospace; font-size:13.5px; color:var(--tlum); }
h2 { font-size:20px; margin:30px 0 8px; padding-top:6px; border-top:1px solid var(--linka); }
h3 { font-size:16px; margin:20px 0 6px; }
h4 { font-size:15px; margin:16px 0 4px; color:var(--tlum); }
p, li { max-width: 78ch; }
code { background:var(--panel); border:1px solid var(--linka); padding:1px 5px;
       border-radius:4px; font-size:13.5px; font-family:Consolas,monospace; }
pre { background:var(--panel); border:1px solid var(--linka); border-radius:8px;
      padding:12px 14px; overflow-x:auto; }
pre code { background:none; border:0; padding:0; font-size:13px; }
blockquote { margin:12px 0; padding:8px 14px; border-left:3px solid var(--odkaz);
             background:var(--panel); border-radius:0 8px 8px 0; }
blockquote p { margin:4px 0; }
.tabulka { overflow-x:auto; margin:12px 0; }
table { border-collapse:collapse; font-size:14.5px; }
th, td { border:1px solid var(--linka); padding:6px 10px; text-align:left; vertical-align:top; }
th { background:var(--panel); }
hr { border:0; border-top:1px solid var(--linka); margin:26px 0; }
.zpet { display:inline-block; margin-bottom:16px; text-decoration:none; font-size:14px; }
@media (max-width: 700px) { .obsah ol { columns:1; } body { font-size:15px; } }
@media print { .rozcestnik, .zpet { display:none; } body { background:#fff; color:#000; } }
`;

/**
 * Vykreslí jeden dokument, nebo rozcestník, když se žádný nevybral.
 * Rozcestník stojí nahoře na každé stránce — mezi dokumenty se přeskakuje
 * pořád dokola a vracet se kvůli tomu do aplikace by bylo otravné.
 */
function dokumentStranka(klic: string): Response {
    const dok = DOKUMENTY.find(d => d.klic === klic);

    const rozcestnik = `<nav class="rozcestnik"><h2>Dokumentace</h2><ul>`
        + DOKUMENTY.map(d => `<li><a href="/dok/${d.klic}"${d.klic === klic ? ' class="tady"' : ''}>`
            + `${escHtml(d.titulek)}</a></li>`).join('')
        + `</ul></nav>`;

    const telo = dok
        ? `<h1>${escHtml(dok.titulek)}</h1>
           <p class="zdroj">${escHtml(dok.zdroj)}</p>
           ${dok.kapitoly.length > 1 ? `<div class="obsah"><h2>Kapitoly</h2><ol>`
                + dok.kapitoly.map(k => `<li><a href="#${kotvaNadpisu(k)}">${escHtml(k)}</a></li>`).join('')
                + `</ol></div>` : ''}
           ${dok.html}`
        : `<h1>Dokumentace</h1>
           <p>Vyber si dokument nahoře. Každý odpovídá na jinou otázku — od toho,
              jak se aplikace ovládá, přes to, co dělat, když něco nefunguje,
              až po deník, proč je něco udělané zrovna takhle.</p>`;

    return new Response(
        `<!doctype html><html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(dok ? dok.titulek : 'Dokumentace')} — Hodnocení hráčů</title>
<style>${DOK_STYL}</style></head><body><div class="obal">
<a class="zpet" href="/">&larr; Zpět do aplikace</a>
${rozcestnik}
${telo}
</div></body></html>`,
        { status: dok || !klic ? 200 : 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
    );
}

/* ===================== veřejná část (hráč) ===================== */

async function self(request: Request, env: Env, token: string): Promise<Response> {
    if (!token || token.length < 20) return chyba('Neplatný odkaz.', 404);

    // Šablona je na tokenu, ne na osobě: hráč musí vyplnit tytéž osy, které
    // známkoval trenér, jinak by se porovnávaly dvě různé šestice.
    const t = await env.DB.prepare(
        `SELECT t.token, t.player_id, t.obdobi, t.pouzit, t.platny_do, t.sablona,
                p.jmeno, p.prezdivka
           FROM tokens t JOIN players p ON p.id = t.player_id
          WHERE t.token = ?`
    ).bind(token).first<{
        token: string; player_id: number; obdobi: string; pouzit: number;
        platny_do: string | null; jmeno: string; prezdivka: string | null; sablona: string;
    }>();

    if (!t) return chyba('Odkaz neplatí. Napiš trenérovi, pošle ti nový.', 404);
    if (t.platny_do && new Date(t.platny_do) < new Date()) {
        return chyba('Odkazu vypršela platnost. Napiš trenérovi, pošle ti nový.', 410);
    }

    /* --- GET: co smí hráč vidět. Nic z hodnocení trenéra (§7.1),
           žádné předchozí hodnoty (§7.2), nic o jiných hráčích. --- */
    if (request.method === 'GET') {
        return json({
            jmeno: t.jmeno,
            prezdivka: t.prezdivka,
            obdobi: t.obdobi,
            sablona: t.sablona,
            osy: klice(t.sablona),      // jen klíče, popisy si přeloží prohlížeč
            pouzit: !!t.pouzit
        });
    }

    if (request.method !== 'POST') return chyba('Nepodporovaná metoda.', 405);
    if (t.pouzit) return chyba('Sebehodnocení už jsi jednou odeslal. Podruhé to nejde.', 409);

    const telo = await request.json<{ hodnoty?: Record<string, number>; poznamka?: string }>();
    const problem = zkontrolujHodnoty(t.sablona, telo.hodnoty);
    if (problem) return chyba(problem, 400);

    const poznamka = (telo.poznamka ?? '').slice(0, 500) || null;

    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO evaluations (player_id, obdobi, autor, sablona, hodnoty, poznamka)
             VALUES (?, ?, 'hrac', ?, ?, ?)`
        ).bind(t.player_id, t.obdobi, t.sablona, JSON.stringify(telo.hodnoty), poznamka),
        env.DB.prepare('UPDATE tokens SET pouzit = 1 WHERE token = ?').bind(token)
    ]);

    await zapisUdalost(env, 'sebehodnoceni', t.player_id, t.obdobi, null);
    return json({ ulozeno: true });
}

/* ===================== obnova zapomenutého hesla ===================== */

/** Adresy, na které se smí obnova poslat. Nastavuje se secretem, ne z aplikace —
 *  jinak by si cíl obnovy přesměroval ten, kdo se do aplikace zrovna dostal. */
function povoleneAdresy(env: Env): string[] {
    return (env.OBNOVA_EMAILY ?? '').split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
}

async function posliMail(env: Env, komu: string, predmet: string, text: string): Promise<boolean> {
    if (!env.EMAIL) {
        console.warn('Obnova hesla: binding EMAIL chybí, mail se neodeslal.');
        return false;
    }
    const from = { email: env.EMAIL_FROM || 'hodnoceni@maxferit.cz', name: 'Hodnocení hráčů' };
    try {
        await env.EMAIL.send({
            to: komu, from, subject: predmet, text,
            html: `<pre style="font:inherit;white-space:pre-wrap;margin:0">${text
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
        });
        return true;
    } catch (e: any) {
        // E_SENDER_NOT_VERIFIED = doména odesílatele není onboardovaná,
        // E_RECIPIENT_NOT_ALLOWED = adresa příjemce není ověřená destination address.
        console.warn(`Obnova hesla — odeslání selhalo: ${e?.code ?? ''} ${e?.message ?? e}`);
        return false;
    }
}

/**
 * Vytvoří jednorázový odkaz a pošle ho na kanály toho konkrétního člověka.
 * Nikdy se neposílá heslo — heslo poslané zprávou zůstane ve schránce navždy.
 * Vrací lidsky čitelné řádky (pro tlačítko „poslat pozvánku" v administraci).
 */
async function posliObnovu(env: Env, u: Ucet, zaklad: string, lang: string): Promise<string[]> {
    const token = novyToken();
    const platnyDo = new Date(Date.now() + OBNOVA_MINUT * 60_000).toISOString();
    await env.DB.prepare(
        'INSERT INTO obnova (token, email, platny_do, player_id) VALUES (?, ?, ?, ?)'
    ).bind(token, u.email ?? '', platnyDo, u.id).run();

    const odkaz = `${zaklad}/obnova/${token}`;
    const en = lang === 'en';
    const predmet = en ? 'Player evaluation — set your password' : 'Hodnocení hráčů — nastavení hesla';
    const text = en
        ? `Hi ${u.jmeno},\n\nSet your password here (valid ${OBNOVA_MINUT} minutes, single use):\n${odkaz}\n\nYour sign-in name is: ${u.login}\n\nIf you did not ask for this, ignore the message — nothing changed.`
        : `Ahoj ${u.jmeno},\n\nHeslo si nastavíš tady (platí ${OBNOVA_MINUT} minut, jen jednou):\n${odkaz}\n\nPřihlašovací jméno máš: ${u.login}\n\nPokud jsi o to nežádal, zprávu ignoruj — nic se nezměnilo.`;

    const zpravy: string[] = [];
    if (u.telegram_chat_id) {
        const r = await posliTelegram(env, u.telegram_chat_id, `${predmet}\n\n${text}`);
        zpravy.push(`Telegram → ${u.jmeno}: ${r.ok ? 'odesláno' : 'selhalo — ' + r.popis}`);
        // Do logu jde jen metadata — odkaz s tokenem tam nesmí, byl by to
        // reset hesla čekající na zneužití.
        await zalogujKomunikaci(env, {
            kanal: 'telegram', platforma: 'telegram-bot', playerId: u.id,
            adresa: u.telegram_chat_id, typ: 'obnova',
            vysledek: r.ok ? 'ok' : 'chyba', kod: r.ok ? null : 'SEND',
            podrobnosti: r.ok ? null : r.popis
        });
    }
    if (u.email) {
        const ok = await posliMail(env, u.email, predmet, text);
        zpravy.push(`E-mail → ${u.jmeno} (${u.email}): ${ok ? 'přijato k odeslání' : 'selhalo, viz log'}`);
        await zalogujKomunikaci(env, {
            kanal: 'email', platforma: 'cloudflare-email', playerId: u.id,
            adresa: u.email, typ: 'obnova', vysledek: ok ? 'ok' : 'chyba'
        });
    }
    if (u.telefon) {
        // SMS nese jen krátkou pobídku a odkaz; delší text by zbytečně přidal segmenty.
        // Kdo píše, řekne hlavička — tady stačí, k čemu odkaz je.
        const r = await posliSmsHlidane(env, u.telefon,
            `${en ? 'password reset' : 'obnova hesla'} ${odkaz}`, 'obnova', u.id);
        zpravy.push(`SMS → ${u.jmeno} (${u.telefon}): ${r.popis}`);
    }
    if (!zpravy.length) {
        zpravy.push(`${u.jmeno} nemá vyplněný e-mail, Telegram ani telefon — nemá kam odkaz poslat.`);
    }
    return zpravy;
}

/**
 * Žádost o obnovu. Odpověď je vždycky stejná, ať se nedá zjišťovat,
 * která přihlašovací jména existují.
 */
async function zadostOObnovu(request: Request, env: Env, url: URL): Promise<Response> {
    const { login, email, lang } = await request.json<{ login?: string; email?: string; lang?: string }>();
    const neutralni = json({ odeslano: true });
    const vstup = (login ?? email ?? '').trim();

    // Tvar vstupu se říct smí — neprozrazuje, kdo účet má, a ušetří člověka
    // hádání, proč nic nepřišlo. Mlčet se má jen o existenci účtu.
    if (!vstup) return chyba('Vyplň přihlašovací jméno nebo e-mail.', 400);
    const jeMail = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(vstup);
    const jeLogin = /^[a-z0-9._-]{2,40}$/i.test(vstup);
    if (!jeMail && !jeLogin) {
        return chyba('Tohle nevypadá jako přihlašovací jméno ani e-mail.', 400);
    }

    // Brzda na spamování: pár žádostí za okno a dost. Že brzda sepnula, se řekne
    // nahlas — dřív to vypadalo stejně jako úspěch a nikdo nevěděl, na čem je.
    const nedavno = await env.DB.prepare(
        `SELECT COUNT(*) AS pocet FROM obnova WHERE created_at > datetime('now', ?)`
    ).bind(`-${OBNOVA_MINUT} minutes`).first<{ pocet: number }>();
    if ((nedavno?.pocet ?? 0) >= OBNOVA_MAX_ZA_OKNO) {
        return chyba(`Za posledních ${OBNOVA_MINUT} minut už odešly ${OBNOVA_MAX_ZA_OKNO} žádosti o obnovu. `
            + 'Počkej chvíli a zkus to znovu — a mrkni i do spamu, jestli odkaz nedorazil.', 429);
    }

    // 1) Účet po lidech — odkaz jde na kanály toho člověka. Hledá se podle
    //    přihlašovacího jména i e-mailu, ať nezáleží, co si člověk pamatuje.
    const u = await najdiUcet(env, vstup);
    if (u) {
        const zpravy = await posliObnovu(env, u, url.origin, lang ?? 'cs');
        for (const z of zpravy) console.log('Obnova:', z);
        return neutralni;
    }

    // 2) Přechodné společné heslo — odkaz jde na adresy ze secretu.
    const adresa = vstup.toLowerCase();
    if (!povoleneAdresy(env).includes(adresa)) {
        // Nic se nenašlo. Že účet neexistuje, se neřekne (dalo by se tím zjišťovat,
        // kdo účet má), ale v logu komunikace to vidět je — jinak by trenér neměl
        // šanci poznat, jestli vůbec někdo o obnovu žádal.
        await zalogujKomunikaci(env, {
            kanal: 'obnova', platforma: 'zadost', adresa: vstup, typ: 'obnova',
            vysledek: 'preskoceno', kod: 'NEZNAMY',
            podrobnosti: 'Žádost o obnovu na jméno/adresu, která k žádnému účtu nepatří.'
        });
        return neutralni;
    }

    const token = novyToken();
    const platnyDo = new Date(Date.now() + OBNOVA_MINUT * 60_000).toISOString();
    await env.DB.prepare('INSERT INTO obnova (token, email, platny_do) VALUES (?, ?, ?)')
        .bind(token, adresa, platnyDo).run();

    const odkaz = `${url.origin}/obnova/${token}`;
    const en = lang === 'en';
    await posliMail(
        env, adresa,
        en ? 'Player evaluation — password reset' : 'Hodnocení hráčů — obnova hesla',
        en
            ? `Someone asked to reset the shared password.\n\nSet a new one here (valid ${OBNOVA_MINUT} minutes, single use):\n${odkaz}\n\nIf it wasn't you, ignore this e-mail — nothing has changed.`
            : `Někdo požádal o obnovu společného hesla.\n\nNové heslo si nastavíš tady (platí ${OBNOVA_MINUT} minut, jen jednou):\n${odkaz}\n\nPokud to nebyl ty, e-mail ignoruj — nic se nezměnilo.`
    );

    return neutralni;
}

/** GET = platí ještě odkaz?  POST = nastav nové heslo. */
async function obnovaHesla(request: Request, env: Env, token: string): Promise<Response> {
    const t = token && token.length >= 20
        ? await env.DB.prepare('SELECT token, pouzit, platny_do, player_id FROM obnova WHERE token = ?')
            .bind(token).first<{ token: string; pouzit: number; platny_do: string; player_id: number | null }>()
        : null;

    const platny = !!t && !t.pouzit && new Date(t.platny_do) > new Date();

    if (request.method === 'GET') {
        // Komu odkaz patří, se říct musí: jinak si člověk myslí, že mění heslo
        // svého účtu, a přitom přenastavuje staré společné. Držitel odkazu na to
        // právo má, takže se tím nic neprozrazuje.
        let komu: string | null = null;
        if (platny && t!.player_id) {
            const u = await env.DB.prepare('SELECT login FROM players WHERE id = ?')
                .bind(t!.player_id).first<{ login: string }>();
            komu = u?.login ?? null;
        }
        return json({ platny, komu, spolecne: platny && !t!.player_id });
    }
    if (request.method !== 'POST') return chyba('Nepodporovaná metoda.', 405);
    if (!platny) return chyba('Odkaz už neplatí. Požádej o nový.', 410);

    const { heslo } = await request.json<{ heslo?: string }>();
    const problem = zkontrolujNoveHeslo(heslo);
    if (problem) return chyba(problem, 400);

    if (t!.player_id) {
        // Heslo konkrétního trenéra. Padají jen jeho ostatní odkazy.
        await nastavHesloUctu(env, t!.player_id, heslo as string);
        await env.DB.prepare('DELETE FROM obnova WHERE player_id = ?').bind(t!.player_id).run();
        const u = await env.DB.prepare('SELECT login FROM players WHERE id = ?')
            .bind(t!.player_id).first<{ login: string }>();
        return json({ nastaveno: true, login: u?.login ?? null });
    }

    await nastavHeslo(env, heslo as string);
    await env.DB.prepare('DELETE FROM obnova WHERE player_id IS NULL').run();
    return json({ nastaveno: true, login: null });
}

/* ===================== log komunikace ===================== */

/**
 * Zaznamená pokus o odeslání. Metadata, ne obsah — výjimka je SMS, kde se text
 * ukládá kvůli počtu segmentů. Tokeny se sem nesmí dostat nikdy.
 */
async function zalogujKomunikaci(env: Env, z: {
    kanal: string; platforma?: string | null; playerId?: number | null; adresa?: string | null;
    typ: string; vysledek: string; kod?: string | null; poznamka?: string | null;
    podrobnosti?: string | null;
}) {
    try {
        await env.DB.prepare(
            `INSERT INTO komunikace (kanal, platforma, player_id, adresa, typ, vysledek, kod, poznamka, podrobnosti)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(z.kanal, z.platforma ?? null, z.playerId ?? null, z.adresa ?? null, z.typ,
               z.vysledek, z.kod ?? null, z.poznamka ?? null,
               z.podrobnosti ? z.podrobnosti.slice(0, 500) : null).run();
    } catch (e) {
        console.warn('Log komunikace selhal:', e instanceof Error ? e.message : String(e));
    }
}

/* ===================== SMS ===================== */

/** Háčky přepnou SMS na UCS-2 a segment se zkrátí ze 160 na 70 znaků — dvojnásobná cena. */
function bezDiakritiky(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Přilepí úvod zprávy. Skládá se na jednom místě, aby se souhrn, pozvánka
 * i zkouška hlásily stejně — dřív měl každý svůj vlastní natvrdo psaný začátek
 * a příjemce dostával pokaždé něco jiného. Prázdné nastavení = název klubu.
 */
function sHlavickou(nas: Record<string, string>, text: string): string {
    const hlavicka = (nas.smsHlavicka ?? '').trim() || (nas.klub ?? '').trim();
    return hlavicka ? `${hlavicka}: ${text}` : text;
}

/**
 * Čísla lidé píšou různě („777 123 456", „+420 777-123-456"). Brány chtějí E.164.
 * Devítimístné číslo bez předvolby je české — jiné se nikdy nezadávalo.
 */
function naE164(cislo: string): string {
    const holé = cislo.replace(/[^\d+]/g, '');
    if (holé.startsWith('+')) return holé;
    if (holé.startsWith('00')) return '+' + holé.slice(2);
    if (holé.length === 9) return '+420' + holé;
    return '+' + holé;
}

type VysledekSms = { ok: boolean; kod?: string; popis?: string };

/** GoSMS jede na .eu; .cz na ni jen přesměrovává a POST by se cestou zvrhl na GET. */
const GOSMS_URL = 'https://app.gosms.eu';

/**
 * Pošle SMS přes providera nastaveného v SMS_PROVIDER. Výchozí 'console' zprávu
 * jen zaloguje — reálná SMS odejde teprve po přepnutí na bránu. Bez toho by se
 * kredit protelefonoval při každém testu.
 *
 * `nanecisto` využije kontrolní endpoint brány: požadavek se ověří, ale nic se
 * neodešle a nic nestojí. Umí to GoSMS, Twilio ne.
 */
async function posliSms(env: Env, cislo: string, text: string,
                        nanecisto = false): Promise<VysledekSms> {
    const zprava = bezDiakritiky(text);
    const provider = (env.SMS_PROVIDER || 'console').toLowerCase();

    if (provider === 'gosms') return posliSmsGoSms(env, naE164(cislo), zprava, nanecisto);
    if (provider === 'twilio') return posliSmsTwilio(env, naE164(cislo), zprava, nanecisto);

    console.log(`SMS (console) → ${cislo}: ${zprava}`);
    return { ok: true, kod: 'console', popis: 'Provider je console — SMS se neodeslala, jen zalogovala.' };
}

/**
 * GoSMS: OAuth2 client_credentials, token platí hodinu. Bereme ho ke každému
 * odeslání znovu — pár zpráv týdně nestojí za cache, která by přežívala restart isolate.
 */
async function gosmsToken(env: Env): Promise<{ ok: true; token: string } | { ok: false; kod: string; popis: string }> {
    if (!env.GOSMS_CLIENT_ID || !env.GOSMS_CLIENT_SECRET) {
        return { ok: false, kod: 'NO_CREDENTIALS', popis: 'Chybí GOSMS_CLIENT_ID nebo GOSMS_CLIENT_SECRET.' };
    }
    try {
        // Form-encoded a doména .eu — přesně jak GoSMS ukazuje curl v samoobsluze.
        const r = await fetch(`${GOSMS_URL}/oauth/v2/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: env.GOSMS_CLIENT_ID,
                client_secret: env.GOSMS_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        const d = await r.json<any>();
        // Do odpovědi nesmí prosáknout client_secret — bereme jen popis chyby od GoSMS.
        if (!r.ok || !d?.access_token) {
            return {
                ok: false, kod: String(r.status),
                popis: d?.error_description ?? d?.error ?? 'GoSMS nevydalo token — zkontroluj client_id a client_secret.'
            };
        }
        return { ok: true, token: d.access_token };
    } catch (e) {
        return { ok: false, kod: 'FETCH', popis: e instanceof Error ? e.message : String(e) };
    }
}

async function posliSmsGoSms(env: Env, cislo: string, zprava: string, nanecisto: boolean): Promise<VysledekSms> {
    if (!env.GOSMS_KANAL) {
        return { ok: false, kod: 'NO_CHANNEL', popis: 'Chybí GOSMS_KANAL — ID kanálu najdeš v GoSMS v menu Kanály.' };
    }
    const t = await gosmsToken(env);
    if (!t.ok) return { ok: false, kod: t.kod, popis: t.popis };

    try {
        const url = nanecisto
            ? `${GOSMS_URL}/api/v1/messages/test`
            : `${GOSMS_URL}/api/v1/messages/`;
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${t.token}` },
            body: JSON.stringify({ message: zprava, recipients: [cislo], channel: Number(env.GOSMS_KANAL) })
        });
        // Chybu GoSMS vrací různě (message, error, pole errors) — bez syrového těla
        // se hádá naslepo, tak ho v nouzi ukážeme celé. Token v něm není.
        const syrove = await r.text();
        let d: any = null;
        try { d = JSON.parse(syrove); } catch { /* nechceme spadnout na HTML chybě */ }
        if (!r.ok) {
            const podrobnosti = d?.message ?? d?.error_description ?? d?.error
                ?? (Array.isArray(d?.errors) ? d.errors.map((e: any) => e?.message ?? JSON.stringify(e)).join('; ') : null)
                ?? syrove.slice(0, 300);
            return { ok: false, kod: String(d?.code ?? r.status), popis: `GoSMS zprávu odmítlo: ${podrobnosti}` };
        }
        if (nanecisto) {
            return { ok: true, kod: 'nanecisto', popis: 'GoSMS požadavek přijalo. Nanečisto — nic se neodeslalo a nic to nestálo.' };
        }
        return { ok: true, kod: String(d?.id ?? d?.data?.id ?? 'ok') };
    } catch (e) {
        return { ok: false, kod: 'FETCH', popis: e instanceof Error ? e.message : String(e) };
    }
}

async function posliSmsTwilio(env: Env, cislo: string, zprava: string, nanecisto: boolean): Promise<VysledekSms> {
    if (nanecisto) {
        return { ok: false, kod: 'NELZE', popis: 'Zkoušku nanečisto umí jen GoSMS. Twilio buď odešle, nebo odmítne.' };
    }
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        return { ok: false, kod: 'NO_CREDENTIALS', popis: 'Chybí TWILIO_ACCOUNT_SID nebo TWILIO_AUTH_TOKEN.' };
    }
    try {
        const telo = new URLSearchParams({
            To: cislo,
            From: env.SMS_ODESILATEL || 'SKRicmanice',
            Body: zprava
        });
        const odpoved = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    authorization: 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
                    'content-type': 'application/x-www-form-urlencoded'
                },
                body: telo
            });
        const data = await odpoved.json<any>();
        if (!odpoved.ok) {
            // Twilio vrací code + message; token v odpovědi není a nesmí se logovat.
            return { ok: false, kod: String(data?.code ?? odpoved.status), popis: data?.message ?? 'Twilio odmítlo zprávu.' };
        }
        return { ok: true, kod: data?.sid };
    } catch (e) {
        return { ok: false, kod: 'FETCH', popis: e instanceof Error ? e.message : String(e) };
    }
}

/** Pojistka proti smyčce: kolik SMS opravdu odešlo za posledních 24 h.
 *  Zprávy z režimu `console` ani zkoušky nanečisto se nepočítají — nic nestály. */
async function smsZaDen(env: Env): Promise<number> {
    const r = await env.DB.prepare(
        `SELECT COUNT(*) AS pocet FROM komunikace
          WHERE kanal = 'sms' AND vysledek = 'ok'
            AND (kod IS NULL OR kod NOT IN ('console', 'nanecisto'))
            AND cas > datetime('now', '-1 day')`
    ).first<{ pocet: number }>();
    return r?.pocet ?? 0;
}

/**
 * Stav SMS kanálu pro Nastavení. Popis je psaný pro člověka, který do útrob nevidí:
 * musí z něj být poznat, jestli kanál mlčí schválně, nebo mu něco chybí.
 */
async function stavSms(env: Env) {
    const provider = (env.SMS_PROVIDER || 'console').toLowerCase();
    const nas = await nastaveni(env);
    const aktivni = nas.smsAktivni === '1';
    const spolecne = {
        provider, aktivni,
        zaDen: await smsZaDen(env),
        strop: Number(nas.smsDenniStrop) || 50
    };

    // Vypnutý kanál je normální stav, ne porucha — musí to tak i vypadat.
    if (!aktivni) {
        return {
            ...spolecne, zapojeno: false, odesilatel: '—',
            popis: `SMS je vypnutá v Nastavení — mimořádný nástroj, zapíná se ručně. `
                + `Brána (${provider}) je připravená, zkoušku nanečisto lze spustit i teď.`
        };
    }

    if (provider === 'gosms') {
        const chybi = [
            !env.GOSMS_CLIENT_ID && 'GOSMS_CLIENT_ID',
            !env.GOSMS_CLIENT_SECRET && 'GOSMS_CLIENT_SECRET',
            !env.GOSMS_KANAL && 'GOSMS_KANAL'
        ].filter(Boolean);
        return {
            ...spolecne, zapojeno: chybi.length === 0,
            odesilatel: `kanál ${env.GOSMS_KANAL ?? '—'} (odesílatele drží GoSMS)`,
            popis: chybi.length
                ? `Provider je GoSMS, ale chybí ${chybi.join(', ')}. Bez toho se neodešle nic.`
                : 'GoSMS je zapojené, SMS se odesílají doopravdy. Příjemce uvidí odesílatele GoSMS, ne klub.'
        };
    }

    if (provider === 'twilio') {
        return {
            ...spolecne, zapojeno: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
            odesilatel: env.SMS_ODESILATEL || 'SKRicmanice',
            popis: env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
                ? 'Twilio je zapojené. Pozor: do Česka končí neregistrovaný odesílatel na chybě 21612.'
                : 'Provider je twilio, ale chybí TWILIO_ACCOUNT_SID nebo TWILIO_AUTH_TOKEN.'
        };
    }

    return {
        ...spolecne, zapojeno: false, odesilatel: '—',
        popis: 'Provider je console — SMS se jen logují, nic se neodesílá. Přepni SMS_PROVIDER na gosms.'
    };
}

/** Odešle SMS s ohlídáním denního stropu a se záznamem do logu. */
async function posliSmsHlidane(env: Env, cislo: string, text: string,
                               typ: string, playerId?: number | null,
                               nanecisto = false): Promise<{ ok: boolean; popis: string }> {
    const nas = await nastaveni(env);
    const strop = Number(nas.smsDenniStrop) || 50;

    const platforma = (env.SMS_PROVIDER || 'console').toLowerCase();

    // SMS je mimořádný nástroj — dokud ji trenér v Nastavení nezapne, neodejde
    // nic, ani když má osoba přepínač u sebe. Zkouška nanečisto smí vždy:
    // nic neodesílá, nic nestojí a slouží právě k ověření, že by to fungovalo.
    if (!nanecisto && nas.smsAktivni !== '1') {
        await zalogujKomunikaci(env, {
            kanal: 'sms', platforma, playerId, adresa: cislo, typ, vysledek: 'preskoceno',
            kod: 'VYPNUTO', poznamka: 'SMS kanál je v Nastavení vypnutý.'
        });
        return {
            ok: false,
            popis: 'SMS kanál je v Nastavení vypnutý (mimořádný nástroj). Zapni ho, jen když je opravdu potřeba.'
        };
    }

    if (!nanecisto && await smsZaDen(env) >= strop) {
        await zalogujKomunikaci(env, {
            kanal: 'sms', platforma, playerId, adresa: cislo, typ, vysledek: 'preskoceno',
            kod: 'STROP', poznamka: `Denní strop ${strop} SMS vyčerpán.`
        });
        return { ok: false, popis: `Denní strop ${strop} SMS je vyčerpaný, zpráva se neodeslala.` };
    }

    // Hlavička se přilepí až tady, aby ji dostaly všechny zprávy stejně —
    // a aby se do logu zapsalo přesně to, co odešlo, i s ní.
    const zprava = sHlavickou(nas, text);
    const r = await posliSms(env, cislo, zprava, nanecisto);
    await zalogujKomunikaci(env, {
        kanal: 'sms', platforma: nanecisto ? `${platforma} (nanečisto)` : platforma,
        playerId, adresa: cislo, typ,
        vysledek: r.ok ? 'ok' : 'chyba', kod: r.kod ?? null,
        poznamka: bezDiakritiky(zprava).slice(0, 300),  // text kvůli segmentům; hodnocení v něm není
        podrobnosti: r.ok ? null : (r.popis ?? null)  // proč to brána odmítla, ať se to nedohledává jinde
    });
    return { ok: r.ok, popis: r.ok ? (r.popis ?? 'Odesláno.') : `${r.kod ?? 'chyba'} — ${r.popis ?? ''}` };
}

/* ===================== Telegram ===================== */

/**
 * Zavolá Telegram Bot API. Nikdy nevrací token ani celou URL — do odpovědi jde
 * jen `description` od Telegramu, ať se secret nedostane do UI ani do logu.
 */
async function telegramApi(env: Env, metoda: string, telo?: unknown): Promise<
    { ok: true; vysledek: any } | { ok: false; popis: string }
> {
    if (!env.TELEGRAM_BOT_TOKEN) {
        return { ok: false, popis: 'Není nastavený secret TELEGRAM_BOT_TOKEN.' };
    }
    try {
        const odpoved = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${metoda}`,
            telo
                ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(telo) }
                : undefined);
        const data = await odpoved.json<{ ok: boolean; result?: any; description?: string }>();
        if (!data.ok) {
            return { ok: false, popis: data.description ?? `Telegram odpověděl HTTP ${odpoved.status}.` };
        }
        return { ok: true, vysledek: data.result };
    } catch (e) {
        return { ok: false, popis: `Telegram je nedostupný: ${e instanceof Error ? e.message : String(e)}` };
    }
}

/** Pošle zprávu do konkrétního chatu. */
async function posliTelegram(env: Env, chatId: string, text: string): Promise<{ ok: boolean; popis?: string }> {
    const r = await telegramApi(env, 'sendMessage', {
        chat_id: chatId, text, disable_web_page_preview: true
    });
    return r.ok ? { ok: true } : { ok: false, popis: r.popis };
}

/* ===================== CSV pro Excel ===================== */

/* Sloupce kádru v pořadí, v jakém jdou do souboru i zpátky z něj.
   Heslo tu schválně není: export by ho vynesl ven a import přepsal. */
const CSV_SLOUPCE = [
    'id', 'jmeno', 'prezdivka', 'role', 'pozice', 'post', 'sablony', 'aktivni',
    'login', 'email', 'telegram_chat_id', 'telefon',
    'notif_email', 'notif_telegram', 'notif_sms', 'hodnoceni_povinne'
] as const;

/**
 * Řazení lidí: trenéři nahoru, neaktivní dolů, jinak podle abecedy.
 *
 * Řadit se musí tady, ne v SQL — SQLite v D1 nemá českou collation a porovnává
 * bajty, takže Říčka a Šplíchal spadnou až za Weisse. `Intl.Collator` ve Workeru
 * je a česky řadí správně.
 */
const CESKA_ABECEDA = new Intl.Collator('cs', { sensitivity: 'base' });

function porovnejLidi(a: any, b: any): number {
    if (a.role !== b.role) return a.role === 'trener' ? -1 : 1;
    if (!!a.aktivni !== !!b.aktivni) return a.aktivni ? -1 : 1;
    return CESKA_ABECEDA.compare(String(a.jmeno ?? ''), String(b.jmeno ?? ''));
}

/* Sloupce, které by Excel spolkl jako číslo: z „+420604577765" udělá vzorec
   a zobrazí 4,20605E+11. V sešitu .xlsx se řeší formátem Text; v CSV se nedá
   řešit vůbec, protože CSV žádné formáty nenese. */
const CSV_JAKO_TEXT = ['telefon', 'telegram_chat_id'];

/* Sloupce s ano/ne. V souboru pro člověka nemá co dělat 0 a 1. */
const CSV_ANO_NE = ['aktivni', 'notif_email', 'notif_telegram', 'notif_sms', 'hodnoceni_povinne'];

/**
 * Hodnota do souboru pro člověka: klíče se překládají na popisky, přepínače
 * na ano/ne. Import bere zpátky obojí, takže starší soubory dál projdou.
 */
function hodnotaVen(sloupec: string, o: Record<string, unknown>, jazyk: string): string {
    const h = o[sloupec] === null || o[sloupec] === undefined ? '' : String(o[sloupec]);
    if (sloupec === 'pozice') {
        try {
            return (JSON.parse(String(o.pozice ?? '[]')) as string[])
                .map(p => popis('pozice', p, jazyk)).join(', ');
        } catch { return ''; }
    }
    // Šablon může být víc (brankář i hráč v poli i leader) — jdou do jedné buňky
    // oddělené čárkou, stejně jako pozice.
    if (sloupec === 'sablony') {
        return sablonyOsoby(o).map(s => popis('sablona', s, jazyk)).join(', ');
    }
    if (sloupec === 'role' || sloupec === 'sablona') return popis(sloupec, h, jazyk);
    if (CSV_ANO_NE.includes(sloupec)) {
        return h === '1' ? (jazyk === 'en' ? 'yes' : 'ano') : (jazyk === 'en' ? 'no' : 'ne');
    }
    return h;
}

/** Jedno pole do CSV. Uvozovky se zdvojují, jinak by rozsekaly řádek. */
function csvPole(h: unknown): string {
    const s = h === null || h === undefined ? '' : String(h);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Zpátky z ="…" na holou hodnotu — starší exporty ten obal ještě mají. */
function csvZText(h: string): string {
    const m = h.trim().match(/^="(.*)"$/s);
    return (m ? m[1].replace(/""/g, '"') : h).trim();
}

/**
 * Sestaví CSV pro Excel. Středník místo čárky (české Excely mají středník jako
 * oddělovač seznamu), CRLF a BOM — bez BOM Excel čte UTF-8 jako svoji starou
 * kódovou stránku a z háčků udělá patvary.
 */
function csvSoubor(radky: string[][]): string {
    return '﻿' + radky.map(r => r.map(csvPole).join(';')).join('\r\n') + '\r\n';
}

/**
 * Rozebere CSV. Oddělovač si vezme z hlavičky (Excel podle nastavení počítače
 * uloží středník i čárku), umí uvozovky i konce řádků uvnitř nich.
 */
function csvRozeber(text: string): string[][] {
    const bezBom = text.replace(/^﻿/, '');
    const prvni = bezBom.split(/\r?\n/, 1)[0] ?? '';
    const oddelovac = (prvni.split(';').length >= prvni.split(',').length) ? ';' : ',';

    const radky: string[][] = [];
    let pole: string[] = [];
    let bunka = '';
    let vUvozovkach = false;

    for (let i = 0; i < bezBom.length; i++) {
        const z = bezBom[i];
        if (vUvozovkach) {
            if (z === '"' && bezBom[i + 1] === '"') { bunka += '"'; i++; }
            else if (z === '"') vUvozovkach = false;
            else bunka += z;
            continue;
        }
        if (z === '"') { vUvozovkach = true; continue; }
        if (z === oddelovac) { pole.push(bunka); bunka = ''; continue; }
        if (z === '\r') continue;
        if (z === '\n') { pole.push(bunka); radky.push(pole); pole = []; bunka = ''; continue; }
        bunka += z;
    }
    if (bunka !== '' || pole.length) { pole.push(bunka); radky.push(pole); }
    return radky.filter(r => r.some(b => b.trim() !== ''));
}

/** „ano", „1", „x", „true" — lidi to v Excelu píšou různě, ber to všechno. */
function csvAno(h: string | undefined): number {
    const s = (h ?? '').trim().toLowerCase();
    return ['1', 'ano', 'a', 'x', 'true', 'yes', 'ja'].includes(s) ? 1 : 0;
}

/* ===================== admin část (trenér) ===================== */

async function admin(request: Request, env: Env, url: URL, kdo: Session): Promise<Response> {
    const cesta = url.pathname;
    const metoda = request.method;
    const q = url.searchParams;

    /* ---------- změna vlastního hesla ---------- */
    if (cesta === '/api/heslo' && metoda === 'POST') {
        const { stare, nove } = await request.json<{ stare?: string; nove?: string }>();
        const problem = zkontrolujNoveHeslo(nove);

        if (kdo.id) {
            // Přihlášený člověk mění své vlastní heslo.
            const u = await env.DB.prepare(
                'SELECT login FROM players WHERE id = ?'
            ).bind(kdo.id).first<{ login: string }>();
            const v = u ? await overUcet(env, u.login, stare ?? '') : { stav: 'neznamy' as const };
            if (v.stav !== 'ok') {
                await new Promise(hotovo => setTimeout(hotovo, 700));
                return chyba('Stávající heslo nesouhlasí.', 401);
            }
            if (problem) return chyba(problem, 400);
            await nastavHesloUctu(env, kdo.id, nove as string);
            await env.DB.prepare('DELETE FROM obnova WHERE player_id = ?').bind(kdo.id).run();
            return json({ zmeneno: true, kdo: kdo.jmeno });
        }

        // Přechodné společné heslo.
        if (!stare || await overHeslo(env, stare) !== 'ok') {
            await new Promise(hotovo => setTimeout(hotovo, 700));
            return chyba('Stávající heslo nesouhlasí.', 401);
        }
        if (problem) return chyba(problem, 400);
        await nastavHeslo(env, nove as string);
        await env.DB.prepare('DELETE FROM obnova WHERE player_id IS NULL').run();
        return json({ zmeneno: true, kdo: null });
    }

    /* ---------- poslat trenérovi odkaz na nastavení hesla ---------- */
    if (cesta.match(/^\/api\/players\/(\d+)\/pozvanka$/) && metoda === 'POST') {
        const id = Number(cesta.match(/^\/api\/players\/(\d+)\/pozvanka$/)![1]);
        const u = await env.DB.prepare(
            `SELECT id, jmeno, login, email, telegram_chat_id FROM players
              WHERE id = ? AND role = 'trener'`
        ).bind(id).first<Ucet>();
        if (!u) return chyba('Trenér nenalezen.', 404);
        if (!u.login) return chyba('Trenér nemá přihlašovací jméno — nejdřív ho vyplň.', 400);

        const zpravy = await posliObnovu(env, u, url.origin, 'cs');
        return json({ zpravy });
    }

    /* ---------- ruční odeslání souhrnu (tlačítko „poslat teď") ---------- */
    if (cesta === '/api/notifikace/ted' && metoda === 'POST') {
        const zpravy = await rozesliSouhrn(env, url.origin, true);
        return json({ zpravy });
    }

    /* ---------- co čeká na odeslání ---------- */
    if (cesta === '/api/notifikace/stav' && metoda === 'GET') {
        const nas = await nastaveni(env);
        const ceka = await env.DB.prepare('SELECT COUNT(*) AS pocet FROM udalosti WHERE odeslano = 0')
            .first<{ pocet: number }>();
        const { results: prijemci } = await env.DB.prepare(
            `SELECT jmeno, notif_email, notif_telegram FROM players
              WHERE role = 'trener' AND aktivni = 1
                AND ((notif_email = 1 AND email IS NOT NULL) OR (notif_telegram = 1 AND telegram_chat_id IS NOT NULL))`
        ).all<{ jmeno: string; notif_email: number; notif_telegram: number }>();
        return json({
            ceka: ceka?.pocet ?? 0,
            posledni: nas.notifPosledni || null,
            // Ať je vidět, že Worker počítá s pražským časem a ne s UTC —
            // jinak by se chyba poznala až tím, že souhrn nedorazí.
            hodinaTed: prazskaHodina(new Date()),
            hodinaCil: Number((nas.notifCas || '19:00').split(':')[0]),
            cronZapnuty: true,
            prijemci: (prijemci ?? []).map(p => ({
                jmeno: p.jmeno,
                kanaly: [p.notif_telegram ? 'Telegram' : null, p.notif_email ? 'e-mail' : null].filter(Boolean)
            }))
        });
    }

    /* ---------- kolik je v aplikaci dat ----------
       Čísla o stavu projektu se **nesmí** psát do textu dokumentace. Jednou
       opsaná zestárnou a začnou lhát: v STATUS.md stálo „0 odkazů, 0
       sebehodnocení" ještě ve chvíli, kdy hráči odkazy dostali a jeden už
       vyplnil. Text drží význam, čísla se berou odsud. */
    if (cesta === '/api/stav-dat' && metoda === 'GET') {
        const r = await env.DB.prepare(
            `SELECT
               (SELECT COUNT(*) FROM players WHERE role = 'hrac' AND aktivni = 1)        AS hracu,
               (SELECT COUNT(*) FROM players)                                            AS osob,
               (SELECT COUNT(*) FROM evaluations WHERE autor = 'trener')                 AS trenerskych,
               (SELECT COUNT(DISTINCT player_id) FROM evaluations WHERE autor = 'trener') AS hodnocenych,
               (SELECT COUNT(*) FROM evaluations WHERE autor = 'hrac')                   AS sebehodnoceni,
               (SELECT COUNT(DISTINCT player_id) FROM evaluations WHERE autor = 'hrac')  AS hracuVyplnilo,
               (SELECT COUNT(*) FROM tokens)                                             AS odkazu,
               (SELECT COUNT(*) FROM tokens WHERE pouzit = 1)                            AS odkazuPouzitych`
        ).first<Record<string, number>>();
        return json(r ?? {}, 200, { 'cache-control': 'no-store' });
    }

    /* ---------- stav notifikačních kanálů ---------- */
    if (cesta === '/api/kanaly' && metoda === 'GET') {
        const tg = await telegramApi(env, 'getMe');
        return json({
            email: {
                zapojeno: !!env.EMAIL,
                odesilatel: env.EMAIL_FROM || 'hodnoceni@maxferit.cz',
                popis: env.EMAIL
                    ? 'Binding EMAIL je nasazený. Doručení ověří až odeslaná zpráva.'
                    : 'Chybí binding EMAIL (Cloudflare Email Sending).'
            },
            sms: await stavSms(env),
            telegram: tg.ok
                ? {
                    zapojeno: true, ok: true,
                    bot: tg.vysledek?.username ?? null,
                    jmeno: tg.vysledek?.first_name ?? null,
                    popis: `Bot @${tg.vysledek?.username} odpovídá.`
                }
                : { zapojeno: !!env.TELEGRAM_BOT_TOKEN, ok: false, bot: null, popis: tg.popis }
        });
    }

    /* ---------- stav konektivity do horní lišty ----------
       Musí být LEVNÉ: volá se při každém načtení stránky. Telegram getMe
       a token GoSMS nic nestojí a ověřují spojení doopravdy; u modelu se
       hlásí jen nastavení, protože každý dotaz na něj ujídá denní limit
       (u Claude rovnou peníze). Skutečnou zkoušku modelu drží tlačítko
       v Nastavení, kde ji člověk spustí vědomě. */
    if (cesta === '/api/stav' && metoda === 'GET') {
        const nas = await nastaveni(env);

        const tg = await telegramApi(env, 'getMe');
        const telegram = tg.ok
            ? { stav: 'ok', popis: `Bot @${tg.vysledek?.username} odpovídá.` }
            : { stav: env.TELEGRAM_BOT_TOKEN ? 'chyba' : 'chybi', popis: tg.popis };

        const email = env.EMAIL
            ? { stav: 'ok', popis: `Odesílá se z ${env.EMAIL_FROM || 'hodnoceni@maxferit.cz'}.` }
            : { stav: 'chybi', popis: 'Chybí binding EMAIL (Cloudflare Email Sending).' };

        // U SMS se rozlišuje "brána odpovídá" od "kanál je zapnutý" — vypnutý
        // kanál je záměr, ne porucha, a nesmí svítit stejně jako rozbité spojení.
        const smsProvider = (env.SMS_PROVIDER || 'console').toLowerCase();
        let sms: { stav: string; popis: string };
        if (smsProvider === 'gosms') {
            const t = await gosmsToken(env);
            if (!t.ok) {
                sms = { stav: 'chyba', popis: `Brána neodpovídá: ${t.popis}` };
            } else if (nas.smsAktivni !== '1') {
                sms = { stav: 'vypnuto', popis: 'Brána odpovídá, ale odesílání je v Nastavení vypnuté.' };
            } else {
                sms = {
                    stav: 'ok',
                    popis: `Brána odpovídá, odesílání zapnuté (${await smsZaDen(env)}/${Number(nas.smsDenniStrop) || 50} za 24 h).`
                };
            }
        } else {
            sms = { stav: 'vypnuto', popis: `Provider je ${smsProvider} — SMS se neodesílají.` };
        }

        /* Model se neptáme naprázdno — hlásí se podle toho, jak dopadlo POSLEDNÍ
           skutečné použití. Zkušební dotaz při každém přihlášení by ujídal denní
           limit (u Claude rovnou peníze), kdežto log stejně nese odpověď na tutéž
           otázku: kdyby model neodpovídal, poslední volání skončilo chybou.
           `preskoceno` je jiný případ — model odpověděl, jen nerozuměl větě. */
        const poskytovatel = nas.aiPoskytovatel || 'vypnuto';
        let ai: { stav: string; popis: string };
        if (poskytovatel === 'vypnuto') {
            ai = { stav: 'vypnuto', popis: 'Jazykový model je v Nastavení vypnutý.' };
        } else if (poskytovatel === 'claude' && !env.ANTHROPIC_API_KEY) {
            ai = { stav: 'chyba', popis: 'Vybraný je Claude, ale chybí secret ANTHROPIC_API_KEY.' };
        } else {
            const posledni = await env.DB.prepare(
                `SELECT cas, platforma, vysledek, podrobnosti FROM komunikace
                  WHERE kanal = 'ai' ORDER BY id DESC LIMIT 1`
            ).first<{ cas: string; platforma: string; vysledek: string; podrobnosti: string | null }>();

            const kdo = `${poskytovatel === 'claude' ? 'Claude' : 'Workers AI'}, model ${nas.aiModel}`;
            if (!posledni) {
                ai = { stav: 'nastaveno', popis: `${kdo}. Zatím se ho na nic neptalo.` };
            } else if (posledni.vysledek === 'chyba') {
                ai = {
                    stav: 'chyba',
                    popis: `${kdo}. Poslední dotaz (${posledni.cas} UTC) selhal: `
                        + (posledni.podrobnosti ?? 'bez podrobností') + '. Zkus Vyzkoušet spojení v Nastavení.'
                };
            } else {
                ai = { stav: 'ok', popis: `${kdo}. Poslední dotaz (${posledni.cas} UTC) prošel.` };
            }
        }

        return json({ ai, sms, telegram, email }, 200, { 'cache-control': 'no-store' });
    }

    /* ---------- kdo botovi napsal (kvůli chat id) ---------- */
    if (cesta === '/api/telegram/chaty' && metoda === 'GET') {
        const r = await telegramApi(env, 'getUpdates');
        if (!r.ok) return json({ ok: false, popis: r.popis, chaty: [] });

        // Telegram drží updaty jen ~24 h. Kdo botovi nenapsal, tady nebude.
        const chaty = new Map<string, { chat_id: string; jmeno: string }>();
        for (const u of (r.vysledek as any[]) ?? []) {
            const chat = u?.message?.chat ?? u?.edited_message?.chat ?? u?.channel_post?.chat;
            if (!chat) continue;
            const jmeno = [chat.first_name, chat.last_name].filter(Boolean).join(' ')
                || chat.title || chat.username || String(chat.id);
            chaty.set(String(chat.id), { chat_id: String(chat.id), jmeno });
        }
        return json({
            ok: true,
            chaty: [...chaty.values()],
            popis: chaty.size
                ? `Botovi zatím napsali: ${chaty.size}`
                : 'Botovi zatím nikdo nenapsal. Telegram nedovolí psát prvnímu — každý trenér musí botovi poslat aspoň jednu zprávu.'
        });
    }

    /* ---------- log odeslané komunikace ---------- */
    if (cesta === '/api/komunikace' && metoda === 'GET') {
        const { results } = await env.DB.prepare(
            `SELECT k.id, k.cas, k.kanal, k.platforma, k.adresa, k.typ, k.vysledek, k.kod,
                    k.poznamka, k.podrobnosti, p.jmeno
               FROM komunikace k LEFT JOIN players p ON p.id = k.player_id
              ORDER BY k.id DESC LIMIT 100`
        ).all();
        return json(results ?? []);
    }

    /* ---------- export celého logu komunikace ----------
       V tabulce je posledních sto záznamů; když se dohledává, co komu odešlo
       před měsícem, je tohle jediná cesta k tomu zbytku. */
    if (cesta === '/api/komunikace/export.csv' && metoda === 'GET') {
        const { results } = await env.DB.prepare(
            `SELECT k.cas, k.kanal, k.platforma, k.adresa, k.typ, k.vysledek, k.kod,
                    k.poznamka, k.podrobnosti, p.jmeno
               FROM komunikace k LEFT JOIN players p ON p.id = k.player_id
              ORDER BY k.id DESC`
        ).all<Record<string, unknown>>();

        const en = q.get('lang') === 'en';
        const radky: string[][] = [en
            ? ['time', 'channel', 'platform', 'to', 'type', 'result', 'code', 'message', 'details']
            : ['čas', 'kanál', 'platforma', 'komu', 'typ', 'výsledek', 'kód', 'zpráva', 'podrobnosti']];
        for (const z of results ?? []) {
            radky.push([
                // Čas je v databázi v UTC; do souboru jde s Z, ať je to poznat.
                String(z.cas ?? '') + 'Z',
                String(z.kanal ?? ''), String(z.platforma ?? ''),
                String(z.jmeno ?? z.adresa ?? ''), String(z.typ ?? ''),
                String(z.vysledek ?? ''), String(z.kod ?? ''),
                String(z.poznamka ?? ''), String(z.podrobnosti ?? '')
            ]);
        }

        const datum = new Date().toISOString().slice(0, 10);
        return new Response(csvSoubor(radky), {
            headers: {
                'content-type': 'text/csv; charset=utf-8',
                'content-disposition': `attachment; filename="komunikace-${datum}.csv"`,
                'cache-control': 'no-store'
            }
        });
    }

    /* ---------- kontrola přihlašovacích údajů brány (nic neodesílá) ---------- */
    if (cesta === '/api/sms/ucet' && metoda === 'GET') {
        const provider = (env.SMS_PROVIDER || 'console').toLowerCase();

        if (provider === 'gosms') {
            const t = await gosmsToken(env);
            if (!t.ok) return json({ ok: false, provider, kod: t.kod, popis: t.popis });
            try {
                // Kořen API vrací stav účtu včetně kreditu — bez odeslání zprávy.
                const r = await fetch(`${GOSMS_URL}/api/v1/`, { headers: { authorization: `Bearer ${t.token}` } });
                const d = await r.json<any>().catch(() => null);
                if (!r.ok) {
                    return json({ ok: false, provider, kod: String(r.status), popis: d?.message ?? 'GoSMS odmítlo přihlášení.' });
                }
                return json({
                    ok: true, provider,
                    ucet: d?.name ?? d?.organization ?? null,
                    kredit: d?.credit ?? d?.wallet?.credit ?? null,
                    // GoSMS nemá pojmenování polí zdokumentované; syrová odpověď je
                    // vidět jen přihlášenému trenérovi a šetří kolo dohadování.
                    syrove: d ?? null,
                    kanal: env.GOSMS_KANAL ?? null,
                    popis: env.GOSMS_KANAL
                        ? 'Token i účet v pořádku. Zkus zprávu nanečisto, ta ověří i kanál.'
                        : 'Token je v pořádku, ale chybí GOSMS_KANAL — bez ID kanálu se odeslat nedá.'
                });
            } catch (e) {
                return json({ ok: false, provider, popis: e instanceof Error ? e.message : String(e) });
            }
        }

        if (provider !== 'twilio') {
            return json({ ok: false, provider, popis: `Provider je ${provider} — žádná brána, není co ověřovat.` });
        }
        if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
            return json({ ok: false, popis: 'Chybí TWILIO_ACCOUNT_SID nebo TWILIO_AUTH_TOKEN.' });
        }
        try {
            const r = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}.json`,
                { headers: { authorization: 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`) } });
            const d = await r.json<any>();
            if (!r.ok) {
                // 20003 = špatný token nebo SID; 20404 = SID neexistuje.
                return json({
                    ok: false, kod: String(d?.code ?? r.status), popis: d?.message ?? 'Twilio odmítlo přihlášení.',
                    sidKoncovka: env.TWILIO_ACCOUNT_SID.slice(-6),
                    delkaTokenu: env.TWILIO_AUTH_TOKEN.length,
                    tokenMaBileZnaky: env.TWILIO_AUTH_TOKEN !== env.TWILIO_AUTH_TOKEN.trim()
                });
            }
            return json({
                ok: true, ucet: d?.friendly_name ?? null, stav: d?.status ?? null,
                sidKoncovka: env.TWILIO_ACCOUNT_SID.slice(-6)
            });
        } catch (e) {
            return json({ ok: false, popis: e instanceof Error ? e.message : String(e) });
        }
    }

    /* ---------- výpis kanálů GoSMS (kvůli ID do GOSMS_KANAL) ---------- */
    if (cesta === '/api/sms/kanaly' && metoda === 'GET') {
        const t = await gosmsToken(env);
        if (!t.ok) return json({ ok: false, kod: t.kod, popis: t.popis, kanaly: [] });
        try {
            const r = await fetch(`${GOSMS_URL}/api/v1/channels`, { headers: { authorization: `Bearer ${t.token}` } });
            const d = await r.json<any>().catch(() => null);
            if (!r.ok) {
                return json({
                    ok: false, kod: String(r.status), kanaly: [],
                    popis: 'GoSMS výpis kanálů nevrátilo — ID kanálu najdeš v portálu v menu Kanály.'
                });
            }
            // Odpověď bývá zabalená různě podle verze API; bereme první pole, které najdeme.
            const seznam: any[] = Array.isArray(d) ? d : (d?.data ?? d?.channels ?? []);
            return json({
                ok: true,
                kanaly: seznam.map((k: any) => ({ id: k?.id ?? null, nazev: k?.name ?? k?.title ?? null })),
                popis: seznam.length ? `Kanálů: ${seznam.length}` : 'Účet nemá žádný kanál.'
            });
        } catch (e) {
            return json({ ok: false, kanaly: [], popis: e instanceof Error ? e.message : String(e) });
        }
    }

    /* ---------- zkušební SMS (nanečisto = ověří spojení, nic neodešle a nic nestojí) ---------- */
    if (cesta === '/api/sms/test' && metoda === 'POST') {
        const { telefon, nanecisto } = await request.json<{ telefon?: string; nanecisto?: boolean }>();
        if (!telefon) return chyba('Chybí telefon.', 400);
        // Hlavičku i klub dosadí posliSmsHlidane — tady jde jen o tělo zprávy.
        const r = await posliSmsHlidane(env, String(telefon),
            'zkusebni zprava z aplikace Hodnoceni hracu.', 'test', null, !!nanecisto);
        return json({ ok: r.ok, popis: r.popis });
    }

    /* ---------- zkušební zpráva do Telegramu ---------- */
    if (cesta === '/api/telegram/test' && metoda === 'POST') {
        const { chat_id } = await request.json<{ chat_id?: string }>();
        if (!chat_id) return chyba('Chybí chat_id.', 400);
        const nas = await nastaveni(env);
        const r = await posliTelegram(env, String(chat_id),
            `✅ Zkušební zpráva z aplikace Hodnocení hráčů (${nas.klub}).\n`
            + 'Když ti tohle přišlo, notifikace ti budou chodit sem.');
        return json({ ok: r.ok, popis: r.ok ? 'Zpráva odeslána.' : r.popis });
    }

    /* ---------- kam chodí obnova hesla (jen ke čtení, mění se secretem) ---------- */
    if (cesta === '/api/obnova-adresy' && metoda === 'GET') {
        return json({ adresy: povoleneAdresy(env), mailFunguje: !!env.EMAIL });
    }

    /* ---------- nastavení ---------- */
    if (cesta === '/api/settings') {
        if (metoda === 'GET') return json(await nastaveni(env));
        if (metoda === 'PUT') {
            const telo = await request.json<Record<string, string>>();
            const prikazy = Object.entries(telo)
                .filter(([k]) => k in VYCHOZI_NASTAVENI)
                .map(([k, v]) => env.DB.prepare(
                    `INSERT INTO settings (klic, hodnota) VALUES (?, ?)
                     ON CONFLICT(klic) DO UPDATE SET hodnota = excluded.hodnota`
                ).bind(k, String(v)));
            if (!prikazy.length) return chyba('Žádné známé nastavení k uložení.', 400);

            const tolerance = telo.tolerance !== undefined ? Number(telo.tolerance) : null;
            if (tolerance !== null && (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 9)) {
                return chyba('Tolerance musí být celé číslo 0 až 9.', 400);
            }
            await env.DB.batch(prikazy);
            return json(await nastaveni(env));
        }
    }

    /* ---------- lidé ---------- */
    /* ---------- export kádru do Excelu (.xlsx) ----------
       Na rozdíl od CSV nese sešit i formát buněk, takže telefon zůstane
       textem a Excel z něj neudělá 4,20605E+11.                          */
    if (cesta === '/api/players/export.xlsx' && metoda === 'GET') {
        const { results } = await env.DB.prepare(
            `SELECT ${CSV_SLOUPCE.join(', ')} FROM players`
        ).all<Record<string, unknown>>();
        const lide = (results ?? []).slice().sort(porovnejLidi);

        const jazyk = q.get('lang') === 'en' ? 'en' : 'cs';
        const sloupce: Sloupec[] = CSV_SLOUPCE.map(s => ({
            nazev: s,
            text: CSV_JAKO_TEXT.includes(s),
            sirka: s === 'jmeno' ? 26 : (s === 'pozice' ? 30 : 14)
        }));

        const radky = lide.map(o => CSV_SLOUPCE.map(s => hodnotaVen(s, o, jazyk)));

        const datum = new Date().toISOString().slice(0, 10);
        return new Response(xlsxSoubor('lide', sloupce, radky), {
            headers: {
                'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'content-disposition': `attachment; filename="lide-${datum}.xlsx"`,
                'cache-control': 'no-store'
            }
        });
    }

    /* ---------- export kádru do CSV ---------- */
    if (cesta === '/api/players/export.csv' && metoda === 'GET') {
        const { results } = await env.DB.prepare(
            `SELECT ${CSV_SLOUPCE.join(', ')} FROM players`
        ).all<Record<string, unknown>>();
        const lide = (results ?? []).slice().sort(porovnejLidi);

        // Hlavička jde do souboru vždycky, i když kádr ještě nikdo nezaložil —
        // prázdný export je tím pádem rovnou šablona pro import.
        const jazyk = q.get('lang') === 'en' ? 'en' : 'cs';
        const radky: string[][] = [[...CSV_SLOUPCE]];
        for (const o of lide) {
            radky.push(CSV_SLOUPCE.map(s => hodnotaVen(s, o, jazyk)));
        }

        const datum = new Date().toISOString().slice(0, 10);
        return new Response(csvSoubor(radky), {
            headers: {
                'content-type': 'text/csv; charset=utf-8',
                'content-disposition': `attachment; filename="lide-${datum}.csv"`,
                'cache-control': 'no-store'
            }
        });
    }

    /* ---------- export hodnocení do CSV ----------
       Jeden plochý soubor pro Excel: řádek = jedno hodnocení, sloupec na každou
       osu napříč šablonami (u cizí šablony zůstane prázdný). Sloupce `id`
       a `hrac_id` slouží k párování při importu zpátky. */
    if (cesta === '/api/evaluations/export.csv' && metoda === 'GET') {
        const jazyk = q.get('lang') === 'en' ? 'en' : 'cs';
        const obdobi = q.get('obdobi');

        const { results } = obdobi
            ? await env.DB.prepare(
                `SELECT e.*, p.jmeno AS hrac, a.jmeno AS hodnotil
                   FROM evaluations e
                   JOIN players p ON p.id = e.player_id
              LEFT JOIN players a ON a.id = e.autor_id
                  WHERE e.obdobi = ? ORDER BY p.jmeno, e.id`).bind(obdobi).all<any>()
            : await env.DB.prepare(
                `SELECT e.*, p.jmeno AS hrac, a.jmeno AS hodnotil
                   FROM evaluations e
                   JOIN players p ON p.id = e.player_id
              LEFT JOIN players a ON a.id = e.autor_id
                  ORDER BY e.obdobi, p.jmeno, e.id`).all<any>();

        const osyKlice = vsechnyOsy();
        const p = (skupina: string, klic: string) => popis(skupina, klic, jazyk);
        const hlavicka = jazyk === 'en'
            ? ['id', 'player_id', 'player', 'period', 'author', 'signed by', 'template']
            : ['id', 'hrac_id', 'hráč', 'období', 'autor', 'hodnotil', 'šablona'];
        const konec = jazyk === 'en'
            ? ['Physical', 'Head', 'In the group', 'Goals', 'Player note', 'date']
            : ['Fyzicky', 'Hlavou', 'V partě', 'Cíle', 'Poznámka hráče', 'datum'];

        const radky: string[][] = [[...hlavicka, ...osyKlice.map(k => p('osa', k)), ...konec]];
        for (const e of results ?? []) {
            let hodnoty: Record<string, unknown> = {};
            try { hodnoty = JSON.parse(String(e.hodnoty ?? '{}')); } catch { /* rozbitý JSON = prázdno */ }
            let cile: string[] = [];
            try { cile = JSON.parse(String(e.cile ?? '[]')); } catch { /* dtto */ }

            radky.push([
                String(e.id), String(e.player_id), String(e.hrac ?? ''), String(e.obdobi ?? ''),
                p('role', String(e.autor ?? '')), String(e.hodnotil ?? ''),
                p('sablona', String(e.sablona ?? '')),
                // Osa, kterou tahle šablona nemá, zůstane prázdná — ne nula.
                ...osyKlice.map(k => hodnoty[k] === undefined || hodnoty[k] === null ? '' : String(hodnoty[k])),
                String(e.fyzicky ?? ''), String(e.hlavou ?? ''), String(e.parta ?? ''),
                (Array.isArray(cile) ? cile : []).join(' | '),
                String(e.poznamka ?? ''), String(e.datum ?? '')
            ]);
        }

        const datum = new Date().toISOString().slice(0, 10);
        return new Response(csvSoubor(radky), {
            headers: {
                'content-type': 'text/csv; charset=utf-8',
                'content-disposition': `attachment; filename="hodnoceni-${datum}.csv"`,
                'cache-control': 'no-store'
            }
        });
    }

    /* ---------- import hodnocení z CSV ----------
       Append-only jako všude jinde: importovaný řádek je NOVÉ hodnocení, nikdy
       přepis. Sloupec `id` se proto při zápisu ignoruje, slouží jen k tomu, aby
       trenér v Excelu poznal, co je co. */
    if (cesta === '/api/evaluations/import' && metoda === 'POST') {
        const { csv, nanecisto } = await request.json<{ csv?: string; nanecisto?: boolean }>();
        if (!csv || !csv.trim()) return chyba('Soubor je prázdný.', 400);

        const tabulka = csvRozeber(csv);
        if (tabulka.length < 2) return chyba('Soubor nemá žádné řádky s daty.', 400);

        // Hlavička může být v obou jazycích i v klíčích — mapuje se na klíče.
        const najdi = (radek: string[], varianty: string[]) =>
            radek.findIndex(b => varianty.some(v => holyText(b) === holyText(v)));
        const hlavicka = tabulka[0];
        const sl = {
            // `id` rozhoduje, jestli je řádek úprava existujícího hodnocení,
            // nebo úplně nový záznam. Prázdné = nový.
            id: najdi(hlavicka, ['id']),
            hracId: najdi(hlavicka, ['hrac_id', 'player_id']),
            hrac: najdi(hlavicka, ['hráč', 'hrac', 'player']),
            obdobi: najdi(hlavicka, ['období', 'obdobi', 'period']),
            autor: najdi(hlavicka, ['autor', 'author']),
            hodnotil: najdi(hlavicka, ['hodnotil', 'signed by']),
            sablona: najdi(hlavicka, ['šablona', 'sablona', 'template']),
            fyzicky: najdi(hlavicka, ['fyzicky', 'physical']),
            hlavou: najdi(hlavicka, ['hlavou', 'head']),
            parta: najdi(hlavicka, ['v partě', 'parta', 'in the group']),
            cile: najdi(hlavicka, ['cíle', 'cile', 'goals'])
        };
        if (sl.sablona < 0) return chyba('V hlavičce chybí sloupec „šablona".', 400);

        // Sloupec osy se pozná podle popisku i podle klíče, v obou jazycích.
        const osaSloupce = new Map<string, number>();
        for (const klic of vsechnyOsy()) {
            const i = najdi(hlavicka, [klic, popis('osa', klic, 'cs'), popis('osa', klic, 'en')]);
            if (i >= 0) osaSloupce.set(klic, i);
        }

        const { results: lide } = await env.DB.prepare(
            'SELECT id, jmeno, login, role, aktivni, sablona, sablony FROM players').all<any>();
        const podleId = new Map((lide ?? []).map((o: any) => [Number(o.id), o]));
        const podleJmena = new Map((lide ?? []).map((o: any) => [holyText(o.jmeno), o]));

        const chyby: string[] = [];
        const kZapisu: any[] = [];

        /* Řádek se sloupcem `id` je ÚPRAVA existujícího hodnocení, ne nový
           záznam — import se má chovat stejně jako oprava ve formuláři: uloží
           se nová verze navázaná přes `uprava_id`, původní zůstává v historii.
           Proto se předlohy načtou dopředu. */
        const { results: puvodni } = await env.DB.prepare(
            'SELECT id, player_id, autor, autor_id, sablona, obdobi, hodnoty, fyzicky, hlavou, parta, cile FROM evaluations'
        ).all<any>();
        const podleIdHodnoceni = new Map((puvodni ?? []).map((e: any) => [Number(e.id), e]));

        const preskoceno: string[] = [];
        let bezeZmeny = 0;
        const nastav = await nastaveni(env);

        /** Porovnání toho, co se ukládá — ať se beze změny nezakládají kopie. */
        const stejne = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

        for (let r = 1; r < tabulka.length; r++) {
            const radek = tabulka[r];
            if (!radek.some(b => b.trim())) continue;          // prázdný řádek se přeskočí
            const cislo = r + 1;                                // číslo řádku, jak ho vidí Excel
            const vezmi = (i: number) => (i >= 0 ? (radek[i] ?? '').trim() : '');

            const predloha = podleIdHodnoceni.get(Number(vezmi(sl.id)));

            /* Sebehodnocení se importovat ani upravovat nedá. Celý nástroj stojí
               na tom, že jsou to DVA nezávislé pohledy; kdyby hráčův pohled mohl
               nahrát trenér, přestal by být hráčův. Není to chyba souboru —
               export ta hodnocení obsahuje schválně, aby byla vidět. */
            const autor = klicZPopisu('role', vezmi(sl.autor) || 'trener');
            if (autor === 'hrac' || predloha?.autor === 'hrac') {
                preskoceno.push(`řádek ${cislo}: sebehodnocení hráče — mění ho jen hráč přes svůj odkaz`);
                continue;
            }

            const hrac = podleId.get(Number(vezmi(sl.hracId))) ?? podleJmena.get(holyText(vezmi(sl.hrac)));
            if (!hrac) { chyby.push(`řádek ${cislo}: hráč nenalezen (${vezmi(sl.hrac) || vezmi(sl.hracId) || '—'})`); continue; }
            if (hrac.role !== 'hrac') { chyby.push(`řádek ${cislo}: ${hrac.jmeno} není hráč`); continue; }
            if (predloha && Number(predloha.player_id) !== Number(hrac.id)) {
                chyby.push(`řádek ${cislo}: id ${vezmi(sl.id)} patří jinému hráči — id se nepřepisuje`);
                continue;
            }

            const sablona = klicZPopisu('sablona', vezmi(sl.sablona)) || predloha?.sablona;
            // U úpravy platí šablona předlohy, i kdyby ji hráč mezitím ztratil —
            // stejná výjimka jako ve formuláři.
            if (!sablonyOsoby(hrac).includes(sablona) && sablona !== predloha?.sablona) {
                chyby.push(`řádek ${cislo}: ${hrac.jmeno} nemá přiřazenou šablonu ${sablona}`);
                continue;
            }

            /* Známky: u úpravy se vychází z původních a přepíšou se jen ty, které
               jsou v souboru vyplněné. Díky tomu projde i nezměněný export
               staršího hodnocení, které novou osu (kondici) vůbec nemá — prázdná
               buňka znamená „neměnit", ne „vynulovat". */
            let hodnoty: Record<string, number> = {};
            if (predloha) {
                try { hodnoty = JSON.parse(String(predloha.hodnoty ?? '{}')); } catch { hodnoty = {}; }
            }
            let spatna: string | null = null;
            for (const klic of klice(sablona)) {
                const i = osaSloupce.get(klic);
                const syrove = String(i !== undefined ? radek[i] ?? '' : '').trim();
                if (!syrove) continue;                       // prázdno = neměnit
                const cislovka = Number(syrove.replace(',', '.'));
                if (!Number.isInteger(cislovka) || cislovka < 1 || cislovka > MAX) {
                    spatna = `osa „${popis('osa', klic, 'cs')}" musí být celé číslo 1 až ${MAX} (je „${syrove}")`;
                    break;
                }
                hodnoty[klic] = cislovka;
            }
            if (spatna) { chyby.push(`řádek ${cislo}: ${spatna}`); continue; }

            // Nové hodnocení musí mít osy všechny; úprava si nese ty, co měla.
            if (!predloha) {
                const problem = zkontrolujHodnoty(sablona, hodnoty);
                if (problem) { chyby.push(`řádek ${cislo}: ${problem}`); continue; }
            } else if (!Object.keys(hodnoty).length) {
                chyby.push(`řádek ${cislo}: žádné známky`);
                continue;
            }

            /* Podpis: co je v souboru, jinak podpis původního hodnocení, jinak
               přihlášený trenér — přesně jako formulář, který ho předvyplní. */
            const zeSouboru = podleJmena.get(holyText(vezmi(sl.hodnotil)));
            const podpisId = (zeSouboru && zeSouboru.role === 'trener' ? zeSouboru.id : null)
                ?? predloha?.autor_id ?? kdo.id ?? null;
            const problemPodpisu = await overTrenera(env, podpisId ? Number(podpisId) : null);
            if (problemPodpisu) {
                chyby.push(`řádek ${cislo}: sloupec „hodnotil" musí obsahovat jméno trenéra (je „${vezmi(sl.hodnotil) || '—'}")`);
                continue;
            }

            const obdobi = vezmi(sl.obdobi) || predloha?.obdobi || nastav.obdobi;
            const zaznam = {
                player_id: hrac.id, obdobi, autor: 'trener', autor_id: Number(podpisId), sablona,
                hodnoty: JSON.stringify(hodnoty),
                fyzicky: (sl.fyzicky >= 0 ? vezmi(sl.fyzicky) : String(predloha?.fyzicky ?? '')) || null,
                hlavou: (sl.hlavou >= 0 ? vezmi(sl.hlavou) : String(predloha?.hlavou ?? '')) || null,
                parta: (sl.parta >= 0 ? vezmi(sl.parta) : String(predloha?.parta ?? '')) || null,
                cile: JSON.stringify(vezmi(sl.cile).split('|').map(c => c.trim()).filter(Boolean).slice(0, 5)),
                uprava_id: predloha ? Number(predloha.id) : null,
                popis: predloha
                    ? `${hrac.jmeno} — ${popis('sablona', sablona, 'cs')}, ${obdobi} (nová verze)`
                    : `${hrac.jmeno} — ${popis('sablona', sablona, 'cs')}, ${obdobi} (nové)`
            };

            /* Nezměněný řádek se nezapisuje. Kolotoč export → import by jinak
               při každém průchodu založil kopii celé historie. */
            if (predloha) {
                let puvCile: unknown = [];
                try { puvCile = JSON.parse(String(predloha.cile ?? '[]')); } catch { puvCile = []; }
                let puvHodnoty: unknown = {};
                try { puvHodnoty = JSON.parse(String(predloha.hodnoty ?? '{}')); } catch { puvHodnoty = {}; }
                const beze = stejne(hodnoty, puvHodnoty)
                    && stejne(zaznam.fyzicky, predloha.fyzicky ?? null)
                    && stejne(zaznam.hlavou, predloha.hlavou ?? null)
                    && stejne(zaznam.parta, predloha.parta ?? null)
                    && stejne(JSON.parse(zaznam.cile), puvCile)
                    && zaznam.obdobi === predloha.obdobi;
                if (beze) { bezeZmeny++; continue; }
            }

            kZapisu.push(zaznam);
        }

        if (!nanecisto && kZapisu.length) {
            await env.DB.batch(kZapisu.map(z => env.DB.prepare(
                `INSERT INTO evaluations (player_id, obdobi, autor, autor_id, sablona, hodnoty, fyzicky, hlavou, parta, cile, uprava_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(z.player_id, z.obdobi, z.autor, z.autor_id, z.sablona, z.hodnoty,
                   z.fyzicky, z.hlavou, z.parta, z.cile, z.uprava_id)));
        }

        return json({
            nanecisto: !!nanecisto,
            pridano: kZapisu.filter(z => !z.uprava_id).length,
            upraveno: kZapisu.filter(z => z.uprava_id).length,
            bezeZmeny,
            preskoceno,
            chyby,
            nahled: kZapisu.slice(0, 10).map(z => z.popis)
        });
    }

    /* ---------- import kádru z CSV ---------- */
    if (cesta === '/api/players/import' && metoda === 'POST') {
        const { csv, nanecisto } = await request.json<{ csv?: string; nanecisto?: boolean }>();
        if (!csv || !csv.trim()) return chyba('Soubor je prázdný.', 400);

        const radky = csvRozeber(csv);
        if (!radky.length) return chyba('V souboru není ani hlavička.', 400);

        const hlavicka = radky[0].map(h => h.trim().toLowerCase());
        if (!hlavicka.includes('jmeno')) {
            return chyba('V hlavičce chybí sloupec „jmeno". Vyexportuj si prázdný soubor '
                + 'tlačítkem Export — má přesně ty sloupce, které import čeká.', 400);
        }
        const sloupec = (r: string[], nazev: string) => {
            const i = hlavicka.indexOf(nazev);
            // Buňky ="…" (aby Excel nespolkl telefon jako číslo) se tu zase svlékají.
            return i >= 0 ? csvZText(r[i] ?? '') : '';
        };

        let pridano = 0, upraveno = 0;
        const chyby: { radek: number; jmeno: string; duvod: string }[] = [];

        for (let i = 1; i < radky.length; i++) {
            const r = radky[i];
            const cislo = i + 1;   // číslo řádku tak, jak ho vidí Excel
            // Pozice se píšou oddělené čárkou („střední záložník, stoper“); starší
            // soubory je mají jako klíče oddělené mezerou. Bereme obojí: nejdřív
            // podle čárek, a co se nepodaří přeložit, zkusíme rozpadnout na slova.
            const poziceText = sloupec(r, 'pozice');
            const pozice = poziceText
                .split(',')
                .map(c => c.trim())
                .filter(Boolean)
                .flatMap(cast => {
                    const klic = klicZPopisu('pozice', cast);
                    return POZICE.includes(klic) ? [klic] : cast.split(/\s+/).filter(Boolean);
                });

            // Šablon může být víc, oddělené čárkou. Soubory vyexportované dřív
            // mají sloupec `sablona` s jedinou hodnotou — bereme obojí.
            const sablonyText = sloupec(r, 'sablony') || sloupec(r, 'sablona');
            const sablony = [...new Set(sablonyText.split(',').map(c => c.trim()).filter(Boolean)
                .map(c => klicZPopisu('sablona', c)))];
            if (!sablony.length) sablony.push('pole');

            const osoba = {
                jmeno: sloupec(r, 'jmeno'),
                prezdivka: sloupec(r, 'prezdivka') || null,
                post: sloupec(r, 'post') || null,
                pozice,
                role: klicZPopisu('role', sloupec(r, 'role')) || 'hrac',
                sablony,
                sablona: sablony[0],
                aktivni: hlavicka.includes('aktivni') ? csvAno(sloupec(r, 'aktivni')) : 1,
                email: sloupec(r, 'email') || null,
                telegram_chat_id: sloupec(r, 'telegram_chat_id') || null,
                telefon: sloupec(r, 'telefon') || null,
                notif_email: csvAno(sloupec(r, 'notif_email')),
                notif_telegram: csvAno(sloupec(r, 'notif_telegram')),
                notif_sms: csvAno(sloupec(r, 'notif_sms')),
                login: sloupec(r, 'login').toLowerCase() || null,
                hodnoceni_povinne: csvAno(sloupec(r, 'hodnoceni_povinne'))
            };

            const problem = zkontrolujOsobu(osoba);
            if (problem) { chyby.push({ radek: cislo, jmeno: osoba.jmeno, duvod: problem }); continue; }

            // Koho řádek popisuje: id > login > jméno a role. Bez toho by import
            // udělal z každé opravy nového člověka.
            const id = Number(sloupec(r, 'id')) || null;
            let stavajici: { id: number } | null = null;
            if (id) {
                stavajici = await env.DB.prepare('SELECT id FROM players WHERE id = ?')
                    .bind(id).first<{ id: number }>();
                if (!stavajici) {
                    chyby.push({ radek: cislo, jmeno: osoba.jmeno, duvod: `Osoba s id ${id} v databázi není.` });
                    continue;
                }
            } else if (osoba.login) {
                stavajici = await env.DB.prepare('SELECT id FROM players WHERE lower(login) = ?')
                    .bind(osoba.login).first<{ id: number }>();
            } else {
                stavajici = await env.DB.prepare(
                    'SELECT id FROM players WHERE lower(jmeno) = lower(?) AND role = ?'
                ).bind(osoba.jmeno, osoba.role).first<{ id: number }>();
            }

            if (nanecisto) { stavajici ? upraveno++ : pridano++; continue; }

            if (stavajici) {
                await env.DB.prepare(
                    `UPDATE players SET jmeno = ?, prezdivka = ?, post = ?, pozice = ?, role = ?,
                                        sablona = ?, sablony = ?, aktivni = ?, email = ?, telegram_chat_id = ?,
                                        telefon = ?, notif_email = ?, notif_telegram = ?, notif_sms = ?,
                                        login = ?, hodnoceni_povinne = ?
                      WHERE id = ?`
                ).bind(
                    osoba.jmeno, osoba.prezdivka, osoba.post, JSON.stringify(osoba.pozice),
                    osoba.role, osoba.sablona, JSON.stringify(osoba.sablony),
                    osoba.aktivni, osoba.email, osoba.telegram_chat_id,
                    osoba.telefon, osoba.notif_email, osoba.notif_telegram, osoba.notif_sms,
                    osoba.login, osoba.hodnoceni_povinne, stavajici.id
                ).run();
                upraveno++;
            } else {
                await env.DB.prepare(
                    `INSERT INTO players (jmeno, prezdivka, post, pozice, role, sablona, sablony, aktivni,
                                          email, telegram_chat_id, telefon,
                                          notif_email, notif_telegram, notif_sms, login, hodnoceni_povinne)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    osoba.jmeno, osoba.prezdivka, osoba.post, JSON.stringify(osoba.pozice),
                    osoba.role, osoba.sablona, JSON.stringify(osoba.sablony),
                    osoba.aktivni, osoba.email, osoba.telegram_chat_id,
                    osoba.telefon, osoba.notif_email, osoba.notif_telegram, osoba.notif_sms,
                    osoba.login, osoba.hodnoceni_povinne
                ).run();
                pridano++;
            }
        }

        // Hesla ani hodnocení se importem nikdy nedotýkáme — jen kartotéky lidí.
        return json({
            nanecisto: !!nanecisto, pridano, upraveno, chyby,
            radku: radky.length - 1
        });
    }

    /* ---------- hromadné obsazení jedné pozice ----------
       Opačný směr než formulář v Lidech: nevybírá se hráč a k němu pozice, ale
       pozice a k ní hráči. Zapisuje se **jen ta jedna pozice** — ostatní, které
       má hráč nastavené, se nechají být. Kdyby se ukládalo celé pole, vyřadil
       by tenhle formulář všechno, co v něm zrovna není vidět. */
    if (cesta === '/api/pozice' && metoda === 'PUT') {
        const { pozice, ids } = await request.json<{ pozice?: string; ids?: unknown[] }>();
        if (!pozice || !POZICE.includes(pozice)) return chyba('Neznámá pozice.', 400);

        const vybrani = new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger));

        const { results } = await env.DB.prepare(
            `SELECT id, pozice FROM players WHERE role = 'hrac'`
        ).all<{ id: number; pozice: string }>();

        const zmeny: { id: number; pozice: string[] }[] = [];
        for (const o of results ?? []) {
            let ma: string[] = [];
            try { ma = JSON.parse(String(o.pozice ?? '[]')); } catch { ma = []; }
            const melBy = vybrani.has(Number(o.id));
            const maTed = ma.includes(pozice);
            if (melBy === maTed) continue;                    // beze změny, nešahat

            // Pořadí ostatních pozic zůstává; přidaná jde na konec.
            const nove = melBy ? [...ma, pozice] : ma.filter(p => p !== pozice);
            const problem = zkontrolujPozice(nove);
            if (problem) return chyba(problem, 400);
            zmeny.push({ id: Number(o.id), pozice: nove });
        }

        if (zmeny.length) {
            await env.DB.batch(zmeny.map(z => env.DB.prepare(
                'UPDATE players SET pozice = ? WHERE id = ?'
            ).bind(JSON.stringify(z.pozice), z.id)));
        }

        return json({ pozice, zmeneno: zmeny.length, obsazeno: vybrani.size });
    }

    if (cesta === '/api/players') {
        if (metoda === 'GET') {
            const { results } = await env.DB.prepare(
                `SELECT id, jmeno, prezdivka, post, pozice, role, sablona, sablony, aktivni, created_at,
                        email, telegram_chat_id, telefon,
                        notif_email, notif_telegram, notif_sms, login,
                        hodnoceni_povinne, heslo_hash IS NOT NULL AS ma_heslo, heslo_zmeneno
                   FROM players`
            ).all();
            // Hash ani sůl ven nikdy neposíláme, jen příznak „heslo nastavené".
            // Řadí se česky v kódu, ne v SQL — viz porovnejLidi().
            return json((results ?? []).slice().sort(porovnejLidi).map(osobaVen));
        }
        if (metoda === 'POST') {
            const p = await request.json<any>();
            const problem = zkontrolujOsobu(p);
            if (problem) return chyba(problem, 400);
            const sablony = sablonyZTela(p);
            const r = await env.DB.prepare(
                `INSERT INTO players (jmeno, prezdivka, post, pozice, role, sablona, sablony, aktivni,
                                      email, telegram_chat_id, telefon,
                                      notif_email, notif_telegram, notif_sms, login,
                                      hodnoceni_povinne)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
                 RETURNING id, jmeno, prezdivka, post, pozice, role, sablona, sablony, aktivni,
                           email, telegram_chat_id, telefon,
                           notif_email, notif_telegram, notif_sms, login, hodnoceni_povinne`
            ).bind(
                p.jmeno.trim(), p.prezdivka || null, p.post || null,
                JSON.stringify(p.pozice ?? []), p.role, sablony[0], JSON.stringify(sablony),
                (p.email ?? '').trim() || null, (p.telegram_chat_id ?? '').trim() || null,
                (p.telefon ?? '').trim() || null,
                p.notif_email ? 1 : 0, p.notif_telegram ? 1 : 0, p.notif_sms ? 1 : 0,
                (p.login ?? '').trim().toLowerCase() || null,
                p.hodnoceni_povinne ? 1 : 0
            ).first();
            return json(osobaVen(r), 201);
        }
    }

    const osobaId = cesta.match(/^\/api\/players\/(\d+)$/)?.[1];
    if (osobaId && metoda === 'PATCH') {
        const p = await request.json<any>();
        const problem = zkontrolujOsobu(p);
        if (problem) return chyba(problem, 400);
        const sablony = sablonyZTela(p);
        const r = await env.DB.prepare(
            `UPDATE players SET jmeno = ?, prezdivka = ?, post = ?, pozice = ?,
                                role = ?, sablona = ?, sablony = ?, aktivni = ?,
                                email = ?, telegram_chat_id = ?, telefon = ?,
                                notif_email = ?, notif_telegram = ?, notif_sms = ?,
                                login = ?, hodnoceni_povinne = ?
              WHERE id = ?
          RETURNING id, jmeno, prezdivka, post, pozice, role, sablona, sablony, aktivni,
                    email, telegram_chat_id, telefon,
                    notif_email, notif_telegram, notif_sms, login, hodnoceni_povinne`
        ).bind(
            p.jmeno.trim(), p.prezdivka || null, p.post || null, JSON.stringify(p.pozice ?? []),
            p.role, sablony[0], JSON.stringify(sablony), p.aktivni ? 1 : 0,
            (p.email ?? '').trim() || null, (p.telegram_chat_id ?? '').trim() || null,
            (p.telefon ?? '').trim() || null,
            p.notif_email ? 1 : 0, p.notif_telegram ? 1 : 0, p.notif_sms ? 1 : 0,
            (p.login ?? '').trim().toLowerCase() || null,
            p.hodnoceni_povinne ? 1 : 0,
            Number(osobaId)
        ).first();
        if (!r) return chyba('Osoba nenalezena.', 404);
        return json(osobaVen(r));
    }

    /* ---------- smazání osoby ----------
       Vyřazený hráč se NEMAŽE, jen se odškrtne „aktivní" — jeho hodnocení jsou
       součástí historie a číslo, které dostal, se už nikomu nepřidělí. Smazat
       jde proto jen člověk, po kterém nic nezůstalo: překlep v kádru, dvojitý
       import, omylem založený trenér. Kdo má hodnocení (svoje nebo pořízená),
       odkaz na sebehodnocení nebo zápis v komunikaci, se smazat nedá a aplikace
       řekne proč — mazat záznamy „nějak kolem" by z historie udělalo děravý
       dokument, který nejde vzít do ruky.                                      */
    if (osobaId && metoda === 'DELETE') {
        const id = Number(osobaId);
        const osoba = await env.DB.prepare('SELECT id, jmeno, role FROM players WHERE id = ?')
            .bind(id).first<{ id: number; jmeno: string; role: string }>();
        if (!osoba) return chyba('Osoba nenalezena.', 404);

        const pocty = await env.DB.prepare(
            `SELECT
                (SELECT COUNT(*) FROM evaluations WHERE player_id = ?) AS hodnoceni,
                (SELECT COUNT(*) FROM evaluations WHERE autor_id = ?)  AS porizil,
                (SELECT COUNT(*) FROM tokens      WHERE player_id = ?) AS odkazy`
        ).bind(id, id, id).first<{ hodnoceni: number; porizil: number; odkazy: number }>();

        const drzi = [
            pocty?.hodnoceni ? `${pocty.hodnoceni}× hodnocení` : '',
            pocty?.porizil ? `${pocty.porizil}× hodnocení, které pořídil(a)` : '',
            pocty?.odkazy ? `${pocty.odkazy}× odkaz na sebehodnocení` : ''
        ].filter(Boolean);

        if (drzi.length) {
            return chyba(
                `${osoba.jmeno} má v databázi ${drzi.join(', ')} — smazat to nejde, `
                + 'protože by z historie zmizely záznamy. Odškrtni místo toho „aktivní".',
                409
            );
        }

        // Nedokončené odkazy na nastavení hesla po téhle osobě už nemají komu patřit.
        await env.DB.batch([
            env.DB.prepare('DELETE FROM obnova WHERE player_id = ?').bind(id),
            env.DB.prepare('DELETE FROM players WHERE id = ?').bind(id)
        ]);
        return json({ smazano: true, jmeno: osoba.jmeno });
    }

    /* ---------- období, která v datech opravdu jsou ----------
       Nabídka místo volného pole. Překlep ve volném poli nevypadá jako chyba:
       tisk projde a vyjedou prázdné listy, protože se hledalo období, které
       nikdo nikdy nezadal.

       Chronologii nese datum, ne řetězec. „2026/2027 jaro" je abecedně PŘED
       „2026/2027 zima", ale v sezoně je až za ním — řadí se proto podle
       nejstaršího záznamu v období, stejně jako sloupce v /api/porovnani-vice.

       V nabídce je i období z Nastavení, i když v něm ještě žádné hodnocení
       není: právě do něj se teď hodnotí a jeho prázdné listy jsou legitimní
       podklad k vyplnění rukou.                                              */
    if (cesta === '/api/obdobi' && metoda === 'GET') {
        const nas = await nastaveni(env);
        const { results } = await env.DB.prepare(
            `SELECT obdobi,
                    COUNT(DISTINCT CASE WHEN autor IN ('trener', 'shoda')
                                        THEN player_id || '|' || sablona END) AS listy,
                    COUNT(DISTINCT CASE WHEN autor = 'hrac'
                                        THEN player_id || '|' || sablona END) AS odHracu,
                    COUNT(*) AS zaznamu, MIN(datum) AS prvni, MAX(datum) AS posledni
               FROM evaluations
              GROUP BY obdobi
              ORDER BY MIN(datum) DESC`
        ).all<{ obdobi: string; listy: number; odHracu: number; zaznamu: number;
                prvni: string; posledni: string }>();

        const obdobi = results ?? [];
        if (!obdobi.some(o => o.obdobi === nas.obdobi)) {
            obdobi.unshift({ obdobi: nas.obdobi, listy: 0, odHracu: 0, zaznamu: 0,
                             prvni: '', posledni: '' });
        }
        return json({ aktualni: nas.obdobi, obdobi });
    }

    /* ---------- přehled stavu za období ----------
       Hráč může mít víc šablon a každá je vlastní list, vlastní odkaz a vlastní
       řada. Přehled proto říká stav **po šablonách**; souhrnné `ma_trener`
       a `ma_hrac` zůstávají (platí, když je hotová aspoň jedna šablona).

       `obdobi=vse` = napříč všemi obdobími; ✓ pak znamená „aspoň v jednom",
       ne „letos". Používají to Listy, když se tisknou celé dějiny hráče.     */
    if (cesta === '/api/prehled' && metoda === 'GET') {
        const obdobi = q.get('obdobi') || (await nastaveni(env)).obdobi;
        const vse = obdobi === VSECHNA_OBDOBI;
        const kdeE = vse ? '' : 'AND e.obdobi = ?';
        const kdeT = vse ? '' : 'AND t.obdobi = ?';

        const { results } = await env.DB.prepare(
            `SELECT p.id, p.jmeno, p.prezdivka, p.post, p.role, p.sablona, p.sablony, p.aktivni,
                    EXISTS(SELECT 1 FROM evaluations e
                            WHERE e.player_id = p.id ${kdeE} AND e.autor = 'trener') AS ma_trener,
                    EXISTS(SELECT 1 FROM evaluations e
                            WHERE e.player_id = p.id ${kdeE} AND e.autor = 'hrac')   AS ma_hrac,
                    EXISTS(SELECT 1 FROM tokens t
                            WHERE t.player_id = p.id ${kdeT} AND t.pouzit = 0)       AS ma_odkaz
               FROM players p
              WHERE p.role = 'hrac'
              ORDER BY p.aktivni DESC, p.jmeno`
        ).bind(...(vse ? [] : [obdobi, obdobi, obdobi])).all();

        const { results: hotove } = await env.DB.prepare(
            `SELECT player_id, sablona, autor FROM evaluations
              WHERE autor IN ('trener', 'hrac') ${vse ? '' : 'AND obdobi = ?'}
              GROUP BY player_id, sablona, autor`
        ).bind(...(vse ? [] : [obdobi])).all<{ player_id: number; sablona: string; autor: string }>();

        const { results: cekajiciOdkazy } = await env.DB.prepare(
            `SELECT player_id, sablona FROM tokens
              WHERE pouzit = 0 ${vse ? '' : 'AND obdobi = ?'}
              GROUP BY player_id, sablona`
        ).bind(...(vse ? [] : [obdobi])).all<{ player_id: number; sablona: string }>();

        const hraci = (results ?? []).map((h: any) => ({
            ...osobaVen(h),
            stavSablon: sablonyOsoby(h).map(sablona => ({
                sablona,
                maTrener: (hotove ?? []).some(x => x.player_id === h.id && x.sablona === sablona && x.autor === 'trener'),
                maHrac: (hotove ?? []).some(x => x.player_id === h.id && x.sablona === sablona && x.autor === 'hrac'),
                maOdkaz: (cekajiciOdkazy ?? []).some(x => x.player_id === h.id && x.sablona === sablona)
            }))
        }));

        return json({ obdobi, hraci });
    }

    /* ---------- hodnocení ---------- */
    if (cesta === '/api/evaluations') {
        if (metoda === 'GET') {
            const playerId = Number(q.get('player_id'));
            if (!playerId) return chyba('Chybí player_id.', 400);
            const obdobi = q.get('obdobi');
            const sql = obdobi
                ? 'SELECT * FROM evaluations WHERE player_id = ? AND obdobi = ? ORDER BY id DESC'
                : 'SELECT * FROM evaluations WHERE player_id = ? ORDER BY id DESC';
            const st = obdobi
                ? env.DB.prepare(sql).bind(playerId, obdobi)
                : env.DB.prepare(sql).bind(playerId);
            const { results } = await st.all<RadekHodnoceni>();
            return json((results ?? []).map(rozbal));
        }

        if (metoda === 'POST') {
            const h = await request.json<any>();
            const playerId = Number(h.player_id);
            if (!playerId) return chyba('Chybí player_id.', 400);

            const hrac = await env.DB.prepare('SELECT * FROM players WHERE id = ?')
                .bind(playerId).first<{ sablona: string; sablony: string; role: string }>();
            if (!hrac) return chyba('Hráč nenalezen.', 404);
            if (hrac.role !== 'hrac') return chyba('Hodnotí se jen hráči, ne trenéři.', 400);

            const sablona = h.sablona || sablonyOsoby(hrac)[0];
            const problem = zkontrolujHodnoty(sablona, h.hodnoty);
            if (problem) return chyba(problem, 400);

            const obdobi = (h.obdobi || '').trim() || (await nastaveni(env)).obdobi;
            const cile = Array.isArray(h.cile)
                ? h.cile.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 5)
                : [];

            // Hodnocení se neukládá bez podpisu. Za půl roku nikdo nedohledá, kdo
            // ho psal, a Shoda mezi trenéry nemá co s čím porovnávat. Přihlášený
            // účet má přednost před volbou ve formuláři — u společného hesla
            // (session bez id) platí to, co trenér vybral.
            const autorId = kdo.id ?? (h.autor_id ? Number(h.autor_id) : null);
            const problemAutora = await overTrenera(env, autorId);
            if (problemAutora) return chyba(problemAutora, 400);

            // Úprava staršího hodnocení. Původní řádek zůstává, tenhle je jeho
            // další verze — `uprava_id` drží nit, aby v historii šlo poznat
            // opravu od druhého, samostatně pořízeného hodnocení.
            const upravaId = h.uprava_id ? Number(h.uprava_id) : null;
            let sablonaPredlohy: string | null = null;
            if (upravaId) {
                const zdroj = await env.DB.prepare(
                    'SELECT player_id, autor, sablona FROM evaluations WHERE id = ?'
                ).bind(upravaId).first<{ player_id: number; autor: string; sablona: string }>();
                if (!zdroj) return chyba('Upravovaná verze hodnocení neexistuje.', 404);
                if (zdroj.player_id !== playerId) return chyba('Upravovaná verze patří jinému hráči.', 400);
                // Sebehodnocení hráče trenér nepřepisuje ani formou nové verze
                // a uzavřená shoda se dělá v Shodě, ne tady.
                if (zdroj.autor !== 'trener') return chyba('Upravovat jde jen hodnocení od trenéra.', 400);
                sablonaPredlohy = zdroj.sablona;
            }

            // Známkuje se jen šesticí os, kterou má hráč přiřazenou. Nabídka ve
            // formuláři je omezená stejně, tohle je pojistka na přímé volání API
            // a na starý otevřený formulář — jinak by hráči v poli vznikla
            // brankářská řada, kterou by v Listech nikdo nečekal.
            // Výjimka je oprava už pořízeného záznamu: šablonu mohl hráč mezitím
            // ztratit a novou verzi musí jít uložit tam, kam původní patří.
            if (!sablonyOsoby(hrac).includes(sablona) && sablona !== sablonaPredlohy) {
                return chyba(`Hráč nemá přiřazenou šablonu ${sablona} — zaškrtává se u něj v Lidech.`, 400);
            }

            const r = await env.DB.prepare(
                `INSERT INTO evaluations
                    (player_id, obdobi, autor, autor_id, sablona, hodnoty, fyzicky, hlavou, parta, cile, uprava_id)
                 VALUES (?, ?, 'trener', ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, datum`
            ).bind(
                playerId, obdobi, autorId, sablona,
                JSON.stringify(h.hodnoty),
                (h.fyzicky ?? '').trim() || null,
                (h.hlavou ?? '').trim() || null,
                (h.parta ?? '').trim() || null,
                JSON.stringify(cile),
                upravaId
            ).first();
            await zapisUdalost(env, 'hodnoceni', playerId, obdobi, autorId);
            return json({ ulozeno: true, ...r }, 201);
        }
    }

    /* ---------- předloha pro úpravu hodnocení ----------
       Vrátí poslední VLASTNÍ hodnocení hráče v období, aby se dalo načíst do
       formuláře, opravit a uložit jako další verze. Nic nemaže a nepřepisuje.

       Známkování naslepo tím netrpí: vrací se jen to, co ten člověk sám
       napsal — vlastní čísla nemají co ukotvovat. Když je přihlášený konkrétní
       trenér, dostane výhradně své řádky, ať v nabídce autora vybere kohokoli.
       U přechodného společného hesla (session bez id) platí volba z formuláře,
       stejně jako u samotného ukládání — víc se v tom režimu poznat nedá.     */
    if (cesta === '/api/evaluations/predloha' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);

        const obdobi = q.get('obdobi') || (await nastaveni(env)).obdobi;
        const sablona = q.get('sablona') && q.get('sablona')! in SABLONY ? q.get('sablona')! : null;
        const autorId = kdo.id ?? (q.get('autor_id') ? Number(q.get('autor_id')) : null);

        const r = sablona
            ? await env.DB.prepare(
                `SELECT * FROM evaluations
                  WHERE player_id = ? AND obdobi = ? AND autor = 'trener'
                    AND sablona = ? AND autor_id IS ?
                  ORDER BY id DESC LIMIT 1`
            ).bind(playerId, obdobi, sablona, autorId).first<RadekHodnoceni>()
            : await env.DB.prepare(
                `SELECT * FROM evaluations
                  WHERE player_id = ? AND obdobi = ? AND autor = 'trener' AND autor_id IS ?
                  ORDER BY id DESC LIMIT 1`
            ).bind(playerId, obdobi, autorId).first<RadekHodnoceni>();

        return json({ obdobi, predloha: r ? rozbal(r) : null });
    }

    /* ---------- hromadné hodnocení ----------
       Když má půlka kádru stejné hlavičky, nemá smysl klikat každého zvlášť.
       Vyplněné osy se **doplní k poslednímu hodnocení** toho hráče (od stejného
       trenéra, ve stejném období a šabloně) a uloží se jako nový záznam — nic
       se nepřepisuje, historie zůstává. Kdo od tebe v tomhle období hodnocení
       ještě nemá, se nezaloží: chybějícím osám by nebylo co doplnit a neúplný
       záznam nejde vykreslit ani vytisknout. Takoví hráči se vrátí v `ceka`.  */
    if (cesta === '/api/evaluations/hromadne' && metoda === 'POST') {
        const h = await request.json<any>();
        const sablona = String(h.sablona || 'pole');
        if (!(sablona in SABLONY)) return chyba(`Neznámá šablona: ${sablona}`, 400);

        const osy = klice(sablona);
        const zadane: Record<string, number> = {};
        for (const [osa, hodnota] of Object.entries(h.hodnoty ?? {})) {
            if (hodnota === '' || hodnota === null || hodnota === undefined) continue;
            if (!osy.includes(osa)) return chyba(`Osa ${osa} do šablony ${sablona} nepatří.`, 400);
            const n = Number(hodnota);
            if (!Number.isInteger(n) || n < 1 || n > MAX) {
                return chyba(`Osa ${osa}: hodnota musí být celé číslo 1–${MAX}.`, 400);
            }
            zadane[osa] = n;
        }
        if (!Object.keys(zadane).length) return chyba('Nevyplnil jsi ani jednu osu.', 400);

        const ids = Array.isArray(h.player_ids) ? h.player_ids.map(Number).filter(Boolean) : [];
        if (!ids.length) return chyba('Nevybral jsi ani jednoho hráče.', 400);

        // Podpis platí i tady — a navíc rozhoduje, ke kterému hodnocení se
        // doplňuje: základ se hledá mezi řádky od téhož trenéra.
        const autorId = kdo.id ?? (h.autor_id ? Number(h.autor_id) : null);
        const problemAutora = await overTrenera(env, autorId);
        if (problemAutora) return chyba(problemAutora, 400);

        const obdobi = (h.obdobi || '').trim() || (await nastaveni(env)).obdobi;
        const ulozeno: { id: number; jmeno: string }[] = [];
        const ceka: { id: number; jmeno: string }[] = [];
        const chyby: { jmeno: string; duvod: string }[] = [];

        for (const id of ids) {
            const hrac = await env.DB.prepare('SELECT id, jmeno, role FROM players WHERE id = ?')
                .bind(id).first<{ id: number; jmeno: string; role: string }>();
            if (!hrac) { chyby.push({ jmeno: `#${id}`, duvod: 'Hráč v databázi není.' }); continue; }
            if (hrac.role !== 'hrac') {
                chyby.push({ jmeno: hrac.jmeno, duvod: 'Hodnotí se jen hráči, ne trenéři.' });
                continue;
            }

            // Základ je poslední hodnocení od TOHOTO trenéra — cizí čísla se nepřebírají.
            const zaklad = await env.DB.prepare(
                `SELECT hodnoty, fyzicky, hlavou, parta, cile FROM evaluations
                  WHERE player_id = ? AND obdobi = ? AND sablona = ? AND autor = 'trener'
                    AND autor_id IS ? ORDER BY id DESC LIMIT 1`
            ).bind(id, obdobi, sablona, autorId).first<RadekHodnoceni>();

            if (!zaklad) { ceka.push({ id, jmeno: hrac.jmeno }); continue; }

            let puvodni: Record<string, number> = {};
            try { puvodni = JSON.parse(String(zaklad.hodnoty ?? '{}')); } catch { puvodni = {}; }
            const hodnoty = { ...puvodni, ...zadane };

            const problem = zkontrolujHodnoty(sablona, hodnoty);
            if (problem) { chyby.push({ jmeno: hrac.jmeno, duvod: problem }); continue; }

            if (!h.nanecisto) {
                await env.DB.prepare(
                    `INSERT INTO evaluations
                        (player_id, obdobi, autor, autor_id, sablona, hodnoty, fyzicky, hlavou, parta, cile)
                     VALUES (?, ?, 'trener', ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    id, obdobi, autorId, sablona, JSON.stringify(hodnoty),
                    zaklad.fyzicky ?? null, zaklad.hlavou ?? null, zaklad.parta ?? null,
                    zaklad.cile ?? '[]'
                ).run();
                await zapisUdalost(env, 'hodnoceni', id, obdobi, autorId);
            }
            ulozeno.push({ id, jmeno: hrac.jmeno });
        }

        return json({
            nanecisto: !!h.nanecisto, obdobi, sablona,
            osy: Object.keys(zadane), ulozeno, ceka, chyby
        });
    }

    /* ---------- shoda mezi trenéry ---------- */
    if (cesta === '/api/shoda' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);
        const nas = await nastaveni(env);
        const obdobi = q.get('obdobi') || nas.obdobi;
        const sablona = q.get('sablona') && q.get('sablona')! in SABLONY ? q.get('sablona')! : 'pole';
        return json(await shoda(env, playerId, obdobi, sablona, kdo));
    }

    /* ---------- uzavření shody = další verze hodnocení ---------- */
    if (cesta === '/api/shoda' && metoda === 'POST') {
        const h = await request.json<any>();
        const playerId = Number(h.player_id);
        if (!playerId) return chyba('Chybí player_id.', 400);

        const nas = await nastaveni(env);
        const obdobi = (h.obdobi || nas.obdobi).trim();
        const sablona = h.sablona in SABLONY ? h.sablona : 'pole';

        const problem = zkontrolujHodnoty(sablona, h.hodnoty);
        if (problem) return chyba(problem, 400);

        // Uzavření shody je taky hodnocení, takže i tady musí být podepsané,
        // kdo ho uzavřel — jinak by v historii stál záznam bez původce.
        const autorId = kdo.id ?? (h.autor_id ? Number(h.autor_id) : null);
        const problemAutora = await overTrenera(env, autorId);
        if (problemAutora) return chyba(problemAutora, 400);

        const cile = Array.isArray(h.cile)
            ? h.cile.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 5)
            : [];

        // Původní hodnocení trenérů zůstávají. Tohle je další verze, ne přepis.
        const r = await env.DB.prepare(
            `INSERT INTO evaluations
                (player_id, obdobi, autor, autor_id, sablona, hodnoty,
                 fyzicky, hlavou, parta, cile, poznamka_shody)
             VALUES (?, ?, 'shoda', ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, datum`
        ).bind(
            playerId, obdobi, autorId, sablona, JSON.stringify(h.hodnoty),
            (h.fyzicky ?? '').trim() || null,
            (h.hlavou ?? '').trim() || null,
            (h.parta ?? '').trim() || null,
            JSON.stringify(cile),
            (h.poznamka_shody ?? '').trim() || null
        ).first();

        await zapisUdalost(env, 'hodnoceni', playerId, obdobi, autorId);
        return json({ ulozeno: true, ...r }, 201);
    }

    /* ---------- historie: všechny verze, nic se nemaže ---------- */
    if (cesta === '/api/historie' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);
        const { results } = await env.DB.prepare(
            `SELECT e.id, e.datum, e.obdobi, e.autor, e.autor_id, e.sablona, e.hodnoty,
                    e.fyzicky, e.hlavou, e.parta, e.cile, e.poznamka, e.poznamka_shody,
                    e.uprava_id, a.jmeno AS autor_jmeno
               FROM evaluations e LEFT JOIN players a ON a.id = e.autor_id
              WHERE e.player_id = ?
              ORDER BY e.id DESC`
        ).bind(playerId).all<any>();
        return json((results ?? []).map(r => ({
            id: r.id, datum: r.datum, obdobi: r.obdobi, autor: r.autor,
            autorId: r.autor_id ?? null, upravaId: r.uprava_id ?? null,
            autorJmeno: r.autor_jmeno, sablona: r.sablona,
            hodnoty: JSON.parse(r.hodnoty),
            fyzicky: r.fyzicky, hlavou: r.hlavou, parta: r.parta,
            cile: r.cile ? JSON.parse(r.cile) : [],
            poznamka: r.poznamka, poznamkaShody: r.poznamka_shody
        })));
    }

    /* ---------- podklady pro tiskové listy ---------- */
    if (cesta === '/api/listy' && metoda === 'GET') {
        const nas = await nastaveni(env);
        const obdobi = q.get('obdobi') || nas.obdobi;
        const vseObdobi = obdobi === VSECHNA_OBDOBI;   // tisk celé historie
        const rezim = q.get('porovnani') || 'minule';   // 'minule' | 'hrac' | 'zadne'
        const ids = q.get('ids');

        // Tisk konkrétní starší verze — nic se nepřepisuje, takže se dá vrátit
        // k čemukoli, co kdy vzniklo.
        const verze = Number(q.get('verze'));
        if (verze) {
            const r = await env.DB.prepare(
                `SELECT e.*, p.jmeno, p.prezdivka, p.post, p.pozice
                   FROM evaluations e JOIN players p ON p.id = e.player_id
                  WHERE e.id = ?`
            ).bind(verze).first<any>();
            if (!r) return chyba('Taková verze hodnocení neexistuje.', 404);
            const v = rozbal(r);
            return json({
                nastaveni: { ...nas, obdobi: v.obdobi },
                listy: [{
                    player_id: r.player_id, jmeno: r.jmeno, prezdivka: r.prezdivka,
                    post: r.post, pozice: JSON.parse(r.pozice ?? '[]'),
                    obdobi: v.obdobi, sablona: v.sablona, hodnoceni: v.hodnoty,
                    porovnani: null, porovnaniRezim: null, porovnaniObdobi: '',
                    fyzicky: v.fyzicky ?? '', hlavou: v.hlavou ?? '', parta: v.parta ?? '',
                    cile: v.cile ?? []
                }]
            });
        }

        // Ferda má tři šablony, ale tisknout se má jen to, co je zaškrtnuté —
        // ne vždycky všechno, co u sebe má. Viz `rozeberIds`.
        const vyber = rozeberIds(ids);

        const { results: hraci } = await env.DB.prepare(
            `SELECT id, jmeno, prezdivka, post, pozice, sablona, sablony FROM players
              WHERE role = 'hrac' AND aktivni = 1 ORDER BY jmeno`
        ).all<{ id: number; jmeno: string; prezdivka: string | null; post: string | null;
                pozice: string; sablona: string; sablony: string }>();

        const vybrani = (hraci ?? []).filter(h => !vyber || vyber.some(v => v.id === h.id));
        const listy = [];

        /* Chronologie období. Bere se z dat (nejstarší záznam v období), protože
           z názvu ji přečíst nejde — „jaro" je abecedně před „zima", ale v sezoně
           je za ním. Potřebuje ji řazení hromádky při tisku historie i polygon
           „minule": ten se smí dívat jen dozadu. */
        const zacatekObdobi = new Map<string, string>();
        {
            const { results: o } = await env.DB.prepare(
                `SELECT obdobi, MIN(datum) AS prvni FROM evaluations GROUP BY obdobi`
            ).all<{ obdobi: string; prvni: string }>();
            for (const r of o ?? []) zacatekObdobi.set(r.obdobi, r.prvni);
        }

        for (const h of vybrani) {
            // Hráč může mít v jednom období hodnocení víc šablonami (brankář
            // i hráč v poli). Každá dostane vlastní list — do jednoho grafu
            // se brankářské a polní osy míchat nedají. Při `obdobi=vse` je
            // jednotkou listu dvojice období × šablona, takže hráč se dvěma
            // sezonami dostane papír za každou z nich.
            const { results: sablony } = await env.DB.prepare(
                `SELECT DISTINCT obdobi, sablona FROM evaluations
                  WHERE player_id = ? AND autor = 'trener' ${vseObdobi ? '' : 'AND obdobi = ?'}`
            ).bind(...[h.id, ...(vseObdobi ? [] : [obdobi])])
             .all<{ obdobi: string; sablona: string }>();

            // Co se vykreslí: šablony, které v období hodnocení mají, PLUS ty,
            // které má hráč přiřazené v kartotéce. Přiřazená šablona bez hodnocení
            // dá prázdný list jako podklad — jinak by chybějící brankářská řada
            // z tisku tiše zmizela a nikdo by si jí nevšiml.
            // Když si trenér vybral konkrétní listy (`id:sablona`), vytisknou se jen ty.
            const jenTyto = sablonyZVyberu(vyber, h.id);

            const kVykresleni: { obdobi: string; sablona: string }[] = [];
            const pridej = (o: string, s: string) => {
                if (jenTyto && !jenTyto.has(s)) return;
                if (!kVykresleni.some(x => x.obdobi === o && x.sablona === s)) {
                    kVykresleni.push({ obdobi: o, sablona: s });
                }
            };
            for (const s of sablony ?? []) pridej(s.obdobi, s.sablona);
            // Prázdný podklad se dělá jen do období, do kterého se právě hodnotí.
            // U historie by z toho byly papíry za sezony, kdy hráč tu šablonu
            // ještě neměl — a vypadaly by jako nevyplněné hodnocení.
            for (const s of sablonyOsoby(h)) pridej(vseObdobi ? nas.obdobi : obdobi, s);

            if (vseObdobi) {
                kVykresleni.sort((a, b) =>
                    (zacatekObdobi.get(a.obdobi) ?? '9999').localeCompare(zacatekObdobi.get(b.obdobi) ?? '9999')
                    || a.sablona.localeCompare(b.sablona));
            }

            for (const { obdobi: obdobiListu, sablona } of kVykresleni) {
                // Na list jde uzavřená shoda trenérů, když existuje. Teprve když
                // není, bere se poslední hodnocení trenéra — jinak by při dvou
                // trenérech tiše vyhrál ten, kdo uložil později.
                const trener = await posledni(env, h.id, obdobiListu, 'shoda', sablona)
                    ?? await posledni(env, h.id, obdobiListu, 'trener', sablona);
                let porovnani: Record<string, number> | null = null;
                let popisek = '';

                if (rezim === 'hrac') {
                    const hrac = await posledni(env, h.id, obdobiListu, 'hrac', sablona);
                    if (hrac) { porovnani = hrac.hodnoty; popisek = ''; }
                } else if (rezim === 'minule') {
                    /* „Minule" se musí dívat dozadu od tohohle listu, ne od dneška.
                       Dřív se brávalo nejnovější hodnocení z jiného období — u tisku
                       aktuálního období to vycházelo správně, ale jakmile jde vybrat
                       starší období (nebo se tisknou všechna), stálo by u podzimu
                       jako „minule" následující jaro a vývoj by ukazoval pozpátku.
                       Kotva je datum vlastního záznamu; u prázdného podkladu, který
                       žádné nemá, začátek jeho období. */
                    const driv = await predchoziObdobi(env, h.id, obdobiListu, sablona,
                        trener?.datum ?? zacatekObdobi.get(obdobiListu) ?? null);
                    if (driv) { porovnani = driv.hodnoty; popisek = driv.obdobi; }
                }

                listy.push({
                    player_id: h.id,
                    jmeno: h.jmeno,
                    prezdivka: h.prezdivka,
                    post: h.post,
                    pozice: JSON.parse(h.pozice ?? '[]'),
                    // Období nese každý list zvlášť: při tisku historie jich je
                    // na hromádce několik a v hlavičce musí být to své.
                    obdobi: obdobiListu,
                    sablona,
                    hodnoceni: trener?.hodnoty ?? null,
                    porovnani,
                    porovnaniRezim: porovnani ? rezim : null,
                    porovnaniObdobi: popisek,
                    fyzicky: trener?.fyzicky ?? '',
                    hlavou: trener?.hlavou ?? '',
                    parta: trener?.parta ?? '',
                    cile: trener?.cile ?? []
                });
            }
        }

        return json({
            // `nastaveni.obdobi` je popisek do hlavičky vysvětlivek a do stavového
            // řádku. U tisku historie žádné jedno období není, proto se posílá
            // příznak a text si složí prohlížeč (server nevrací texty).
            nastaveni: { ...nas, obdobi: vseObdobi ? nas.obdobi : obdobi },
            vsechnaObdobi: vseObdobi,
            listy
        });
    }

    /* ---------- porovnání trenér vs. hráč (§7.3) ---------- */
    /* ---------- rozřazení povelu jazykovým modelem ----------
       Volá se teprve tehdy, když si s větou neporadí prohlížeč sám. Běžné
       povely („Robin", „porovnej Robina a Ferdu") se rozřadí lokálně a
       nestojí ani token — model je tu na věty, které se vymykají.          */
    if (cesta === '/api/ai/prikaz' && metoda === 'POST') {
        const { text } = await request.json<{ text?: string }>();
        const veta = (text ?? '').trim().slice(0, 300);
        if (!veta) return chyba('Prázdný povel.', 400);

        const nas = await nastaveni(env);
        if (nas.aiPoskytovatel === 'vypnuto') {
            return json({ ok: false, duvod: 'vypnuto', popis: 'Jazykový model je v Nastavení vypnutý.' });
        }
        if (!env.AI) return json({ ok: false, duvod: 'binding', popis: 'Chybí binding AI.' });

        const { results } = await env.DB.prepare(
            `SELECT id, jmeno, prezdivka FROM players WHERE role = 'hrac' AND aktivni = 1`
        ).all<{ id: number; jmeno: string; prezdivka: string | null }>();
        const kadr = results ?? [];

        // Krátký vstup i výstup: chceme rozřazení, ne vypravování. Modelu jdou
        // jména kádru (aby poznal překlepy), ale žádné známky ani posudky.
        const pokyn = 'Jsi rozřazovač povelů v aplikaci na hodnocení mládežnických fotbalistů. '
            + 'Odpověz VÝHRADNĚ jedním JSON objektem bez dalšího textu, ve tvaru '
            + '{"akce":"hodnotit|porovnat|listy|odkaz|nevim","hraci":["jméno",...]}. '
            + 'Jména vybírej jen ze seznamu, který dostaneš. Když si nejsi jistý, vrať akci "nevim".';
        const dotaz = `Kádr: ${kadr.map(h => h.jmeno).join('; ')}\nPovel: ${veta}`;

        const pres_workers = async (m: string) => {
            const r = await env.AI!.run(m, {
                messages: [{ role: 'system', content: pokyn }, { role: 'user', content: dotaz }],
                max_tokens: stropTokenu(m, 120), temperature: 0
            });
            return textZWorkersAI(r);
        };

        /* Placený model. Když na účtu není kredit nebo je vyčerpaný limit, spadne
           to na model zdarma — appka nesmí kvůli fakturaci přestat fungovat. */
        const pres_claude = async (m: string) => {
            if (!env.ANTHROPIC_API_KEY) throw new Error('Chybí secret ANTHROPIC_API_KEY.');
            const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
            const odpoved = await anthropic.messages.create({
                model: m, max_tokens: 200, system: pokyn,
                messages: [{ role: 'user', content: dotaz }]
            });
            return odpoved.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
        };

        // Rozřazení povelu je klasifikace do čtyř kategorií — jede na modelu
        // pro povely, ne na tom, který si trenér vybral na analýzy.
        let model = modelProUkol(nas, 'povely');
        let poskytovatel = nas.aiPoskytovatel;
        let zaloha: string | null = null;
        const zacatek = Date.now();

        try {
            let syrove: string;
            if (poskytovatel === 'claude') {
                try {
                    syrove = await pres_claude(model);
                } catch (e) {
                    const duvod = claudeNaZalohu(e);
                    if (!duvod) throw e;                    // chyba zadání se zálohou nezakrývá
                    zaloha = duvod;
                    poskytovatel = 'workers';
                    model = vychoziModel('workers');
                    syrove = await pres_workers(model);
                }
            } else {
                syrove = await pres_workers(model);
            }

            const zavorka = syrove.slice(syrove.indexOf('{'), syrove.lastIndexOf('}') + 1);
            let navrh: any = null;
            try { navrh = JSON.parse(zavorka); } catch { navrh = null; }

            // Jména z modelu se párují na skutečný kádr tady — model ID hráčů
            // nevidí a vymyslet si je tím pádem nemůže.
            const najdi = (jmeno: string) => {
                const h = holyText(jmeno);
                return kadr.find(x => holyText(x.jmeno) === h)
                    ?? kadr.find(x => holyText(x.jmeno).includes(h) || h.includes(holyText(x.jmeno)))
                    ?? null;
            };
            const hraci = Array.isArray(navrh?.hraci)
                ? navrh.hraci.map((j: unknown) => najdi(String(j))).filter(Boolean)
                : [];

            const akce = ['hodnotit', 'porovnat', 'listy', 'odkaz'].includes(navrh?.akce) ? navrh.akce : 'nevim';
            const trvaloMs = Date.now() - zacatek;

            await zalogujKomunikaci(env, {
                kanal: 'ai', platforma: model, typ: 'prikaz', vysledek: akce === 'nevim' ? 'preskoceno' : 'ok',
                kod: akce, poznamka: veta.slice(0, 120),
                podrobnosti: `Rozřazeno za ${trvaloMs} ms; hráčů: ${hraci.length}.`
                    + (zaloha ? ` Záloha zdarma: ${zaloha}` : '')
            });

            return json({
                ok: akce !== 'nevim', zdroj: 'model', model, poskytovatel, zaloha, trvaloMs, akce,
                hraci: hraci.map((h: any) => ({ id: h.id, jmeno: h.jmeno }))
            });
        } catch (e) {
            const popis = e instanceof Error ? e.message : String(e);
            await zalogujKomunikaci(env, {
                kanal: 'ai', platforma: model, typ: 'prikaz', vysledek: 'chyba',
                poznamka: veta.slice(0, 120), podrobnosti: popis
            });
            return json({ ok: false, zdroj: 'model', model, popis });
        }
    }

    /* ---------- analýza kádru jazykovým modelem ----------
       Model tu NEPOČÍTÁ. Průměry, rozdíly a pořadí spočítal Worker
       (`podkladyProAnalyzu`) a model dostane hotová čísla — jeho prací je
       formulace. Kdyby počítal sám, spletl by se a věta by zněla stejně
       sebejistě. Proto je v pokynu zákaz cokoli dopočítávat.               */
    if (cesta === '/api/ai/analyza' && metoda === 'POST') {
        const { otazka, obdobi: kdy, popisky } = await request.json<{
            otazka?: string; obdobi?: string;
            popisky?: { osy?: Record<string, string>; sablony?: Record<string, string> };
        }>();
        const dotazTrenera = (otazka ?? '').trim().slice(0, 500);
        if (!dotazTrenera) return chyba('Prázdná otázka.', 400);

        const nas = await nastaveni(env);
        if (nas.aiPoskytovatel === 'vypnuto') {
            return json({ ok: false, duvod: 'vypnuto', popis: 'Jazykový model je v Nastavení vypnutý.' });
        }
        if (nas.aiAnalyzy !== 'ano') {
            return json({
                ok: false, duvod: 'analyzyVypnuty',
                popis: 'Analýzy modelem jsou vypnuté. Zapínají se zvlášť v Nastavení — '
                     + 'posílají ven známky a slovní posudky konkrétních hráčů.'
            });
        }
        if (!env.AI) return json({ ok: false, duvod: 'binding', popis: 'Chybí binding AI.' });

        const obdobi = (kdy || nas.obdobi).trim();
        const podklady = await podkladyProAnalyzu(env, obdobi, nas);
        if (!podklady.pocty.sHodnocenim) {
            return json({ ok: false, duvod: 'prazdno', popis: `Za období „${obdobi}" není žádné hodnocení.` });
        }

        const pokyn = [
            'Jsi pomocník trenéra mládežnického fotbalu. Dostaneš SPOČÍTANÁ data o hráčích a otázku.',
            'Odpovídej česky, stručně a konkrétně, ke každému tvrzení uveď jméno a číslo z podkladů.',
            'NIC NEDOPOČÍTÁVEJ a nevymýšlej: používej jen čísla, která jsou v podkladech.',
            'Když na otázku podklady nestačí, řekni to rovnou a napiš, co by bylo potřeba doplnit.',
            'Nehodnoť povahu hráče. Osy popisují chování, které je vidět, ne charakter.',
            'Rozdíl se znaménkem: + znamená, že si hráč dal víc než trenér (slepé místo),',
            '− že si dal míň (může jít o sebedůvěru nebo o něco mimo fotbal).',
            'Neuváděj souhrnnou známku hráče. Průměr je orientační, ne vysvědčení.',
            // Odpověď se vypisuje jako text, ne jako markdown — hvězdičky by zůstaly vidět.
            'Piš prostým textem bez markdownu: žádné hvězdičky, mřížky ani odrážky.'
        ].join(' ');

        const dotaz = `${podkladyDoTextu(podklady, popisky)}\n\nOTÁZKA TRENÉRA: ${dotazTrenera}`;

        const pres_workers = async (m: string) => {
            const r = await env.AI!.run(m, {
                messages: [{ role: 'system', content: pokyn }, { role: 'user', content: dotaz }],
                max_tokens: stropTokenu(m, 900), temperature: 0.2
            });
            const text = textZWorkersAI(r).trim();
            // Prázdno není „model mlčí" — má to konkrétní příčinu a ta patří
            // do logu komunikace, ne až do hlášení od uživatele.
            if (!text) throw new Error(procNicNeprislo(r, m));
            return text;
        };
        const pres_claude = async (m: string) => {
            if (!env.ANTHROPIC_API_KEY) throw new Error('Chybí secret ANTHROPIC_API_KEY.');
            const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
            const odpoved = await anthropic.messages.create({
                model: m, max_tokens: 1200, system: pokyn,
                messages: [{ role: 'user', content: dotaz }]
            });
            return odpoved.content.filter(b => b.type === 'text').map(b => (b as any).text).join('').trim();
        };

        let model = modelProUkol(nas, 'analyzy');
        let poskytovatel = nas.aiPoskytovatel;
        let zaloha: string | null = null;
        const zacatek = Date.now();

        try {
            let text: string;
            if (poskytovatel === 'claude') {
                try {
                    text = await pres_claude(model);
                } catch (e) {
                    const duvod = claudeNaZalohu(e);
                    if (!duvod) throw e;              // chyba zadání se zálohou nezakrývá
                    zaloha = duvod;
                    poskytovatel = 'workers';
                    model = vychoziModel('workers');
                    text = await pres_workers(model);
                }
            } else {
                text = await pres_workers(model);
            }

            const trvaloMs = Date.now() - zacatek;
            await zalogujKomunikaci(env, {
                kanal: 'ai', platforma: model, typ: 'analyza', vysledek: text ? 'ok' : 'preskoceno',
                poznamka: dotazTrenera.slice(0, 120),
                // Do logu jde jen rozsah podkladů, ne jejich obsah — log čte i ten,
                // kdo na hodnocení nemá dosah.
                podrobnosti: `Za ${trvaloMs} ms; podklady: ${podklady.pocty.sHodnocenim} listů`
                    + `, ${podklady.rozdily.length} os nad tolerancí.`
                    + (zaloha ? ` Záloha zdarma: ${zaloha}` : '')
            });

            // Podklady se vrací s odpovědí, aby si trenér mohl každé tvrzení ověřit
            // proti číslům. Věta od modelu bez čísel pod ní je jen dojem.
            return json({ ok: !!text, odpoved: text, model, poskytovatel, zaloha, trvaloMs, podklady });
        } catch (e) {
            const popis = e instanceof Error ? e.message : String(e);
            await zalogujKomunikaci(env, {
                kanal: 'ai', platforma: model, typ: 'analyza', vysledek: 'chyba',
                poznamka: dotazTrenera.slice(0, 120), podrobnosti: popis
            });
            return json({ ok: false, model, popis });
        }
    }

    /* ---------- nabídka modelů pro Nastavení ---------- */
    if (cesta === '/api/ai/modely' && metoda === 'GET') {
        const nas = await nastaveni(env);
        return json({
            modely: AI_MODELY,
            poskytovatel: nas.aiPoskytovatel,
            // Co úkol, to vlastní volba. Prohlížeč z toho poskládá nabídku sám,
            // takže přidání dalšího úkolu ve Workeru nevyžaduje zásah do UI.
            ukoly: AI_UKOLY.map(u => ({
                klic: u.klic, nastaveni: u.nastaveni,
                zvoleny: nas[u.nastaveni], pouzity: modelProUkol(nas, u.klic)
            })),
            zvoleny: nas.aiModel   // kvůli starším voláním
        });
    }

    /* ---------- ověření jazykového modelu (nic o hráčích neposílá) ----------
       Jádro dřív, než se na něm cokoli postaví: odpoví model z Workeru vůbec?
       Posílá se holá věta bez jediného údaje o komkoli z kádru.               */
    if (cesta === '/api/ai/stav' && metoda === 'GET') {
        const nas = await nastaveni(env);
        const zvoleny = q.get('model') || nas.aiModel || vychoziModel(nas.aiPoskytovatel);
        const jeClaude = AI_MODELY.find(m => m.id === zvoleny)?.poskytovatel === 'claude';
        const zacatek = Date.now();

        // Zkušební věta neobsahuje nic o kádru — ověřuje se spojení, ne appka.
        if (jeClaude) {
            if (!env.ANTHROPIC_API_KEY) {
                return json({ ok: false, poskytovatel: 'claude', model: zvoleny, popis: 'Chybí secret ANTHROPIC_API_KEY.' });
            }
            try {
                const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
                const r = await anthropic.messages.create({
                    model: zvoleny, max_tokens: 20,
                    system: 'Odpovídej česky, jedním slovem.',
                    messages: [{ role: 'user', content: 'Napiš slovo: funguje' }]
                });
                const odpoved = r.content.filter(b => b.type === 'text').map(b => (b as any).text).join('').trim();
                return json({
                    ok: !!odpoved, poskytovatel: 'claude', model: zvoleny,
                    odpoved: odpoved.slice(0, 120), trvaloMs: Date.now() - zacatek,
                    popis: 'Claude odpověděl, kredit na účtu je.'
                });
            } catch (e) {
                const duvod = claudeNaZalohu(e);
                return json({
                    ok: false, poskytovatel: 'claude', model: zvoleny,
                    zaloha: duvod,
                    popis: duvod
                        ? `${duvod} Povely proto poběží na modelu zdarma.`
                        : (e instanceof Error ? e.message : String(e))
                });
            }
        }

        if (!env.AI) {
            return json({ ok: false, poskytovatel: 'workers', model: zvoleny, popis: 'Chybí binding AI ve wrangler.jsonc.' });
        }
        try {
            const r = await env.AI.run(zvoleny, {
                messages: [
                    { role: 'system', content: 'Odpovídej česky, jedním slovem.' },
                    { role: 'user', content: 'Napiš slovo: funguje' }
                ],
                max_tokens: stropTokenu(zvoleny, 20)
            });
            const odpoved = textZWorkersAI(r).trim();
            return json({
                ok: !!odpoved, poskytovatel: 'workers', model: zvoleny,
                odpoved: odpoved.slice(0, 120), trvaloMs: Date.now() - zacatek,
                popis: odpoved
                    ? 'Model odpověděl. Volání z Workeru funguje.'
                    : procNicNeprislo(r, zvoleny)
            });
        } catch (e) {
            // Nejčastěji: model neexistuje, nebo je vyčerpaný denní limit free tieru.
            return json({
                ok: false, poskytovatel: 'workers', model: zvoleny,
                popis: e instanceof Error ? e.message : String(e)
            });
        }
    }

    /* ---------- srovnání hráčů mezi sebou ----------
       Jiná otázka než /api/porovnani: tam jde o rozdíl trenér vs. hráč u jednoho
       člověka, tady o to, jak si stojí dva brankáři vedle sebe. Srovnávají se
       jen hodnocení od trenérů (sebehodnocení hráčů by míchalo dvě různé optiky)
       a vždy v rámci jedné šablony — brankářské a polní osy nemají co porovnávat. */
    if (cesta === '/api/srovnani' && metoda === 'GET') {
        const nas = await nastaveni(env);
        const obdobi = q.get('obdobi') || nas.obdobi;
        const sablona = q.get('sablona') && q.get('sablona')! in SABLONY ? q.get('sablona')! : 'pole';
        const ids = (q.get('ids') ?? '').split(',').map(Number).filter(Boolean).slice(0, 8);
        if (ids.length < 2) return chyba('Vyber aspoň dva hráče.', 400);

        const osyKlice = klice(sablona);
        const hraci: { id: number; jmeno: string; hodnoty: Record<string, number> | null; prumer: number | null }[] = [];

        for (const id of ids) {
            const osoba = await env.DB.prepare('SELECT id, jmeno, prezdivka FROM players WHERE id = ?')
                .bind(id).first<{ id: number; jmeno: string; prezdivka: string | null }>();
            if (!osoba) continue;
            const h = await posledni(env, id, obdobi, 'trener', sablona);
            const hodnoty = h?.hodnoty ?? null;
            const cisla = hodnoty ? osyKlice.map(k => hodnoty[k]).filter(x => typeof x === 'number') : [];
            hraci.push({
                id, jmeno: osoba.jmeno,
                hodnoty,
                // Průměr je orientační souhrn, ne známka na vysvědčení — proto
                // se posílá vedle jednotlivých os, ne místo nich.
                prumer: cisla.length ? Math.round((cisla.reduce((a, b) => a + b, 0) / cisla.length) * 10) / 10 : null
            });
        }

        // Rozptyl na ose ukáže, kde se ti dva opravdu liší a kde jsou stejní.
        const osy = osyKlice.map(klic => {
            const cisla = hraci.map(h => h.hodnoty?.[klic]).filter((x): x is number => typeof x === 'number');
            return {
                klic,
                hodnoty: Object.fromEntries(hraci.map(h => [h.id, h.hodnoty?.[klic] ?? null])),
                nejlepe: cisla.length ? Math.max(...cisla) : null,
                nejhure: cisla.length ? Math.min(...cisla) : null,
                rozptyl: cisla.length > 1 ? Math.max(...cisla) - Math.min(...cisla) : null
            };
        });

        return json({ obdobi, sablona, osy, hraci });
    }

    /* ---------- co všechno jde porovnat ----------
       Nabídne jen to, co v databázi opravdu je: kombinace hráč × období ×
       autor v rámci JEDNÉ šablony. Šablona je tvrdá hranice — brankářská
       a polní šestice nemají jedinou společnou osu, takže „Chytání 8" proti
       „Levá noha 3" by nebylo porovnání, ale nesmysl.

       Vrací se `id` posledního hodnocení té kombinace. Append-only databáze
       má u jedné kombinace i několik verzí (opravy); ty jsou pro porovnání
       šum, od toho je historie verzí.                                        */
    if (cesta === '/api/zaznamy' && metoda === 'GET') {
        const sablona = q.get('sablona') && q.get('sablona')! in SABLONY ? q.get('sablona')! : 'pole';

        const { results } = await env.DB.prepare(
            `SELECT MAX(e.id) AS id, e.player_id, e.obdobi, e.autor, e.autor_id,
                    p.jmeno, p.prezdivka, MAX(e.datum) AS datum
               FROM evaluations e JOIN players p ON p.id = e.player_id
              WHERE e.sablona = ?
              GROUP BY e.player_id, e.obdobi, e.autor, e.autor_id
              ORDER BY e.obdobi DESC, p.jmeno`
        ).bind(sablona).all<{
            id: number; player_id: number; obdobi: string; autor: string;
            autor_id: number | null; jmeno: string; prezdivka: string | null; datum: string;
        }>();

        // Jméno trenéra se dohledá až tady, ať se v seznamu nepletou dva Trnkové.
        const { results: lide } = await env.DB.prepare('SELECT id, jmeno FROM players').all<{ id: number; jmeno: string }>();
        const jmenoPodleId = new Map((lide ?? []).map(o => [o.id, o.jmeno]));

        return json({
            sablona,
            zaznamy: (results ?? []).map(r => ({
                id: r.id, player_id: r.player_id, jmeno: r.jmeno, prezdivka: r.prezdivka,
                obdobi: r.obdobi, autor: r.autor, autorId: r.autor_id,
                // Klíč `autor` překládá prohlížeč; jméno konkrétního trenéra ne.
                autorJmeno: r.autor_id ? (jmenoPodleId.get(r.autor_id) ?? null) : null,
                datum: r.datum
            }))
        });
    }

    /* ---------- porovnání čehokoli s čímkoli (v rámci jedné šablony) ----------
       `ids` jsou id hodnocení ze `/api/zaznamy`. Co položka, to sloupec —
       takže vedle sebe můžou stát dvě období téhož hráče, dva hráči, trenér
       proti sebehodnocení i dva trenéři. Míchané šablony se odmítají.        */
    if (cesta === '/api/porovnani-vice' && metoda === 'GET') {
        const ids = (q.get('ids') ?? '').split(',').map(Number).filter(Boolean).slice(0, 8);
        if (ids.length < 2) return chyba('Vyber aspoň dva záznamy.', 400);

        const otazniky = ids.map(() => '?').join(',');
        const { results } = await env.DB.prepare(
            `SELECT e.*, p.jmeno, p.prezdivka FROM evaluations e
               JOIN players p ON p.id = e.player_id
              WHERE e.id IN (${otazniky})`
        ).bind(...ids).all<any>();

        if ((results ?? []).length < 2) return chyba('Vybrané záznamy se nenašly.', 404);

        const sablony = [...new Set((results ?? []).map(r => r.sablona))];
        if (sablony.length > 1) {
            return chyba('Porovnávat jde jen záznamy se stejnou šablonou — jiná šestice os '
                + 'nemá s touhle společnou ani jednu osu.', 400);
        }
        const sablona = sablony[0];
        const osyKlice = klice(sablona);
        if (!osyKlice.length) return chyba(`Neznámá šablona: ${sablona}`, 400);

        const { results: lide } = await env.DB.prepare('SELECT id, jmeno FROM players').all<{ id: number; jmeno: string }>();
        const jmenoPodleId = new Map((lide ?? []).map(o => [o.id, o.jmeno]));

        /* Pořadí sloupců. U dvou sloupců je rozdíl „druhý mínus první", takže na
           pořadí záleží — a nesmí ho určovat náhoda v pořadí zaškrtnutí:
           - období se řadí chronologicky (podle nejstaršího záznamu v něm),
             takže u dvou období téhož hráče znamená + zlepšení,
           - uvnitř období jde trenér před hráče, takže + znamená „hráč si dal
             víc než trenér" — stejné čtení jako v porovnání trenér × hráč. */
        const poradiAutora = (a: string) => (a === 'trener' ? 0 : a === 'shoda' ? 1 : 2);
        const zacatekObdobi = new Map<string, string>();
        for (const r of results ?? []) {
            const d = zacatekObdobi.get(r.obdobi);
            if (!d || r.datum < d) zacatekObdobi.set(r.obdobi, r.datum);
        }

        const zaznamy = (results ?? [])
            .slice()
            .sort((a, b) =>
                (zacatekObdobi.get(a.obdobi) ?? '').localeCompare(zacatekObdobi.get(b.obdobi) ?? '')
                || poradiAutora(a.autor) - poradiAutora(b.autor)
                || String(a.jmeno).localeCompare(String(b.jmeno), 'cs')
                || a.id - b.id)
            .map(r => {
                const v = rozbal(r);
                const cisla = osyKlice.map(k => v.hodnoty[k]).filter(x => typeof x === 'number');
                return {
                    id: r.id, player_id: r.player_id, jmeno: r.jmeno, prezdivka: r.prezdivka,
                    obdobi: v.obdobi, autor: v.autor, autorId: v.autorId,
                    autorJmeno: v.autorId ? (jmenoPodleId.get(v.autorId) ?? null) : null,
                    datum: v.datum, hodnoty: v.hodnoty,
                    fyzicky: v.fyzicky, hlavou: v.hlavou, parta: v.parta,
                    cile: v.cile, poznamka: v.poznamka,
                    prumer: cisla.length
                        ? Math.round((cisla.reduce((a, b) => a + b, 0) / cisla.length) * 10) / 10
                        : null
                };
            });

        /* U dvou sloupců dává smysl rozdíl se znaménkem (druhý minus první) —
           je to tentýž způsob čtení jako u porovnání trenér × hráč. U tří a víc
           se znaménko ztrácí, tam se ukazuje rozptyl. */
        const osy = osyKlice.map(klic => {
            const cisla = zaznamy.map(z => z.hodnoty[klic]).filter((x): x is number => typeof x === 'number');
            const rozdil = zaznamy.length === 2
                && typeof zaznamy[1].hodnoty[klic] === 'number'
                && typeof zaznamy[0].hodnoty[klic] === 'number'
                ? zaznamy[1].hodnoty[klic] - zaznamy[0].hodnoty[klic]
                : null;
            return {
                klic,
                hodnoty: Object.fromEntries(zaznamy.map(z => [z.id, z.hodnoty[klic] ?? null])),
                nejlepe: cisla.length ? Math.max(...cisla) : null,
                nejhure: cisla.length ? Math.min(...cisla) : null,
                rozptyl: cisla.length > 1 ? Math.max(...cisla) - Math.min(...cisla) : null,
                rozdil
            };
        });

        return json({ sablona, zaznamy, osy });
    }

    if (cesta === '/api/porovnani' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);

        const nas = await nastaveni(env);
        const obdobi = q.get('obdobi') || nas.obdobi;
        const tolerance = Number(nas.tolerance) || 0;

        // Porovnává se v rámci jedné šablony. Když má hráč v období hodnocení
        // brankářské i polní, řekne si volající které (?sablona=), jinak se bere
        // to poslední, co trenér uložil.
        const sablona = q.get('sablona') && q.get('sablona')! in SABLONY ? q.get('sablona')! : undefined;
        const trener = await posledni(env, playerId, obdobi, 'trener', sablona);
        const hrac = trener
            ? await posledni(env, playerId, obdobi, 'hrac', trener.sablona)
            : await posledni(env, playerId, obdobi, 'hrac', sablona);

        if (!trener || !hrac) {
            // Hráč mohl vyplnit jinou šesticí os, než jakou ho trenér známkoval —
            // to je jiná situace než „ještě nevyplnil" a musí to být poznat.
            const jinouSablonou = !hrac && !!trener
                && !!(await posledni(env, playerId, obdobi, 'hrac'));
            return json({
                obdobi, tolerance, hotovo: false,
                maTrener: !!trener, maHrac: !!hrac, jinaSablona: jinouSablonou,
                sablona: trener?.sablona ?? sablona ?? null, osy: []
            });
        }

        const osy = klice(trener.sablona).map(klic => {
            const zTrenera = trener.hodnoty[klic];
            const zHrace = hrac.hodnoty[klic];

            /* Rozdíl jen tam, kde známku dali OBA. Chybějící hodnotu nelze brát
               jako nulu: hodnocení pořízené dřív, než osa přibyla, ji prostě
               nemá, a `7 − 0 = +7` by vyrobilo velký rozpor, o kterém by pak
               trenér s hráčem vedl rozhovor o něčem, co se nikdy nestalo. */
            const obaDali = Number.isFinite(Number(zTrenera)) && Number.isFinite(Number(zHrace));
            // znaménko, ne absolutní hodnota: + = hráč si dal víc než trenér
            const rozdil = obaDali ? Number(zHrace) - Number(zTrenera) : null;

            return {
                klic,
                trener: zTrenera ?? null,
                hrac: zHrace ?? null,
                rozdil,
                resit: rozdil !== null && Math.abs(rozdil) > tolerance
            };
        });

        return json({
            obdobi, tolerance, hotovo: true, maTrener: true, maHrac: true,
            sablona: trener.sablona, osy,
            pocetResit: osy.filter(o => o.resit).length,
            poznamkaHrace: hrac.poznamka
        });
    }

    /* ---------- vývoj v čase (§7.4, jen pro trenéra) ---------- */
    if (cesta === '/api/trend' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);

        // Trend má smysl jen v rámci jedné šablony — jiných šest os = jiná řada.
        const sablonaTrend = q.get('sablona') && q.get('sablona')! in SABLONY ? q.get('sablona')! : null;
        const { results } = sablonaTrend
            ? await env.DB.prepare(
                `SELECT * FROM evaluations
                  WHERE player_id = ? AND autor = 'trener' AND sablona = ?
                  ORDER BY id ASC`
            ).bind(playerId, sablonaTrend).all<RadekHodnoceni>()
            : await env.DB.prepare(
                `SELECT * FROM evaluations
                  WHERE player_id = ? AND autor = 'trener'
                  ORDER BY id ASC`
            ).bind(playerId).all<RadekHodnoceni>();

        let historie = (results ?? []).map(rozbal);
        // Bez upřesnění bereme řadu té šablony, kterou trenér použil naposledy.
        if (!sablonaTrend && historie.length) {
            const posledniSablona = historie[historie.length - 1].sablona;
            historie = historie.filter(h => h.sablona === posledniSablona);
        }
        if (historie.length < 2) return json({ historie, osy: [], maTrend: false });

        const ted = historie[historie.length - 1];
        const driv = historie[historie.length - 2];
        const osy = klice(ted.sablona).map(klic => {
            const zmena = (ted.hodnoty[klic] ?? 0) - (driv.hodnoty[klic] ?? 0);
            // pásmo šumu: za změnu se považuje až rozdíl 2 body
            const smer = Math.abs(zmena) >= PASMO_SUMU ? (zmena > 0 ? '↑' : '↓') : '→';
            return { klic, driv: driv.hodnoty[klic], ted: ted.hodnoty[klic], zmena, smer };
        });

        // Žádné souhrnné číslo ani průměr os — jen kolik os kam (§7.4).
        return json({
            historie, osy, maTrend: true,
            odkud: driv.obdobi, kam: ted.obdobi,
            nahoru: osy.filter(o => o.smer === '↑').length,
            dolu: osy.filter(o => o.smer === '↓').length,
            stejne: osy.filter(o => o.smer === '→').length
        });
    }

    /* ---------- podklady pro analýzy (bez modelu) ---------- */
    if (cesta === '/api/analyzy' && metoda === 'GET') {
        const nas = await nastaveni(env);
        const obdobi = q.get('obdobi') || nas.obdobi;
        return json(await podkladyProAnalyzu(env, obdobi, nas));
    }

    /* ---------- odkazy na sebehodnocení ---------- */
    if (cesta === '/api/tokens') {
        if (metoda === 'GET') {
            const obdobi = q.get('obdobi') || (await nastaveni(env)).obdobi;
            const { results } = await env.DB.prepare(
                `SELECT t.token, t.player_id, t.obdobi, t.pouzit, t.platny_do, t.sablona,
                        p.jmeno, p.prezdivka
                   FROM tokens t JOIN players p ON p.id = t.player_id
                  WHERE t.obdobi = ? ORDER BY p.jmeno`
            ).bind(obdobi).all();
            return json(results ?? []);
        }

        if (metoda === 'POST') {
            const telo = await request.json<{
                player_id?: number; obdobi?: string; dni?: number; sablona?: string; ids?: string;
            }>();
            const nas = await nastaveni(env);
            const obdobi = (telo.obdobi || nas.obdobi).trim();
            const dni = Number(telo.dni) > 0 ? Number(telo.dni) : 30;
            const platnyDo = new Date(Date.now() + dni * 86400_000).toISOString();

            /* Komu se generuje. `ids` má stejný tvar jako u tiskových listů
               (`id` nebo `id:sablona`) — je to tatáž otázka „koho a kterou řadu".
               `player_id` + `sablona` zůstávají kvůli starším voláním. */
            const vyber = rozeberIds(telo.ids ?? (telo.player_id ? String(telo.player_id) : null));

            // Prázdný výběr po rozebrání znamená, že v `ids` nebylo nic platného
            // (třeba neznámá šablona). To je jiná chyba než „ten hráč tu není".
            if (vyber && !vyber.length) return chyba('Ve výběru není platná kombinace hráč + šablona.', 400);

            const vsichni = (await env.DB.prepare(
                `SELECT id, sablona, sablony FROM players WHERE role = 'hrac' AND aktivni = 1`
            ).all<{ id: number; sablona: string; sablony: string }>()).results ?? [];
            const cile = vyber ? vsichni.filter(c => vyber.some(v => v.id === c.id)) : vsichni;
            if (!cile.length) return chyba('Vybraní hráči nejsou v aktivním kádru.', 400);

            // Odkaz je na jednu šesticí os. Hráč s víc šablonami (chytá i hraje
            // v poli) dostane odkaz na každou — jeden formulář by se jinak ptal
            // jen na jednu řadu a zbytek by tiše chyběl.
            const { results: uzJsou } = await env.DB.prepare(
                'SELECT player_id, sablona FROM tokens WHERE obdobi = ? AND pouzit = 0'
            ).bind(obdobi).all<{ player_id: number; sablona: string }>();

            const nove = [];
            let preskoceno = 0;
            for (const c of cile) {
                // Pořadí: výslovná šablona v těle > výběr z `ids` > všechny přiřazené.
                const sablony = (telo.sablona && telo.sablona in SABLONY)
                    ? [telo.sablona]
                    : [...(sablonyZVyberu(vyber, c.id) ?? new Set(sablonyOsoby(c)))];
                for (const sablona of sablony) {
                    // Nevyplněný odkaz na tutéž šablonu už visí — druhý by jen
                    // zmátl, který z nich platí.
                    if ((uzJsou ?? []).some(t => t.player_id === c.id && t.sablona === sablona)) {
                        preskoceno++;
                        continue;
                    }
                    nove.push({ player_id: c.id, token: novyToken(), obdobi, platny_do: platnyDo, sablona });
                }
            }
            if (!nove.length) {
                return preskoceno
                    ? json({ vytvoreno: 0, preskoceno, tokeny: [] })
                    : chyba('Není komu odkaz vygenerovat.', 400);
            }

            await env.DB.batch(nove.map(n => env.DB.prepare(
                'INSERT INTO tokens (token, player_id, obdobi, platny_do, sablona) VALUES (?, ?, ?, ?, ?)'
            ).bind(n.token, n.player_id, n.obdobi, n.platny_do, n.sablona)));

            return json({ vytvoreno: nove.length, preskoceno, tokeny: nove }, 201);
        }
    }

    const token = cesta.match(/^\/api\/tokens\/(.+)$/)?.[1];
    if (token && metoda === 'DELETE') {
        const r = await env.DB.prepare('DELETE FROM tokens WHERE token = ?').bind(token).run();
        return json({ smazano: r.meta.changes ?? 0 });
    }

    return chyba('Neznámý endpoint.', 404);
}

/* ===================== validace a drobnosti ===================== */

function zkontrolujOsobu(p: any): string | null {
    if (!p || typeof p.jmeno !== 'string' || !p.jmeno.trim()) return 'Jméno je povinné.';
    if (p.jmeno.length > 80) return 'Jméno je moc dlouhé.';
    if (p.role !== 'hrac' && p.role !== 'trener') return "Role musí být 'hrac' nebo 'trener'.";
    const problem = zkontrolujSablonySeznam(sablonyZTela(p));
    if (problem) return problem;
    return zkontrolujPozice(p.pozice ?? []);
}

/**
 * Šablony z těla požadavku. Bere nový tvar (`sablony: [...]`) i starý
 * (`sablona: "pole"`), aby starší klient nebo import bez nového sloupce prošel.
 */
function sablonyZTela(p: any): string[] {
    if (Array.isArray(p?.sablony)) return [...new Set(p.sablony.map((s: unknown) => String(s)))];
    return [String(p?.sablona ?? 'pole')];
}

function zkontrolujSablonySeznam(sablony: string[]): string | null {
    if (!sablony.length) return 'Vyber aspoň jednu šablonu.';
    if (sablony.length > Object.keys(SABLONY).length) return 'Příliš mnoho šablon.';
    const nezname = sablony.filter(s => !(s in SABLONY));
    if (nezname.length) return `Neznámé šablony: ${nezname.join(', ')}`;
    return null;
}

/** Kryptograficky náhodný token, 43 znaků. Nikdy ne pořadové ID hráče. */
function novyToken(): string {
    return b64url(crypto.getRandomValues(new Uint8Array(32)));
}
