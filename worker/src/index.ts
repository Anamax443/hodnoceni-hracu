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
import { SABLONY, klice, zkontrolujHodnoty, zkontrolujPozice } from '../../web/src/sablony.js';
/* Generuje scripts/gen-version.mjs při každém `npm run deploy` i `npm run dev`. */
import { VERZE } from './version';

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
}

const MODUL = 'hodnoceni-hracu';
const SESSION_HODIN = 12;
const PASMO_SUMU = 2;         // §7.4: posun o 1 bod u subjektivního hodnocení není signál
const OBNOVA_MINUT = 15;      // platnost odkazu na obnovu hesla
const OBNOVA_MAX_ZA_OKNO = 3; // víc žádostí za 15 minut se nepošle (brzda na spamování schránky)
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
    notifZapnuto: '1',         // hlavní vypínač souhrnů
    notifCas: '19:00',         // místní čas; cron běží každou hodinu a vybere si tu svou
    notifDnyZmeny: '3',        // když se něco změnilo: nejvýš jednou za N dní
    notifDnyTicho: '14',       // když se nic neděje: po N dnech přijde „nic se nezměnilo"
    notifPosledni: '',         // kdy naposledy něco odešlo
    // SMS je mimořádný nástroj: stojí peníze a lidi ruší. Výchozí stav je vypnuto
    // a zapíná se vědomě v Nastavení — přepínač u osoby sám o sobě nestačí.
    smsAktivni: '0',
    smsDenniStrop: '50'        // pojistka proti smyčce, i když je kanál zapnutý
};

async function nastaveni(env: Env): Promise<Record<string, string>> {
    const { results } = await env.DB.prepare('SELECT klic, hodnota FROM settings').all<{ klic: string; hodnota: string }>();
    const out = { ...VYCHOZI_NASTAVENI };
    for (const r of results ?? []) out[r.klic] = r.hodnota;
    return out;
}

/* ===================== hodnocení ===================== */

interface RadekHodnoceni {
    id: number; player_id: number; datum: string; obdobi: string; autor: string;
    sablona: string; hodnoty: string; fyzicky: string | null; hlavou: string | null;
    parta: string | null; cile: string | null; poznamka: string | null;
}

