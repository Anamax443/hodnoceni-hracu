# known_good — ověřené funkční stavy

Stavy, o kterých je doloženo, že fungovaly. Když se něco rozbije, tohle je bod návratu.
Nový záznam nahoru.

---

## 2026-08-06 (6) — účty po lidech + vlastní obnova hesla

**Commit:** `1c7f3bf` · **Ověřeno proti** https://hodnoceni.maxferit.cz

| Kontrola | Výsledek |
|---|---|
| pozvánka trenérovi z administrace | `Telegram → Maxla: odesláno` |
| nastavení hesla jednorázovým odkazem | 200, `{"nastaveno":true,"login":"maxla"}` |
| přihlášení `maxla` + heslo | 200, session zná `{"jmeno":"Maxla","id":1}` |
| `/api/me` po přihlášení | vrací jméno a id |
| cizí účet (`maso`) stejným heslem | 409 „účet nemá nastavené heslo" — nepustí |
| špatné heslo u existujícího účtu | 401 „Špatné přihlašovací jméno nebo heslo." |
| odkaz podruhé | 410 |
| přechodné společné heslo (prázdný login) | 200, `{"jmeno":null,"id":null}` |
| hash ani sůl v `/api/players` | neposílá se, jen příznak `ma_heslo` |

**Co ověřeno NEBYLO:** doručení e-mailem u účtu bez Telegramu (Julek, Maso zatím nemají
ani jeden kanál).

---

## 2026-08-06 (5) — souhrnné notifikace

**Commit:** `de6e038` · 13 testů proti nasazené aplikaci, **0 chyb**

| Kontrola | Výsledek |
|---|---|
| Telegram `getMe` | bot `@skricmanice_bot` odpovídá |
| binding EMAIL | zapojený |
| uložení hodnocení → událost | +1 |
| sebehodnocení hráče → událost | +1 |
| ruční rozeslání souhrnu | `Telegram → Maxla: odesláno`, uživatel potvrdil doručení |
| po odeslání nic nečeká | 0 |
| souhrn i bez změn (liveness) | odesláno |
| uložení intervalů (3 / 14 dní) a vypínače | sedí |

**Cron:** slot uvolněn vypnutím denního běhu `pojistky-watch`; deploy hlásí `schedule: 0 * * * *`.
Stav v Nastavení ukazuje pražskou hodinu (Worker 10, PC 10:39 při UTC 08:39) — časová zóna sedí.

**Co ověřeno NEBYLO:** skutečné spuštění cronem v 19:00 (od nasazení neuplynulo).

---

## 2026-08-06 (4) — N pozic + šablona os na hodnocení

**Commit:** `c4926ba` · 25 testů proti nasazené aplikaci, **0 chyb**

| Kontrola | Výsledek |
|---|---|
| tři pozice u jednoho hráče | uloženo, vrací se jako pole |
| neznámá pozice | 400 |
| hodnocení brankářskou i polní šablonou v jednom období | obojí 201 |
| polní osy do brankářské šablony | 400 |
| jeden hráč → dva listy, každý svou šablonou | 2 listy, 2 různé šablony |
| token nese šablonu, `/api/self` vrací její osy | `brankar` → `chytani` |
| porovnání v rámci šablony | hotovo, rozdíly sedí |
| hráč vyplnil jinou šablonou | `jinaSablona: true`, ne „ještě nevyplnil" |
| `/api/trend` | 200 (dřív padal — chybějící `.bind`) |

---

## 2026-08-06 (3) — NASAZENO: Cloudflare Worker + D1, frontpage CS/EN + vzhled + verze

**Commit:** `5c1d62e58f3c4dfa218b7659d9a2bba26fb847fd`
**Adresa:** https://hodnoceni-hracu.bass443.workers.dev
**Prostředí:** Cloudflare Worker, D1 `hodnoceni-hracu` (EEUR, `8fe85587-7409-4b95-83f3-d23f340aa2ad`),
wrangler 4.119.0.

### Co bylo ověřeno — proti běžící produkci, ne lokálně

**48 API testů, 0 chyb.** Stejná sada jako u předchozího záznamu, spuštěná proti nasazené
aplikaci přes HTTPS. Nad rámec minula ověřeno:

