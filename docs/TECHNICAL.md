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
├── worker/src/xlsx.ts     ruční zapisovač .xlsx (ZIP + XML, bez knihovny)
├── worker/src/version.ts  generovaný, v .gitignore — verze zapečená v bundlu
├── scripts/gen-version.mjs  zapíše commit hash do web/version.json i worker/src/version.ts
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
│       ├── dokumentace.js text záložky 📖 Dokumentace (souvislé odstavce, CS i EN)
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

**Přihlásit se jde jménem i e-mailem** (od 2026-08-07). `najdiUcet()` hledá podle
`login` i `email`. Předtím e-mail v poli „Kdo jsi“ tiše propadl do větve společného
hesla — člověk si obnovou přenastavil staré společné heslo, pak s ním nemohl vlézt na
svůj účet a nechápal proč. Tichý průchod do jiné větve je horší než chyba.

**Heslo smí být 4místný PIN** (`HESLO_MIN = 4`, od 2026-08-07). Trenéři to ťukají do
mobilu na hřišti. Deset tisíc kombinací je únosných jen díky zámku níž — samotná
prodleva 700 ms u špatného pokusu robota nezastaví.

**Zámek proti hádání hesla** (tabulka `prihlaseni_pokusy`, migrace 011):

| Klíč | Strop | Okno |
|---|---|---|
| `ucet:<login>` | 5 marných pokusů | 15 minut |
| `ip:<adresa>` | 15 marných pokusů | 15 minut |

Po překročení vrací `/api/login` **429 s vysvětlením**, ne další „špatné heslo".
Úspěšné přihlášení počitadlo nuluje; účet, který ještě heslo nemá, se nepočítá (nemá se
čím trefit). Zámek na účet je **schválně krátký** — kdyby držel dlouho, pár špatných
pokusů by stačilo k vyřazení trenéra z aplikace, což je útok sám o sobě. Staré řádky
se uklízejí při zápisu (starší než den).

Ověřeno naostro 2026-08-07: pátý pokus zamkl, další vracely 429, testovací řádky smazány.

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
- **o existenci účtu se mlčí, o všem ostatním ne** (upřesněno 2026-08-07): nesmyslný tvar
  vstupu vrací 400 („tohle nevypadá jako přihlašovací jméno ani e-mail“) a vyčerpaná brzda
  429. Dřív obojí vypadalo jako úspěch — zelený rámeček „odkaz je na cestě“ i ve chvíli,
  kdy se neodeslalo nic. Tichá lež je horší než přiznaná mez.
- **žádost na neznámé jméno se zapíše do logu komunikace** (`preskoceno` / `NEZNAMY`),
  aby trenér vůbec věděl, že o obnovu někdo žádal
- **stránka s novým heslem píše, čí heslo nastavuje** — `GET /api/obnova/<token>` vrací
  `komu` a `spolecne`. Držitel odkazu na to právo má a bez toho si člověk plete účet
  se starým společným heslem
- nejvýš 3 žádosti za 15 minut (brzda na spamování schránky), počítá se z tabulky `obnova`
- odesílá se přes **Cloudflare Email Sending**, binding `[[send_email]] name = "EMAIL"`,
  `env.EMAIL.send({to, from, subject, text, html})` — stejný mechanismus jako JobWatch.
  Doména odesílatele musí být onboardovaná (jinak `E_SENDER_NOT_VERIFIED`) a v režimu
  Email Routing musí být ověřená i adresa příjemce (jinak `E_RECIPIENT_NOT_ALLOWED`).

Změna hesla z aplikace (Nastavení → Změna hesla) chce stávající heslo a nové 2×, minimálně
**4 znaky** (viz PIN výš). Běžící session se změnou hesla neruší — kdo je přihlášený,
dojede svých 12 hodin.

- `POST /api/login` porovná heslo s `ADMIN_HESLO` a nastaví cookie
  `sess=<payload>.<HMAC-SHA256>`; payload nese jen čas vypršení
- cookie je `HttpOnly; SameSite=Lax; Path=/`, `Secure` se přidává jen přes HTTPS
  (jinak by ji lokální vývoj na `http://127.0.0.1` neuložil)
- platnost 12 hodin, podpis se ověřuje časově konstantním porovnáním
- **každý** endpoint pod `/api/` kromě `/api/login`, `/api/logout`, `/api/me`
  a `/api/self/*` vyžaduje platnou session; při 401 se aplikace vrátí na přihlášení

Hráč se nepřihlašuje vůbec — jeho přístup je jednorázový token v odkazu.

Aplikace je na veřejné adrese a chrání data nezletilých, proto navíc:

- **prodleva 700 ms u špatného hesla** a nad ní **zámek po pěti pokusech** (viz výš) —
  samotná prodleva krátký PIN neuhlídá
- **náhledové URL jednotlivých verzí vypnuté** (`preview_urls: false` ve `wrangler.jsonc`),
  aby existovala jediná veřejná adresa

---

## 3b. Vzhled, jazyk a verze

**Tmavý / světlý vzhled.** Atribut `data-theme` na `<html>`, volba v `localStorage`
(`hodnoceni.theme`). Výchozí je systémové nastavení (`prefers-color-scheme`). Vzhled se
nastavuje malým skriptem v `<head>` ještě před vykreslením — jinak by při tmavém vzhledu
problikla bílá. Barvy jsou CSS proměnné v `app.css`, tmavá varianta je jen jejich přepis.

**Mobil.** Pod 720 px se záložky schovají pod hamburger (osm položek se vedle sebe
nevejde) a tlačítko nese jméno otevřené záložky, ať je i zavřené menu orientační. Dál:
ovládací prvky povyrostou na palec (známky 42 px), formulářové řádky se skládají pod sebe,
vstupy mají 16 px (pod tím iOS zvětší celou stránku a už ji nevrátí) a **široké tabulky
se posouvají uvnitř karty**, aby stránka nerolovala do stran. Čas a název aplikace
z lišty mizí — telefon má hodiny vlastní a místo je drahé.

### Oslovení hráče (5. pád)

`osloveni(jmeno, prezdivka)` v `i18n.js` vrací tvar, kterým se hráč osloví na stránce
sebehodnocení. Dvě věci, které to řeší:

- **Vokativ.** „Ahoj Ferda" zní od aplikace, která hráče vyzývá k upřímnosti, jako od
  cizince. `vokativ()` pokrývá běžná česká jména a přezdívky — včetně případů, kde se
  pravidla rozcházejí: `Marek → Marku` (vsuvné -e- vypadává), `Petr → Petře` (po souhlásce),
  `Karel → Karle` × `Daniel → Danieli` (u `-el` rozhoduje, jestli mu předchází souhláska
  nebo samohláska), `Max → Maxi`, `Maso → Maso` (končí na samohlásku, nechává se být).
