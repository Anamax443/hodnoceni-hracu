# Zadání projektu: hodnoceni-hracu

> Podklad pro vytvoření nového repozitáře. Určeno k předání AI asistentovi jako vstupní specifikace.
> Autor zadání: Milan Trnka + Claude
> Datum: srpen 2026

---

## 1. Účel

Webová aplikace pro **hodnocení mládežnických fotbalových hráčů** v SK Říčmanice.

Trenér hodnotí každého hráče 2× za sezónu na pevné škále. Hráč vyplňuje **sebehodnocení** stejných parametrů přes soukromý odkaz. Výstupem je tištěný list formátu A4 (jeden hráč = jedna strana) s radar grafem a slovním komentářem, plus interní pohled trenéra na vývoj v čase a na rozdíly mezi hodnocením trenéra a hráče.

**Proč to stavíme:** hráči nemají zpětnou vazbu v čitelné podobě a trenér nemá záznam vývoje. Rozdíl mezi sebehodnocením a hodnocením trenéra je hlavní diagnostická hodnota celého nástroje — ukazuje, kde hráč o sobě neví.

---

## 2. Scope

### Ve scope (fáze 1–3)

- správa hráčů (jméno, přezdívka, post, šablona, aktivní/neaktivní)
- zadání hodnocení trenérem, ukládané s datem
- generování tiskového listu A4 pro jednoho i pro celý kádr
- sebehodnocení hráče přes tokenový odkaz
- porovnání trenér vs. hráč s nastavitelnou tolerancí
- pohled na vývoj hráče v čase (admin only)

### Mimo scope

- statistiky ze zápasů, docházka, MVP hlasování (řeší jiná aplikace)
- účty a hesla pro hráče (přístup je pouze přes jednorázový token)
- mobilní nativní aplikace
- víceklubovost / multi-tenant
- e-mailové rozesílání odkazů (odkazy se kopírují ručně)

### Známé limitace

- hodnocení je subjektivní, hodnotí jediný člověk; data nejsou srovnatelná s jiným klubem
- tvary grafů nejsou porovnatelné mezi hráči navzájem (levák vs. pravák)
- token v odkazu = kdo odkaz získá, může vyplnit sebehodnocení za hráče
- free tier Cloudflare není produkční SLA (pro tento účel dostačuje)

---

## 3. Stack a architektura

Výhradně Cloudflare. Nový samostatný projekt, **nesdílí kód ani databázi s aplikací sk-ricmanice-taktika**.

```
Cloudflare Pages (frontend, statický build)
      |
      v
Cloudflare Worker (API, veškerá logika a autorizace)
      |
      v
Cloudflare D1 (SQLite)
```

Pravidla:

- frontend **nikdy** nesahá do D1 přímo, jen přes Worker
- veškerá autorizace se děje ve Workeru, ne v prohlížeči
- Worker má `GET /health` vracející `{status, module, timestamp}`

**Otevřené rozhodnutí (nutno potvrdit před startem):** čím je nahrazena dosavadní Supabase Auth pro admin přístup. Nejjednodušší varianta = jedno admin heslo jako Worker secret + podepsaná session cookie. Cloudflare Access je robustnější, ale svazuje projekt s účtem. **Nevymýšlet — potvrdit se zadavatelem.**

---

## 4. Datový model (D1)

### Zásada: append-only

Hodnocení se **nikdy nepřepisuje**. Každé uložení je nový řádek s datem. Historie vzniká sama, žádná zvláštní tabulka pro verzování není potřeba.

