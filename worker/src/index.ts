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
import { SABLONY, klice, zkontrolujHodnoty } from '../../web/src/sablony.js';

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
}

const MODUL = 'hodnoceni-hracu';
const SESSION_HODIN = 12;
const PASMO_SUMU = 2;         // §7.4: posun o 1 bod u subjektivního hodnocení není signál
const OBNOVA_MINUT = 15;      // platnost odkazu na obnovu hesla
const OBNOVA_MAX_ZA_OKNO = 3; // víc žádostí za 15 minut se nepošle (brzda na spamování schránky)
const HESLO_MIN = 10;
const PBKDF2_ITERACE = 210_000;

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

/** Uloží nové heslo. Od téhle chvíle se secret ADMIN_HESLO ignoruje. */
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
async function overHeslo(env: Env, heslo: string): Promise<boolean> {
    const a = await env.DB.prepare('SELECT heslo_hash, heslo_sul, iterace FROM auth WHERE id = 1')
        .first<{ heslo_hash: string; heslo_sul: string; iterace: number }>();
    if (a) {
        return stejne(await odvodHash(heslo, zB64url(a.heslo_sul), a.iterace), a.heslo_hash);
    }
    return !!env.ADMIN_HESLO && stejne(heslo, env.ADMIN_HESLO);
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

async function vytvorSession(env: Env): Promise<string> {
    const platnost = Date.now() + SESSION_HODIN * 3600_000;
    const telo = b64url(new TextEncoder().encode(JSON.stringify({ exp: platnost })));
    return `${telo}.${await podepis(env.SESSION_KEY, telo)}`;
}

async function overSession(env: Env, cookie: string | null): Promise<boolean> {
    if (!cookie) return false;
    const sess = cookie.split(/;\s*/).find(c => c.startsWith('sess='))?.slice(5);
    if (!sess) return false;

    const [telo, sig] = sess.split('.');
    if (!telo || !sig) return false;

    if (!stejne(sig, await podepis(env.SESSION_KEY, telo))) return false;

    try {
        const { exp } = JSON.parse(atob(telo.replace(/-/g, '+').replace(/_/g, '/')));
        return typeof exp === 'number' && exp > Date.now();
    } catch {
        return false;
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
    cileNadpis: 'Na čem makáme do zimy'
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

/** Poslední hodnocení daného autora pro hráče a období. Append-only => bereme nejnovější. */
async function posledni(env: Env, playerId: number, obdobi: string, autor: string) {
    const r = await env.DB.prepare(
        `SELECT * FROM evaluations
          WHERE player_id = ? AND obdobi = ? AND autor = ?
          ORDER BY id DESC LIMIT 1`
    ).bind(playerId, obdobi, autor).first<RadekHodnoceni>();
    return r ? rozbal(r) : null;
}

/** Poslední trenérské hodnocení z JINÉHO (dřívějšího) období. */
async function predchoziObdobi(env: Env, playerId: number, obdobi: string) {
    const r = await env.DB.prepare(
        `SELECT * FROM evaluations
          WHERE player_id = ? AND obdobi <> ? AND autor = 'trener'
          ORDER BY id DESC LIMIT 1`
    ).bind(playerId, obdobi).first<RadekHodnoceni>();
    return r ? rozbal(r) : null;
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
                // Bez no-store by se odpověď držela na edge a po nasazení
                // by lišta ještě chvíli ukazovala předchozí commit.
                const v = await soubor(env, url, '/version.json');
                return new Response(v.body, {
                    status: v.status,
                    headers: {
                        'content-type': 'application/json; charset=utf-8',
                        'cache-control': 'no-store'
                    }
                });
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
                const { heslo } = await request.json<{ heslo?: string }>();
                if (!heslo || !await overHeslo(env, heslo)) {
                    // Aplikace je na veřejné adrese a chrání data nezletilých.
                    // Prodleva u špatného hesla dělá hádání hesla ve smyčce nepraktickým.
                    await new Promise(hotovo => setTimeout(hotovo, 700));
                    return chyba('Špatné heslo.', 401);
                }
                return json({ prihlasen: true }, 200, {
                    'set-cookie': cookieHlavicka(await vytvorSession(env), https, SESSION_HODIN * 3600)
                });
            }
            if (cesta === '/api/logout' && request.method === 'POST') {
                return json({ prihlasen: false }, 200, { 'set-cookie': cookieHlavicka('', https, 0) });
            }
            if (cesta === '/api/me') {
                return json({ prihlasen: await overSession(env, request.headers.get('cookie')) });
            }

            /* ---------- admin API ---------- */
            if (cesta.startsWith('/api/')) {
                if (!await overSession(env, request.headers.get('cookie'))) {
                    return chyba('Nepřihlášen.', 401);
                }
                return await admin(request, env, url);
            }

            /* ---------- statické soubory ---------- */
            return soubor(env, url, cesta === '/' ? '/index.html' : cesta);

        } catch (e) {
            const zprava = e instanceof Error ? e.message : String(e);
            console.error('Chyba požadavku', cesta, zprava);
            return chyba(`Chyba serveru: ${zprava}`, 500);
        }
    }
} satisfies ExportedHandler<Env>;