- **Křestní jméno, ne celé.** `players.jmeno` je ve tvaru „Příjmení Jméno", takže bez toho
  by hráč bez přezdívky dostal „Ahoj Trnka Ferdinande". Bere se poslední slovo; přezdívka
  má přednost, protože tak mu říkají v kabině.

**Anglicky se neskloňuje** — `osloveni()` vrací jméno beze změny, vokativ je věc češtiny.

**Tištěný list zůstává vždy světlý.** `listy.html` načítá pouze `src/styl.css` a o tmavém
vzhledu nic neví. Je to papír, ne obrazovka.

**Čeština a angličtina.** Všechny texty jsou v `web/src/i18n.js`, v kódu se používá
`t('klic')`. Volba se pamatuje v `localStorage` (`hodnoceni.lang`), výchozí podle jazyka
prohlížeče. Jazyk jde vynutit i adresou: `?lang=en` — hodí se pro poslání odkazu.
Chybějící klíč se vypíše sám sebou, aby bylo hned vidět, co chybí.

Klíče os se nepřekládají (jsou to klíče v databázi), překládají se jen jejich popisy.
Ke každé ose je navíc věta v první osobě (`ja.*`) pro formulář hráče.

**Verze.** `scripts/gen-version.mjs` zapíše před každým nasazením commit hash, větev a čas
do `web/version.json` **i do `worker/src/version.ts`** (oba jsou v `.gitignore`). `/api/version`
čte tu **zapečenou v bundlu**, ne asset: na custom doméně držela cache zóny starý
`/version.json`, takže lišta po nasazení hlásila předchozí commit, ačkoli `workers.dev`
už měl nový. `no-store` hlídá odpověď, ne asset pod ní; co je v bundlu, cache obejít nemůže.
Aplikace verzi ukazuje v horní liště, celý hash a čas sestavení jsou v tooltipu. Na nasazené aplikaci je tak vidět,
která verze běží. Odkaz na GitHub v produktu není — repozitář je private, uživatelům by
nefungoval.

---

## 3c. Export a import kádru

**Proč sešit, a ne CSV.** CSV nenese formátování buněk — Excel mu vždy přiřadí „Obecný",
takže z `+420604577765` udělá vzorec a zobrazí `4,20605E+11`. Berlička `="…"` hodnotu
zachrání, ale v buňce zůstane vzorec. Proto `GET /api/players/export.xlsx` skládá
**skutečný sešit** (`worker/src/xlsx.ts`): ZIP z několika XML, bez komprese (metoda 0),
CRC32 vlastní. Knihovna kvůli tomu do Workeru nepatří — soubor má pár kilobajtů.

Sloupce `telefon` a `telegram_chat_id` mají styl s `numFmtId="49"` (formát Text). Ověřeno
2026-08-07 přímo Excelem přes COM: `NumberFormat` je `@` a hodnota `+420604577765` zůstala
doslova, bez vzorce; diakritika v pořádku.

CSV export zůstává pro programy mimo Excel (středníky, CRLF, BOM). Berlička `="…"` se v něm
**už nepoužívá** — v Power Query se ukazovala doslova a od zavedení sešitu není k čemu.
Import ji pořád umí svléknout, aby prošly starší soubory.

**V souboru jsou popisky, ne klíče.** `trener`, `pole` a `stredni_zaloznik` jsou klíče do
databáze; v tabulce pro trenéra nemají co dělat. Export je překládá (`POPISKY` v
`web/src/sablony.js`, sdílený modul) podle `?lang=cs|en`, přepínače píše jako `ano`/`ne`.
Je to vědomá výjimka z pravidla „server texty nevrací": soubor nečte aplikace, ale člověk.
Import bere zpátky **popisek i klíč**, v obou jazycích, bez ohledu na velikost písmen
a diakritiku (`klicZPopisu()`), takže starší soubory dál projdou.

**Import** (`POST /api/players/import`) čte jediný formát — CSV. Sešit `.xlsx` se proto
rozbaluje **v prohlížeči** (`DecompressionStream('deflate-raw')` + `DOMParser`) a posílá se
už jako CSV. Důvod je praktický: prohlížeč umí i `TextDecoder('windows-1250')`, kterým se
zachrání soubor uložený Excelem ve staré kódové stránce — Worker umí jen UTF-8 a z háčků
by byly patvary.

Párování řádku k člověku: **`id` → `login` → jméno + role**. Bez toho by z každé opravy
vznikl nový člověk. Import běží nejdřív `nanecisto` (řekne, co by se stalo) a zapisuje až
po potvrzení; vadné řádky se přeskočí a vypíšou s číslem řádku, jak ho ukazuje Excel.
**Hesla ani hodnocení import nemění** — `heslo_*` v seznamu sloupců schválně nejsou, aby
je export nevynesl ven a import nepřepsal.

**Řazení jmen se dělá v kódu** (`Intl.Collator('cs')`), ne v SQL: SQLite v D1 nemá českou
collation a porovnává bajty, takže Říčka a Šplíchal končili až za Weissem — v tabulce
i v exportu to vypadalo jako přeházená čísla.

---

## 3d. Příkazový řádek a jazykový model

**Rozřazení dělá prohlížeč, ne model.** Kádr je v `stav.lide`, takže hledání jména
i klíčových slov (`hodnotit`, `porovnat`, `listy`, `odkaz`) je okamžité a nestojí ani
token. `POST /api/ai/prikaz` se volá teprve tehdy, když si `rozeberPovel()` s větou
neporadí — a jen když `settings.aiPoskytovatel` není `vypnuto`.

**Model nikdy nic neprovede.** Vrací jen `{akce, hraci:[jména]}`; jména se párují na
skutečný kádr na serveru, takže ID hráčů nevidí a vymyslet si je nemůže. Akci spouští
aplikace.

### Model podle úkolu, poskytovatel společný

Rozdělení vzniklo z otázky „nemá silný model dirigovat slabší?". **Dirigent by přidal
náklady, ne ubral**: silný model by běžel dvakrát (zadat a zkontrolovat) a k tomu by se
platil ten levný — a kontrola odpovědi stojí zhruba tolik co její vytvoření. Skutečná
ztráta byla jinde: na rozřazení povelu jel model vybraný pro analýzy.