function rozbal(r: RadekHodnoceni) {
    return {
        id: r.id,
        player_id: r.player_id,
        datum: r.datum,
        obdobi: r.obdobi,
        autor: r.autor,
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

/** Řádek osoby z D1 → objekt pro API (pozice jako pole, ne JSON řetězec). */
function osobaVen(r: any) {
    let pozice: string[] = [];
    try { pozice = JSON.parse(r.pozice ?? '[]'); } catch { pozice = []; }
    return { ...r, pozice, aktivni: !!r.aktivni };
}

/** Poslední trenérské hodnocení z JINÉHO (dřívějšího) období, stejnou šablonou. */
async function predchoziObdobi(env: Env, playerId: number, obdobi: string, sablona: string) {
    const r = await env.DB.prepare(
        `SELECT * FROM evaluations
          WHERE player_id = ? AND obdobi <> ? AND autor = 'trener' AND sablona = ?
          ORDER BY id DESC LIMIT 1`
    ).bind(playerId, obdobi, sablona).first<RadekHodnoceni>();
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
        const url = new URL(request.url);
        const cesta = url.pathname;
        const https = url.protocol === 'https:';

        try {
            /* ---------- health a verze ---------- */
            if (cesta === '/health') {
                return json({ status: 'ok', module: MODUL, timestamp: new Date().toISOString() });
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
                return soubor(env, url, '/h.html');
            }

            /* ---------- veřejné API pro hráče ---------- */
            if (cesta.startsWith('/api/self/')) {
                return await self(request, env, cesta.slice('/api/self/'.length));
            }

            /* ---------- obnova zapomenutého hesla (veřejné) ---------- */
            if (cesta === '/obnova' || cesta.startsWith('/obnova/')) {
                return soubor(env, url, '/obnova.html');
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

                // Bez přihlašovacího jména platí přechodné společné heslo.
                const vysledek = await overHeslo(env, heslo);
                if (vysledek === 'nenastaveno') {
                    return chyba('Na serveru není nastavené žádné heslo (chybí secret ADMIN_HESLO '
                        + 'a v databázi není uložené společné heslo). Aplikace se takhle nedá odemknout.', 500);
                }
                if (vysledek !== 'ok') return nezdar('Špatné heslo.');

                await smazNezdary(env, klicUctu, klicIp);
                return json({ prihlasen: true, jmeno: null, id: null }, 200, {
                    'set-cookie': cookieHlavicka(await vytvorSession(env), https, SESSION_HODIN * 3600)
                });
            }
            if (cesta === '/api/logout' && request.method === 'POST') {
                return json({ prihlasen: false }, 200, { 'set-cookie': cookieHlavicka('', https, 0) });
            }
            if (cesta === '/api/me') {
                const s = await overSession(env, request.headers.get('cookie'));
                return json({ prihlasen: !!s, jmeno: s?.jmeno ?? null, id: s?.id ?? null });
            }

            /* ---------- admin API ---------- */
            if (cesta.startsWith('/api/')) {
                const s = await overSession(env, request.headers.get('cookie'));
                if (!s) return chyba('Nepřihlášen.', 401);
                return await admin(request, env, url, s);
            }

            /* ---------- statické soubory ---------- */
            return soubor(env, url, cesta === '/' ? '/index.html' : cesta);

        } catch (e) {
            const zprava = e instanceof Error ? e.message : String(e);
            console.error('Chyba požadavku', cesta, zprava);
            return chyba(`Chyba serveru: ${zprava}`, 500);
        }
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

/** Vrátí statický soubor z ./web, aniž by se měnila adresa v prohlížeči. */
function soubor(env: Env, url: URL, cesta: string): Promise<Response> {
    return env.ASSETS.fetch(new Request(new URL(cesta, url), { method: 'GET' }));
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
        const r = await posliSmsHlidane(env, u.telefon,
            `${en ? 'Player evaluation' : 'Hodnoceni hracu'}: ${odkaz}`, 'obnova', u.id);
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
 *  Zprávy z režimu `console` se nepočítají — nic nestály. */
async function smsZaDen(env: Env): Promise<number> {
    const r = await env.DB.prepare(
        `SELECT COUNT(*) AS pocet FROM komunikace
          WHERE kanal = 'sms' AND vysledek = 'ok'
            AND (kod IS NULL OR kod <> 'console')
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

    const r = await posliSms(env, cislo, text);
    await zalogujKomunikaci(env, {
        kanal: 'sms', platforma: nanecisto ? `${platforma} (nanečisto)` : platforma,
        playerId, adresa: cislo, typ,
        vysledek: r.ok ? 'ok' : 'chyba', kod: r.kod ?? null,
        poznamka: bezDiakritiky(text).slice(0, 300),  // text kvůli segmentům; hodnocení v něm není
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
    'id', 'jmeno', 'prezdivka', 'role', 'pozice', 'post', 'sablona', 'aktivni',
    'login', 'email', 'telegram_chat_id', 'telefon',
    'notif_email', 'notif_telegram', 'notif_sms', 'hodnoceni_povinne'
] as const;

/** Jedno pole do CSV. Uvozovky se zdvojují, jinak by rozsekaly řádek. */
function csvPole(h: unknown): string {
    const s = h === null || h === undefined ? '' : String(h);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
        const nas = await nastaveni(env);
        const r = await posliSmsHlidane(env, String(telefon),
            `${nas.klub}: zkusebni zprava z aplikace Hodnoceni hracu.`, 'test', null, !!nanecisto);
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
    /* ---------- export kádru do CSV ---------- */
    if (cesta === '/api/players/export.csv' && metoda === 'GET') {
        const { results } = await env.DB.prepare(
            `SELECT ${CSV_SLOUPCE.join(', ')} FROM players
              ORDER BY role DESC, aktivni DESC, jmeno`
        ).all<Record<string, unknown>>();

        // Hlavička jde do souboru vždycky, i když kádr ještě nikdo nezaložil —
        // prázdný export je tím pádem rovnou šablona pro import.
        const radky: string[][] = [[...CSV_SLOUPCE]];
        for (const o of results ?? []) {
            radky.push(CSV_SLOUPCE.map(s => {
                if (s === 'pozice') {
                    try { return (JSON.parse(String(o.pozice ?? '[]')) as string[]).join(' '); }
                    catch { return ''; }
                }
                return o[s] === null || o[s] === undefined ? '' : String(o[s]);
            }));
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
            return i >= 0 ? (r[i] ?? '').trim() : '';
        };

        let pridano = 0, upraveno = 0;
        const chyby: { radek: number; jmeno: string; duvod: string }[] = [];

        for (let i = 1; i < radky.length; i++) {
            const r = radky[i];
            const cislo = i + 1;   // číslo řádku tak, jak ho vidí Excel
            const osoba = {
                jmeno: sloupec(r, 'jmeno'),
                prezdivka: sloupec(r, 'prezdivka') || null,
                post: sloupec(r, 'post') || null,
                // Pozice se v tabulce píšou oddělené mezerou nebo čárkou — středník
                // by se pral s oddělovačem sloupců.
                pozice: sloupec(r, 'pozice').split(/[\s,]+/).filter(Boolean),
                role: sloupec(r, 'role') || 'hrac',
                sablona: sloupec(r, 'sablona') || 'polni',
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
                                        sablona = ?, aktivni = ?, email = ?, telegram_chat_id = ?,
                                        telefon = ?, notif_email = ?, notif_telegram = ?, notif_sms = ?,
                                        login = ?, hodnoceni_povinne = ?
                      WHERE id = ?`
                ).bind(
                    osoba.jmeno, osoba.prezdivka, osoba.post, JSON.stringify(osoba.pozice),
                    osoba.role, osoba.sablona, osoba.aktivni, osoba.email, osoba.telegram_chat_id,
                    osoba.telefon, osoba.notif_email, osoba.notif_telegram, osoba.notif_sms,
                    osoba.login, osoba.hodnoceni_povinne, stavajici.id
                ).run();
                upraveno++;
            } else {
                await env.DB.prepare(
                    `INSERT INTO players (jmeno, prezdivka, post, pozice, role, sablona, aktivni,
                                          email, telegram_chat_id, telefon,
                                          notif_email, notif_telegram, notif_sms, login, hodnoceni_povinne)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    osoba.jmeno, osoba.prezdivka, osoba.post, JSON.stringify(osoba.pozice),
                    osoba.role, osoba.sablona, osoba.aktivni, osoba.email, osoba.telegram_chat_id,
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

    if (cesta === '/api/players') {
        if (metoda === 'GET') {
            const { results } = await env.DB.prepare(
                `SELECT id, jmeno, prezdivka, post, pozice, role, sablona, aktivni, created_at,
                        email, telegram_chat_id, telefon,
                        notif_email, notif_telegram, notif_sms, login,
                        hodnoceni_povinne, heslo_hash IS NOT NULL AS ma_heslo, heslo_zmeneno
                   FROM players ORDER BY role DESC, aktivni DESC, jmeno`
            ).all();
            // Hash ani sůl ven nikdy neposíláme, jen příznak „heslo nastavené".
            return json((results ?? []).map(osobaVen));
        }
        if (metoda === 'POST') {
            const p = await request.json<any>();
            const problem = zkontrolujOsobu(p);
            if (problem) return chyba(problem, 400);
            const r = await env.DB.prepare(
                `INSERT INTO players (jmeno, prezdivka, post, pozice, role, sablona, aktivni,
                                      email, telegram_chat_id, telefon,
                                      notif_email, notif_telegram, notif_sms, login,
                                      hodnoceni_povinne)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
                 RETURNING id, jmeno, prezdivka, post, pozice, role, sablona, aktivni,
                           email, telegram_chat_id, telefon,
                           notif_email, notif_telegram, notif_sms, login, hodnoceni_povinne`
            ).bind(
                p.jmeno.trim(), p.prezdivka || null, p.post || null,
                JSON.stringify(p.pozice ?? []), p.role, p.sablona,
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
        const r = await env.DB.prepare(
            `UPDATE players SET jmeno = ?, prezdivka = ?, post = ?, pozice = ?,
                                role = ?, sablona = ?, aktivni = ?,
                                email = ?, telegram_chat_id = ?, telefon = ?,
                                notif_email = ?, notif_telegram = ?, notif_sms = ?,
                                login = ?, hodnoceni_povinne = ?
              WHERE id = ?
          RETURNING id, jmeno, prezdivka, post, pozice, role, sablona, aktivni,
                    email, telegram_chat_id, telefon,
                    notif_email, notif_telegram, notif_sms, login, hodnoceni_povinne`
        ).bind(
            p.jmeno.trim(), p.prezdivka || null, p.post || null, JSON.stringify(p.pozice ?? []),
            p.role, p.sablona, p.aktivni ? 1 : 0,
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

    /* ---------- přehled stavu za období ---------- */
    if (cesta === '/api/prehled' && metoda === 'GET') {
        const obdobi = q.get('obdobi') || (await nastaveni(env)).obdobi;
        const { results } = await env.DB.prepare(
            `SELECT p.id, p.jmeno, p.prezdivka, p.post, p.role, p.sablona, p.aktivni,
                    EXISTS(SELECT 1 FROM evaluations e
                            WHERE e.player_id = p.id AND e.obdobi = ? AND e.autor = 'trener') AS ma_trener,
                    EXISTS(SELECT 1 FROM evaluations e
                            WHERE e.player_id = p.id AND e.obdobi = ? AND e.autor = 'hrac')   AS ma_hrac,
                    EXISTS(SELECT 1 FROM tokens t
                            WHERE t.player_id = p.id AND t.obdobi = ? AND t.pouzit = 0)       AS ma_odkaz
               FROM players p
              WHERE p.role = 'hrac'
              ORDER BY p.aktivni DESC, p.jmeno`
        ).bind(obdobi, obdobi, obdobi).all();
        return json({ obdobi, hraci: results ?? [] });
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
                .bind(playerId).first<{ sablona: string; role: string }>();
            if (!hrac) return chyba('Hráč nenalezen.', 404);
            if (hrac.role !== 'hrac') return chyba('Hodnotí se jen hráči, ne trenéři.', 400);

            const sablona = h.sablona || hrac.sablona;
            const problem = zkontrolujHodnoty(sablona, h.hodnoty);
            if (problem) return chyba(problem, 400);

            const obdobi = (h.obdobi || '').trim() || (await nastaveni(env)).obdobi;
            const cile = Array.isArray(h.cile)
                ? h.cile.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 5)
                : [];

            const autorId = h.autor_id ? Number(h.autor_id) : null;
            const r = await env.DB.prepare(
                `INSERT INTO evaluations
                    (player_id, obdobi, autor, autor_id, sablona, hodnoty, fyzicky, hlavou, parta, cile)
                 VALUES (?, ?, 'trener', ?, ?, ?, ?, ?, ?, ?) RETURNING id, datum`
            ).bind(
                playerId, obdobi, autorId, sablona,
                JSON.stringify(h.hodnoty),
                (h.fyzicky ?? '').trim() || null,
                (h.hlavou ?? '').trim() || null,
                (h.parta ?? '').trim() || null,
                JSON.stringify(cile)
            ).first();
            await zapisUdalost(env, 'hodnoceni', playerId, obdobi, autorId);
            return json({ ulozeno: true, ...r }, 201);
        }
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
            playerId, obdobi, kdo.id ?? null, sablona, JSON.stringify(h.hodnoty),
            (h.fyzicky ?? '').trim() || null,
            (h.hlavou ?? '').trim() || null,
            (h.parta ?? '').trim() || null,
            JSON.stringify(cile),
            (h.poznamka_shody ?? '').trim() || null
        ).first();

        await zapisUdalost(env, 'hodnoceni', playerId, obdobi, kdo.id ?? null);
        return json({ ulozeno: true, ...r }, 201);
    }

    /* ---------- historie: všechny verze, nic se nemaže ---------- */
    if (cesta === '/api/historie' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);
        const { results } = await env.DB.prepare(
            `SELECT e.id, e.datum, e.obdobi, e.autor, e.sablona, e.hodnoty,
                    e.fyzicky, e.hlavou, e.parta, e.cile, e.poznamka, e.poznamka_shody,
                    a.jmeno AS autor_jmeno
               FROM evaluations e LEFT JOIN players a ON a.id = e.autor_id
              WHERE e.player_id = ?
              ORDER BY e.id DESC`
        ).bind(playerId).all<any>();
        return json((results ?? []).map(r => ({
            id: r.id, datum: r.datum, obdobi: r.obdobi, autor: r.autor,
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
                    sablona: v.sablona, hodnoceni: v.hodnoty,
                    porovnani: null, porovnaniRezim: null, porovnaniObdobi: '',
                    fyzicky: v.fyzicky ?? '', hlavou: v.hlavou ?? '', parta: v.parta ?? '',
                    cile: v.cile ?? []
                }]
            });
        }

        const filtr = ids && ids !== 'vse'
            ? ids.split(',').map(Number).filter(Boolean)
            : null;

        const { results: hraci } = await env.DB.prepare(
            `SELECT id, jmeno, prezdivka, post, pozice, sablona FROM players
              WHERE role = 'hrac' AND aktivni = 1 ORDER BY jmeno`
        ).all<{ id: number; jmeno: string; prezdivka: string | null; post: string | null; pozice: string; sablona: string }>();

        const vybrani = (hraci ?? []).filter(h => !filtr || filtr.includes(h.id));
        const listy = [];

        for (const h of vybrani) {
            // Hráč může mít v jednom období hodnocení víc šablonami (brankář
            // i hráč v poli). Každá dostane vlastní list — do jednoho grafu
            // se brankářské a polní osy míchat nedají.
            const { results: sablony } = await env.DB.prepare(
                `SELECT DISTINCT sablona FROM evaluations
                  WHERE player_id = ? AND obdobi = ? AND autor = 'trener'`
            ).bind(h.id, obdobi).all<{ sablona: string }>();

            const kVykresleni = (sablony ?? []).map(s => s.sablona);
            if (!kVykresleni.length) kVykresleni.push(h.sablona);   // prázdný list jako podklad

            for (const sablona of kVykresleni) {
                // Na list jde uzavřená shoda trenérů, když existuje. Teprve když
                // není, bere se poslední hodnocení trenéra — jinak by při dvou
                // trenérech tiše vyhrál ten, kdo uložil později.
                const trener = await posledni(env, h.id, obdobi, 'shoda', sablona)
                    ?? await posledni(env, h.id, obdobi, 'trener', sablona);
                let porovnani: Record<string, number> | null = null;
                let popisek = '';

                if (rezim === 'hrac') {
                    const hrac = await posledni(env, h.id, obdobi, 'hrac', sablona);
                    if (hrac) { porovnani = hrac.hodnoty; popisek = ''; }
                } else if (rezim === 'minule') {
                    const driv = await predchoziObdobi(env, h.id, obdobi, sablona);
                    if (driv) { porovnani = driv.hodnoty; popisek = driv.obdobi; }
                }

                listy.push({
                    player_id: h.id,
                    jmeno: h.jmeno,
                    prezdivka: h.prezdivka,
                    post: h.post,
                    pozice: JSON.parse(h.pozice ?? '[]'),
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

        return json({ nastaveni: { ...nas, obdobi }, listy });
    }

    /* ---------- porovnání trenér vs. hráč (§7.3) ---------- */
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
            // znaménko, ne absolutní hodnota: + = hráč si dal víc než trenér
            const rozdil = (hrac.hodnoty[klic] ?? 0) - (trener.hodnoty[klic] ?? 0);
            return {
                klic,
                trener: trener.hodnoty[klic] ?? null,
                hrac: hrac.hodnoty[klic] ?? null,
                rozdil,
                resit: Math.abs(rozdil) > tolerance
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
            const telo = await request.json<{ player_id?: number; obdobi?: string; dni?: number; sablona?: string }>();
            const nas = await nastaveni(env);
            const obdobi = (telo.obdobi || nas.obdobi).trim();
            const dni = Number(telo.dni) > 0 ? Number(telo.dni) : 30;
            const platnyDo = new Date(Date.now() + dni * 86400_000).toISOString();

            const cile = telo.player_id
                ? ((await env.DB.prepare('SELECT id, sablona FROM players WHERE id = ?')
                    .bind(Number(telo.player_id)).all<{ id: number; sablona: string }>()).results ?? [])
                : ((await env.DB.prepare(
                      `SELECT id, sablona FROM players WHERE role = 'hrac' AND aktivni = 1`
                  ).all<{ id: number; sablona: string }>()).results ?? []);

            const nove = [];
            for (const c of cile) {
                // Přednost má šablona, kterou trenér pro tohle období použil.
                // Až pak výchozí šablona osoby (nebo to, co si vyžádal volající).
                const hodnoceni = await posledni(env, c.id, obdobi, 'trener');
                const sablona = (telo.sablona && telo.sablona in SABLONY)
                    ? telo.sablona
                    : (hodnoceni?.sablona ?? c.sablona);
                nove.push({ player_id: c.id, token: novyToken(), obdobi, platny_do: platnyDo, sablona });
            }
            if (!nove.length) return chyba('Není komu odkaz vygenerovat.', 400);

            await env.DB.batch(nove.map(n => env.DB.prepare(
                'INSERT INTO tokens (token, player_id, obdobi, platny_do, sablona) VALUES (?, ?, ?, ?, ?)'
            ).bind(n.token, n.player_id, n.obdobi, n.platny_do, n.sablona)));

            return json({ vytvoreno: nove.length, tokeny: nove }, 201);
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
    if (!(p.sablona in SABLONY)) return `Neznámá šablona: ${p.sablona}`;
    return zkontrolujPozice(p.pozice ?? []);
}

/** Kryptograficky náhodný token, 43 znaků. Nikdy ne pořadové ID hráče. */
function novyToken(): string {
    return b64url(crypto.getRandomValues(new Uint8Array(32)));
}