```sql
-- 001_init.sql

CREATE TABLE players (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  jmeno        TEXT NOT NULL,
  prezdivka    TEXT,
  post         TEXT,
  sablona      TEXT NOT NULL DEFAULT 'pole',  -- 'pole' | 'brankar'
  aktivni      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE evaluations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id    INTEGER NOT NULL REFERENCES players(id),
  datum        TEXT NOT NULL DEFAULT (datetime('now')),
  obdobi       TEXT NOT NULL,               -- napr. '2025/2026 zima'
  autor        TEXT NOT NULL,               -- 'trener' | 'hrac'
  sablona      TEXT NOT NULL,               -- kopie sablony v dobe hodnoceni
  hodnoty      TEXT NOT NULL,               -- JSON: {"prava":7,"leva":4,...}
  fyzicky      TEXT,                        -- pouze autor='trener'
  hlavou       TEXT,
  parta        TEXT,
  cile         TEXT,                        -- JSON pole retezcu
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_eval_player ON evaluations(player_id, obdobi);

CREATE TABLE tokens (
  token        TEXT PRIMARY KEY,            -- nahodny, min. 32 znaku
  player_id    INTEGER NOT NULL REFERENCES players(id),
  obdobi       TEXT NOT NULL,
  pouzit       INTEGER NOT NULL DEFAULT 0,
  platny_do    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  klic         TEXT PRIMARY KEY,
  hodnota      TEXT NOT NULL
);
-- seed: ('tolerance', '2')
```

### Proč `hodnoty` jako JSON, ne sloupce

Přidání sedmé osy pak znamená přidání klíče, ne migraci schématu. Stará hodnocení zůstanou platná a vykreslí se šablonou, se kterou byla pořízena (proto je `sablona` kopírovaná do řádku hodnocení).

---

## 5. Šablony os

Definované v kódu (`src/sablony.js`), sdílené frontendem i Workerem.

**Šablona `pole`** (hráč v poli, 6 os):
`prava` Technika pravá noha · `leva` Technika levá noha · `hlavicky` Hlavičkování · `prihravka` Přihrávka a první dotek · `braneni` Bránění 1v1 · `skenovani` Skenování a poziční hra

**Šablona `brankar`** (6 os):
`chytani` Chytání a zákroky · `misto` Výběr místa a postavení · `nohama` Hra nohama (rozehrávka) · `vykopy` Výkopy a dlouhá rozehrávka · `mimo` Hra mimo bránu a centry · `organizace` Organizace a komunikace

**Škála 1–10 s pevnými kotvami** (zobrazuje se na listu i ve formuláři):

| Rozsah | Význam |
|--------|--------|
| 1–3 | začínám, jen v klidu bez tlaku |
| 4–5 | umím na tréninku, v zápase kolísá |
| 6–7 | spolehlivé i v zápase |
| 8–9 | silná stránka, opora týmu |
| 10 | nadstandard pro kategorii |

Kondice a rychlost **nejsou** mezi osami záměrně — u této věkové kategorie měří biologický věk, ne odvedenou práci. Patří do slovního bloku *Fyzicky*.

> **Změněno 9. 8. 2026 rozhodnutím zadavatele:** fyzická kondice se známkuje jako **sedmá osa u všech šablon**. Důvod výše tím nezaniká — kondice u téhle kategorie měří i biologický věk — a proto u ní slovní blok *Fyzicky* zůstává důležitější než jinde. Rychlost mezi osami dál není.
>
> Původní odstavec se nepřepisuje. Zadání je historický dokument a je poctivější ukázat vedle sebe, co se rozhodlo původně a kdy se to změnilo, než se tvářit, že to tak bylo vždycky.

---

## 6. Radar graf

Vykreslovat jako **inline SVG, bez knihovny**. Referenční implementace včetně geometrie je v `docs/vzor-list.html` (přiložený vzorový soubor) — funkce `bod()`, `polygon()`, `zalom()`, `radar()`. Převzít beze změny.

Požadavky:

- generický pro libovolný počet os (`n = osy.length`), 5 os = pětiúhelník, 6 = šestiúhelník atd.
- 5 soustředných úrovní mřížky
- aktuální hodnocení: modrý výplňový polygon
- porovnávací hodnocení: šedý čárkovaný obrys pod ním
- popisky os vně grafu s hodnotou `x/10`

**Na tištěném listu jsou maximálně dva polygony.** Trenér + hráč (hlavní sdělení), nebo trenér nyní + trenér minule. Tři polygony jsou nečitelné.

---

## 7. Funkční pravidla

Tato pravidla jsou podstatou nástroje, ne detailem UI. Implementovat je přesně.