`AI_UKOLY` proto páruje úkol s klíčem nastavení; `modelProUkol()` vrátí model a při
nesouladu s poskytovatelem spadne na jeho výchozí (jinak by volání padlo na neznámém ID).
**Přidání dalšího úkolu = řádek v `AI_UKOLY` + klíč ve `VYCHOZI_NASTAVENI`**; nabídka
v Nastavení i ukládání se poskládají samy z `/api/ai/modely`.

| Úkol | Klíč | Co to je |
|---|---|---|
| `povely` | `aiModelPovely` | rozřazení věty do čtyř akcí |
| `analyzy` | `aiModel` | otázky na kádr |

**Poskytovatel zůstává společný** (`aiPoskytovatel`) — rozhoduje, jestli se vůbec platí
a kam data odcházejí; to nedává smysl mít jinak pro každý úkol.

**Naměřeno** na povelu „ukaž mi papíry pro Jednu" (kádr 2 hráči, správně = akce `listy`,
jeden hráč):

| Model | Akce | Hráči | Čas |
|---|---|---|---|
| Llama 3.2 3B | `odkaz` ❌ | 1 ✅ | 234 ms |
| Llama 3.1 8B | `listy` ✅ | **2** ❌ | 1784 ms |
| **Llama 3.3 70B fp8-fast** | `listy` ✅ | 1 ✅ | **477 ms** |
| gpt-oss 120B | `listy` ✅ | 1 ✅ | 2135 ms |

Proto je výchozí model na povely **70B, ne ten nejmenší**: nejmenší tu nešetří, jen se
pletou, a 70B je zároveň nejrychlejší ze správných. Je to měření na jednom povelu a malém
kádru — orientační, ne benchmark.

**Poskytovatel je přepínač** (`settings.aiPoskytovatel`, výchozí `vypnuto`):

| Hodnota | Chování |
|---|---|
| `vypnuto` | model se nevolá vůbec |
| `workers` | Cloudflare Workers AI přes binding `AI` (zdarma, denní limit) |
| `claude` | Anthropic přes oficiální `@anthropic-ai/sdk`, secret `ANTHROPIC_API_KEY` |

**Záloha zdarma při vyčerpaném kreditu.** `claudeNaZalohu()` rozlišuje provozní stav od
chyby zadání: `billing_error`, 429, 402/403, 5xx a zprávu „credit balance is too low“
(chodí jako 400) bere jako důvod dokončit povel na Workers AI; jiné 400 propadnou ven,
protože chybu v požadavku nemá smysl zakrývat. Důvod jde do odpovědi i do logu komunikace.

Seznam modelů (`AI_MODELY`) je **v kódu, ne z katalogu**: Cloudflare modely vyřazuje
(`@cf/meta/llama-3.1-8b-instruct` skončil 2026-05-30 a volání padalo na `5028`), a
vyřazený model má být vidět v commitu, ne až v runtime chybě. Aktuální nabídku účtu
vypíše `npx wrangler ai models`.

### Odpověď se čte podle rodiny modelu (`textZWorkersAI`)

Workers AI nemá jeden tvar odpovědi:

| Rodina | Kde je text |
|---|---|
| Llama a spol. | `response` |
| REST obal | `result.response` |
| `gpt-oss` | `choices[0].message.content` (tvar OpenAI) |
| Responses API | `output[].content[].text` u bloků `type: 'message'` |

Vedle textu leží u uvažujících modelů i **`reasoning` / `reasoning_content`** — vnitřní
monolog modelu. Do odpovědi se brát **nesmí**, `textZWorkersAI` ho přeskakuje.

### Uvažující modely potřebují vyšší strop tokenů

**`gpt-oss` počítá vnitřní uvažování do `max_tokens`.** Se stropem nastaveným pro běžný
model (20 / 120 / 900) došly tokeny dřív, než začal psát odpověď: vrátil
`content: null`, `finish_reason: 'length'` — a aplikace hlásila „model neodpověděl“,
přestože volání proběhlo v pořádku.

`jeUvazujici()` pozná model podle id (`gpt-oss`) a `stropTokenu()` mu strop **zečtyřnásobí,
minimálně na 2000**. Když text i tak nepřijde, `procNicNeprislo()` to nehlásí jako „zkus
jiný model“, ale řekne důvod — u vyčerpaného limitu jmenovitě.

Cena za to je **latence**: naměřeno `gpt-oss-120b` 4,8 s a 9,5 s tam, kde
`llama-3.3-70b-fp8-fast` zvládl 0,5 s a 1,6 s. Na povely v liště je to znát.

`@anthropic-ai/sdk` vyžaduje `"compatibility_flags": ["nodejs_compat"]`; bundle Workeru
je s ním 513 kB / 108 kB gzip.

---

## 3e. Analýzy

Záložka **Analýzy** má dvě vrstvy a v tomhle pořadí:

**1. Spočítané podklady** (`GET /api/analyzy`, funkce `podkladyProAnalyzu`). Průměry os za
kádr, osy nad tolerancí, kdo nemá hodnocení a kdo sebehodnocení. Počítá se ve Workeru,
je to přesné, zadarmo, okamžité a **nic neopustí aplikaci**. Dostupné vždycky, i když je
model vypnutý.

**2. Otázka jazykovému modelu** (`POST /api/ai/analyza`). Model dostane **tatáž hotová
čísla** a otázku; jeho prací je formulace, ne výpočet. V pokynu má výslovný zákaz cokoli
dopočítávat. Kdyby počítal sám, spletl by se a věta by zněla stejně sebejistě jako
správná — proto je aritmetika v kódu.

Odpověď nese větu „ověř si čísla" a tlačítko do Analýz; `podklady` se vrací i v odpovědi
API. Odpověď bez čísel pod sebou je dojem, ne analýza.

### Jedno pole na dotazy: příkazový řádek

Ptát se jde **odkudkoli** — lišta je nad každou záložkou. Původně byla pole dvě (lišta
a textarea v Analýzách) a uživatel logicky psal do toho nápadnějšího nahoře, kde dostal
„tomuhle nerozumím". Textarea z Analýz proto zmizela; zůstaly tam tabulky a příklady
otázek, které se vloží do lišty a rovnou spustí.

Pořadí v `spustPovel()`:

1. **Vypadá to jako otázka?** (`vypadaJakoOtazka`) → rovnou `/api/ai/analyza`.
2. Jinak **lokální rozřazení** (`rozeberPovel`) — jména a klíčová slova, nestojí token.
3. Jinak **rozřazovač** `/api/ai/prikaz`.
4. Vrátí-li `akce: 'nevim'` → ber to jako otázku.

