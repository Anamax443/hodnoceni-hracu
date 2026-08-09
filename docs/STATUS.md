# STATUS — kde projekt stojí

Snímek k **9. 8. 2026**. Odpovídá na tři otázky: co běží, co je ověřené a co chybí.
Podrobnosti a důvody rozhodnutí jsou v [HANDOFF.md](../HANDOFF.md) (deník, nejnovější nahoře).

**Živě:** https://hodnoceni.maxferit.cz · záloha `hodnoceni-hracu.bass443.workers.dev`
**Verze:** commit běžící aplikace je v horní liště a v `/api/version`.

---

## Co běží

| Oblast | Stav | Poznámka |
|---|---|---|
| Kádr a kartotéka (Lidé) | ✅ | 22 osob (18 aktivních hráčů + 3 trenéři), pozice, přezdívky, role; klik na jméno = úprava |
| Víc šablon u hráče | ✅ | brankář i hráč v poli i leader; každá vlastní řada, odkaz i list |
| Export / import kádru | ✅ | `.xlsx` s formátem Text, CSV, import nanečisto |
| Hodnocení trenérem | ✅ | 6 os 1–10, append-only, šablony `pole` / `brankar` / `leader` |
| Hromadné hodnocení | ✅ | jedna známka pro víc hráčů, doplní se k poslednímu záznamu |
| Úprava hodnocení | ✅ | načíst, opravit, uložit = **nová verze**; jen vlastní, naslepo platí dál |
| Sebehodnocení hráče | ✅ | jednorázový odkaz, blind guard ověřený naostro |
| Porovnání trenér × hráč | ✅ | tolerance, znaménko, trend, historie verzí |
| Srovnání hráčů mezi sebou | ✅ | tabulka osa × hráč, rozptyl |
| Porovnat cokoliv s čímkoliv | ✅ | 2–8 záznamů (hráč × období × autor) vedle sebe; napříč obdobími i autory, v rámci jedné šablony |
| Odkazy vybraným | ✅ | zaškrtává se po odkazech (hráč × šablona), ne po hráčích |
| Shoda mezi trenéry | ✅ | matice osa × trenér, finální znění na list |
| Tiskové listy A4 | ✅ | 1 list = 1 stránka, ověřeno headless tiskem do PDF |
| Kumulovaný list | ✅ | volitelně všechny šablony hráče na jedné A4, ověřeno tiskem do PDF |
| Barva podle šablony | ✅ | hráč v poli modrá, brankář petrolejová, leader vínová; název šablony v hlavičce listu, štítky i v aplikaci |
| Výběr tisku po listech | ✅ | zaškrtávátko na každý řádek hráč × šablona, `ids=id:sablona` |
| Účty a hesla | ✅ | login i e-mail, PIN od 4 znaků, zámek po 5 pokusech |
| Obnova hesla | ✅ | jednorázový odkaz, 15 minut, Telegram i e-mail |
| Notifikace — Telegram | ✅ | ověřeno doručením |
| Notifikace — e-mail | ✅ | Cloudflare Email Sending |
| Notifikace — SMS | ✅ | **ověřeno naostro 9. 8. 2026** — zkouška nanečisto i doručená zpráva; kanál zapnutý (`smsAktivni = 1`), strop 50/den |
| Hlavička SMS | ✅ | editovatelná v Nastavení, náhled se segmenty a varováním na znaky mimo GSM-7; prázdné = název klubu |
| Zkouška SMS na libovolné číslo | ✅ | v Nastavení, bez vazby na kartotéku; nanečisto zdarma, ostrá s potvrzením |
| Log komunikace | ✅ | sbalený (neroste stránka), hledání a export **celého** logu do CSV |
| Příkazový řádek | ✅ | **jedno pole na povely i otázky**, nad každou záložkou; rozřazení lokálně, model až na zapeklité věty |
| Analýzy — souhrny | ✅ | nejslabší osy kádru, největší rozpory, kdo chybí; počítá aplikace, nic neodchází |
| Analýzy — otázka modelu | ✅ | **zapnuto v ostré databázi** (`aiAnalyzy = ano`) — modelu odcházejí plná data hráčů, viz Osobní údaje níž |
| Jazykový model | ✅ | ostrý model `@cf/openai/gpt-oss-120b` (Workers AI, zdarma); Claude čeká na `ANTHROPIC_API_KEY` |
| Mobil | ✅ | hamburger, ovládání na palec, tabulky se posouvají v kartě |
| Dokumentace v aplikaci | ✅ | záložka 📖, česky i anglicky |

## Kolik je v aplikaci dat

Souhrnná čísla z ostré databáze k 9. 8. 2026 (jen počty, žádná jména ani známky):

| | |
|---|---|
| osob v kartotéce | 22 (18 aktivních hráčů, 3 trenéři, 1 neaktivní) |
| hráčů s vyplněnými pozicemi | 4 z 18 |
| hodnocení od trenéra | **16** u 11 hráčů, jedno období |
| z toho podle šablon | hráč v poli 11 (10 hráčů) · brankář 3 (2 hráči) · leader 2 (2 hráči) |
| sebehodnocení od hráčů | **0** |
| vygenerovaných odkazů na sebehodnocení | **0** |
| uzavřených shod mezi trenéry | 0 |
| účtů v `auth` | 1 (pořád společné heslo) |

