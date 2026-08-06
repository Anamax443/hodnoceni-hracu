# TECHNICAL — architektura a programátorská dokumentace

Nahrazuje `ARCHITECTURE.md` z project-standard (název podle zadání §10).
Uživatelská část je v [README.md](README.md), postup od nuly v [BUILD.md](BUILD.md).

---

## 1. Přehled

| | Fáze 1 (hotovo) | Fáze 2+ (plán) |
|---|---|---|
| Běh | soubor na disku, `file://` | Cloudflare Pages |
| Logika | prohlížeč | Cloudflare Worker |
| Data | `frontend/data/kadr.js` | Cloudflare D1 (SQLite) |
| Autorizace | žádná (lokální soubor) | session cookie ve Workeru |

Cílový tvar:

```
Cloudflare Pages (frontend, statický build)
      |
      v
Cloudflare Worker (API, veškerá logika a autorizace)
      |
      v
Cloudflare D1 (SQLite)
```

Dvě pravidla, která platí od začátku:

- frontend **nikdy** nesahá do D1 přímo, jen přes Worker
- veškerá autorizace se děje ve Workeru, ne v prohlížeči

---

## 2. Struktura repozitáře

```
hodnoceni-hracu/
├── frontend/
│   ├── tisk.html          vstupní bod fáze 1
│   ├── src/
│   │   ├── sablony.js     definice os + kotvy škály (sdílené s Workerem ve fázi 2)
│   │   ├── radar.js       vykreslení SVG (převzato z docs/vzor-list.html)
│   │   ├── list.js        sestavení A4 listu
│   │   └── styl.css       styly včetně @page/@media print
│   └── data/
│       └── kadr.js        JEDINÝ ručně editovaný soubor — kádr + hodnocení
├── migrations/
│   ├── 001_init.sql       schéma D1 (aplikuje se až ve fázi 2)
│   └── 002_seed.sql       kádr
├── docs/
│   ├── README.md          uživatelská (trenér)
│   ├── TECHNICAL.md       tenhle soubor
│   ├── BUILD.md           výrobní — jak postavit od nuly
│   ├── RUNBOOK.md         provoz
│   ├── ZADANI.md          původní zadání
│   └── vzor-list.html     referenční tiskový výstup (zmrazený)
├── known_good.md          ověřené funkční stavy
└── HANDOFF.md             deník
```

`worker/` vznikne až ve fázi 2. Prázdná složka do gitu nepatří.

---

## 3. Fáze 1 — jak to funguje

`tisk.html` načte v pevném pořadí čtyři skripty a zavolá `vykresli()`:

```
src/sablony.js   ->  SABLONY, KOTVY, MAX, KRUHY
src/radar.js     ->  bod(), polygon(), zalom(), radar()
src/list.js      ->  esc(), list(), vykresli()
data/kadr.js     ->  NASTAVENI, HRACI
```

**Proč klasické `<script>` a ne ES moduly:** stránka se musí otevřít dvojklikem z disku.
Moduly přes `file://` blokuje CORS, JSON přes `fetch()` taky. Klasické skripty fungují a data
jsou proto v `.js` souboru, ne v `.json`. `const` na nejvyšší úrovni klasického skriptu je
viditelný z ostatních klasických skriptů, takže žádné globální přiřazování není potřeba.

**Převod na fázi 2:** k deklaracím v `sablony.js` a `radar.js` se doplní `export`, nic jiného
se nemění. Tyhle dva soubory pak sdílí frontend i Worker.

Chyby v datech (chybějící čárka, neznámá šablona) chytá `try/catch` v `tisk.html` a vypíše je
červeně nahoře na stránce. Trenér musí poznat, co má opravit, aniž by otevíral konzoli.

### Escapování

`list.js` prohání všechny hodnoty z dat přes `esc()`. Data píše sám trenér, ale `&` nebo `<`
v komentáři by rozbily HTML. Jediná odchylka od `docs/vzor-list.html`, kde escapování není.

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

**Na jednom listu jsou maximálně dva polygony.** Buď trenér + hráč (hlavní sdělení fáze 3),
nebo trenér nyní + trenér minule. Tři jsou nečitelné.

Když se geometrie změní tady, musí se změnit i v `docs/vzor-list.html` — jinak přestane být
referenční.

---

## 5. Šablony os

Definované v `frontend/src/sablony.js`, sdílené frontendem i (ve fázi 2) Workerem.

**`pole`** — hráč v poli, 6 os:
`prava` Technika pravá noha · `leva` Technika levá noha · `hlavicky` Hlavičkování ·
`prihravka` Přihrávka a první dotek · `braneni` Bránění 1v1 · `skenovani` Skenování a poziční hra

**`brankar`** — 6 os:
`chytani` Chytání a zákroky · `misto` Výběr místa a postavení · `nohama` Hra nohama (rozehrávka) ·
`vykopy` Výkopy a dlouhá rozehrávka · `mimo` Hra mimo bránu a centry · `organizace` Organizace a komunikace

Škála 1–10 s pevnými kotvami (`KOTVY`) se tiskne na list a ve fázi 3 se zobrazí i ve formuláři
hráče. Kondice a rychlost mezi osami schválně nejsou — u téhle kategorie měří biologický věk.

**Šablonu neměnit uprostřed sezóny.** Jiný počet vrcholů = jiný tvar polygonu a hodnocení už
nejde porovnat s předchozím obdobím.

---

## 6. Datový model (D1)