**Rozdíly dostane model spočítané u každé osy**, ne jen u těch nad tolerancí. Když je
neměl, dopočítal si je sám a **pletl si znaménko** (u zápisu `3/4` hlásil −1 místo +1).
Zápis je proto `8/6 (-2)` = trenér 8, hráč 6, rozdíl −2, a v poznámce stojí, že rozdíl je
už spočítaný. Platí i tady, že co jde spočítat, se počítá v kódu.

**Proč se otázka pozná jako první:** `rozeberPovel` páruje slova na jména podle začátku,
takže krátké slovo v otázce trefí hráče — „u koho **je** největší rozpor" otevřelo kartu
hráče „**Je**dna" místo odpovědi. Odchytil to až proklik v prohlížeči. Test podle délky
slova je nespolehlivý (dvouznakové prefixy jsou v češtině běžné), proto se rozhoduje podle
**tázacího slova nebo otazníku** (`TAZACI_SLOVA`).

### Popisky os posílá prohlížeč

Worker texty nedrží — vrací klíče a překládá se až v UI (§3b). Model by ale z klíče
`braneni` slušnou větu nenapsal, takže mu prohlížeč pošle `popisky: {osy, sablony}`
z i18n. Neznámý klíč se použije, jak přišel.

### Vlastní vypínač, protože jde o jiná data

| | příkazový řádek | analýzy |
|---|---|---|
| co odchází modelu | jedna věta + **jména kádru** | jména, **známky, slovní posudky, cíle, poznámka hráče** |
| přepínač | `settings.aiPoskytovatel` | **navíc** `settings.aiAnalyzy` (výchozí `ne`) |
| bez modelu | povel se rozřadí v prohlížeči | podklady se dál počítají, jen se nedá ptát větou |

**Rozhodnutí (8. 8. 2026, vědomé):** analýza nad samotnými čísly by přišla o polovinu toho,
co trenér napsal, takže modelu jdou i slovní bloky a cíle. Je to jediné místo v aplikaci,
odkud odcházejí ven údaje o konkrétním nezletilém hráči — proto samostatný vypínač, který
je ve výchozím stavu vypnutý a v Nastavení má u sebe varování. Zapnout se to musí vědomě,
ne omylem při přepnutí modelu.

**Co z toho plyne a co je otevřené:**
- Do **logu komunikace** jde jen rozsah podkladů (kolik listů, kolik os nad tolerancí),
  nikdy jejich obsah — log čte i ten, kdo na hodnocení nemá dosah.
- **Poskytovatel má význam.** Workers AI běží na Cloudflare, tedy na témže účtu jako
  aplikace; Claude je americká třetí strana. Pro data nezletilých je Workers AI méně
  problematická cesta a je to i výchozí volba.
- **GDPR zatím nedořešeno:** zpracování údajů dětí jazykovým modelem si zaslouží záznam
  o činnosti zpracování a informaci pro rodiče. Otevřené, viz STATUS.

### Pravidla, která tady platí dál

- **§7.4 se neporušuje:** trend zůstává šipkový (↑ ↓ →, pásmo šumu 2 body), souhrnné číslo
  ani průměr os se u něj nepočítá. Průměr je jen tam, kde už zavedený byl (srovnání hráčů),
  a vždy jako orientační souhrn.
- **Na tištěný list nejde z analýz nic** (§7.5). Je to interní pohled trenéra.
- Průměr osy za kádr se počítá **v rámci jedné šablony** — brankářské a polní osy se
  míchat nedají.
- Na list i do analýzy jde **uzavřená shoda trenérů**, když existuje, jinak poslední
  hodnocení trenéra. Stejné pravidlo na obou místech, ať papír a analýza neříkají jiné číslo.

---

## 4. Radar graf

Inline SVG, bez knihovny. Geometrie převzatá beze změny z `docs/vzor-list.html`.

- generický pro libovolný počet os: `n = osy.length`, 5 os = pětiúhelník, 6 = šestiúhelník
- plátno 470×300, střed (235, 148), poloměr 100
- osa 0 je nahoře, pokračuje po směru hodinových ručiček: `úhel = 2π·i/n − π/2`
- 5 soustředných úrovní mřížky (`KRUHY`), střídavě bílá a `#fafafa`
- popisky os vně grafu (poloměr + 22), zalomené na dva řádky nad 17 znaků, s hodnotou `x/10`
- aktuální hodnocení: výplňový polygon @ 40 % + body, **barva podle šablony** (viz 4c)
- porovnávací hodnocení: šedý čárkovaný obrys pod ním — zůstává šedý vždy, aby se nepletl
  s barvou šablony

**Na jednom listu jsou maximálně dva polygony.** Buď trenér + hráč (rozhovor), nebo trenér
nyní + trenér minule (vývoj). Vybírá se v záložce Listy. Tři polygony jsou nečitelné.

Když se geometrie změní tady, musí se změnit i v `docs/vzor-list.html` — jinak přestane být
referenční. Barvy se změnit smějí: vzor je list hráče v poli, tedy modrý.

---

## 4c. Barva podle šablony

Aby se v hromádce vytištěných listů poznalo na první pohled, co je co:

| Šablona | Barva | základ | tmavá | světlá |
|---|---|---|---|---|
| `pole` | modrá | `#2196F3` | `#1565C0` | `#E3F2FD` |
| `brankar` | petrolejová | `#00838F` | `#006064` | `#E0F7FA` |
| `leader` | vínová | `#AD1457` | `#880E4F` | `#FCE4EC` |

Odstíny jsou schválně daleko od sebe a žádný se netluče se slovními bloky (zelená, oranžová,
fialová) ani s rámečkem cílů (žlutá).

**Barva je vždy jen druhý signál.** Vedle ní stojí název šablony — v hlavičce listu jako
značka (`.sab-znacka`), v aplikaci jako štítek (`.znacka.sab-*`). Bez toho by list nedával
smysl na černobílé tiskárně, při tisku bez grafiky na pozadí ani barvoslepému čtenáři.
Značka má proto barevný **text a rámeček**, ne bílý text na barevném podkladu.

Technicky jsou to tři CSS proměnné (`--sab-zaklad`, `--sab-tmava`, `--sab-svetla`) a tři
třídy `.sab-pole` / `.sab-brankar` / `.sab-leader` v `src/styl.css`. Proměnné se dědí, takže
třída se nasadí buď na `.page` (jeden list = jedna šablona), nebo na `.chart-one` (kumulovaný
list = víc šablon na stránce, každý radar má svou). Kumulovaná `.page.kumul` je neutrálně
šedá — stránka nepatří žádné jedné šabloně.

