# TECHNICAL — architektura a programátorská dokumentace

Nahrazuje `ARCHITECTURE.md` z project-standard (název podle zadání §10).
Uživatelská část je v [README.md](README.md), postup od nuly v [BUILD.md](BUILD.md).

---

## 1. Přehled

```
prohlížeč
   |
   v
Cloudflare Worker  ──  statické soubory z ./web (binding ASSETS)
   |                   API /api/*, autorizace, validace
   v
Cloudflare D1 (SQLite)
```

Dvě pravidla, která platí bez výjimky:

- frontend **nikdy** nesahá do D1 přímo, jen přes Worker
- veškerá autorizace se děje ve Workeru, ne v prohlížeči

### Odchylka od zadání §3

Zadání počítalo s Cloudflare Pages pro frontend a Workerem zvlášť. Místo toho obsluhuje
statické soubory přímo Worker přes `assets` binding: jeden deploy, jedna doména, žádné CORS
a žádná druhá konfigurace. Funkčně je to totéž, provozně o krok míň.

Důsledek, na který se dá naletět: asset server standardně přesměrovává `/h.html` na `/h`,
čímž by z adresy zmizel token sebehodnocení. Proto je v `wrangler.jsonc`
`html_handling: "none"` a cesty mapuje Worker sám (`/` → `index.html`, `/h/<token>` → `h.html`).

---

## 2. Struktura repozitáře

```
hodnoceni-hracu/
├── wrangler.jsonc         konfigurace Workeru, assets a D1
├── package.json           skripty: dev, deploy, db:init, db:seed, db:export
├── worker/src/index.ts    API, autorizace, přístup k D1 — veškerá logika serveru
├── scripts/gen-version.mjs  zapíše commit hash do web/version.json (predeploy)
├── web/                   statické soubory (obsluhuje je Worker)
│   ├── index.html         aplikace trenéra (záložky)
│   ├── app.js             logika aplikace
│   ├── app.css            styl aplikace včetně tmavého vzhledu
│   ├── listy.html/.js     tiskové listy A4 z databáze (vlastní stránka)
│   ├── h.html/.js         sebehodnocení hráče za tokenem
│   ├── version.json       generovaný, v .gitignore
│   └── src/
│       ├── sablony.js     klíče os + validace hodnot  ← sdílí Worker
│       ├── i18n.js        všechny texty česky a anglicky
│       ├── radar.js       vykreslení SVG (převzato z docs/vzor-list.html)
│       ├── list.js        sestavení A4 listu
│       └── styl.css       styl listu včetně @page / @media print
├── migrations/
│   ├── 001_init.sql       schéma D1
│   └── 002_seed.sql       kádr
└── docs/                  README (trenér), TECHNICAL, BUILD, RUNBOOK, ZADANI, vzor-list.html
```

`web/src/sablony.js` importuje frontend i Worker — definice os je na jednom místě. Ostatní
soubory ve `web/src/` používá jen prohlížeč.

**Server texty nevrací.** API posílá klíče (`prava`, `hrac`, `minule`) a překládá až
prohlížeč. Díky tomu se po přepnutí jazyka jen překreslí a nic se znovu netahá z databáze.

Tiskové listy mají **vlastní stránku** (`listy.html`), protože `src/styl.css` nastavuje
`body` pro A4. V aplikaci by si styly lezly do zelí.

---

## 3. Autorizace

**Účty po lidech** (od 2026-08-06). Každý trenér má vlastní přihlašovací jméno
(`players.login`) a vlastní heslo (`heslo_hash`, `heslo_sul`, `heslo_iterace` u jeho řádku).
Session nese jeho `id` a `jmeno`, takže aplikace ví, kdo je přihlášený — a obnova hesla
může být pro každého zvlášť.

**Obnova jde na kanál toho člověka**, ne na globální seznam adres: Telegram chat id nebo
e-mail, které má u sebe vyplněné. Díky tomu nebylo potřeba čekat na ověřené e-maily
v Cloudflare — Maxla dostává odkaz na Telegram. Kdo nemá ani jedno, nemá kam odkaz poslat
a aplikace to řekne.