**Rozhovor nad rozdílem dvou pohledů — hlavní hodnota nástroje — se zatím nekonal.**
Trenérská strana běží, hráčská ne: dokud se hráčům nerozešlou odkazy, není co porovnávat
a druhý polygon na listu zůstává prázdný.

## Co je ověřené naostro

Doklady a čísla v [known_good.md](../known_good.md). Ve zkratce:

- API testy proti nasazené aplikaci (48 + 45 + 27 + 25 + 13 běhů, 0 chyb)
- blind guard: povinný trenér bez odevzdaného hodnocení nedostane cizí čísla
- zámek přihlášení: 5. marný pokus zamkl, další vracely 429
- export `.xlsx` otevřený Excelem přes COM: telefon má formát `@`, hodnota doslova
- tisk: 1 stránka, MediaBox 595 × 842 pt (A4 na výšku)
- jazykový model: Workers AI odpověděl za ~0,7 s
- úprava hodnocení: 15 kontrol API + 23 proklikáním v prohlížeči (lokálně, čerstvá D1);
  živě zatím jen migrace a nasazení — ostrá data k proklikání nejsou
- víc šablon u hráče: 15 kontrol API + 16 proklikáním; kumulovaný list vytištěný do PDF
  na **jednu A4**, bez přepínače tři stránky
- slovní bloky a cíle se mezi šablonami nepřenášejí: 5 kontrol (prázdný formulář přepne
  bez ptaní, s rozepsaným textem se zeptá a text zůstane u své šablony)
- barva podle šablony: spočtené barvy u všech tří šablon zvlášť i na kumulovaném listu,
  tisk do PDF 5 listů = 5 stránek, kontrast štítků 5,0–10,6 ve světlém i tmavém vzhledu
- výběr tisku po listech: 6 případů `ids` přes API + tabulka proklikaná v headless Edge
  (3 řádky, 3 zaškrtávátka, výběr jednoho listu dal `ids=2:brankar`)
- odkazy vybraným: 7 případů `ids` (jeden odkaz, přeskočení, doplnění chybějící šablony,
  neznámá šablona, neexistující hráč) + proklik tabulky výběru
- volné porovnání: 10 případů; **pořadí sloupců nezávisí na pořadí zadání** (`16,17`
  i `17,16` dá stejný výsledek), míchané šablony `400`, dvě období vždy starší první
- jazykový model `gpt-oss-120b`: odpovídá po zvýšení stropu tokenů (uvažování se do něj
  počítá) — analýza trefila `+5 (3 vs 8)` za 4,1 s, rozřazení povelu za 2,7 s
- **SMS naostro (9. 8. 2026)**: zkouška nanečisto `ok`, o sedm vteřin později ostrá zpráva
  `ok` a doručená na telefon. Text v logu doslova souhlasí s tím, co odešlo
- skládání SMS a počítání segmentů ověřeno spuštěním funkcí nad pěti hlavičkami: „–" i „„"
  správně hlásí UCS-2, spojovník `-` ne, `€` se počítá za dva znaky

## Co chybí

1. **Rozeslat hráčům odkazy na sebehodnocení.** Zatím nevznikl ani jeden a hráči tedy
   nevyplnili nic. Bez toho nemá list druhý polygon a rozhovor nad rozdílem pohledů
   — kvůli kterému nástroj vznikl — se nemá o co opřít. **Tohle je teď to hlavní.**
2. **Julek a Maso nemají vlastní heslo ani kanál.** Až budou mít Telegram nebo ověřený
   e-mail, poslat pozvánku z Lidí; pak zrušit společné heslo (`DELETE FROM auth`).
3. **Doplnit pozice zbylým hráčům** — vyplněné je mají 4 z 18. Šablony už přiřazené jsou
   (brankářská i leader hodnocení v databázi existují), tenhle bod se tím z větší části
   vyřídil; zbývají pozice, které se tisknou na list.
4. **Dohodnotit zbylých 7 hráčů** — hodnocení má 11 z 18 aktivních.
5. **Klíč `ANTHROPIC_API_KEY`**, pokud se má zkoušet placený model. Bez něj i s vyčerpaným
   kreditem jede příkazový řádek dál na modelu zdarma.

## Otevřené otázky

- **GDPR u analýz jazykovým modelem — teď už to není hypotetické.** `aiAnalyzy` je
  v ostré databázi **zapnuté**, takže při každé otázce na kádr odcházejí modelu známky,
  slovní posudky a cíle nezletilých. Rozhodnuto vědomě (8. 8. 2026), ale **záznam o činnosti
  zpracování a informace pro rodiče pořád chybí** — a od chvíle, kdy je vypínač zapnutý,
  je to dluh, ne poznámka do budoucna. Workers AI (Cloudflare, týž účet jako aplikace) je
  pro tohle méně problematická cesta než Claude (americká třetí strana); ostrý model je
  dnes `@cf/openai/gpt-oss-120b`, tedy Cloudflare.
- Mají mít k tištěnému listu přístup rodiče, nebo jen hráči?
- WhatsApp jako další kanál: provozně bez paušálu, ale chce číslo mimo běžný WhatsApp,
  Meta Business Portfolio a schválenou šablonu. Nepostaveno.