**Pozor na pořadí pravidel.** Záložní `.page` má stejnou specificitu jako `.sab-*`, takže
musí stát **před** nimi; když stálo za nimi, přebilo je a brankářský i leader list se
tiskly modré. Je to tentýž případ jako pravidla `@media print` na konci souboru.

Radar bere barvu z týchž proměnných, ale zapisuje ji přes atribut `style`, ne přes
`fill="…"` — prezentační atributy `var()` spolehlivě neumí. Záložní hodnota je modrá, aby
SVG vytažené ze stránky vypadalo pořád stejně.

V aplikaci má tmavý vzhled vlastní, světlejší odstíny (`:root[data-theme="dark"] .znacka.sab-*`
v `app.css`) — papírové jsou na tmavém pozadí nečitelné. Tištěný list zůstává světlý vždy.

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
brankářské a polní osy se do jednoho grafu míchat nedají. Totéž platí pro šablonu `leader`:
je to **druhý list vedle herního**, ne sedmá osa (viz kap. 5).

**Kartotéka drží seznam** (`players.sablony`, JSON pole, migrace `013`): kterými šesticemi
os se ten hráč známkuje. Není to duplikát `evaluations.sablona` — ta říká, čím hodnocení
**bylo** pořízeno, tohle říká, co **má být** hotové. Z toho pak plyne: řádek na každou
šablonu v Listech a v přehledu, prázdný list jako podklad u šablony bez hodnocení, odkaz
na sebehodnocení na každou šablonu zvlášť (token nese jednu šestici os) a výchozí volba
ve formuláři. `players.sablona` zůstává jako zrcadlo první položky, aby ruční SQL a starší
klient nevraceli nesmysl; pravda je `sablony` a čte se přes `sablonyOsoby()`.

**Slovní bloky a cíle jsou na hodnocení, ne na osobě** (`evaluations.fyzicky`, `hlavou`,
`parta`, `cile`) — takže vycházejí na každou šablonu vlastní. Formulář je proto při
přepnutí šablony **nepřenáší**; dřív je nesl s sebou (mění se osy, ne text), což u hráče
s víc šablonami znamenalo, že se brankářské cíle propsaly i na leader list. Když je něco
rozepsané, formulář se před přepnutím zeptá.

**Kumulovaný list** (`listy.html?…&kumulovane=1`) skládá stránku ze všech listů téhož
hráče. Dělá to **frontend** (`list.js: vykresli()` seskupí podle `player_id`), server dál
vrací jeden záznam na kombinaci hráč × šablona — kumulace je tisková volba, ne jiný dotaz.
Radary zůstávají oddělené i tady; slévají se jen slovní bloky a cíle, a to s podpisem
šablony, ze které jsou.

**Hromadné hodnocení** (`POST /api/evaluations/hromadne`) doplní vyplněné osy k poslednímu
hodnocení hráče v daném období a šabloně a uloží nový záznam. Základ se hledá **jen u
přihlášeného trenéra** (`autor_id IS ?`) — cizí čísla se nepřebírají, jinak by hromadné
zadání tiše smíchalo dva pohledy, které má rozsuzovat Shoda. Hráč bez základu se nezakládá
(nešlo by doplnit chybějící osy a neúplný záznam nejde vykreslit) a vrací se v `ceka`.

**Úprava hodnocení** (`GET /api/evaluations/predloha` + `uprava_id` v `POST /api/evaluations`,
migrace `012`) je jediné místo, kde formulář ukazuje dřívější čísla — a je to **výjimka
z hodnocení naslepo**, ne její zrušení:

- předvyplní se **jen vlastní** hodnocení. Když má session `id` (trenér s vlastním heslem),
  server hledá výhradně jeho řádky a volbu v nabídce *Hodnotí* ignoruje; u přechodného
  společného hesla (session bez `id`) platí `autor_id` z dotazu, stejně jako u ukládání.
  Cizí čísla se tudy nedají vytáhnout.
- uložení je **nový řádek** (append-only platí dál), `uprava_id` drží nit na upravovanou
  verzi. Bez ní by v historii ležely dva záznamy vedle sebe a nešlo by poznat opravu
  překlepu od druhého, samostatně pořízeného hodnocení.
- server odmítne `uprava_id`, které neexistuje (404), patří jinému hráči nebo není od
  trenéra (400) — sebehodnocení hráče se trenérským formulářem nepřepisuje ani novou verzí
  a uzavřená shoda patří do `POST /api/shoda`.
- nová verze se ukládá do **období upravované verze**, ne do právě nastaveného; jinak by
  oprava starého hodnocení tiše přeskočila do letošní řady.
- nabídka nad formulářem nese jen datum a šablonu, žádné známky. Existence hodnocení není
  kotva, hodnota ano.

**Srovnání hráčů mezi sebou** (`GET /api/srovnani`) je jiná otázka než `/api/porovnani`:
tam jde o rozdíl trenér vs. hráč u jednoho člověka, tady o to, jak si stojí dva brankáři
vedle sebe. Bere jen hodnocení od trenérů a vždy v rámci jedné šablony; vrací i rozptyl
na ose, aby šlo poznat, kde se ti dva skutečně liší.

Důsledky, které musí platit všude:

- `POST /api/evaluations` bere `sablona` z formuláře a ukládá ji do řádku hodnocení
- **token na sebehodnocení nese šablonu** (`tokens.sablona`) — hráč musí vyplnit tytéž osy,
  které známkoval trenér. Generuje se **jeden token na každou přiřazenou šablonu**; nevyplněný
  token na tutéž šablonu se nezakládá podruhé (vrací se v `preskoceno`).
- `/api/listy` vrací **jeden list na kombinaci hráč × šablona** — Ferda dostane tři.
  Kumulace na jednu stránku je až tisková volba ve frontendu.
- **Vybírá se po listech, ne po hráčích.** V záložce Listy má každý řádek (hráč × šablona)
  vlastní zaškrtávátko a do `ids` jde `id:sablona`. Dokud bylo zaškrtávátko na hráči, Ferdovy
  tři šablony se tiskly vždycky všechny najednou.
- **slovní bloky a cíle jsou na hodnocení**, takže vycházejí na každou šablonu vlastní;
  formulář je při přepnutí šablony nepřenáší
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

**`leader`** — vůdcovství, 6 os (od 2026-08-07):
`vedeni` Vedení na hřišti · `priklad` Příklad v tréninku · `tlak` Reakce na chybu a tlak ·
`fairplay` Fair play a respekt · `podpora` Podpora spoluhráčů · `odpovednost` Spolehlivost a odpovědnost

