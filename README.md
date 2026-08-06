# hodnoceni-hracu

> Hodnotící listy mládežnických fotbalistů SK Říčmanice — radar graf, slovní komentář,
> sebehodnocení hráče a překryv obou pohledů pro rozhovor.

**Běží na:** https://hodnoceni-hracu.bass443.workers.dev

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
| 1 | Statický tiskový generátor | nahrazeno aplikací |
| 2 | D1 + Worker + správa lidí + zadávání hodnocení + tisk z databáze | **nasazeno** |
| 3 | Odkazy + sebehodnocení + porovnání s tolerancí | **nasazeno** |
| 4 | Historie a trendy | šipky u os hotové, plný pohled až s druhým obdobím |

Databáze je prázdná a čeká na kádr. Lidé se zadávají v aplikaci v záložce **Lidé**.

## Stack

Výhradně Cloudflare. Jeden Worker obsluhuje API i statické soubory z `web/`:

```
prohlížeč  ->  Cloudflare Worker (API + statické soubory)  ->  Cloudflare D1 (SQLite)
```

Frontend nikdy nesahá do D1 přímo a veškerá autorizace je ve Workeru. Žádný framework,
žádný bundler, žádný build krok — čisté ES moduly, radar je inline SVG.

## Obrazovky

| Cesta | Kdo | Co |
|---|---|---|
| `/` | trenér (heslo) | Lidé, Hodnotit, Listy, Porovnání, Odkazy, Nastavení |
| `/listy.html` | trenér | tiskové listy A4 sestavené z databáze |
| `/h/<token>` | hráč | sebehodnocení přes jednorázový odkaz |
| `/health` | kdokoliv | `{status, module, timestamp}` |
| `/api/version` | kdokoliv | commit a čas sestavení běžící verze |

V horní liště je čas, commit běžící verze, přepínač **tmavého/světlého** vzhledu a přepínač
**CS/EN**. Volba se pamatuje; jazyk jde vynutit i odkazem: `?lang=en`.

Tištěný list je vždy světlý, i když má aplikace tmavý vzhled — je to papír, ne obrazovka.

## Nasazení a provoz

```powershell
npm install
npm run deploy      # predeploy zapíše commit hash do web/version.json
```

Secrety (`ADMIN_HESLO`, `SESSION_KEY`) jsou uložené jako Worker secrets, ne v repozitáři.
Postup od nuly a změna hesla viz [docs/BUILD.md](docs/BUILD.md) a [docs/RUNBOOK.md](docs/RUNBOOK.md).

Lokální běh (`npm run dev`) je jen pro vývoj; ostrý provoz je v cloudu.

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
hráčů, známky a slovní posudky. V repozitáři samotném žádná osobní data nejsou — kádr se
zadává až v běžící aplikaci.

Vytištěné listy patří hráči. Do rukou jiných hráčů nebo na nástěnku ne.
