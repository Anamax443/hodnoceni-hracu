# known_good — ověřené funkční stavy

Stavy, o kterých je doloženo, že fungovaly. Když se něco rozbije, tohle je bod návratu.
Nový záznam nahoru.

---

## 2026-08-09 (22) — SMS ověřená naostro, hlavička zpráv, sbalený log

**Commit:** `5452411` · **NASAZENO** 2026-08-09, Version ID `1e5d8abc-be15-496b-8528-7c5813521006`.

**Ostrá SMS prošla.** Doklad z tabulky `komunikace` v ostré databázi (časy UTC):

| Čas | Platforma | Číslo | Typ | Výsledek | Kód |
|---|---|---|---|---|---|
| 2026-08-09 09:37:55 | `gosms (nanečisto)` | +420 604577765 | test | **ok** | `nanecisto` |
| 2026-08-09 09:38:02 | `gosms` | +420 604577765 | test | **ok** | `ok` |
| 2026-08-06 17:32:12 | — | +420604577765 | test | chyba | `400` |

Poslední řádek je stav před dobitím kreditu. Uživatel potvrdil doručení na telefon.
Text v logu u obou úspěšných záznamů: `SK RICMANICE: zkusebni zprava z aplikace
Hodnoceni hracu.` — souhlasí doslova s tím, co skládá kód.

**Skládání zpráv a segmenty** (spuštěno nad funkcemi `sHlavickou` + `bezDiakritiky`,
šablona zprávy `…: zkusebni zprava z aplikace Hodnoceni hracu.`):

| Hlavička | Kódování | Znaků | Segmentů | Mimo abecedu |
|---|---|---|---|---|
| `SK ŘÍČMANICE` | GSM-7 | 57 | 1 | — |
| `SK Říčmanice – mládež` | **UCS-2** | 66 | 1 | `–` |
| `SK Ricmanice - mladez` | GSM-7 | 66 | 1 | — |
| `Klub „naše" mládež` | **UCS-2** | 63 | 1 | `„` |
| `Cena 5€` | GSM-7 | 53 | 1 | — (€ = 2 místa) |

Potvrzuje, že dlouhá pomlčka i české uvozovky **přežijí odstranění diakritiky** a samy
o sobě zdvojnásobí cenu zprávy; obyčejný spojovník ne.

**Ostatní kontroly:** `node --check` prošel nad `web/app.js`, `web/src/i18n.js`
i `web/src/dokumentace.js`; v `dokumentace.js` jsou právě 4 zpětné apostrofy (dva
literály CS + EN), tedy žádný uvnitř textu — přesně ta chyba, která shodila Nastavení
v záznamu (21). Ostrá databáze: `smsAktivni = 1`, `smsDenniStrop = 50`, **0 osob** má
`notif_sms = 1` s vyplněným telefonem, takže hodinový cron nic nerozesílá.

**Neověřeno:** proklikání v prohlížeči a na mobilu (sbalený log, hledání, export CSV,
náhled hlavičky). Vyžaduje přihlášení do aplikace.

---

## 2026-08-09 (21) — model podle úkolu

**Commit:** `aa908bc` · **NASAZENO** 2026-08-09, Version ID `bd58a68e-20ff-4e16-b6ac-7096693728ba`; živě ověřeno na obou adresách. **Ověřeno** proti `wrangler dev` nad lokální D1.

**Porovnání modelů na povelu** „ukaž mi papíry pro Jednu" (kádr 2 hráči; správně = akce
`listy`, jeden hráč). Jedno zadání a malý kádr — orientační, ne benchmark:

| Model | Akce | Hráči | Čas |
|---|---|---|---|
| `llama-3.2-3b-instruct` | `odkaz` ❌ | 1 ✅ | 234 ms |
| `llama-3.1-8b-instruct-fp8` | `listy` ✅ | **2** ❌ | 1784 ms |
| **`llama-3.3-70b-instruct-fp8-fast`** | `listy` ✅ | 1 ✅ | **477 ms** |
| `gpt-oss-120b` | `listy` ✅ | 1 ✅ | 2135 ms |