Viz `migrations/001_init.sql`. Tabulky: `players`, `evaluations`, `tokens`, `settings`.

### Append-only

Hodnocení se **nikdy nepřepisuje**. Každé uložení je nový řádek s datem. Historie vzniká sama,
zvláštní tabulka pro verzování není potřeba.

### Proč `hodnoty` jako JSON, ne sloupce

Přidání sedmé osy pak znamená přidání klíče, ne migraci schématu. Stará hodnocení zůstanou
platná a vykreslí se šablonou, se kterou byla pořízena — proto je `sablona` kopírovaná do řádku
hodnocení.

---

## 7. Funkční pravidla

Podstata nástroje, ne detail UI. Ve fázi 2/3 implementovat přesně.

**7.1 Zaměněné pořadí.** Hráč nesmí vidět hodnocení trenéra dřív, než odešle své sebehodnocení.
Kontrola musí být ve Workeru, ne skrytím v UI.

**7.2 Zadávání naslepo.** Při vyplňování formuláře (trenér i hráč) se nezobrazují předchozí
hodnoty. Porovnání se odhalí až po uložení. Viditelná loňská hodnota přitáhne novou k sobě
a datová řada ztratí vypovídací hodnotu.

**7.3 Tolerance.** Nastavitelná v `settings.tolerance`, výchozí `2`.
Rozdíl ≤ tolerance → osa se neřeší. Rozdíl > tolerance → osa se označí k osobnímu rozhovoru.
Ukládat a zobrazovat **znaménko** rozdílu, ne absolutní hodnotu:

- hráč si dal víc než trenér (+) = slepé místo, chybí zpětná vazba
- hráč si dal míň než trenér (−) = sebedůvěra, může jít o něco mimo fotbal

Když toleranci překročí víc než 3 osy, zobrazit upozornění a doporučit vybrat maximálně
2–3 témata k rozhovoru.

**7.4 Trend.** Nepočítat souhrnné číslo ani průměr os. Šipka u každé osy (↑ ↓ →) plus souhrn
typu „4 osy nahoru, 1 dolů, 1 beze změny". Pásmo šumu: za změnu se považuje až rozdíl 2 body.

**7.5 Rozdělení pohledů.** Stejná data, dva výstupy:

| | Trenér (admin) | Hráč (tištěný list / odkaz) |
|---|---|---|
| šipky trendu, „zhoršuje se" | ano | **ne** |
| historie všech období | ano | jen aktuální + předchozí polygon |
| rozdíl trenér vs. hráč | ano, číselně | ano, jako druhý polygon bez hodnocení rozdílu |
| data jiných hráčů | ano | nikdy |

Věta „zhoršil ses" nepatří na papír, který si čtrnáctiletý odnese domů.

---

## 8. API (Worker) — fáze 2/3

```
GET    /health                               {status, module, timestamp}

GET    /api/players                          admin
POST   /api/players                          admin
PATCH  /api/players/:id                      admin

GET    /api/evaluations?player_id=&obdobi=   admin
POST   /api/evaluations                      admin   (autor='trener')

POST   /api/tokens                           admin   (vygeneruje pro obdobi)
DELETE /api/tokens/:token                    admin

GET    /api/self/:token                      verejne (vrati jmeno + sablonu, NIC z hodnoceni trenera)
POST   /api/self/:token                      verejne (ulozi autor='hrac', oznaci token pouzit)
```

Bezpečnostní pravidla:

- token generovat kryptograficky (`crypto.getRandomValues`), min. 32 znaků, nikdy ne pořadové
  ID hráče
- `GET /api/self/:token` nesmí za žádných okolností vrátit hodnocení trenéra ani jiného hráče
- admin endpointy odmítnout bez platné session, ne jen skrýt v UI
- validovat rozsah hodnot 1–10 na serveru
- token v odkazu = kdo odkaz získá, může vyplnit sebehodnocení za hráče. Známá a přijatá
  limitace pro 19 hráčů 2× ročně.

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
- vic nez jeden clovek s admin pristupem
- pozadavek na MFA nebo audit log prihlaseni
Následující krok: Cloudflare Access pred /admin cestami
```

```
Rozhodnutí: data fáze 1 v .js souboru, ne .json
Důvod: stranka se musi otevrit dvojklikem z disku; fetch a moduly pres file:// blokuje CORS
Platí pro fázi: 1
Exit criteria:
- prechod na fazi 2 (data jdou z D1)
Následující krok: bez nahrady, soubor zanikne
```

---

## 10. Otevřené otázky

Zbývají z §14 zadání, řešit před fází 3:

1. Mají mít k listu přístup rodiče, nebo jen hráči?
2. Sebehodnocení: jen 6 os, nebo i krátká otevřená otázka („na čem chceš pracovat")?

Rozhodnuto 2026-08-06:

- admin auth = heslo v secretu + podepsaná session cookie (§14/1)
- doména = nakonec vlastní pod `maxferit.cz`, do té doby `*.pages.dev` (§14/2)
- osobní data (jména i posudky) zůstávají v repu → **repozitář musí zůstat private**

---

## 11. Mimo scope

Statistiky ze zápasů, docházka a MVP hlasování řeší jiná aplikace
(`sk-ricmanice-taktika`). Tenhle projekt s ní **nesdílí kód ani databázi**.

Dál mimo scope: účty a hesla pro hráče, nativní mobilní aplikace, víceklubovost,
e-mailové rozesílání odkazů.