/** Vrátí statický soubor z ./web, aniž by se měnila adresa v prohlížeči. */
function soubor(env: Env, url: URL, cesta: string): Promise<Response> {
    return env.ASSETS.fetch(new Request(new URL(cesta, url), { method: 'GET' }));
}

/* ===================== veřejná část (hráč) ===================== */

async function self(request: Request, env: Env, token: string): Promise<Response> {
    if (!token || token.length < 20) return chyba('Neplatný odkaz.', 404);

    const t = await env.DB.prepare(
        `SELECT t.token, t.player_id, t.obdobi, t.pouzit, t.platny_do,
                p.jmeno, p.prezdivka, p.sablona
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
 * Žádost o obnovu. Odpověď je vždycky stejná, ať se nedá zjistit, které adresy
 * jsou nastavené. Neposílá se heslo, ale jednorázový odkaz s krátkou platností.
 */
async function zadostOObnovu(request: Request, env: Env, url: URL): Promise<Response> {
    const { email, lang } = await request.json<{ email?: string; lang?: string }>();
    const neutralni = json({ odeslano: true });

    const adresa = (email ?? '').trim().toLowerCase();
    if (!adresa || !povoleneAdresy(env).includes(adresa)) return neutralni;

    // Brzda na spamování schránky: pár žádostí za okno a dost.
    const nedavno = await env.DB.prepare(
        `SELECT COUNT(*) AS pocet FROM obnova WHERE created_at > datetime('now', ?)`
    ).bind(`-${OBNOVA_MINUT} minutes`).first<{ pocet: number }>();
    if ((nedavno?.pocet ?? 0) >= OBNOVA_MAX_ZA_OKNO) {
        console.warn('Obnova hesla: překročen limit žádostí, mail se neodeslal.');
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
            ? `Someone asked to reset the coach password.\n\nSet a new one here (valid ${OBNOVA_MINUT} minutes, single use):\n${odkaz}\n\nIf it wasn't you, ignore this e-mail — nothing has changed and the current password keeps working.`
            : `Někdo požádal o obnovu hesla trenéra.\n\nNové heslo si nastavíš tady (platí ${OBNOVA_MINUT} minut, jen jednou):\n${odkaz}\n\nPokud to nebyl ty, e-mail ignoruj — nic se nezměnilo a stávající heslo platí dál.`
    );

    return neutralni;
}

/** GET = platí ještě odkaz?  POST = nastav nové heslo. */
async function obnovaHesla(request: Request, env: Env, token: string): Promise<Response> {
    const t = token && token.length >= 20
        ? await env.DB.prepare('SELECT token, pouzit, platny_do FROM obnova WHERE token = ?')
            .bind(token).first<{ token: string; pouzit: number; platny_do: string }>()
        : null;

    const platny = !!t && !t.pouzit && new Date(t.platny_do) > new Date();

    if (request.method === 'GET') return json({ platny });
    if (request.method !== 'POST') return chyba('Nepodporovaná metoda.', 405);
    if (!platny) return chyba('Odkaz už neplatí. Požádej o nový.', 410);

    const { heslo } = await request.json<{ heslo?: string }>();
    const problem = zkontrolujNoveHeslo(heslo);
    if (problem) return chyba(problem, 400);

    await nastavHeslo(env, heslo as string);
    // Ostatní rozeslané odkazy tím padají — platí jen ten poslední použitý.
    await env.DB.prepare('DELETE FROM obnova').run();

    return json({ nastaveno: true });
}