Administrace umí poslat trenérovi **odkaz na nastavení hesla** (tlačítko v Lidech) — stejná
jednorázová logika, jen ji spouští někdo jiný.

**Přechod:** původní společné heslo (tabulka `auth`) zůstává funkční, dokud ho někdo
nesmaže (`DELETE FROM auth`). Kdo nechá přihlašovací jméno prázdné, přihlásí se jím.
Jinak by šlo vyzamknout celý tým. Až budou mít všichni svoje heslo, společné smazat.

---

Původní rozhodnutí (přechodné): jedno společné heslo trenéra + podepsaná session cookie
(zadání §14/1).

**Heslo žije v databázi, ne v secretu.** Ukládá se jako PBKDF2-SHA256 hash s náhodnou
16bajtovou solí, 100 000 iterací (víc workerd nedovolí — „iteration counts above 100000 are
not supported"). Důvod přesunu: Worker si secret sám přepsat nemůže, takže dokud heslo bylo
jen v `ADMIN_HESLO`, nešlo ho změnit z aplikace ani obnovit odkazem.

- dokud v tabulce `auth` není řádek, přihlašuje se proti secretu `ADMIN_HESLO` (bootstrap)
- jakmile se heslo jednou nastaví z aplikace, **secret se ignoruje** — jinak by staré sdílené
  heslo platilo napořád i po změně
- nouzové odemčení, když se ztratí i obnova: `DELETE FROM auth;` a secret zase platí
- server rozlišuje „špatné heslo" (401) a „na serveru není nastavené žádné heslo" (500),
  ať se to druhé nehledá zbytečně dlouho

### Obnova zapomenutého hesla

Neposílá se heslo, ale **jednorázový odkaz** — heslo poslané mailem zůstane ve schránce
navždy. Stejná logika jako u tokenů hráčů:

- platnost 15 minut, jedno použití; po nastavení hesla se smažou i všechny ostatní odkazy
- cílové adresy jsou v secretu `OBNOVA_EMAILY` (čárkami), **ne v nastavení aplikace** —
  jinak by si cíl obnovy přesměroval ten, kdo se zrovna dostal dovnitř
- odpověď na žádost je vždy stejná, ať se nedá zjistit, které adresy jsou povolené
- nejvýš 3 žádosti za 15 minut (brzda na spamování schránky), počítá se z tabulky `obnova`
- odesílá se přes **Cloudflare Email Sending**, binding `[[send_email]] name = "EMAIL"`,
  `env.EMAIL.send({to, from, subject, text, html})` — stejný mechanismus jako JobWatch.
  Doména odesílatele musí být onboardovaná (jinak `E_SENDER_NOT_VERIFIED`) a v režimu
  Email Routing musí být ověřená i adresa příjemce (jinak `E_RECIPIENT_NOT_ALLOWED`).

Změna hesla z aplikace (Nastavení → Změna hesla) chce stávající heslo a nové 2×, minimálně
10 znaků. Běžící session se změnou hesla neruší — kdo je přihlášený, dojede svých 12 hodin.

- `POST /api/login` porovná heslo s `ADMIN_HESLO` a nastaví cookie
  `sess=<payload>.<HMAC-SHA256>`; payload nese jen čas vypršení
- cookie je `HttpOnly; SameSite=Lax; Path=/`, `Secure` se přidává jen přes HTTPS
  (jinak by ji lokální vývoj na `http://127.0.0.1` neuložil)
- platnost 12 hodin, podpis se ověřuje časově konstantním porovnáním
- **každý** endpoint pod `/api/` kromě `/api/login`, `/api/logout`, `/api/me`
  a `/api/self/*` vyžaduje platnou session; při 401 se aplikace vrátí na přihlášení

Hráč se nepřihlašuje vůbec — jeho přístup je jednorázový token v odkazu.

Aplikace je na veřejné adrese a chrání data nezletilých, proto navíc:

- **prodleva 700 ms u špatného hesla** — hádání hesla ve smyčce je tím nepraktické
- **náhledové URL jednotlivých verzí vypnuté** (`preview_urls: false` ve `wrangler.jsonc`),
  aby existovala jediná veřejná adresa

---

## 3b. Vzhled, jazyk a verze

**Tmavý / světlý vzhled.** Atribut `data-theme` na `<html>`, volba v `localStorage`
(`hodnoceni.theme`). Výchozí je systémové nastavení (`prefers-color-scheme`). Vzhled se
nastavuje malým skriptem v `<head>` ještě před vykreslením — jinak by při tmavém vzhledu
problikla bílá. Barvy jsou CSS proměnné v `app.css`, tmavá varianta je jen jejich přepis.

**Tištěný list zůstává vždy světlý.** `listy.html` načítá pouze `src/styl.css` a o tmavém
vzhledu nic neví. Je to papír, ne obrazovka.

**Čeština a angličtina.** Všechny texty jsou v `web/src/i18n.js`, v kódu se používá
`t('klic')`. Volba se pamatuje v `localStorage` (`hodnoceni.lang`), výchozí podle jazyka
prohlížeče. Jazyk jde vynutit i adresou: `?lang=en` — hodí se pro poslání odkazu.
Chybějící klíč se vypíše sám sebou, aby bylo hned vidět, co chybí.

Klíče os se nepřekládají (jsou to klíče v databázi), překládají se jen jejich popisy.
Ke každé ose je navíc věta v první osobě (`ja.*`) pro formulář hráče.

**Verze.** `scripts/gen-version.mjs` zapíše před každým nasazením commit hash, větev a čas
do `web/version.json` (soubor je v `.gitignore`). Aplikace ho čte přes `/api/version` a ukazuje
v horní liště; celý hash a čas sestavení jsou v tooltipu. Na nasazené aplikaci je tak vidět,
která verze běží. Odkaz na GitHub v produktu není — repozitář je private, uživatelům by
nefungoval.

---

## 4. Radar graf

Inline SVG, bez knihovny. Geometrie převzatá beze změny z `docs/vzor-list.html`.

- generický pro libovolný počet os: `n = osy.length`, 5 os = pětiúhelník, 6 = šestiúhelník
- plátno 470×300, střed (235, 148), poloměr 100
- osa 0 je nahoře, pokračuje po směru hodinových ručiček: `úhel = 2π·i/n − π/2`
- 5 soustředných úrovní mřížky (`KRUHY`), střídavě bílá a `#fafafa`
- popisky os vně grafu (poloměr + 22), zalomené na dva řádky nad 17 znaků, s hodnotou `x/10`
- aktuální hodnocení: modrý výplňový polygon `#2196F3` @ 40 % + body
- porovnávací hodnocení: šedý čárkovaný obrys pod ním

**Na jednom listu jsou maximálně dva polygony.** Buď trenér + hráč (rozhovor), nebo trenér
nyní + trenér minule (vývoj). Vybírá se v záložce Listy. Tři polygony jsou nečitelné.

Když se geometrie změní tady, musí se změnit i v `docs/vzor-list.html` — jinak přestane být
referenční.

---

## 4b. Pozice a šablona — dvě různé věci

Dřív se to pletlo do jedné kolonky `post`. Rozděleno:

- **pozice** (`players.pozice`, JSON pole klíčů) — kde hráč může nastoupit. Klidně několik:
  `["brankar","levy_bek","prave_kridlo"]`. Popisné, tiskne se na list, se známkováním nesouvisí.
  Klíče v seznamu `POZICE` v `sablony.js`, názvy se překládají (`pozice.*` v i18n).
- **`post`** zůstal jako volný text pro funkci nebo poznámku — „Kapitán", „Hlavní trenér".
  Na listu se tiskne za pozicemi.
- **šablona os** — kterých šest os se známkuje. Sedí na **hodnocení**, ne na osobě.

**Proč je šablona na hodnocení:** hráč, který chytá i hraje v poli, potřebuje obojí. Ferda
může mít v jednom období hodnocení brankářskou i polní šablonou a každá řada žije samostatně —
brankářské a polní osy se do jednoho grafu míchat nedají. `players.sablona` je jen výchozí
volba ve formuláři.

Důsledky, které musí platit všude:

- `POST /api/evaluations` bere `sablona` z formuláře a ukládá ji do řádku hodnocení
- **token na sebehodnocení nese šablonu** (`tokens.sablona`) — hráč musí vyplnit tytéž osy,
  které známkoval trenér. Při generování se bere šablona posledního hodnocení trenéra pro
  dané období, jinak výchozí šablona osoby.
- `/api/listy` vrací **jeden list na kombinaci hráč × šablona** — Ferda dostane dva
- `/api/porovnani` a `/api/trend` pracují vždy v rámci jedné šablony; když hráč vyplnil
  jinou, než jakou byl známkovaný, vrátí se `jinaSablona: true` a aplikace to řekne
  (není to totéž jako „ještě nevyplnil")

---

## 5. Šablony os

Definované v `web/src/sablony.js`, sdílené frontendem i Workerem.

**`pole`** — hráč v poli, 6 os:
`prava` Technika pravá noha · `leva` Technika levá noha · `hlavicky` Hlavičkování ·
`prihravka` Přihrávka a první dotek · `braneni` Bránění 1v1 · `skenovani` Skenování a poziční hra

**`brankar`** — 6 os:
`chytani` Chytání a zákroky · `misto` Výběr místa a postavení · `nohama` Hra nohama (rozehrávka) ·
`vykopy` Výkopy a dlouhá rozehrávka · `mimo` Hra mimo bránu a centry · `organizace` Organizace a komunikace

Ke každé ose je i **formulace v první osobě** (`JA`) pro formulář hráče — stejná osa, jiná
věta: „Levou nohou přihraju na deset metrů tak, jak chci." Hráč odpovídá na „umím to",
neznámkuje sám sebe.

Škála 1–10 s pevnými kotvami (`KOTVY`) se tiskne na list i zobrazuje ve formulářích. Kondice
a rychlost mezi osami schválně nejsou — u téhle kategorie měří biologický věk.

**Šablonu neměnit uprostřed sezóny.** Jiný počet vrcholů = jiný tvar polygonu a hodnocení už
nejde porovnat s předchozím obdobím. Stará hodnocení se vykreslují šablonou, se kterou byla
pořízena (sloupec `evaluations.sablona`).

---

## 5b. Souhrnné notifikace

Trenér si u sebe (záložka Lidé) zapne e-mail nebo Telegram. Hráči notifikace nedostávají —
do aplikace nechodí.

**Do zprávy nikdy nejde obsah hodnocení.** Žádné známky, žádné slovní bloky — jen „kdo a co"
plus stav období. Jsou to posudky nezletilých a e-mail i Telegram jsou třetí strany;
detail se otevírá v aplikaci.

**Události, ne zprávy.** Každé uložené hodnocení i sebehodnocení zapíše řádek do `udalosti`.
Rozesílka je bere hromadně. Zápis události nesmí shodit uložení hodnocení — chyba se jen loguje.

**Dva nezávislé intervaly** (`settings`):

| Klíč | Význam |
|---|---|
| `notifZapnuto` | hlavní vypínač |
| `notifCas` | v kolik (místní čas, Europe/Prague) |
| `notifDnyZmeny` | když se něco děje, souhrn nejvýš jednou za N dní (výchozí 3) |
| `notifDnyTicho` | když se nic neděje, po N dnech přijde „nic se nezměnilo" (výchozí 14) |
| `notifPosledni` | kdy naposledy něco odešlo |

Ten druhý interval je **liveness signál**, ne notifikace: z ticha jinak nejde poznat, jestli
nikdo nic nedělá, nebo se něco rozbilo. Zpráva to říká výslovně.

Události se označí za vyřízené, jen když se aspoň jednomu příjemci povedlo doručit — jinak
by se ztratily.

### Cron

`"triggers": { "crons": ["0 * * * *"] }` — každou hodinu, protože Cloudflare umí jen UTC,
kdežto čas se nastavuje v místním. Která hodina je ta správná, rozhodne Worker sám
(`prazskaHodina()`, zóna Europe/Prague). Stav v Nastavení ukazuje, kolik je podle Workeru
hodin — chyba v časové zóně by se jinak projevila až tím, že souhrn nedorazí.

**Pozor na limit účtu:** Workers Free dovolí **5 cron triggerů na celý účet** (ne na Worker).
Deploy nad limit skončí na `code: 10072` a triggery se nenastaví, i když se kód nahraje.
Slot pro tenhle projekt se uvolnil vypnutím denního běhu u `pojistky-watch` (2026-08-06).
Další cron na tomhle účtu už se nevejde.

Pozn.: `sk-ricmanice-taktika` má v `wrangler.toml` `[triggers]`, ale **není to Worker**
(Cloudflare vrací „This Worker does not exist on your account") — je to Pages projekt
a ten zápis je mrtvý, žádný slot nedrží.

### Telegram

Bot API přes `https://api.telegram.org/bot<token>/…`, token v secretu `TELEGRAM_BOT_TOKEN`.
Do odpovědí API ani do logu se nikdy nedostane token ani celá URL — jen `description`
od Telegramu.

**Telegram nedovolí, aby bot napsal první.** Každý trenér musí botovi poslat zprávu, teprve
pak vznikne chat id. Tlačítko v Lidech ho dotáhne přes `getUpdates` (Telegram drží updaty
jen ~24 h).

---

## 6. Datový model (D1)

Viz `migrations/001_init.sql`. Tabulky: `players`, `evaluations`, `tokens`, `settings`.

### Append-only

Hodnocení se **nikdy nepřepisuje**. Každé uložení je nový řádek s datem; aplikace pracuje
vždy s nejnovějším záznamem daného autora a období (`ORDER BY id DESC LIMIT 1`). Historie
vzniká sama, zvláštní tabulka pro verzování není potřeba.

### players drží hráče i trenéry

Sloupec `role` (`hrac` / `trener`). Trenér se nehodnotí a netiskne se mu list — je v seznamu
proto, aby šlo zaznamenat, kdo hodnocení pořídil (`evaluations.autor_id`). Pokus uložit
hodnocení osobě s rolí `trener` server odmítne.

### Proč `hodnoty` jako JSON, ne sloupce

Přidání sedmé osy pak znamená přidání klíče, ne migraci schématu. Stará hodnocení zůstanou
platná a vykreslí se svou šablonou.

### settings

Klíč–hodnota: `tolerance`, `obdobi`, `sezona`, `klub`, `kategorie`, `latka`, `cileNadpis`.
Server přijme jen tyhle známé klíče; `tolerance` navíc musí být celé číslo 0–9.

---

## 7. Funkční pravidla

Podstata nástroje, ne detail UI.

**7.1 Zaměněné pořadí.** Hráč nesmí vidět hodnocení trenéra dřív, než odešle své
sebehodnocení. `GET /api/self/:token` vrací jen jméno, období, šablonu, osy a kotvy —
nic z hodnocení trenéra a nic o jiných hráčích. Hlídá to Worker, ne skrytí v UI.

**7.2 Zadávání naslepo.** Formuláře trenéra i hráče nezobrazují předchozí hodnoty a známky
nemají žádnou přednastavenou hodnotu — nic k sobě nepřitahuje novou známku. Porovnání se
odhalí až po uložení. Ve formuláři trenéra na to upozorňuje žlutý rámeček.

**7.3 Tolerance.** V `settings.tolerance`, výchozí `2`, měnitelná v Nastavení.
Rozdíl ≤ tolerance → osa se neřeší. Rozdíl > tolerance → osa se označí k rozhovoru.
Ukládá a zobrazuje se **znaménko** rozdílu, ne absolutní hodnota:

- hráč si dal víc než trenér (+) = slepé místo, chybí zpětná vazba
- hráč si dal míň než trenér (−) = sebedůvěra, může jít o něco mimo fotbal

Když toleranci překročí víc než 3 osy, aplikace to napíše a doporučí vybrat 2–3 témata.

**7.4 Trend.** Žádné souhrnné číslo ani průměr os. Šipka u každé osy (↑ ↓ →) plus souhrn
typu „4 osy nahoru, 1 dolů, 1 beze změny". Pásmo šumu: za změnu se považuje až rozdíl
2 body (`PASMO_SUMU` ve Workeru).

**7.5 Rozdělení pohledů.** Stejná data, dva výstupy:

| | Trenér (`/`) | Hráč (list / odkaz) |
|---|---|---|
| šipky trendu, „zhoršuje se" | ano (záložka Porovnání) | **ne** |
| historie všech období | ano | jen aktuální + druhý polygon |
| rozdíl trenér vs. hráč | ano, číselně | jen jako druhý polygon, bez hodnocení rozdílu |
| data jiných hráčů | ano | nikdy |

Věta „zhoršil ses" nepatří na papír, který si čtrnáctiletý odnese domů.

---

## 8. API

```
GET    /health                                    {status, module, timestamp}
GET    /api/version                               {commit, commitFull, branch, builtAt}

POST   /api/login          {heslo}                nastaví session cookie
POST   /api/logout
GET    /api/me                                    {prihlasen}

POST   /api/heslo          {stare, nove}          admin — změna hesla
GET    /api/obnova-adresy                         admin — kam chodí obnova, je zapojený mail?
POST   /api/obnova         {email, lang}          veřejné — pošle jednorázový odkaz
GET    /api/obnova/:token                         veřejné — {platny}
POST   /api/obnova/:token  {heslo}                veřejné — nastaví nové heslo, odkaz zneplatní

GET    /api/settings                              admin
PUT    /api/settings       {klic: hodnota, …}     admin

GET    /api/players                               admin
POST   /api/players                               admin
PATCH  /api/players/:id                           admin

GET    /api/prehled?obdobi=                       admin — kdo má hodnocení a kdo odkaz
GET    /api/evaluations?player_id=&obdobi=        admin
POST   /api/evaluations                           admin  (autor='trener')

GET    /api/listy?obdobi=&porovnani=&ids=         admin — podklady pro tiskové listy
GET    /api/porovnani?player_id=&obdobi=          admin — rozdíly trenér vs. hráč
GET    /api/trend?player_id=                      admin — vývoj v čase

GET    /api/tokens?obdobi=                        admin
POST   /api/tokens         {player_id?, obdobi, dni}   admin
DELETE /api/tokens/:token                         admin

GET    /api/self/:token                           veřejné — jméno + klíče os, NIC od trenéra
POST   /api/self/:token    {hodnoty, poznamka}    veřejné — uloží autor='hrac', token zneplatní
```

`porovnani` = `minule` | `hrac` | `zadne`, `ids` = `vse` nebo seznam id oddělený čárkami.

Odpovědi nesou klíče, ne texty: `/api/self` vrací `osy: ['prava', …]`, `/api/listy` vrací
`porovnaniRezim` a `porovnaniObdobi` místo hotového popisku, `/api/trend` vrací počty
`nahoru` / `dolu` / `stejne` místo věty. Popisky skládá prohlížeč podle zvoleného jazyka.

### Bezpečnostní pravidla

- token je 32 náhodných bajtů z `crypto.getRandomValues` (43 znaků base64url), nikdy ne
  pořadové ID hráče
- `GET /api/self/:token` nevrací hodnocení trenéra ani jiného hráče
- admin endpointy odmítnou požadavek bez platné session (401), ne jen skryjí v UI
- rozsah hodnot 1–10 a shodu klíčů se šablonou validuje server
  (`zkontrolujHodnoty` v `sablony.js`) — stejný kód na obou stranách
- druhé odeslání sebehodnocení skončí 409; token má omezenou platnost (výchozí 30 dní)
- vše, co jde z databáze do HTML listu, prochází přes `esc()`

Známá a přijatá limitace: kdo odkaz získá, může sebehodnocení vyplnit za hráče.
Pro 19 hráčů 2× ročně je to přijatelné.

---

## 9. Rozhodnutí a exit criteria

```
Rozhodnutí: hodnoty os ulozene jako JSON v jednom sloupci
Důvod: pridani osy nevyzaduje migraci a nerozbije historii
Platí pro fázi: 1-4
Exit criteria:
- potreba dotazovat se na jednotlivou osu napric hraci v SQL
- vice nez ~10 os na sablonu
- pozadavek na agregace nad osami primo v DB
Následující krok: normalizovat do tabulky evaluation_values (eval_id, klic, hodnota)
```

```
Rozhodnutí: pristup hrace pouze pres jednorazovy token, bez uctu
Důvod: nejjednodussi bezpecne reseni pro 19 hracu 2x rocne
Platí pro fázi: 1-4
Exit criteria:
- hraci maji videt svoji historii kdykoliv, ne jen pri vyplnovani
- pozadavek rodicu na trvaly pristup
Následující krok: PIN nebo magic link s delsi platnosti
```

```
Rozhodnutí: admin pristup = jedno heslo jako Worker secret + podepsana session cookie
Důvod: nesvazuje projekt s CF uctem, funguje i z ciziho zarizeni, staci pro jednoho trenera
Potvrzeno: 2026-08-06 (zadani §14/1)
Platí pro fázi: 2-4
Exit criteria:
- vic nez jeden clovek s admin pristupem, kazdy svym heslem
- pozadavek na MFA nebo audit log prihlaseni
Následující krok: Cloudflare Access pred admin cestami
```

```
Rozhodnutí: staticke soubory obsluhuje Worker (assets binding), ne Pages
Důvod: jeden deploy, jedna domena, zadne CORS
Platí pro fázi: 2-4
Exit criteria:
- potreba nezavisleho nasazovani frontendu a API
- build krok u frontendu (framework, bundler)
Následující krok: rozdelit na Pages + Worker podle puvodniho zadani §3
```

---

## 9b. Backlog

### SMS jako třetí kanál

Zatím **nepostaveno**, vedeno vědomě na později. Dnes jsou kanály e-mail a Telegram; SMS
by se hodila pro trenéry, kteří Telegram nepoužívají, a případně jako doručení odkazu
na obnovu hesla.

Poznámky k rozhodnutí, až na to dojde:

- **Cenu neřešit.** Při jednotkách zpráv měsíčně je rozdíl mezi 0,40 a 1,50 Kč/SMS
  v řádu desetikorun. Vybírat podle toho, co se snáz integruje.
- **Provider jako přepínač**, ne natvrdo. V dev režimu `console` provider, který zprávu
  jen zaloguje — reálná SMS ať odejde jen když se testuje doručení, ne při každém běhu:

  ```js
  const provider = env.SMS_PROVIDER === 'twilio' ? posliTwilio : posliDoKonzole;
  ```

- **Twilio trial** dá kredit zdarma na stovky zpráv; posílá jen na ověřená čísla a před text
  přilepí poznámku o trial účtu. Na vývoj to nevadí. Karta až do produkce.
- **BulkGate / GoSMS** jako české alternativy, kdyby bylo potřeba porovnat doručitelnost
  na česká čísla.
- Potřeba bude tabulka v D1 pro odeslané kódy/zprávy a **rate limit** — stejná logika jako
  u obnovy hesla (nejvýš N za okno), aby se nedalo protelefonovat kredit.
- Telefon patří k osobě (`players.telefon`) vedle e-mailu a chat id, se stejným přepínačem
  „posílat SMS" jako ostatní kanály.

Platí i tady: **do zprávy nikdy nejde obsah hodnocení**, jen „kdo a co".

**MikroTik jako SMS provider** (LTE router s SIM, `/tool sms send`): zvažováno a odloženo.
Router je za LTE pravděpodobně pod CGNAT, takže z Workeru nedosažitelný; WireGuard to neřeší
(Worker se do tunelu nepřipojí) a musela by vzniknout další věčně běžící komponenta, která
frontu tahá. SMS je u LTE modemů vedlejší funkce bez doručenek a rozbíjí se s firmwarem.
Hlavně ale: notifikační kanál má fungovat, když je něco jinak špatně — stavět ho na zařízení
v neobsluhované garáži je obrácené. Přidat `mikrotik` providera později je otázka jedné
funkce, takže se nic nezavírá. Pro *garáže* samotné naopak dává smysl jako lokální poplach,
protože funguje i při výpadku uplinku.

**WhatsApp (Twilio to umí) — zvažováno, nižší priorita než SMS.** Mimo 24hodinové okno po
poslední zprávě od uživatele projdou jen **předem schválené šablony** od Mety; souhrn iniciovaný
aplikací je přesně tenhle případ, takže by musel být šablona s proměnnými, ne volný text.
Navíc chce WhatsApp Business účet a ověření subjektu. Proti tomu stojí jediný, zato silný
argument: v ČR ho má skoro každý, kdežto Telegram ne. Pořadí: e-mail (zdarma, běží) →
SMS (bez schvalování, na každém telefonu) → WhatsApp (nejlepší dosah, nejvíc byrokracie).

**Účet Twilio je založený** (Pay as you go, kredit bez expirace, bonus 100 SMS na testování).
Telefonní číslo záměrně nekoupeno — na jednosměrné notifikace stačí alfanumerický odesílatel
zdarma, české mobilní číslo by bylo 12 $/měsíc.

**Twilio přes víc projektů:** jeden účet, **subúčet na projekt** (vlastní SID a token, vlastní
logy a spotřeba, sloučená fakturace), k tomu API Key na aplikaci kvůli odvolatelnosti
a Messaging Service na projekt kvůli sender ID. Do Workeru jdou jen údaje jeho subúčtu.

### Logování komunikace (backlog)

Dnes je stopa po odeslaných zprávách jen ve `wrangler tail` — pomíjivá a vyžaduje terminál.
Až přibude SMS, bude potřeba tabulka `komunikace` v D1 a jednoduchý výpis v Nastavení:

- **metadata, ne obsah**: čas, kanál, komu (osoba + adresa/chat id), typ zprávy
  (souhrn / obnova hesla / test) a **výsledek včetně kódu chyby**
- **nikdy tokeny** — log s platným obnovovacím odkazem je reset hesla čekající na zneužití;
  nanejvýš prvních pár znaků na spárování
- **retence** (např. 12 měsíců) a mazání; záznamy o tom, kdo byl kdy kontaktován, jsou po
  čase spíš riziko než užitek
- výjimka u SMS: ukládat i text kvůli počtu segmentů a sporům o fakturaci — obsah hodnocení
  v něm stejně nikdy nebude
- výpis musí být čitelný i pro toho, kdo neví, co je wrangler

**Hromadné rozesílání (pozvánky na zápasy) do téhle aplikace nepatří** — zadání §2 má
rozesílání mimo scope. Navíc je to jiný právní režim: obchodní sdělení podle zákona 480/2004 §7
vyžaduje souhlas, identifikovatelného odesílatele a funkční odhlášení v každé zprávě. To řeší
SMS brána se sender ID, ne modem v routeru. Kdyby to bylo potřeba, samostatný nástroj.

---

## 10. Otevřené otázky

Zbývají z §14 zadání:

1. Mají mít k listu přístup rodiče, nebo jen hráči?

Rozhodnuto 2026-08-06:

- admin auth = heslo v secretu + podepsaná session cookie (§14/1)
- doména = nakonec vlastní pod `maxferit.cz`, do té doby `*.workers.dev` (§14/2)
- sebehodnocení má **6 os + jednu nepovinnou otevřenou otázku** „Na čem chceš pracovat?"
  (§14/4) — odpověď vidí trenér v Porovnání, na tištěný list se nedostane
- osobní data (jména i posudky) zůstávají v repu a v databázi → **repozitář musí zůstat private**

---

## 11. Mimo scope

Statistiky ze zápasů, docházka a MVP hlasování řeší jiná aplikace
(`sk-ricmanice-taktika`). Tenhle projekt s ní **nesdílí kód ani databázi**.

Dál mimo scope: účty a hesla pro hráče, nativní mobilní aplikace, víceklubovost,
e-mailové rozesílání odkazů (odkazy se kopírují ručně).
