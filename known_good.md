# known_good — ověřené funkční stavy

Stavy, o kterých je doloženo, že fungovaly. Když se něco rozbije, tohle je bod návratu.
Nový záznam nahoru.

---

## 2026-08-06 (2) — aplikace nad D1, fáze 2 + 3

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