Je to **samostatná šablona, ne sedmá osa** u všech. Sedm vrcholů místo šesti změní tvar
radaru a nová hodnocení by nešlo porovnat se staršími. Takhle dostane hráč druhý list vedle
herního — stejný mechanismus, jakým má Ferda list brankářský i polní.

Osy popisují **chování, které je vidět** (mluví na spoluhráče, chodí včas, po chybě se
nesesype), ne povahu. Hodnotit čtrnáctiletému „osobnost" by byl přesah, který na papír
pro rodiče nepatří.

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

Viz `migrations/001_init.sql` a další migrace. Tabulky: `players`, `evaluations`, `tokens`,
`settings`, `auth`, `obnova`, `udalosti`, `komunikace`, `prihlaseni_pokusy`.

Migrace, které přibyly:

| Migrace | Co přinesla |
|---|---|
| `003_auth.sql` | společné heslo jako PBKDF2 hash v D1 místo secretu |
| `004_pozice.sql` | N pozic u hráče, šablona se přesunula na hodnocení |
| `005`, `006` | události a kanály notifikací, dva nezávislé intervaly |
| `007_ucty.sql` | účty po lidech (`login`, heslo u řádku trenéra) |
| `009_sms.sql` | telefon, přepínač `notif_sms`, tabulka `komunikace`, denní strop |
| `010_komunikace_platforma.sql` | sloupce `platforma` a `podrobnosti` v logu komunikace |
| `011_prihlaseni_pokusy.sql` | zámek proti hádání hesla (viz kap. 3) |
| `012_uprava.sql` | `evaluations.uprava_id` — ze které verze nová vznikla |
| `013_sablony.sql` | `players.sablony` — víc šablon u jednoho hráče (JSON pole) |

### Čísla osob se nerecyklují

`players.id` je `INTEGER PRIMARY KEY AUTOINCREMENT`, takže SQLite už jednou přidělené číslo
nevydá znovu ani po smazání řádku. Aplikace navíc hráče **nemaže**, jen odškrtne `aktivni` —
smazat člověka, na kterého odkazují hodnocení, by rozbilo historii.

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

Klíč–hodnota: `tolerance`, `obdobi`, `sezona`, `klub`, `kategorie`, `latka`, `cileNadpis`,
notifikační `notifZapnuto`, `notifCas`, `notifDnyZmeny`, `notifDnyTicho`, `notifPosledni`
a SMS `smsAktivni` (výchozí `0`) se `smsDenniStrop` (výchozí `50`), jazykový model
`aiPoskytovatel` (výchozí `vypnuto`) a `aiModel`.

Server přijme **jen klíče, které zná** (`VYCHOZI_NASTAVENI`); `tolerance` navíc musí být
celé číslo 0–9. Výchozí hodnoty jsou v kódu, ne v migraci — nový přepínač se tak nasadí
bez zásahu do databáze a stará databáze se chová stejně jako nová.

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

**7.3b Volné porovnání.** `GET /api/zaznamy` nabídne kombinace **hráč × období × autor**
v rámci jedné šablony (poslední hodnocení každé kombinace — starší verze jsou opravy a pro
porovnání šum). `GET /api/porovnani-vice?ids=` postaví 2–8 z nich vedle sebe.

- **Šablona je tvrdá hranice.** Míchané šablony vrací `400` — brankářská a polní šestice
  nemají jedinou společnou osu, takže by se porovnávalo „Chytání 8" s „Levá noha 3".
- **Pořadí sloupců určuje server, ne pořadí v `ids`.** Období chronologicky (podle
  nejstaršího záznamu v něm), uvnitř období `trener` → `shoda` → `hrac`. Bez toho by
  znaménko u dvou sloupců záviselo na tom, v jakém pořadí uživatel klikal.
- **Znaménko jen u dvou sloupců** (druhý mínus první). Díky pořadí výše to znamená totéž co
  jinde v aplikaci: u dvou období `+` = zlepšení, u trenéra proti sebehodnocení `+` = hráč
  si dal víc. U tří a víc sloupců se místo znaménka počítá rozptyl.

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

POST   /api/login          {login?, heslo}        login = jméno NEBO e-mail; 429 při zámku
POST   /api/logout
GET    /api/me                                    {prihlasen}

POST   /api/heslo          {stare, nove}          admin — změna hesla
GET    /api/obnova-adresy                         admin — kam chodí obnova, je zapojený mail?
POST   /api/obnova         {login|email, lang}    veřejné — 400 při nesmyslném tvaru, 429 při brzdě
GET    /api/obnova/:token                         veřejné — {platny, komu, spolecne}
POST   /api/obnova/:token  {heslo}                veřejné — nastaví nové heslo, odkaz zneplatní

GET    /api/settings                              admin
PUT    /api/settings       {klic: hodnota, …}     admin

GET    /api/players                               admin — řazeno česky (Intl.Collator)
POST   /api/players                               admin
PATCH  /api/players/:id                           admin
GET    /api/players/export.xlsx                   admin — sešit; telefon a chat id formátem Text
GET    /api/players/export.csv                    admin — CSV pro programy mimo Excel
POST   /api/players/import {csv, nanecisto?}      admin — {pridano, upraveno, chyby[]}

GET    /api/kanaly                                admin — stav e-mailu, Telegramu, SMS
GET    /api/komunikace                            admin — posledních 100 pokusů o odeslání
GET    /api/sms/ucet                              admin — ověří klíče brány, nic neodešle
GET    /api/sms/kanaly                            admin — výpis kanálů (GoSMS v1 ho nemá → 404)
POST   /api/sms/test       {telefon, nanecisto?}  admin — zkušební SMS, nanečisto zdarma

GET    /api/prehled?obdobi=                       admin — stav po šablonách (`stavSablon[]`)
GET    /api/evaluations?player_id=&obdobi=        admin
POST   /api/evaluations    {…, uprava_id?}        admin  (autor='trener'); uprava_id = nová verze
GET    /api/evaluations/predloha?player_id=…      admin — vlastní hodnocení k úpravě, nebo null
POST   /api/evaluations/hromadne                  admin — jedna známka pro víc hráčů
GET    /api/srovnani?sablona=&obdobi=&ids=        admin — tabulka osa × hráč

POST   /api/ai/prikaz     {text}                  admin — rozřazení povelu modelem
GET    /api/ai/stav?model=                        admin — odpoví model? nic o hráčích
GET    /api/ai/modely                             admin — nabídka pro Nastavení

GET    /api/analyzy?obdobi=                       admin — spočítané podklady, BEZ modelu
POST   /api/ai/analyza    {otazka,obdobi,popisky} admin — otázka nad plnými daty (viz 3e)