### 7.0 Jazykový model nesmí sáhnout na data — HLAVNÍ PRAVIDLO

**Z příkazového řádku ani odjinud, kde je v cestě jazykový model, se nesmí nic zapsat,
změnit ani smazat.** Model smí jen číst a navigovat: rozřadit povel, otevřít záložku,
předvybrat hráče, odpovědět na otázku nad daty. Zápis vzniká výhradně z vědomé akce
člověka — kliknutím na tlačítko v příslušném formuláři.

Platí i pro každou budoucí funkci: pokud by nová schopnost znamenala, že model může
uložit hodnocení, vygenerovat odkaz, smazat osobu nebo změnit nastavení, **nesmí se
postavit**. Není to otázka kvality modelu; zápis, který nikdo neodklikl, nejde po půl
roce nikomu vysvětlit — a jde o data nezletilých.

Důsledky v kódu:
- `/api/ai/prikaz` vrací jen `{akce, hraci}` z uzavřeného seznamu akcí (`hodnotit`,
  `porovnat`, `listy`, `odkaz`, `nevim`) — všechny jen přepínají obrazovku,
- `/api/ai/analyza` je čtení: dostane podklady, vrátí větu, nic neukládá,
- žádná odpověď modelu se nesmí stát parametrem `INSERT`, `UPDATE` ani `DELETE`.

### 7.1 Zamčené pořadí

Hráč nesmí vidět hodnocení trenéra dřív, než odešle své sebehodnocení. Kontrola musí být ve Workeru, ne skrytím v UI.

### 7.2 Zadávání naslepo

Při vyplňování formuláře (trenér i hráč) se **nezobrazují předchozí hodnoty**. Porovnání se odhalí až po uložení. Důvod: viditelná loňská hodnota přitáhne novou k sobě a datová řada ztratí vypovídací hodnotu.

### 7.3 Tolerance

Nastavitelná v `settings.tolerance`, výchozí `2`.

- rozdíl v absolutní hodnotě ≤ tolerance → osa se neřeší
- rozdíl > tolerance → osa se označí k osobnímu rozhovoru

Ukládat a zobrazovat **znaménko rozdílu**, ne absolutní hodnotu:
- hráč si dal víc než trenér (+) = slepé místo, chybí zpětná vazba
- hráč si dal míň než trenér (−) = sebedůvěra, může jít o něco mimo fotbal

Pokud toleranci překročí více než 3 osy, aplikace zobrazí upozornění a doporučí vybrat maximálně 2–3 témata k rozhovoru.

### 7.4 Trend

Nepočítat souhrnné číslo ani průměr os. Zobrazovat **šipku u každé osy** (↑ ↓ →) plus souhrn typu „4 osy nahoru, 1 dolů, 1 beze změny".

Pásmo šumu: za změnu se považuje až rozdíl **2 body**. Posun o 1 bod u subjektivního hodnocení není signál.

### 7.5 Rozdělení pohledů

Stejná data, dva výstupy:

| | Trenér (admin) | Hráč (tištěný list / odkaz) |
|---|---|---|
| šipky trendu, „zhoršuje se" | ano | **ne** |
| historie všech období | ano | jen aktuální + předchozí polygon |
| rozdíl trenér vs. hráč | ano, číselně | ano, jako druhý polygon bez hodnocení rozdílu |
| data jiných hráčů | ano | nikdy |

Věta „zhoršil ses" nepatří na papír, který si čtrnáctiletý odnese domů.

---

## 8. Obrazovky

### Veřejná část