/* ===================== admin část (trenér) ===================== */

async function admin(request: Request, env: Env, url: URL): Promise<Response> {
    const cesta = url.pathname;
    const metoda = request.method;
    const q = url.searchParams;

    /* ---------- změna hesla ---------- */
    if (cesta === '/api/heslo' && metoda === 'POST') {
        const { stare, nove } = await request.json<{ stare?: string; nove?: string }>();
        if (!stare || !await overHeslo(env, stare)) {
            await new Promise(hotovo => setTimeout(hotovo, 700));
            return chyba('Stávající heslo nesouhlasí.', 401);
        }
        const problem = zkontrolujNoveHeslo(nove);
        if (problem) return chyba(problem, 400);
        await nastavHeslo(env, nove as string);
        await env.DB.prepare('DELETE FROM obnova').run();   // rozeslané odkazy padají
        return json({ zmeneno: true });
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
    if (cesta === '/api/players') {
        if (metoda === 'GET') {
            const { results } = await env.DB.prepare(
                'SELECT * FROM players ORDER BY role DESC, aktivni DESC, jmeno'
            ).all();
            return json(results ?? []);
        }
        if (metoda === 'POST') {
            const p = await request.json<any>();
            const problem = zkontrolujOsobu(p);
            if (problem) return chyba(problem, 400);
            const r = await env.DB.prepare(
                `INSERT INTO players (jmeno, prezdivka, post, role, sablona, aktivni)
                 VALUES (?, ?, ?, ?, ?, 1) RETURNING *`
            ).bind(p.jmeno.trim(), p.prezdivka || null, p.post || null, p.role, p.sablona).first();
            return json(r, 201);
        }
    }

    const osobaId = cesta.match(/^\/api\/players\/(\d+)$/)?.[1];
    if (osobaId && metoda === 'PATCH') {
        const p = await request.json<any>();
        const problem = zkontrolujOsobu(p);
        if (problem) return chyba(problem, 400);
        const r = await env.DB.prepare(
            `UPDATE players SET jmeno = ?, prezdivka = ?, post = ?, role = ?, sablona = ?, aktivni = ?
              WHERE id = ? RETURNING *`
        ).bind(
            p.jmeno.trim(), p.prezdivka || null, p.post || null, p.role, p.sablona,
            p.aktivni ? 1 : 0, Number(osobaId)
        ).first();
        if (!r) return chyba('Osoba nenalezena.', 404);
        return json(r);
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

            const r = await env.DB.prepare(
                `INSERT INTO evaluations
                    (player_id, obdobi, autor, autor_id, sablona, hodnoty, fyzicky, hlavou, parta, cile)
                 VALUES (?, ?, 'trener', ?, ?, ?, ?, ?, ?, ?) RETURNING id, datum`
            ).bind(
                playerId, obdobi, h.autor_id ? Number(h.autor_id) : null, sablona,
                JSON.stringify(h.hodnoty),
                (h.fyzicky ?? '').trim() || null,
                (h.hlavou ?? '').trim() || null,
                (h.parta ?? '').trim() || null,
                JSON.stringify(cile)
            ).first();
            return json({ ulozeno: true, ...r }, 201);
        }
    }

    /* ---------- podklady pro tiskové listy ---------- */
    if (cesta === '/api/listy' && metoda === 'GET') {
        const nas = await nastaveni(env);
        const obdobi = q.get('obdobi') || nas.obdobi;
        const rezim = q.get('porovnani') || 'minule';   // 'minule' | 'hrac' | 'zadne'
        const ids = q.get('ids');

        const filtr = ids && ids !== 'vse'
            ? ids.split(',').map(Number).filter(Boolean)
            : null;

        const { results: hraci } = await env.DB.prepare(
            `SELECT id, jmeno, prezdivka, post, sablona FROM players
              WHERE role = 'hrac' AND aktivni = 1 ORDER BY jmeno`
        ).all<{ id: number; jmeno: string; prezdivka: string | null; post: string | null; sablona: string }>();

        const vybrani = (hraci ?? []).filter(h => !filtr || filtr.includes(h.id));
        const listy = [];

        for (const h of vybrani) {
            const trener = await posledni(env, h.id, obdobi, 'trener');
            let porovnani: Record<string, number> | null = null;
            let popisek = '';

            if (rezim === 'hrac') {
                const hrac = await posledni(env, h.id, obdobi, 'hrac');
                if (hrac) { porovnani = hrac.hodnoty; popisek = ''; }
            } else if (rezim === 'minule') {
                const driv = await predchoziObdobi(env, h.id, obdobi);
                if (driv) { porovnani = driv.hodnoty; popisek = driv.obdobi; }
            }

            listy.push({
                player_id: h.id,
                jmeno: h.jmeno,
                prezdivka: h.prezdivka,
                post: h.post,
                sablona: trener?.sablona || h.sablona,
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

        return json({ nastaveni: { ...nas, obdobi }, listy });
    }

    /* ---------- porovnání trenér vs. hráč (§7.3) ---------- */
    if (cesta === '/api/porovnani' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);

        const nas = await nastaveni(env);
        const obdobi = q.get('obdobi') || nas.obdobi;
        const tolerance = Number(nas.tolerance) || 0;

        const trener = await posledni(env, playerId, obdobi, 'trener');
        const hrac = await posledni(env, playerId, obdobi, 'hrac');
        if (!trener || !hrac) {
            return json({ obdobi, tolerance, hotovo: false, maTrener: !!trener, maHrac: !!hrac, osy: [] });
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
            obdobi, tolerance, hotovo: true, maTrener: true, maHrac: true, osy,
            pocetResit: osy.filter(o => o.resit).length,
            poznamkaHrace: hrac.poznamka
        });
    }

    /* ---------- vývoj v čase (§7.4, jen pro trenéra) ---------- */
    if (cesta === '/api/trend' && metoda === 'GET') {
        const playerId = Number(q.get('player_id'));
        if (!playerId) return chyba('Chybí player_id.', 400);

        const { results } = await env.DB.prepare(
            `SELECT * FROM evaluations
              WHERE player_id = ? AND autor = 'trener'
              ORDER BY id ASC`
        ).all<RadekHodnoceni>();

        const historie = (results ?? []).map(rozbal);
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
                `SELECT t.token, t.player_id, t.obdobi, t.pouzit, t.platny_do, p.jmeno
                   FROM tokens t JOIN players p ON p.id = t.player_id
                  WHERE t.obdobi = ? ORDER BY p.jmeno`
            ).bind(obdobi).all();
            return json(results ?? []);
        }

        if (metoda === 'POST') {
            const telo = await request.json<{ player_id?: number; obdobi?: string; dni?: number }>();
            const nas = await nastaveni(env);
            const obdobi = (telo.obdobi || nas.obdobi).trim();
            const dni = Number(telo.dni) > 0 ? Number(telo.dni) : 30;
            const platnyDo = new Date(Date.now() + dni * 86400_000).toISOString();

            const cile = telo.player_id
                ? [{ id: Number(telo.player_id) }]
                : ((await env.DB.prepare(
                      `SELECT id FROM players WHERE role = 'hrac' AND aktivni = 1`
                  ).all<{ id: number }>()).results ?? []);

            const nove = cile.map(c => ({ player_id: c.id, token: novyToken(), obdobi, platny_do: platnyDo }));
            if (!nove.length) return chyba('Není komu odkaz vygenerovat.', 400);

            await env.DB.batch(nove.map(n => env.DB.prepare(
                'INSERT INTO tokens (token, player_id, obdobi, platny_do) VALUES (?, ?, ?, ?)'
            ).bind(n.token, n.player_id, n.obdobi, n.platny_do)));

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
    return null;
}

/** Kryptograficky náhodný token, 43 znaků. Nikdy ne pořadové ID hráče. */
function novyToken(): string {
    return b64url(crypto.getRandomValues(new Uint8Array(32)));
}
