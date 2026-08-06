# hodnoceni-hracu

> Hodnotící listy mládežnických fotbalistů SK Říčmanice — radar graf, slovní komentář, jeden hráč = jedna A4.

## Co to dělá

Trenér hodnotí každého hráče 2× za sezónu na pevné škále 1–10. Hráč vyplní **sebehodnocení**
stejných parametrů přes soukromý odkaz. Výstupem je tištěný list A4 s radar grafem a slovním
komentářem, plus interní pohled trenéra na vývoj v čase.

Hlavní hodnota nástroje je **rozdíl mezi sebehodnocením a hodnocením trenéra** — ukazuje, kde
o sobě hráč neví.

Metodicky vychází z **FA Four Corner Model**: technicko-taktický roh se známkuje čísly (radar),
zbylé tři rohy (Fyzicky / Hlavou / V partě) jsou slovní bloky **bez čísel**. Povahové vlastnosti
se nikdy neznámkují.

## Stav

| Fáze | Obsah | Stav |
|------|-------|------|
| 1 | Statický tiskový generátor z lokálního souboru | **hotovo** |
| 2 | D1 + Worker + admin CRUD + tisk z databáze | čeká na ruční odhodnocení celého kádru |
| 3 | Tokeny + sebehodnocení + porovnání | — |
| 4 | Historie a trendy | — |

Fáze 2 se schválně nestaví dřív, než je jednou ručně odhodnocen celý kádr. Teprve pak je jisté,
že osy sedí — měnit je později v databázi s historickými záznamy je nepříjemné.

## Stack

Fáze 1: čisté HTML + CSS + JavaScript, žádná knihovna, žádný build. Radar je inline SVG.

Fáze 2+: Cloudflare Pages (frontend) → Cloudflare Worker (API a veškerá autorizace) → D1 (SQLite).
Frontend nikdy nesahá do D1 přímo.

## Požadavky

Fáze 1: webový prohlížeč. Nic dalšího — žádný Node, žádný server.

## Spuštění

```
frontend/tisk.html
```

Otevřít dvojklikem. Vykreslí listy pro všechny hráče z `frontend/data/kadr.js`
a tlačítkem nahoře je pošle na tiskárnu.

## Konfigurace

Fáze 1 nemá žádná tajemství. Data se editují v jednom souboru: [frontend/data/kadr.js](frontend/data/kadr.js).

## Nasazení

Fáze 1 se nenasazuje, běží z disku. Postup pro fázi 2 viz [docs/BUILD.md](docs/BUILD.md).

## Dokumentace

- [docs/README.md](docs/README.md) — **uživatelská**: jak hodnotit a jak tisknout (pro trenéra)
- [docs/TECHNICAL.md](docs/TECHNICAL.md) — architektura, datový model, API, funkční pravidla
- [docs/BUILD.md](docs/BUILD.md) — jak postavit od nuly (výrobní)
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — provoz: co dělat, když
- [docs/ZADANI.md](docs/ZADANI.md) — původní zadání projektu
- [docs/vzor-list.html](docs/vzor-list.html) — referenční tiskový výstup (zmrazený vzor)
- [HANDOFF.md](HANDOFF.md) — deník stavu
- [known_good.md](known_good.md) — ověřené funkční stavy

## Osobní údaje

**Repozitář je private a musí takový zůstat.** Obsahuje jména nezletilých hráčů
včetně známek a slovních posudků.

Osobní data jsou schválně jen ve dvou souborech — `frontend/data/kadr.js`
a `migrations/002_seed.sql`. Kdyby se repo mělo někdy zveřejnit, stačí vyřadit
tyhle dva soubory; v kódu ani v dokumentaci žádná osobní data nejsou.

Vytištěné listy patří hráči. Do rukou jiných hráčů nebo na nástěnku ne.