| Kontrola | Výsledek |
|---|---|
| `/api/ai/modely` vrací úkoly | 2 — `povely → aiModelPovely`, `analyzy → aiModel`, s `zvoleny` i `pouzity` |
| povel jede na svém modelu | `llama-3.3-70b`, akce `listy`, 1855 ms |
| analýza jede na svém modelu | `gpt-oss-120b`, ok, 5365 ms |
| UI: výběry v Nastavení | 2, popisky „Model na povely" / „Model na analýzy", 4 možnosti |
| UI: uložení | poslalo `aiModelPovely` i `aiModel` zvlášť |
| UI: zkouška spojení | dvě hlášky s popiskem úkolu (312 ms / 1811 ms) |
| konzole prohlížeče | žádná výjimka |
| i18n | 540 klíčů CS i EN |

**Chyba, kterou test odhalil (opraveno):** HTML komentář se zpětnými apostrofy uvnitř
template literálu ten literál ukončil → záložka Nastavení spadla na „ai is not defined".
`node --check` prošel, syntakticky to bylo platné; chytlo to až vykreslení stránky.

---

## 2026-08-09 (20) — oslovení hráče v 5. pádě

**Commit:** `113a511` · **NASAZENO** 2026-08-09, Version ID `9a988b96-aab5-4ea3-b825-b90b3808f4a0`; živě ověřeno na obou adresách. **Ověřeno** jednotkovým během `vokativ()` a `osloveni()`
nad 40 jmény (kádr ze snímku, trenéři, běžná česká jména, dvě ženská) — **40/40**.

| Skupina | Příklady | Výsledek |
|---|---|---|
| kádr | Ferda→Ferdo, Robin→Robine, Max→Maxi, Nikolas→Nikolasi, Lukáš→Lukáši | ✅ |
| trenéři | Milan→Milane, Julek→Julku, Maso→Maso | ✅ |
| vsuvné -e- | Marek→Marku, Radek→Radku | ✅ |
| -r podle předchozího | Petr→Petře, Alexandr→Alexandře | ✅ |
| -el dvojí chování | Karel→Karle, Pavel→Pavle × Daniel→Danieli, Michael→Michaeli | ✅ |
| zadopatrové | Patrik→Patriku, Vojtěch→Vojtěchu, Dominik→Dominiku | ✅ |
| končí samohláskou | Maso→Maso, Ota→Oto, Jiří→Jiří | ✅ |
| ženská | Jana→Jano, Eva→Evo | ✅ |

