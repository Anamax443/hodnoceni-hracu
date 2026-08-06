# hodnoceni-hracu

> Hodnotící listy mládežnických fotbalistů SK Říčmanice — radar graf, slovní komentář,
> sebehodnocení hráče a překryv obou pohledů pro rozhovor.

## Co to dělá

Trenér hodnotí každého hráče 2× za sezónu na pevné škále 1–10. Hráč vyplní **sebehodnocení**
stejných parametrů přes jednorázový odkaz. Výstupem je tištěný list A4 (jeden hráč = jedna
stránka) s radar grafem a slovním komentářem, plus interní pohled trenéra na vývoj v čase
a na rozdíly mezi oběma pohledy.

Hlavní hodnota nástroje je **rozdíl mezi sebehodnocením a hodnocením trenéra** — ukazuje, kde
o sobě hráč neví. Řeší se jen osy, kde je rozdíl větší než nastavená **tolerance**.

Metodicky vychází z **FA Four Corner Model**: technicko-taktický roh se známkuje čísly (radar),
zbylé tři rohy (Fyzicky / Hlavou / V partě) jsou slovní bloky **bez čísel**. Povahové vlastnosti
se nikdy neznámkují.

## Stav

| Fáze | Obsah | Stav |
|------|-------|------|
| 1 | Statický tiskový generátor | hotovo, nahrazeno aplikací |
| 2 | D1 + Worker + správa lidí + zadávání hodnocení + tisk z databáze | **hotovo, ověřeno lokálně** |
| 3 | Odkazy + sebehodnocení + porovnání s tolerancí | **hotovo, ověřeno lokálně** |
| 4 | Historie a trendy | základ hotový (šipky u os), plný pohled až s druhým obdobím |

**Nenasazeno.** Zatím běží jen lokálně (`npm run dev`). K nasazení chybí založit D1 databázi
a secrety — postup v [docs/BUILD.md](docs/BUILD.md).

## Stack

Výhradně Cloudflare. Jeden Worker obsluhuje API i statické soubory z `web/`:

```
prohlížeč  ->  Cloudflare Worker (API + statické soubory)  ->  Cloudflare D1 (SQLite)
```

Frontend nikdy nesahá do D1 přímo a veškerá autorizace je ve Workeru. Žádný framework,
žádný build krok — čisté ES moduly, radar je inline SVG.

## Požadavky

Node.js 22+ a účet Cloudflare (pro nasazení). Pro lokální běh stačí Node.

## Spuštění lokálně

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars    # a vyplň ADMIN_HESLO + SESSION_KEY
npm run db:init:local
npm run db:seed:local
npm run dev
```

Aplikace pak běží na `http://127.0.0.1:8787`.

## Obrazovky

| Cesta | Kdo | Co |
|---|---|---|
| `/` | trenér (heslo) | Lidé, Hodnotit, Listy, Porovnání, Odkazy, Nastavení |
| `/listy.html` | trenér | tiskové listy A4 sestavené z databáze |
| `/h/<token>` | hráč | sebehodnocení přes jednorázový odkaz |
| `/health` | kdokoliv | `{status, module, timestamp}` |

## Konfigurace

Secrety nikdy do gitu. Lokálně `.dev.vars` (je v `.gitignore`), v produkci
`wrangler secret put`:

| Secret | K čemu |
|---|---|
| `ADMIN_HESLO` | přihlášení trenéra |
| `SESSION_KEY` | podpis session cookie (32+ náhodných bajtů) |

## Dokumentace

- [docs/README.md](docs/README.md) — **uživatelská**: jak hodnotit, tisknout a vést rozhovor
- [docs/TECHNICAL.md](docs/TECHNICAL.md) — architektura, datový model, API, funkční pravidla
- [docs/BUILD.md](docs/BUILD.md) — jak postavit a nasadit od nuly (výrobní)
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — provoz: co dělat, když
- [docs/ZADANI.md](docs/ZADANI.md) — původní zadání projektu
- [docs/vzor-list.html](docs/vzor-list.html) — referenční tiskový výstup (zmrazený vzor)
- [HANDOFF.md](HANDOFF.md) — deník stavu
- [known_good.md](known_good.md) — ověřené funkční stavy

## Osobní údaje

**Repozitář je private a musí takový zůstat.** Databáze i zálohy obsahují jména nezletilých
hráčů, známky a slovní posudky. V repu samotném jsou osobní data jen v `migrations/002_seed.sql`.

Vytištěné listy patří hráči. Do rukou jiných hráčů nebo na nástěnku ne.
