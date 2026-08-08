# hodnoceni-hracu

> Hodnotící listy mládežnických fotbalistů SK Říčmanice — radar graf, slovní komentář,
> sebehodnocení hráče a překryv obou pohledů pro rozhovor.

**Běží na:** https://hodnoceni.maxferit.cz
(záložní adresa `https://hodnoceni-hracu.bass443.workers.dev` zůstává funkční)

## Co to dělá

Trenér hodnotí každého hráče 2× za sezónu na pevné škále 1–10. Hráč vyplní **sebehodnocení**
stejných parametrů přes jednorázový odkaz. Výstupem je tištěný list A4 (jedna šestice os =
jedna stránka) s radar grafem a slovním komentářem, plus interní pohled trenéra na vývoj
v čase a na rozdíly mezi oběma pohledy.

Hráč může mít **víc šablon** — kdo chytá, hraje v poli i vede mužstvo, má všechny tři.
Každá je vlastní řada s vlastním listem; sloučit je do jednoho grafu nejde (jiných šest os
má jiný tvar), ale vytisknout vedle sebe na jednu stránku ano.

Hlavní hodnota nástroje je **rozdíl mezi sebehodnocením a hodnocením trenéra** — ukazuje, kde
o sobě hráč neví. Řeší se jen osy, kde je rozdíl větší než nastavená **tolerance**.

Metodicky vychází z **FA Four Corner Model**: technicko-taktický roh se známkuje čísly (radar),
zbylé tři rohy (Fyzicky / Hlavou / V partě) jsou slovní bloky **bez čísel**. Povahové vlastnosti
se nikdy neznámkují.

## Co umí

| | |
|---|---|
| **Lidé** | kádr a trenéři; u hráče **N pozic** a **N šablon** (brankář i hráč v poli i leader), u trenéra účet a notifikační kanály; klik na jméno otevře úpravu |
| **Hodnotit** | 6 os po 1–10, tři slovní bloky, 2–3 cíle; **šestice os se vybírá u hodnocení**, hromadné hodnocení víc hráčů naráz |
| **Úprava hodnocení** | starší hodnocení se načte, opraví a uloží jako **nová verze** — nic se nepřepisuje |
| **Shoda** | matice osa × trenér, uzavření finálního znění pro list; povinný trenér nevidí cizí čísla, dokud neodevzdá |
| **Listy** | tiskové A4 z databáze, list na každou šablonu, volitelně **kumulovaný list** (všechny šablony hráče na jedné stránce), druhý polygon volitelně; **každá šablona má svou barvu a název v hlavičce** |
| **Porovnání** | rozdíly trenér vs. hráč se znaménkem a tolerancí, srovnání hráčů mezi sebou, vývoj v čase, historie verzí |
| **Odkazy** | jednorázové odkazy na sebehodnocení; odkaz nese jednu šestici os, takže hráč s víc šablonami dostane odkaz na každou |
| **Nastavení** | tolerance, období, hlavička listu, změna hesla, souhrnné notifikace, jazykový model |
| **Notifikace** | souhrn na Telegram, e-mail a SMS; zvlášť interval „když se něco děje" a „když se nic neděje" |
| **Příkazový řádek** | „Robin" → Hodnotit / Porovnat / Listy; rozřazení dělá prohlížeč, model až na zapeklité věty |

Účty jsou **po lidech**: každý trenér má přihlašovací jméno a vlastní heslo, obnova chodí
na jeho vlastní kanál.

V horní liště je čas, commit běžící verze, přepínač **tmavého/světlého** vzhledu a přepínač
**CS/EN**. Volba se pamatuje; jazyk jde vynutit i odkazem `?lang=en`.

Tištěný list je vždy světlý, i když má aplikace tmavý vzhled — je to papír, ne obrazovka.

## Stav

| Fáze | Obsah | Stav |
|------|-------|------|
| 1 | Statický tiskový generátor | nahrazeno aplikací |
| 2 | D1 + Worker + správa lidí + zadávání hodnocení + tisk z databáze | **nasazeno** |
| 3 | Odkazy + sebehodnocení + porovnání s tolerancí | **nasazeno** |
| 4 | Historie a trendy | šipky u os hotové, plný pohled až s druhým obdobím |

Nad rámec zadání: účty po lidech, obnova hesla, souhrnné notifikace i SMS, vlastní doména,
CS/EN, tmavý vzhled, shoda mezi trenéry, hromadné hodnocení, úprava hodnocení jako nová
verze, víc šablon u hráče s kumulovaným listem, příkazový řádek s přepínatelným jazykovým
modelem.

**Kádr je nahraný** (19 hráčů + 3 trenéři), hodnocení zatím žádné. Co přesně běží,
co je ověřené a co chybí, je v [docs/STATUS.md](docs/STATUS.md).

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
| `/` | trenér (jméno nebo e-mail + heslo) | příkazový řádek + Lidé, Hodnotit, Shoda, Listy, Porovnání, Odkazy, Nastavení, 📖 Dokumentace |
| `/listy.html` | trenér | tiskové listy A4 sestavené z databáze |
| `/h/<token>` | hráč | sebehodnocení přes jednorázový odkaz |
| `/obnova/<token>` | trenér | nastavení nového hesla za jednorázovým odkazem |
| `/health` | kdokoliv | `{status, module, timestamp}` |
| `/api/version` | kdokoliv | commit a čas sestavení běžící verze |

## Nasazení a provoz

```powershell
npm install
npm run deploy      # predeploy zapíše commit hash do web/version.json
```

Secrety jsou Worker secrets, ne součást repozitáře. Postup od nuly viz
[docs/BUILD.md](docs/BUILD.md), běžný provoz [docs/RUNBOOK.md](docs/RUNBOOK.md).

Lokální běh (`npm run dev`) je jen pro vývoj; ostrý provoz je v cloudu.

## Dokumentace

- [docs/STATUS.md](docs/STATUS.md) — **kde to stojí**: co běží, co je ověřené, co chybí
- [docs/README.md](docs/README.md) — **uživatelská**: jak hodnotit, tisknout a vést rozhovor
- [docs/TECHNICAL.md](docs/TECHNICAL.md) — architektura, datový model, API, funkční pravidla, backlog
- [docs/BUILD.md](docs/BUILD.md) — jak postavit a nasadit od nuly (výrobní)
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — provoz: co dělat, když
- [docs/ZADANI.md](docs/ZADANI.md) — původní zadání projektu
- [docs/vzor-list.html](docs/vzor-list.html) — referenční tiskový výstup (zmrazený vzor)
- [HANDOFF.md](HANDOFF.md) — deník stavu
- [known_good.md](known_good.md) — ověřené funkční stavy, bod návratu

Anglicky: [docs/STATUS.en.md](docs/STATUS.en.md) a [docs/README.en.md](docs/README.en.md).
Uživatelská dokumentace je i **uvnitř aplikace** (záložka 📖) v obou jazycích — ta se
aktualizuje jako první, protože ji trenér čte tam, kde pracuje. Technické dokumenty
(TECHNICAL, BUILD, RUNBOOK) jsou provozní a zůstávají česky.

## Osobní údaje

**Repozitář je private a musí takový zůstat.** Databáze i zálohy obsahují jména nezletilých
hráčů, známky a slovní posudky. V repozitáři samotném žádná osobní data nejsou — kádr se
zadává až v běžící aplikaci.

Notifikace nesou jen „kdo a co", nikdy obsah hodnocení. Vytištěné listy patří hráči.
Do rukou jiných hráčů nebo na nástěnku ne.