**Oslovení:** `("Trnka Ferdinand", "Ferda") → "Ferdo"`, bez přezdívky
`("Trnka Ferdinand", "") → "Ferdinande"` (ne „Trnka Ferdinande"),
`("Vagner Nikolas", "") → "Nikolasi"`. Anglicky beze změny: `"Ferda"`, `"Robin"`.

**Druhá chyba, kterou to odhalilo:** oslovení bralo `prezdivka || jmeno`, ale `jmeno` je
„Příjmení Jméno" — hráč bez přezdívky by dostal „Ahoj Trnka Ferdinand". Bere se poslední slovo.

---

## 2026-08-09 (19) — volné porovnání (cokoliv s čímkoliv)

**Commit:** `41cdc31` · **NASAZENO** 2026-08-09, Version ID `3faaa807-6527-400f-aa21-cec0ee2437a6`; živě ověřeno na obou adresách, oba nové endpointy bez přihlášení `401`. **Ověřeno** proti `wrangler dev` nad lokální D1.
Data: hráč se dvěma obdobími (`zima` trenér + hráč, `jaro` trenér), druhý hráč (`zima`),
plus brankářská řada na test odmítnutí míchání. Ostrá data nedotčena.

| Kontrola | Očekáváno | Naměřeno |
|---|---|---|
| `/api/zaznamy?sablona=pole` | jen existující kombinace | 4, popsané `jméno · období · autor` |
| `/api/zaznamy?sablona=brankar` | 1 | 1 |
| dva sloupce, trenér × hráč | znaménko dle konvence | `braneni` 3/8, **rozdíl +5** |
| tři sloupce | bez znaménka, s rozptylem | `rozdil: null`, rozptyl 5 (bránění), 3 (levá) |
| míchané šablony | odmítnout a vysvětlit | `400` „…jiná šestice os nemá s touhle společnou ani jednu osu." |
| jeden záznam | odmítnout | `400` „Vyber aspoň dva záznamy." |
| **pořadí sloupců** | nezávislé na pořadí v `ids` | `16,17` i `17,16` → `zima/trener → zima/hrac`, obojí `+5` |
| dvě období | starší první, + = zlepšení | `zima → jaro`, `+2`, obojí zadání |
| UI (CDP) | třetí karta | 3 karty, 4 záznamy, hlavičky sloupců s popisem, 1 zvýrazněná osa |
| přepnutí šablony | přenačte nabídku | `brankar` → 1 záznam |
| konzole prohlížeče | čistá | žádná výjimka |
| i18n | CS = EN | 536 klíčů |

**Chyba, kterou test odhalil (opraveno):** sloupce se řadily podle pořadí v seznamu, takže
znaménko u rozdílu určovala náhoda — uživatel pořadí neovlivní. Pořadí teď určuje server
(období chronologicky, uvnitř období trenér → shoda → hráč).

---

## 2026-08-09 (18) — odkazy vybraným hráčům a šablonám

**Commit:** `04ebd28` · **NASAZENO** 2026-08-09, Version ID `07a33467-63a3-4afb-b3ec-8fd9f8005680`; živě ověřeno na obou adresách. **Ověřeno** proti `wrangler dev` nad lokální D1.
Hráč 9 má šablony `pole` + `leader`, hráč 10 `brankar`. Ostrá data nedotčena.

| `ids` | Očekáváno | Naměřeno |
|---|---|---|
| `9:leader` | jeden odkaz | `vytvoreno=1`, jen leader |
| `9:leader` podruhé | přeskočit | `vytvoreno=0, preskoceno=1` |
| `9` | doplnit chybějící šablonu | `vytvoreno=1` (pole), `preskoceno=1` (leader) |
| `10:brankar` | jeden odkaz | `vytvoreno=1` |
| bez `ids` | celý aktivní kádr | `vytvoreno=0, preskoceno=3` (vše už viselo) |
| `9:nesmysl` | srozumitelná chyba | „Ve výběru není platná kombinace hráč + šablona." |
| `999` | chyba | „Vybraní hráči nejsou v aktivním kádru." |

**Tabulka výběru proklikaná v headless Edge přes CDP:**

| Kontrola | Výsledek |
|---|---|
| zaškrtávátek | 3 — `10:brankar`, `9:pole`, `9:leader` |
| výchozí stav | všechna zaškrtnutá, v záhlaví označit/odznačit vše |
| výběr jednoho → co odešlo | `{"obdobi":"2025/2026 zima","dni":30,"ids":"9:pole"}` |
| nic nezaškrtnuto | „Není vybraný ani jeden odkaz.", nic se neodeslalo |
| marker u existujícího odkazu | „už visí" na správném řádku |
| konzole prohlížeče | žádná výjimka |
| i18n | 526 klíčů CS i EN, nechybí ani jeden |

**Chyba, kterou test odhalil (opraveno):** neznámá šablona hlásila „Vybraní hráči nejsou
v aktivním kádru", přestože hráč v kádru byl. Prázdný výběr po rozebrání `ids` má teď
vlastní hlášku.

---

## 2026-08-09 (17) — gpt-oss odpovídá (uvažující model)

**Commit:** `fd9b459` · **NASAZENO** 2026-08-09, Version ID `6bcd49ff-0742-418e-898e-70db78e8944c`; živě ověřeno 8× po sobě na obou adresách. **Ověřeno** proti `wrangler dev` nad lokální D1.

| Kontrola | gpt-oss-120b | llama-3.3-70b-fp8-fast |
|---|---|---|
| zkouška spojení (`/api/ai/stav`) | ✅ „funguje", **1128 ms** | ✅ „Ano", 192 ms |
| analýza — trefit čísla | ✅ `+5 (trenér 3, hráč 8)`, **4062 ms** | ✅ 1,6 s |
| rozřazení povelu | ✅ „ukaž mi papíry pro Jednu" → `akce=listy`, 1 hráč, **2729 ms** | ✅ |
| otázka z lišty, záložka Lidé (UI) | ✅ **4,8 s** | ✅ 0,5 s |
| otázka z lišty, záložka Listy (UI) | ✅ **9,5 s** | ✅ 1,6 s |
| znaménka rozdílů | ✅ bránění +5, levá +1, přihrávka +1, zbytek 0 | ✅ |
| konzole prohlížeče | žádná výjimka | žádná výjimka |

**Před opravou** vracel gpt-oss `content: null`, `finish_reason: 'length'` a plný blok
`reasoning` — uvažování se počítá do `max_tokens` a se stropy 20 / 120 / 900 nezbylo na
odpověď. Hláška „Model odpověděl prázdnotou — zkus jiný model" příčinu zakrývala; odhalilo
ji až vypsání syrové odpovědi.

**Druhá oprava:** model si u os pod tolerancí dopočítával rozdíly a **pletl si znaménko**
(u `3/4` hlásil −1 místo +1). Podklady teď nesou rozdíl spočítaný u každé osy.

---

## 2026-08-09 (16) — jedno pole na dotazy (příkazový řádek)

**Commit:** `74946c4` · **NASAZENO** 2026-08-09, Version ID `f3808fce-9f9c-4307-ab6e-1956084e2b1f`; živě `/api/version` = `74946c4` (5× po sobě), `app.js` nese novou logiku a staré `an-otazka` je pryč. **Ověřeno** proti `wrangler dev` nad lokální D1,
proklikáním v headless Edge přes CDP. Nastražený hráč: trenér bránění 3, hráč si dal 8.

| Kontrola | Očekáváno | Naměřeno |
|---|---|---|
| otázka „kolik máme hráčů" ze záložky Lidé | odpověď v liště, bez přepnutí | „Máme 2 aktivních hráčů." za **0,5 s**, záložka zůstala `lide` |
| tlačítko *Ukázat čísla* u odpovědi | je | ano |
| otázka „u koho je největší rozpor…" ze Listů | odpověď, ne karta hráče | trefila čísla `3` / `8` / `+5` za **1,6 s**, záložka zůstala `listy` |
| povel „hodnotit Jedna" | pořád funguje | přepnulo na záložku `hodnotit` |
| Analýzy — druhé pole na otázky | **není** | `an-otazka` i `an-zeptat` pryč |
| Analýzy — tabulky a příklady | zůstávají | 4 tabulky, 3 příklady, odkaz na lištu |
| konzole prohlížeče | čistá | žádná výjimka |
| i18n | CS = EN | 520 klíčů na obou stranách |

**Chyba, kterou test odhalil (opraveno):** otázka „u koho **je** největší rozpor…"
otevřela kartu hráče „**Je**dna" místo odpovědi — `rozeberPovel` páruje slova na jména
podle začátku, takže krátké slovo ve větě trefí hráče. Řešeno rozpoznáním otázky **před**
hledáním jmen, podle tázacího slova nebo otazníku (ne podle délky slova — dvouznakové
prefixy jsou v češtině běžné).

---

## 2026-08-08 (15) — Analýzy (souhrny v kódu + otázka modelu)

**Commit:** `1b067ca` · **NASAZENO** 2026-08-08, Version ID `38cf2c8b-81bd-453d-928e-4e31411a608e`; živě `/api/analyzy` i `/api/ai/analyza` bez přihlášení `401`. **Ověřeno** proti `wrangler dev` nad lokální D1.
Nastražená data: hráč se slepým místem (trenér bránění 3, hráč si dal 8), druhý hráč zcela
bez hodnocení, třetí řada `leader` bez sebehodnocení. Ostrá databáze nedotčena.

| Kontrola | Očekáváno | Naměřeno |
|---|---|---|
| `/api/analyzy` počty | 2 hráči, 3 listy, 2 s hodnocením, 1 se sebehodnocením, 1 s obojím | přesně tak |
| kdo chybí | rozdělit „bez hodnocení" a „má hodnocení, nemá sebehodnocení" | `bezHodnoceni: [Dva]`, `bezSebehodnoceni: [Jedna]` |
| nejslabší osy `pole` | `leva` a `braneni` po 3 | `leva 3 · braneni 3 · skenovani 5` |
| nejslabší osy `leader` | `tlak` 4 nejníž | `tlak 4 · podpora 6 · vedeni 7` |
| osy nad tolerancí | jen bránění, rozdíl +5 | přesně jedna, `trenér 3, hráč 8, +5` |
| brána bez modelu | odmítnout | `ok:false, duvod:'vypnuto'` |
| brána s modelem, ale `aiAnalyzy=ne` | odmítnout zvlášť | `duvod:'analyzyVypnuty'` |
| **odpověď modelu** | trefit čísla, nic nedopočítat | za **3285 ms** citoval `3` a `8` a rozdíl `+5`; použil skutečný popisek osy „Bránění 1v1" z i18n |
| podklady v odpovědi API | vrátit k ověření | `podklady.zaznamy` = 3 |
| záložka v prohlížeči (CDP) | vykreslit obojí | 4 karty, 4 tabulky, 3 příklady, 3 štítky šablon, 5 zvýrazněných řádků |
| konzole prohlížeče | čistá | **žádná výjimka** |
| i18n | CS = EN | 522 klíčů na obou stranách, nechybí ani jeden |

**Co ověřeno NEBYLO:** analýza nad ostrými daty (v produkci je `aiAnalyzy=ne`) a Claude
větev (`ANTHROPIC_API_KEY` není nastavený).

---

## 2026-08-08 (14) — tisk po listech, ne po hráčích

**Commit:** `56a0db8` · **NASAZENO** 2026-08-08, Version ID `778a4728-ac67-4aac-973f-caf7b3ca8ab1`. **Ověřeno** proti `wrangler dev` nad lokální D1
(zkušební hráč se třemi šablonami a hodnocením ke každé; ostrá data nedotčena).

| `ids` | Očekáváno | Naměřeno |
|---|---|---|
| `vse` | všechny listy | `brankar, pole, leader` |
| `2` | všechny listy hráče (starý tvar) | `brankar, pole, leader` |
| `2:brankar` | jeden list | `brankar` |
| `2:brankar,2:leader` | dva listy | `brankar, leader` |
| `2:nesmysl` | nic | 0 listů |
| `2:brankar,2` | míchané zadání = všechno | `brankar, pole, leader` |

**Tabulka proklikaná v headless Edge přes CDP** (přihlášení cookie, záložka Listy):

| Kontrola | Výsledek |
|---|---|
| řádků / zaškrtávátek | 3 / 3 |
| řádek bez zaškrtávátka | 0 |
| buněk v řádcích | `5 / 4 / 4` — jméno drží `rowspan`, sloupce sedí |
| hodnoty zaškrtávátek | `2:brankar`, `2:pole`, `2:leader` |
| štítků šablon v tabulce | 3 |
| výběr jednoho listu → adresa | `listy.html?…&ids=2%3Abrankar` |

---

## 2026-08-08 (13) — barva podle šablony a název šablony v hlavičce

**Commit:** `3378321` · **NASAZENO** 2026-08-08, Version ID `d672d044-3954-4c68-9beb-67dcffda81a7`.
Živě `/api/version` = `3378321`, `cisto: true` na `hodnoceni.maxferit.cz` i na `workers.dev`.
**Ověřeno** headless Edgem nad listy vyrenderovanými mimo prohlížeč (import `web/src/list.js`
v Node, vzorová data — žádná ostrá, žádná D1) a pak ještě proti běžícímu Workeru.
Změna je jen ve `web/`: bez migrace a bez zásahu do Workeru.

Měřily se **spočtené** barvy (`getComputedStyle`), ne to, co je napsané v CSS.

| Kontrola | Výsledek |
|---|---|
| list `pole` | hlavička, jméno i výplň polygonu `rgb(33,150,243)` = `#2196F3`, obrys `#1565C0` |
| list `brankar` | vše `rgb(0,131,143)` = `#00838F`, obrys `#006064` |
| list `leader` | vše `rgb(173,20,87)` = `#AD1457`, obrys `#880E4F` |
| značka v hlavičce | 1 na list, texty `hráč v poli` / `brankář` / `leader (vůdcovství)` |
| porovnávací polygon | zůstal šedý `rgb(158,158,158)` i na barevném listu |
| kumulovaný list | hlavička neutrální `rgb(55,71,79)`, **3 značky** v hlavičce |
| kumulovaný list — radary | tři polygony ve třech barvách; linka a titulek nad každým sedí s jeho šablonou |
| kumulovaný list — legenda | vzorek za každou šablonu, každý svou barvou |
| **tisk do PDF** | **5 listů = 5 stránek**, MediaBox `595 × 842 pt` (A4 na výšku); kumulovaný se 3 radary drží 1 stránku |
| štítky v aplikaci — světlý vzhled | kontrast text/pozadí 5,03 / 6,60 / 7,85 |
| štítky v aplikaci — tmavý vzhled | kontrast 8,87 / 9,66 / 10,64 |
| syntaxe (`node --check`) | `list.js`, `radar.js`, `sablony.js`, `app.js`, `h.js`, `listy.js` — bez chyby |
| `wrangler dev` + lokální D1 (migrace 001–013) | `/h/<token>` vrátil `<span class="znacka sab-brankar">brankář</span>` a 6 os brankářské šablony |
| přihlašovací obrazovka | vykreslila se → `app.js` se načte a běží (žádný pád modulu) |
| živá statika po nasazení | `app.css`, `app.js`, `src/styl.css`, `src/list.js`, `src/radar.js` nesou novou verzi; pořadí `.page` před `.sab-*` sedí |

**Chyba, kterou test odhalil (opraveno):** záložní pravidlo `.page` stálo v `styl.css` **za**
třídami `.sab-*`. Při stejné specificitě rozhoduje pořadí, takže je přebilo a brankářský
i leader list se dál vykreslovaly modré, přestože třída na stránce byla správná. Na pohled
do kódu to vidět nebylo — chytlo to až měření spočtených barev.

**Poznámka:** štítek role „hráč" a štítek šablony „hráč v poli" mají v Lidech tutéž modrou;
odlišuje je jen text. Nevyřešeno, jen zaznamenáno.

---

## 2026-08-07 (12) — víc šablon u hráče a kumulovaný list

**Commit:** `6dd0701` · **Ověřeno** lokálně (`wrangler dev` + D1 s migracemi 001–013).
Živě: migrace `013` puštěná (23 řádků), `/api/version` = `6dd0701`, `cisto: true`.
V ostré databázi zatím žádné hodnocení není, takže naostro jde ověřit jen schéma a nasazení.

| Kontrola | Výsledek |
|---|---|
| uložení tří šablon u hráče | `["pole","brankar","leader"]`, `sablona` = první z nich (15/15 kontrol API) |
| neznámá šablona / prázdný seznam | `400` v obou případech |
| přehled po šablonách | `stavSablon` má řádek na každou; hotová `pole` ✓, chybějící `brankar` — |
| `/api/listy` | vrátí 3 záznamy; šablona bez hodnocení má `hodnoceni: null` (prázdný podklad) |
| odkazy na sebehodnocení | 3 (na každou šablonu); druhé generování `vytvoreno 0, preskoceno 3` |
| export kádru | sloupec `sablony`, v buňce `hráč v poli, brankář, leader` |
| Lidé v prohlížeči | šablony jsou zaškrtávátka (žádný `select`), úprava je předvyplní (16/16 kontrol UI) |
| klik na jméno v kartotéce | otevře úpravu té osoby (`Úprava: Test Trenér`, id ve formuláři) |
| Hodnotit | výchozí je první přiřazená; formulář vypíše, co má hráč přiřazeno |
| Listy | řádek na každou šablonu, přepínač kumulovaného listu |
| kumulovaný list | 1 stránka, 3 radary, každý podepsaný šablonou; slovní bloky složené |
| **tisk kumulovaného listu do PDF** | **1 stránka** (`Page.printToPDF`, `preferCSSPageSize`) |
| bez přepínače | 3 stránky = 3 šablony, jak to bylo dosud |
| přepnutí šablony u prázdného formuláře | projde bez ptaní, texty zůstanou prázdné |
| přepnutí šablony s rozepsaným textem | zeptá se; po potvrzení se text **nepřenese** (5/5 kontrol) |
| sada k úpravě hodnocení po těchto změnách | 23/23 beze změny |
| konzole prohlížeče | žádná chyba |

**Co ověřeno NEBYLO:** kumulovaný list proti ostrým datům (v produkci není hodnocení)
a čitelnost tří radarů vedle sebe na papíře — v PDF se vejdou, na tiskárně to zatím
nikdo neviděl.

---

## 2026-08-07 (11) — úprava hodnocení jako nová verze

**Commit:** `025d70d` · **Ověřeno** lokálně (`wrangler dev` + čerstvá D1 s migracemi 001–012);
živě zatím jen nasazení a schéma — v ostré databázi není žádné hodnocení, na kterém by
šlo úpravu proklikat.

| Kontrola | Výsledek |
|---|---|
| API: předloha vrací vlastní hodnocení i s hodnotami, texty a autorem | ano (15/15 kontrol, 0 chyb) |
| API: předloha jiného autora | `predloha: null` — cizí čísla se nevrací |
| API: úprava = nový řádek | `id` 3 → 4, původní řádek beze změny (`prava` zůstalo 5) |
| API: `uprava_id` v historii | nová verze nese nit na upravovanou, původní má `null` |
| API: neexistující `uprava_id` | `404` |
| API: `uprava_id` sebehodnocení hráče | `400` — trenérským formulářem to nejde |
| UI (headless Edge přes CDP): předvyplnění | 6 os, slovní bloky i cíle, vybraný autor (23/23 kontrol) |
| UI: varování „naslepo" při úpravě | nahrazeno vysvětlením, že vzniká nová verze |
| UI: nabídka nad formulářem | jen datum a šablona, **žádné známky** (0 prvků `.stupnice`) |
| UI: bez vybraného trenéra | nenabízí se nic (společné heslo nepozná, čí hodnocení hledat) |
| UI: historie | značka *úprava verze z …*, tlačítko *Upravit* jen u trenérských verzí |
| UI: zrušení úpravy | prázdný formulář a varování „naslepo" zpátky |
| konzole prohlížeče | žádná chyba |
| ostrá D1: sloupec `uprava_id` | přidán (`pragma_table_info` → 1) |
| živě po nasazení | `/api/version` = `025d70d`, `cisto: true`; `/api/evaluations/predloha` bez přihlášení `401` |

**Co ověřeno NEBYLO:** úprava proti ostrým datům — v produkci zatím žádné hodnocení není.

---

## 2026-08-07 (10) — leader, tisk, příkazový řádek, jazykový model

**Commit:** `1eeec22` · **Ověřeno proti** https://hodnoceni.maxferit.cz a lokálně

| Kontrola | Výsledek |
|---|---|
| šablona `leader` — popisky i formulace v 1. osobě | česky i anglicky kompletní, žádný chybějící klíč |
| validace `leader` | cizí osa i hodnota mimo 1–10 odmítnuty |
| tisk listu do PDF (headless Edge) | **1 stránka**, MediaBox 595 × 842 pt = A4 na výšku |
| podpis trenéra | sedí dole u kraje papíru (patička si bere zbylé místo) |
| jazykový model — Workers AI | `{"ok":true,"odpoved":"Funguje.","trvaloMs":701}` |
| vyřazený model rozpoznán | `5028 … was deprecated on 2026-05-30` → nahrazen `-fp8` variantou |
| Worker s Anthropic SDK | bundle 513 kB / 108 kB gzip, `nodejs_compat` zapnutý |
| `/api/evaluations/hromadne` a `/api/srovnani` bez přihlášení | `401` |
| popisky exportu tam a zpět | `trenér`/`hráč v poli`/`střední záložník` → klíče, i velkými písmeny a bez diakritiky |

**Co ověřeno NEBYLO:** doručení SMS (účet GoSMS neověřený, bez kreditu); Claude jako
poskytovatel (chybí `ANTHROPIC_API_KEY`, organizace bez kreditu) — pád na model zdarma
je proto ověřený jen kódem, ne živým během; hromadné hodnocení a srovnání hráčů proti
ostrým datům (v období zatím není žádné hodnocení).

---

## 2026-08-07 (9) — GoSMS, zámek přihlášení, export do Excelu

**Commit:** `a89f21e` · **Ověřeno proti** https://hodnoceni.maxferit.cz

| Kontrola | Výsledek |
|---|---|
| GoSMS: OAuth2 token z klíčů v secretech | `/api/sms/ucet` → `{"ok":true,"provider":"gosms"}` |
| GoSMS: výpis kanálů | `404` — v1 API endpoint nemá, ID se opisuje z portálu (ošetřeno hláškou) |
| GoSMS: ostré odeslání | ⛔ `400` — účet je neověřený a bez kreditu (odesílatel `GoSMS-test`) |
| zámek přihlášení | 5. marný pokus zamkl, další vracely `429` s vysvětlením; testovací řádky smazány |
| účet bez hesla se do zámku nepočítá | ano (`409`, ne započtený pokus) |
| export `.xlsx` otevřený **Excelem přes COM** | list `lide`; `telefon` i `telegram_chat_id` mají `NumberFormat = @` |
| hodnota telefonu v sešitu | `+420604577765` doslova, žádný vzorec ani `4,20605E+11` |
| diakritika v sešitu | `Říčka Václav` v pořádku |
| export bez přihlášení | `401` |
| verze v liště po nasazení | `/api/version` = commit v gitu (čte se z bundlu, ne z assetu) |

**Co ověřeno NEBYLO:** doručení SMS na telefon (čeká na ověření účtu GoSMS a dobití kreditu)
a import sešitu `.xlsx` proti ostrým datům — parser sešitu byl zkoušen jen na souboru
z vlastního exportu.

---

## 2026-08-06 (8) — SMS kanál a log komunikace

**Commit:** `c48a89f` · **Ověřeno proti** https://hodnoceni.maxferit.cz

| Kontrola | Výsledek |
|---|---|
| provider `console` — SMS se neodešle, jen zaloguje | `{"ok":true,"popis":"Provider je console…"}` |
| diakritika odstraněna | v logu `SK RICMANICE: zkusebni zprava` (1 segment místo 2) |
| přihlašovací údaje Twilia | `{"ok":true,"ucet":"My First Twilio Account","stav":"active"}` |
| špatný token rozpoznán | `delkaTokenu: 34` → API Key SID místo Auth Tokenu (32) |
| reálné odeslání | ⛔ `21612` — neregistrované Sender ID pro ČR |
| log komunikace | všechny pokusy zapsané s kódem chyby, dohledatelné zpětně |
| zprávy z režimu `console` se nepočítají do denního stropu | ano |

**Co ověřeno NEBYLO:** doručení SMS na telefon. Blokuje to Twilio, ne aplikace —
česká Sender ID vyžadují registraci. Kanál nemá nikdo zapnutý (`notif_sms = 0`).

---

## 2026-08-06 (7) — shoda mezi trenéry a historie verzí

**Commit:** `6203c47`

| Kontrola | Výsledek |
|---|---|
| blind guard mezi trenéry | přihlášen `maxla`, neodevzdal → `{"cekaNaTebe":true}`, **žádná cizí čísla** |
| chybějící povinní trenéři | `["Julek","Maxla"]` |
| povinní podle nastavení | Maxla 1, Julek 1, Maso 0 |
| historie u hráče bez hodnocení | `[]` |
| tiskový list preferuje uzavřenou shodu | ano, jinak poslední hodnocení trenéra |

**Co ověřeno NEBYLO:** uzavření shody na reálných datech — v databázi zatím není žádné
hodnocení, takže tabulka osa × trenér se naplní až po prvním kole.

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