GET    /api/listy?obdobi=&porovnani=&ids=         admin — jeden záznam na hráče × šablonu
GET    /api/porovnani?player_id=&obdobi=          admin — rozdíly trenér vs. hráč
GET    /api/trend?player_id=                      admin — vývoj v čase
GET    /api/zaznamy?sablona=                      admin — co jde porovnat (hráč×období×autor)
GET    /api/porovnani-vice?ids=                   admin — 2–8 záznamů vedle sebe

GET    /api/tokens?obdobi=                        admin
POST   /api/tokens    {ids?, obdobi, dni, sablona?}  admin — `ids` jako u listů (`id`
                                                  nebo `id:sablona`); bez něj celý kádr,
                                                  nevyplněný odkaz se nezdvojí (`preskoceno`)
DELETE /api/tokens/:token                         admin

GET    /api/self/:token                           veřejné — jméno + klíče os, NIC od trenéra
POST   /api/self/:token    {hodnoty, poznamka}    veřejné — uloží autor='hrac', token zneplatní
```

`porovnani` = `minule` | `hrac` | `zadne`.

`ids` = `vse`, nebo seznam oddělený čárkami. Položka je buď **samotné id hráče** (= všechny
jeho listy), nebo **`id:sablona`** pro jeden konkrétní list — Ferda má tři šablony a nemá
smysl, aby se pokaždé tisklo všechno. Obojí jde míchat; hráč zadaný aspoň jednou bez šablony
dostane všechny své listy. Neznámá šablona se zahodí (radši nic než tiše vytisknout všechno).
Samotné id zůstalo kvůli starším odkazům a příkazovému řádku, který vybírá hráče, ne listy.

**Týž tvar používá i `POST /api/tokens`** — je to tatáž otázka „koho a kterou řadu", takže
rozebrání sdílí funkce `rozeberIds()` + `sablonyZVyberu()`. U odkazů navíc platí, že prázdný
výběr po rozebrání (`ids` bylo zadané, ale nic platného v něm nebylo) vrací jinou chybu než
„vybraní hráči nejsou v aktivním kádru" — jinak by neznámá šablona vypadala jako neexistující
hráč.

| `ids` | co se vytiskne |
|---|---|
| `vse` | všichni aktivní hráči, všechny jejich listy |
| `7` | hráč 7, všechny jeho listy |
| `7:brankar` | jen brankářský list hráče 7 |
| `7:brankar,7:leader` | dva listy hráče 7 |
| `7:nesmysl` | nic |

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

### Přehled možných kanálů

Zvažované cesty, jak dostat souhrn nebo odkaz na obnovu hesla k trenérovi. Pořadí podle
poměru „co to dá" / „co to stojí za byrokracii":

| Kanál | Marginální cena | Co je potřeba | Hlavní omezení | Stav |
|---|---|---|---|---|
| **E-mail** (Cloudflare Email Sending) | zdarma | binding `[[send_email]]`, onboardovaná doména | příjemce musí být **ověřená destination address** | **běží** |
| **Telegram** (Bot API) | zdarma | bot od `@BotFather`, token jako secret | bot **nesmí napsat první** — uživatel mu musí poslat zprávu | **běží** |
| **SMS** (GoSMS) | od 0,41 Kč/SMS, **žádný paušál** | účet na gosms.cz, OAuth2 klíče, ID kanálu | odesílatel je jméno brány (`GoSMS-info`), ne klub | **běží**, v Nastavení vypnuto |
| **SMS** (Twilio) | $0,0706/segment (~1,50 Kč) | + **12 $/měs. za české číslo** nebo 30 $/měs. za jméno | bez registrovaného odesílatele končí do ČR na `21612` | **postaveno**, nepoužívá se |
| **WhatsApp** (Twilio) | $0,005 Twilio + $0,0034 Meta za utility mimo 24h okno, **bez paušálu** | číslo, které není na běžném WhatsAppu, Meta Business Portfolio, schválená šablona | neověřený subjekt smí 250 příjemců/24 h; sandbox má opt-in jen na 3 dny | **nepostaveno** |
| **SMS z MikroTiku** (`/tool sms send`) | v paušálu, prakticky zdarma | dosažitelný router + komponenta, která tahá frontu | router pod CGNAT; SMS je u LTE modemů vedlejší funkce bez doručenek | **zamítnuto** pro notifikace |

Poznámky k rozhodnutí:

- **Twilio je pro české SMS špatný nástroj.** Obě jeho cesty stojí měsíční paušál
  (30 $ za registrované jméno, 12 $ za české číslo), kdežto česká brána účtuje jen
  odeslané zprávy. Rada „číslo netřeba, jméno je zdarma“ z prvního kola byla mylná —
  od 14. 7. 2025 čeští operátoři neregistrovaná jména blokují.
- **Účet u Twilia se ruší nemusí.** Nic nestojí, dokud se neposílá, kredit neexpiruje
  (a při zavření účtu se nevyčerpaný zůstatek vrací) a je to jediná cesta k WhatsAppu.
- **BulkGate Mobile Connect** je třetí varianta bez paušálu: Android aplikace udělá bránu
  z vlastního telefonu, SMS jde z vlastního tarifu a z vlastního čísla, brána si bere
  ~0,05 Kč. Chce to telefon, který je pořád zapnutý a online.
- **U SMS zvážit odstranění diakritiky.** „Novak odeslal sebehodnoceni" se vejde do jednoho
  segmentu, s háčky do dvou. Při jednotkách zpráv je to jedno, při stovkách ne.
- **MikroTik dává smysl v garážích**, ne tady: tam je modem to jediné, co při výpadku uplinku
  ještě žije, takže lokální poplach přes SMS projde. Notifikační kanál pro tuhle aplikaci
  ale nemá stát na zařízení, které je samo nejnáchylnější k výpadku.
- Přidat providera je díky přepínači otázka jedné funkce, takže se žádná z cest nezavírá.

### SMS (postaveno)

Telefon patří k osobě (`players.telefon`) vedle e-mailu a chat id, se stejným přepínačem
„posílat SMS". Použije se u souhrnů i u odkazu na obnovu hesla.

**Provider je přepínač, ne natvrdo:**

| `SMS_PROVIDER` | Chování |
|---|---|
| `console` | zprávu jen zaloguje, nikam neodejde — aby se kredit neprotelefonoval testy |
| `gosms` (nastaveno) | česká brána: OAuth2 token, pak `POST https://app.gosms.eu/api/v1/messages/` |
| `twilio` | `POST /2010-04-01/Accounts/{SID}/Messages.json`, Basic auth — do ČR končí na `21612` |