- `/h/:token` — sebehodnocení hráče. Zobrazí jméno, 6 posuvníků 1–10 s popisem škály, formulace v první osobě („Přihraju levou nohou na deset metrů tak, jak chci"). Po odeslání poděkování. Token se označí jako použitý, druhé odeslání odmítnout.

### Admin (za přihlášením)

- `/` — přehled hráčů, stav hodnocení za aktuální období (trenér ✓ / hráč ✓)
- `/hrac/:id` — detail: historie hodnocení, radar, šipky trendu, porovnání s hráčem
- `/hrac/:id/hodnotit` — formulář trenéra (6 os + 3 slovní bloky + 2–3 cíle)
- `/tokeny` — generování odkazů pro období, tlačítko „kopírovat odkaz" u každého hráče, možnost zneplatnění
- `/tisk` — tiskový výstup pro vybrané hráče nebo celý kádr, jeden hráč = jedna A4
- `/nastaveni` — tolerance, název období, správa hráčů

---

## 9. API (Worker)

```
GET    /health

GET    /api/players                    admin
POST   /api/players                    admin
PATCH  /api/players/:id                admin

GET    /api/evaluations?player_id=&obdobi=   admin
POST   /api/evaluations                admin   (autor='trener')

POST   /api/tokens                     admin   (vygeneruje pro obdobi)
DELETE /api/tokens/:token              admin

GET    /api/self/:token                verejne (vrati jmeno + sablonu, NIC z hodnoceni trenera)
POST   /api/self/:token                verejne (ulozi autor='hrac', oznaci token pouzit)
```

Bezpečnostní pravidla:

- token generovat kryptograficky (`crypto.getRandomValues`), min. 32 znaků, nikdy ne pořadové ID hráče
- `GET /api/self/:token` nesmí za žádných okolností vrátit hodnocení trenéra ani jiného hráče
- admin endpointy odmítnout bez platné session, ne jen skrýt v UI
- validovat rozsah hodnot 1–10 na serveru

---

## 10. Struktura repozitáře

```
hodnoceni-hracu/
├── frontend/              # Cloudflare Pages
│   ├── src/
│   │   ├── sablony.js     # definice os + kotvy skaly
│   │   ├── radar.js       # vykresleni SVG (prevzato z docs/vzor-list.html)
│   │   └── ...
├── worker/
│   ├── src/index.ts
│   └── wrangler.toml
├── migrations/
│   ├── 001_init.sql
│   └── 002_seed.sql       # 19 hracu SK Ricmanice
├── docs/
│   ├── README.md          # uzivatelska dokumentace
│   ├── TECHNICAL.md       # programatorska dokumentace
│   ├── RUNBOOK.md
│   └── vzor-list.html     # referencni tiskovy vystup
├── known_good.md
└── README.md
```

Dokumentace v `docs/` musí být natolik úplná, aby podle ní šel projekt postavit znovu od nuly.

---

## 11. Fázování

| Fáze | Obsah | Hotovo když |
|------|-------|-------------|
| 1 | Statický tiskový generátor (hotovo, `docs/vzor-list.html`) | vytištěn kádr ručně z JSON |
| 2 | D1 + Worker + admin CRUD + tisk z databáze | trenér zadá hodnocení v aplikaci |
| 3 | Tokeny + sebehodnocení + porovnání | hráč vyplní odkaz, zobrazí se rozdíl |
| 4 | Historie a trendy | druhé období v databázi |

**Fázi 2 nestavět dřív, než je jednou ručně odhodnocen celý kádr.** Teprve pak je jisté, že osy sedí — měnit je později v databázi s historickými záznamy je nepříjemné.

---

## 12. Rozhodnutí a exit criteria

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

---

## 13. Metodický rámec

Struktura hodnocení vychází z **FA Four Corner Model** (anglická FA, autor Craig Simmons): technicko-taktický, fyzický, psychologický a sociální roh.

Adaptace pro tento projekt:
- **technicko-taktický roh → radar graf s čísly** (pozorovatelné, trénovatelné, hráč je ovlivní)
- **zbylé tři rohy → slovní bloky bez čísel** (Fyzicky / Hlavou / V partě)

Povahové vlastnosti se nikdy neznámkují číslem. Hodnotí se proti absolutní laťce kategorie („co má umět starší žák"), ne proti kádru.

---

## 14. Otevřené otázky k potvrzení před startem

1. Čím nahradit Supabase Auth pro admin přístup (Cloudflare Access vs. heslo v secretu)?
2. Vlastní doména, nebo `*.pages.dev`?
3. Mají mít k listu přístup rodiče, nebo jen hráči?
4. Sebehodnocení: jen 6 os, nebo i krátká otevřená otázka („na čem chceš pracovat")?