| Kontrola | Výsledek |
|---|---|
| session cookie přes HTTPS | `HttpOnly` + `SameSite=Lax` + **`Secure`** |
| `/api/self` vrací jen klíče os, ne texty | ANO (`osy: ['prava', …]`) |
| `/api/listy` vrací `porovnaniRezim`, ne hotový popisek | ANO |
| znaménko rozdílu a `pocetResit` | +3 u levé nohy, 1 osa k řešení |
| `/health`, `/api/version` | odpovídají, `cisto: true` |

**Tiskové listy z ostrých dat, česky i anglicky** (Node, `web/src/list.js`, data z živého API) —
0 chyb: jedna stránka a jeden graf na hráče, správný počet polygonů, přeložený nadpis, bloky,
kotvy škály i legenda, **žádná šipka trendu na listu hráče**, **žádné jméno jiného hráče**,
escapovaný ampersand z komentáře trenéra.

**Headless prohlížeč proti živé adrese:**

| Stránka | Výsledek |
|---|---|
| `/?lang=cs` | Hodnocení hráčů · Heslo · Přihlásit · záložky Lidé/Hodnotit/Listy/Porovnání/Odkazy/Nastavení |
| `/?lang=en` | Player evaluation · Password · Sign in · People/Evaluate/Sheets/Comparison/Links/Settings |
| horní lišta | čas `6. 8. 07:44:03`, `verze 2a88150`, tlačítka vzhledu a jazyka, `data-theme="light"`, `<html lang>` se mění |
| `/h/<token>?lang=cs` | „Ahoj Vzorák", 6 os / 60 tlačítek, „Chytání a zákroky", věta v 1. osobě, otevřená otázka |
| `/h/<token>?lang=en` | „Hi Vzorák", „Shot stopping", „I stop the shot and hold on to the ball.", „What do you want to work on?" |
| oba jazyky `/h/` | **nic z hodnocení trenéra**, žádná chybová hláška |

**Chyba nalezená a opravená při ověřování:** `/api/version` se držel na edge (`cf-cache-status: HIT`)
a po nasazení ještě chvíli hlásil předchozí commit — tedy přesně to, proti čemu ta lišta je.
Opraveno `cache-control: no-store`; po opravě lišta ukazuje `5c1d62e` hned po nasazení.

**Stav databáze po ověření:** testovací data smazána, `players` / `evaluations` / `tokens`
prázdné, `tolerance = 2`. Aplikace čeká na reálný kádr.

### Co ověřeno NEBYLO

- **Proklikání admin obrazovek člověkem** — API, vykreslování listů a obě jazykové mutace
  ověřeny automaticky, ale záložky Lidé, Hodnotit, Porovnání, Odkazy a Nastavení nikdo
  neproklikal myší.
- **Fyzický tisk na papír** — zalomení stránek na reálné tiskárně a grafika na pozadí.
- **Druhé období** — trend se šipkami je naprogramovaný, na reálných datech nevyzkoušený.
- **Vlastní doména** pod maxferit.cz — zatím jen `*.workers.dev`.

---

## 2026-08-06 (2) — aplikace nad D1, fáze 2 + 3 (lokálně)

**Commit:** `1bb0f44e970a8fad430ed4c717b99e01caeb9791`
**Prostředí:** `npm run dev` (wrangler 4.119.0, Node v24.13.1), lokální D1, Windows 11.

### Co bylo ověřeno

**45 API testů** proti běžícímu Workeru — všechny prošly. Pokrývají:

| Oblast | Ověřeno |
|---|---|
| Autorizace | admin endpoint bez session = 401; špatné heslo = 401; správné = 200 + cookie `HttpOnly; SameSite=Lax` |
| Validace na serveru | hodnota 11 = 400; chybějící osy = 400; hodnota 0 i na veřejném endpointu = 400; tolerance 99 = 400 |
| Role | pokus uložit hodnocení osobě s rolí `trener` = 400 |
| Tokeny | 43 znaků, není to ID hráče; neplatný token = 404; druhé odeslání = 409 |
| **§7.1 zaměněné pořadí** | `GET /api/self/<token>` nevrací nic z hodnocení trenéra (kontrola na `fyzicky`, `hodnoty` i na konkrétní texty) |
| **§7.3 tolerance** | rozdíl +2 při toleranci 2 se neřeší; +3 se řeší a hlásí „slepé místo"; po zvýšení tolerance na 3 se stejná osa přestane řešit |
| Append-only | druhé uložení nepřepsalo první (3 záznamy), list bere nejnovější hodnotu |
| Přehled | `ma_trener` / `ma_hrac` sedí, trenéři v přehledu hráčů nefigurují |
| Tiskové listy | režim `hrac` dá překryv sebehodnocením, `zadne` žádný, `ids=vse` vrátí všechny aktivní |

**Vykreslení listů z ostrých dat** (Node, modul `web/src/list.js`, data z běžícího API):

| Kontrola | Výsledek |
|---|---|
| jeden hráč = jedna stránka, jeden graf | ANO (oba hráči) |
| 5 mřížka + hodnocení + překryv = 7 polygonů | ANO |
| jméno, klub, kotvy škály na listu | ANO |
| **žádná šipka trendu na listu hráče** (§7.5) | ANO |
| **žádné jméno jiného hráče na listu** | ANO |
| ampersand z komentáře trenéra escapovaný | ANO (`&amp;`) |

**Headless prohlížeč** (Edge `--dump-dom`):

| Stránka | Výsledek |
|---|---|
| `/` | přihlašovací obrazovka se vykreslí, ES moduly se načtou, záložky včetně Listy |
| `/h/<token>` | jméno hráče, 6 os, 6× stupnice = 60 tlačítek, věty v první osobě, kotvy, otevřená otázka; **nic z hodnocení trenéra** |
| `/listy.html` bez session | čitelná hláška „Nejsi přihlášený. Otevři aplikaci a přihlas se." |
| syntaxe všech ES modulů (`node --check`) | 6/6 OK |

**Chyba nalezená a opravená při ověřování:** asset server přesměrovával `/h.html` na `/h`,
token sebehodnocení mizel z adresy a hráč viděl „Neplatný odkaz". Opraveno
`html_handling: "none"` + mapování cest ve Workeru; po opravě `/h/<token>` vrací 200 bez
přesměrování.

### Co ověřeno NEBYLO

- **Nasazení na Cloudflare** — aplikace zatím běžela jen lokálně (`npm run dev`).
  Produkční D1, secrety a doména jsou nezkoušené.
- **Proklikání admin obrazovek** — API a vykreslování ověřeny zvlášť, ale záložky Lidé,
  Hodnotit, Porovnání, Odkazy a Nastavení nikdo neproklikal v prohlížeči.
- **Fyzický tisk na papír** — zalomení stránek na reálné tiskárně a grafika na pozadí.
- **Druhé období** — trend se šipkami je naprogramovaný, ale bez druhého období ho nešlo
  vyzkoušet na reálných datech.

---

## 2026-08-06 (1) — fáze 1, tiskové listy z lokálního souboru

**Commit:** `6faaf785badc04a72a91fdbc8d5974528fb29b79`

**Co bylo ověřeno:** `frontend/tisk.html` se vykreslil z `frontend/data/kadr.js`
(2 vzoroví hráči — jeden v poli, jeden brankář), headless Edge `--dump-dom`.

| Kontrola | Očekáváno | Naměřeno |
|---|---|---|
| stav | `Listů k tisku: 2` | `Listů k tisku: 2` |
| `class="page"` | 2 | 2 |
| `<svg` | 2 | 2 |
| `<polygon` | 14 | 14 |
| jména s českými uvozovkami | ano | `Vzorový Jan „Vzorek“` |

Tenhle stav byl nahrazen aplikací (viz HANDOFF). Kód offline generátoru už v repu není,
dostupný je v historii u tohoto commitu.

---

## Šablona pro další záznam

```
## RRRR-MM-DD — co

**Commit:** <hash>
**Co bylo ověřeno:**
**Jak:**
**Naměřeno:**
**Co ověřeno NEBYLO:**
```