**Nad providerem je ještě vypínač v aplikaci.** `settings.smsAktivni` je ve výchozím stavu
`0` a bez něj neodejde nic, ani člověku, který má `notif_sms` zapnuté; pokus se zaloguje
jako `preskoceno` s kódem `VYPNUTO`. Přepínač u osoby říká *kam*, tenhle *jestli vůbec* —
SMS je mimořádný nástroj, ne běžný kanál.

**Zapojení GoSMS** (secrety, do gitu nepatří):

```
npx wrangler secret put GOSMS_CLIENT_ID       # z app.gosms.eu → API
npx wrangler secret put GOSMS_CLIENT_SECRET   # tamtéž, jde přegenerovat
```

ID kanálu není tajemství a je ve `wrangler.jsonc` jako `GOSMS_KANAL` (dnes `504031`,
najde se v portálu v Kanály → Upravit, je v adrese). Dokud něco chybí, vrátí se
`NO_CREDENTIALS` / `NO_CHANNEL` a je to vidět v Nastavení i v logu — ne ticho.

**Zkouška nanečisto.** `POST /api/sms/test` s `{"nanecisto": true}` (v Lidech tlačítko
*SMS nanečisto*) posílá na `…/api/v1/messages/test`: GoSMS požadavek ověří, ale nic
neodešle a nic to nestojí. Projde i při vypnutém kanálu a do denního stropu se nepočítá —
je to jediný způsob, jak ověřit klíče a kanál, aniž by někomu pípl telefon.

Pozor na doménu: API je na **`app.gosms.eu`**. `app.gosms.cz` jen přesměrovává a POST by
se cestou zvrhl na GET. Token se bere form-encoded, přesně jak GoSMS ukazuje v samoobsluze.
Výpis kanálů přes API neexistuje (`/api/v1/channels` vrací 404), ID se opisuje z portálu.

**Twilio vyžaduje KYC, než pustí první SMS.** Ověřeno 2026-08-06: přihlašovací údaje projdou
(`/api/sms/ucet` vrátí účet a stav `active`), ale odeslání skončí na
*„Primary compliance profile is not approved — complete the KYC process in Trust Hub."*
Je to regulatorní brána na straně Twilia, ne chyba integrace. Řeší se v konzoli:
**Trust Hub → Primary Customer Profile**. Do schválení má smysl nechat `notif_sms` vypnuté,
aby souhrny zbytečně nepadaly.

**Diakritika se odstraňuje.** Háčky přepnou zprávu na UCS-2, kde má segment 70 znaků místo 160,
tedy dvojnásobná cena. „Novak odeslal sebehodnoceni" se vejde do jednoho segmentu.

**Ladění:** `GET /api/sms/ucet` zavolá `Accounts/{SID}.json` a nic neodešle — rozliší špatný
token od špatného SID a vrátí délku tokenu. Auth Token má **32 znaků**; API Key SID má 34
a začíná `SK`, což je nejčastější záměna (stálo to i tady dvě kola).

**Denní strop** (`settings.smsDenniStrop`, výchozí 50) je pojistka proti smyčce, která by
protelefonovala kredit. Počítá se z logu; po vyčerpání se zpráva nepošle a zaloguje se
`preskoceno` s kódem `STROP`.

### Odesílatel v Česku vyžaduje registraci

Ověřeno 2026-08-06 proti pravidlům Twilia pro ČR a potvrzeno chybou `21612` z ostrého pokusu:

> „Sender ID Registration is required in Czech Republic for networks T-Mobile and O2.
> Starting on July 14, 2025, messages with unregistered Sender IDs to these networks
> will be blocked."

Alfanumerický odesílatel (`SMS_ODESILATEL`, výchozí `SKRicmanice`) je sice zdarma a na účtu
povolený, ale **neregistrovaný ho čeští operátoři zahodí**. Nestačí ani povolit Česko
v Geo Permissions — to bylo zapnuté a chyba zůstala stejná.

| Cesta | Cena | Čas | Sdílení mezi projekty |
|---|---|---|---|
| Registrace alfanumerického odesílatele | **30 $/měsíc za jméno** | ~3 týdny | ne — každé jméno vlastní registrace |
| České telefonní číslo (domestic long code) | ~12 $/měsíc | hned | **ano** — jedno číslo pro všechny appky |

**Mezinárodní long code T-Mobile a O2 nepodporují** — musí to být české číslo, ne americké.
Krátká čísla (short codes) v ČR nejdou vůbec.

**Rozhodnutí: `SKRicmanice` nepoužívat.** Značka patří do těla zprávy, ne do odesílatele —
„SK Ricmanice: Novak odeslal sebehodnoceni" stojí pár znaků místo 30 $ měsíčně a příjemce
pozná stejně dobře, o co jde.

**Místo placení paušálu se přešlo na českou bránu GoSMS** (2026-08-07). Registrace i vedení
účtu jsou zdarma, platí se jen odeslané zprávy (od 0,41 Kč), a hlavně: posílá se pod
**systémovým odesílatelem brány**, který u T-Mobile a O2 registrovaný je. Tím padá celý
problém s `21612`, aniž by se cokoli platilo měsíčně. Daň je, že příjemce uvidí jako
odesílatele `GoSMS-info`, ne klub — vlastní jméno u nich stojí aktivaci a měsíční poplatek
a trvá ~30 dní, takže se nepoužívá.

Účet je zatím neověřený a bez kreditu, takže odesílatel je `GoSMS-test` a ostrá SMS
neprojde. Ověření a první dobití kreditu je otevřený krok; zkouška nanečisto funguje i tak.

`SMS_ODESILATEL` zůstává v konfiguraci, ale používá ho **jen Twilio**.

Platí i tady: **do zprávy nikdy nejde obsah hodnocení**, jen „kdo a co".

### Log komunikace (postaveno)

Tabulka `komunikace`: čas, kanál, komu (osoba + adresa), typ (`souhrn` / `obnova` / `test`),
výsledek (`ok` / `chyba` / `preskoceno`) a kód od poskytovatele. Posledních sto záznamů je
vidět v Nastavení, takže „nic mi nepřišlo" nekončí u `wrangler tail`.

**Logují se metadata, ne obsah.** Výjimkou je SMS, kde se ukládá text kvůli počtu segmentů
a sporům o fakturaci — obsah hodnocení v něm stejně nikdy není. **Tokeny a obnovovací odkazy
se nelogují nikdy**: záznam s platným odkazem je reset hesla čekající na zneužití.

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
