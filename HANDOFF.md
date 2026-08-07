# HANDOFF — deník stavu: hodnoceni-hracu

Append-only. Nejnovější záznam nahoru. Slouží k pokračování z jiného počítače / po pauze.

## 2026-08-07 (15) — víc šablon u jednoho hráče a kumulovaný list

**Hráč má šablon kolik potřebuje** (migrace `013`, `players.sablony` jako JSON pole).
Ferda chytá, hraje v poli a vede mužstvo — zaškrtnou se mu všechny tři. Doteď měl
u sebe jednu „výchozí" a zbylé dvě si musel trenér u každého hodnocení vybrat ručně;
nikde přitom nebylo vidět, že mu dvě řady chybí. `players.sablona` zůstal jako zrcadlo
první šablony, aby ruční SQL nevracelo nesmysl.

**Leader zůstal samostatnou šesticí os, ne sedmou osou u všech** — sedm vrcholů mění
tvar radaru a rozbilo by porovnání se staršími hodnoceními (viz zápis 13). Nově ale
nepůsobí jako cizí těleso: přiřadí se zaškrtnutím vedle brankáře a polního hráče,
po uložení hodnocení nabídne formulář rovnou *Ohodnotit: leader* a na papíře jde mít
všechno vedle sebe (viz kumulovaný list).

**Co z toho plyne jinde:**
- **Listy** mají řádek na každou přiřazenou šablonu a je v nich vidět, která ještě
  hodnocení nemá. Přiřazená šablona bez hodnocení dá **prázdný list jako podklad** —
  jinak by chybějící brankářská řada z tisku tiše zmizela.
- **Odkazy** se generují **na každou šablonu zvlášť** (odkaz nese jednu šestici os).
  Nevyplněný odkaz na tutéž šablonu se už nezakládá podruhé a přeskočené se spočítají.
- **Export/import** má místo sloupce `sablona` sloupec `sablony` s popisky oddělenými
  čárkou; starší soubory s `sablona` dál projdou.

**Kumulovaný list** (Listy → přepínač). Jeden hráč = jedna stránka, na ní radary za
všechny jeho šablony vedle sebe, každý podepsaný. Slovní bloky a cíle se skládají ze
všech šablon a je u nich uvedeno, ze které jsou, takže se nic neztratí. Radary se ani
tady neslučují. Bez přepínače platí dosavadní stav: každá šablona vlastní stránka.

**Slovní bloky a cíle patří k šabloně, ne k člověku.** Formulář je při přepnutí šablony
dřív přenášel („mění se osy, ne text"), což u hráče s víc šablonami znamenalo, že
brankářské cíle („výkopy od brány") propadly i na leader list. Teď se vyprázdní a když
je něco rozepsané, formulář se předtím zeptá. Na kumulovaném listu se skládají
s uvedením šablony; stejná věta u dvou šablon se vypíše jednou.

**Klik na jméno v kartotéce** otevře úpravu té osoby; tlačítko na konci řádku zůstává.

**Ověřeno lokálně:** 15 kontrol API (uložení tří šablon, odmítnutí prázdného
i neznámého seznamu, stav po šablonách v přehledu, list na každou šablonu, odkaz na
každou šablonu a nezdvojení, export popisků) a 16 + 5 proklikáním v headless Edge —
včetně **tisku kumulovaného listu do PDF: 1 stránka**, bez přepínače 3 stránky,
a nepřenášení textů mezi šablonami. Sada k úpravě hodnocení (23 kontrol) prošla beze změn.

**Nasazeno.** Migrace `012` i `013` puštěné na ostré D1 (23 řádků, každý hráč má po
migraci `["pole"]`), Worker nasazený — `/api/version` = `6dd0701`, `cisto: true`.

**Zbývá:** zaškrtat šablony hráčům, kterým se má tisknout brankářský nebo leader list —
po migraci mají všichni jen `hráč v poli`.

---

## 2026-08-07 (14) — úprava hodnocení: načíst, opravit, uložit jako novou verzi

**Oprava překlepu už neznamená vyplnit formulář znovu.** Existující hodnocení se dá
načíst do formuláře, upravit a uložit — a vzniká **nová verze**. Zápis zůstává
append-only: původní řádek se nemaže ani nepřepisuje, zůstává v historii a jde ho
vytisknout. Migrace `012` přidává `evaluations.uprava_id` = ze které verze ta nová
vznikla; bez toho by v historii ležely dva záznamy vedle sebe a nešlo by poznat opravu
od druhého, samostatně pořízeného hodnocení.

**Dvě cesty k úpravě.** V *Hodnotit* se nad formulářem ukáže, že v tomhle období od tebe
hodnocení už je (**jen datum a šablona, žádná čísla**), s tlačítkem *Upravit ho*.
V *Porovnání → Historie hodnocení* je *Upravit* u konkrétní verze — takhle jde opravit
i hodnocení ze staršího období a nová verze se uloží **do období té upravované**, ne do
právě nastaveného.

**Známkování naslepo zůstává v platnosti.** Předvyplnění je výjimka na opravu, ne zrušení
principu: dokud si úpravu sám nevyžádáš, formulář žádná dřívější čísla neukáže, a nabízejí
se **jen vlastní** hodnocení. Když má session `id` (trenér s vlastním heslem), server
hledá výhradně jeho řádky a volbu v *Hodnotí* ignoruje; u přechodného společného hesla
platí `autor_id` z formuláře, stejně jako u ukládání. Cizí čísla se tudy vytáhnout nedají.
Server odmítne `uprava_id`, které neexistuje (404), patří jinému hráči nebo není od trenéra
(400) — sebehodnocení hráče se trenérským formulářem nepřepisuje ani novou verzí.

**Ověřeno lokálně** (`wrangler dev` + čerstvá D1 s migracemi 001–012): 15 kontrol API
a 23 kontrol proklikáním v headless Edge přes CDP — předvyplnění všech šesti os i slovních
bloků, nahrazení varování „naslepo" vysvětlením úpravy, vznik nové verze místo přepisu,
značka *úprava verze z …* v historii, *Upravit* jen u trenérských verzí, zrušení úpravy
vrátí prázdný formulář a varování zpět. Žádná chyba v konzoli prohlížeče.

**Nasazeno** (commit `025d70d`), migrace `012` na ostré D1 puštěná.

---

## 2026-08-07 (13) — leader, hromadné hodnocení, srovnání hráčů, příkazový řádek s AI

**Šablona `leader`** — vůdcovství jako třetí sada os (vedení na hřišti, příklad
v tréninku, reakce na chybu a tlak, fair play, podpora spoluhráčů, spolehlivost),
ne jako sedmá osa u všech: sedm vrcholů mění tvar radaru a rozbilo by porovnání
se staršími hodnoceními. Hráč tak dostane druhý list vedle herního. Osy popisují
**chování, které je vidět**, ne povahu — na papír pro rodiče nepatří posudek osobnosti.

**Hromadné hodnocení** (Hodnotit → *Hodnotit víc hráčů najednou*). Vyplní se jen
osy, na kterých se kádr shoduje, a doplní se k poslednímu hodnocení hráče v daném
období a šabloně; vzniká nový záznam, nic se nepřepisuje. Základ se bere **jen od
přihlášeného trenéra** — cizí čísla se nepřebírají, jinak by se tiše smíchaly dva
pohledy, které má rozsuzovat Shoda. Kdo v období hodnocení nemá, se nezaloží
a vypíše se jmenovitě. Ukládá se až po potvrzení, které napřed řekne, koho se to týká.

**Srovnání hráčů mezi sebou** (Porovnání, druhá karta) — tabulka osa × hráč,
vyšší známka tučně, sloupec *Rozdíl* a zvýrazněné osy s rozdílem ≥ 3. Srovnávají
se jen hodnocení od trenérů a vždy v rámci jedné šablony.

**Příkazový řádek** nad obsahem. „Robin" → nabídne Hodnotit / Porovnat / Listy;
„robin ferda" → srovnání; „listy robin", „porovnej robina a ferdu" jdou rovnou.
**Rozřazení dělá prohlížeč** nad načteným kádrem — okamžité a bez tokenů; model
se ptá teprve na větu, které místní rozřazení nerozumí.

**Jazykový model je přepínač** (Nastavení): `vypnuto` (výchozí) / Workers AI
zdarma / Claude přes oficiální `@anthropic-ai/sdk`. **Při vyčerpaném kreditu,
limitu nebo výpadku Claude spadne volání na model zdarma**, dokončí se a důvod
jde do logu i do odpovědi; chyba ve vlastním požadavku se ale zálohou nezakrývá.
Kvůli SDK je zapnutý `nodejs_compat` (bundle 513 kB / 108 kB gzip).
Vyřazený `llama-3.1-8b-instruct` (skončil 2026-05-30, chyba 5028) nahrazen
`-fp8` variantou; seznam modelů je v kódu, ne z katalogu.

**Mobil** — pod 720 px jdou záložky pod hamburger, který nese jméno otevřené
záložky; známky mají 42 px na palec, vstupy 16 px kvůli iOS, široké tabulky se
posouvají uvnitř karty.

**Tisk opraven.** Pravidla pro tisk byla nahoře v souboru, ale `.page` se šířkou
210 mm níž — při stejné specifičnosti vyhrálo pozdější, šířka se sečetla s okraji
stránky, obsah přetekl vpravo a vylezl druhý prázdný list. Tisková sekce je teď
na konci souboru. Podpis trenéra šel dolů (patička si bere zbylé místo).
Ověřeno headless tiskem do PDF: 1 stránka, MediaBox 595 × 842 pt.

**Export mluví lidsky** — místo `trener`, `pole`, `stredni_zaloznik` a 0/1 jsou
v souboru popisky a ano/ne v jazyce aplikace; import bere zpátky obojí. Přibyl
skutečný **sešit .xlsx** (telefon a chat id formátem Text, ověřeno Excelem přes
COM); CSV už telefon nezabaluje do `="…"`. **České řazení** přes `Intl.Collator`.

**Zbývá:** ověřit účet GoSMS a dobít kredit (ostrá SMS zatím neprojde, odesílatel
je `GoSMS-test`); zadat první hodnocení; pozvánky pro Julka a Masa a pak
`DELETE FROM auth`; případný klíč `ANTHROPIC_API_KEY`, pokud se má zkoušet Claude.

---

## 2026-08-07 (12) — GoSMS místo Twilia, PIN se zámkem, export/import, dokumentace v appce

**SMS přes GoSMS** (`SMS_PROVIDER: gosms`). Twilio je pro české SMS špatný nástroj: obě
jeho cesty stojí měsíční paušál (30 $ za registrované jméno, 12 $ za české číslo). Česká
brána nemá paušál, účtuje od 0,41 Kč za zprávu a posílá pod **svým registrovaným
odesílatelem**, takže problém `21612` mizí. Daň: příjemce vidí `GoSMS-info`, ne klub.

- klíče jsou secrety (`GOSMS_CLIENT_ID`, `GOSMS_CLIENT_SECRET`), ID kanálu `504031` je ve
  `wrangler.jsonc` — tajemství to není
- API je na **`app.gosms.eu`** (`.cz` jen přesměrovává a POST by se zvrhl na GET), token
  form-encoded; výpis kanálů v1 nemá (404), ID se opisuje z portálu
- **zkouška nanečisto** přes `…/messages/test` ověří klíče, kanál i tvar čísla, nic
  neodešle a nic nestojí — tlačítko *SMS nanečisto* v Lidech
- **vypínač `smsAktivni`, výchozí vypnuto**: SMS je mimořádný nástroj. Přepínač u osoby
  říká *kam*, tenhle *jestli vůbec*
- **účet GoSMS je zatím neověřený a bez kreditu** → odesílatel `GoSMS-test`, ostrá SMS
  neprojde. Poslední ostrý pokus skončil `400`; hlášení už nese text od brány, ale nikdo
  ho zatím nepustil znovu. **Tohle je otevřený konec.**
- Twilio účet zůstává (nic nestojí, kredit se při zavření vrací, je to jediná cesta
  k WhatsAppu). WhatsApp by šel bez paušálu, ale chce číslo mimo běžný WhatsApp,
  Meta Business Portfolio a schválenou šablonu — nepostaveno.

**Heslo smí být 4místný PIN** a k němu **zámek přihlášení** (migrace `011`): 5 marných
pokusů na účet nebo 15 z jedné IP v okně 15 minut → `429` s vysvětlením. Ověřeno naostro,
testovací řádky smazány. Zámek je krátký schválně, jinak by šel trenér vyřadit z aplikace.

**Přihlášení i obnova berou e-mail.** E-mail v poli „Kdo jsi" dřív tiše propadl do větve
společného hesla — člověk si tak přenastavil něco jiného, než myslel, a nechápal, proč mu
PIN nebere. Obnova navíc rozlišuje: nesmyslný tvar (400) a vyčerpanou brzdu (429) řekne
nahlas, o existenci účtu dál mlčí; stránka nového hesla píše, čí heslo nastavuje.

**Lidé: export a import.** `.xlsx` skládá Worker sám (`worker/src/xlsx.ts`, ZIP + XML),
protože CSV nenese formát buněk a Excel dělal z telefonu `4,20605E+11`. Ověřeno Excelem
přes COM: formát `@`, hodnota doslova. Import bere `.xlsx` i `.csv` (sešit se rozbaluje
v prohlížeči kvůli kódování), běží nejdřív nanečisto a hesla ani hodnocení nemění.

**České řazení** přes `Intl.Collator('cs')` — SQLite řadil podle bajtů, takže Říčka
a Šplíchal padali za Weisse.

**Verze se čte z bundlu, ne z assetu.** Na custom doméně držela cache zóny starý
`version.json` a lišta po nasazení hlásila předchozí commit.

**Nová záložka 📖 Dokumentace** (CS i EN, `web/src/dokumentace.js`) a srovnané `docs/`.

**Zbývá:** ověřit účet GoSMS a dobít kredit, pak doladit to `400`; zadat první hodnocení;
pozvánky pro Julka a Masa a pak `DELETE FROM auth`; doplnit pozice zbylým hráčům.

---

## 2026-08-06 (11) — SMS kanál, log komunikace, Twilio naráží na české Sender ID

**Hotové a nasazené:**

- **SMS kanál** (migrace `009_sms.sql`): telefon a přepínač u osoby, volání Twilio API,
  odstranění diakritiky (háčky půlí segment ze 160 na 70 znaků = dvojnásobná cena),
  denní strop jako pojistka proti smyčce.
- **Provider je přepínač**: `console` jen loguje, `twilio` odesílá. Přepnuto na `twilio`.
- **Log komunikace** — tabulka `komunikace`, posledních sto pokusů vidět v Nastavení.
  Metadata a kód chyby, ne obsah; u SMS text kvůli segmentům. **Tokeny nikdy.**
- `/api/sms/ucet` — kontrola přihlašovacích údajů bez odeslání.

**Kde to stojí:** Twilio přijme požadavek, ale odmítne odeslat s `21612`.
Podle pravidel Twilia pro ČR od 14. 7. 2025 **T-Mobile a O2 blokují neregistrované Sender ID**.
Geo Permissions pro Česko bylo zapnuté, na tom to nebylo.

**Rozhodnutí: `SKRicmanice` nepoužívat.** Registrace jména stojí 30 $/měsíc a nejde sdílet
mezi projekty; české číslo je 12 $/měsíc, funguje hned a jedno stačí pro všechny aplikace.
Značka patří do těla zprávy. Zatím se **nekupuje nic** — SMS na nikoho nečekají, Telegram jede.

**Cestou opraveno:** dvě rady, které byly špatně — že registrace je zdarma (není, 30 $/měsíc)
a že číslo není potřeba (v Česku bez registrace je).

**Pro příště:** Auth Token má 32 znaků, API Key SID 34 a začíná `SK`. Ta záměna stála dvě kola;
proto `/api/sms/ucet` vrací délku tokenu.

---

## 2026-08-06 (10) — obrazovky ke shodě a k historii verzí

- **Záložka Shoda**: tabulka osa × trenér, sloupec „shoda / rozchází se" s velikostí rozdílu,
  výběr výsledku (předvyplněný jen tam, kde se shodli), slovní bloky všech trenérů jako
  podklad a jedno finální znění na list.
- **Blind guard ověřen naostro**: povinný trenér, který ještě neodevzdal, dostane
  `{"cekaNaTebe": true}` a **žádná cizí čísla**.
- **Historie verzí** v Porovnání: všechny verze s datem a autorem, tisk kterékoli
  (`listy.html?verze=<id>`) a posun mezi dvěma vybranými se šipkami.
- Zaškrtávátko „jeho hodnocení je nutné" u trenéra; výchozí Maxla a Julek.

---

## 2026-08-06 (9) — dokumentace srovnaná, cron potvrzený, SMS do backlogu

- Celá dokumentace projita a srovnána se skutečností: README, uživatelská příručka,
  TECHNICAL, BUILD (secrety + pořadí migrací), RUNBOOK, known_good (doplněny záznamy
  o ověření pozic, notifikací a účtů).
- **Cron je uvolněný a běží** — slot dal `pojistky-watch`, deploy hlásí `schedule: 0 * * * *`.
  V TECHNICAL opraveno tvrzení „cron je vypnutý", které už nebyla pravda.
- **SMS jako třetí kanál** zapsána do backlogu (TECHNICAL §9b) — nestaví se teď.
  Poznámky: cenu neřešit (desetikoruny měsíčně), providera jako přepínač, v dev režimu
  `console` provider, Twilio trial na ověřená čísla, BulkGate/GoSMS jako české alternativy,
  tabulka v D1 + rate limit jako u obnovy hesla.

**Zbývá:**

1. Zadat hodnocení (aplikace je připravená, kádr nahraný, hodnocení zatím žádné).
2. Julek a Maso nemají heslo ani kanál — až budou mít Telegram nebo ověřený e-mail,
   poslat pozvánku z Lidí. Pak zrušit společné heslo (`DELETE FROM auth`).
3. Doplnit pozice zbylým hráčům (má je zatím jen Ferda).
4. SMS kanál — viz backlog.

---

## 2026-08-06 (8) — účty po lidech, přezdívky, favicon

**Účty po lidech** (migrace `007_ucty.sql`): každý trenér má `login` a vlastní heslo
(PBKDF2 u jeho řádku). Session nese `id` a `jmeno` → aplikace ví, kdo je přihlášený.
**Obnova hesla je pro každého zvlášť** a chodí na jeho vlastní kanál (Telegram nebo e-mail),
ne na globální seznam ze secretu. Administrace umí poslat trenérovi odkaz na nastavení hesla.

Přechod: společné heslo v `auth` zůstává funkční (prázdné přihlašovací jméno), aby nešlo
vyzamknout celý tým. Až budou mít všichni svoje, smazat `DELETE FROM auth`.

**Ověřeno naživo:** pozvánka Maxlovi dorazila na Telegram, nastavení hesla odkazem,
přihlášení `maxla` + heslo → session zná jméno, cizí účet stejné heslo nepustí (409/401),
odkaz je jednorázový (410), společné heslo pořád funguje.

**Stav hesel:** Maxla má vlastní heslo (stejný řetězec jako společné, ať si nepamatuje dvě).
Julek a Maso zatím bez hesla — pošli jim pozvánku z Lidí, až budou mít Telegram nebo
ověřený e-mail.

**Drobnosti:** přezdívky se ukazují všude, kde se vypisují jména (v kádru jsou tři Trnkové);
favicon (`web/favicon.svg`) místo globusu v záložce; klik na název klubu vede na úvod.

---

## 2026-08-06 (7) — vlastní doména hodnoceni.maxferit.cz

**Živě na https://hodnoceni.maxferit.cz.** Custom domain přímo ve `wrangler.jsonc`
(`routes` s `custom_domain: true`); zóna je na stejném účtu, takže si Cloudflare DNS
i certifikát založil sám při deployi. `hodnoceni-hracu.bass443.workers.dev` zůstává
funkční jako záloha.

Ověřeno na nové adrese: `/health`, `/api/version`, přihlášení (cookie se `Secure`),
načtení kádru (22 osob), stránky `/`, `/listy.html`, `/obnova/*`.

Do `vars` přibylo `ZAKLADNI_URL` — odkazy v notifikacích vznikají v cronu, kde není
request, ze kterého by šla adresa odvodit.

**Cestou nastal blok:** wrangler se uprostřed práce odhlásil (`whoami` → not authenticated),
credentials se navíc přesunuly z `AppData\Roaming\xdg.config\.wrangler` do
`C:\Users\trnkam\.wrangler`. Vyřešeno tím, že se uživatel znovu přihlásil (`wrangler login`).

**Zjištění k cronu:** `sk-ricmanice-taktika` **není Worker** (Cloudflare vrací
„This Worker does not exist on your account", code 10007) — je to Pages projekt a `[triggers]`
v jeho `wrangler.toml` je mrtvý zápis. Uvolněním nic nezískáme. Skutečné držitele slotů viz
níž; rozhodnutí (Workers Paid vs. piggyback na job-watch) je na zadavateli.

---

## 2026-08-06 (6) — souhrnné notifikace (Telegram ověřený, cron blokovaný limitem)

**Hotové** (migrace `005_notifikace.sql`, `006_notif_intervaly.sql`, nasazeno):

- Kanály se zapínají u konkrétního trenéra v Lidech: e-mail, Telegram chat id, dva přepínače.
  Tlačítko dotáhne chat id z Telegramu, druhé pošle zkušební zprávu.
- **Dva nezávislé intervaly** místo „jak často": `notifDnyZmeny` (když se něco děje, souhrn
  nejvýš jednou za N dní, výchozí 3) a `notifDnyTicho` (když se nic neděje, po N dnech přijde
  „nic se nezměnilo", výchozí 14). Druhý je liveness signál — z ticha jinak nejde poznat,
  jestli nikdo nic nedělá, nebo se něco rozbilo.
- Zpráva nese jen „kdo a co" + stav období. **Nikdy známky ani slovní bloky.**
- Události se označí za odeslané, jen když se aspoň někomu povedlo doručit.
- `/api/kanaly`, `/api/notifikace/stav`, `/api/notifikace/ted` (poslat teď).

**Telegram ověřený naostro:** bot `@skricmanice_bot`, chat id Maxly uložené, doručení
potvrzené uživatelem. Julek a Maso mají notifikace vypnuté (nevíme, jestli Telegram používají).

**Ověřeno:** 13 testů proti nasazené aplikaci, 0 chyb — vznik událostí při hodnocení
i sebehodnocení, odeslání souhrnu, zpráva „nic se nezměnilo", uložení intervalů.
Testovací data smazána.

**BLOKUJE: cron.** `wrangler.jsonc` má trigger zakomentovaný — Workers Free dovolí
**5 cron triggerů na celý účet** a ty jsou vyčerpané (job-watch, pojistky-watch,
sk-ricmanice-taktika…). Deploy s ním padá na `code: 10072`. Do vyřešení se souhrn posílá
jen tlačítkem „Poslat souhrn teď" v Nastavení. Řešení: Workers Paid, uvolnit cron jinde,
nebo nechat existující cron jiného Workeru pingnout tenhle.

---

## 2026-08-06 (5) — N pozic u hráče + šablona os na hodnocení

**Hotové** (migrace `004_pozice.sql`, nasazeno):

- **Pozic může být N.** `players.pozice` je JSON pole klíčů (`["brankar","levy_bek",…]`),
  vybírá se zaškrtávátky v záložce Lidé, tiskne se na list. `post` zůstal jako volný text
  pro funkci („Kapitán").
- **Šablona os se přesunula z osoby na hodnocení.** Vybírá se ve formuláři; hráč, který
  chytá i hraje v poli, může mít v jednom období obojí a dostane dva listy. `players.sablona`
  je už jen výchozí volba.
- **Token na sebehodnocení nese šablonu** (`tokens.sablona`), aby hráč vyplňoval tytéž osy,
  které známkoval trenér. Když se rozejdou, porovnání to pozná a řekne (`jinaSablona`),
  místo aby tvrdilo „hráč ještě nevyplnil".
- `/api/listy` vrací jeden list na kombinaci hráč × šablona; `/api/porovnani` i `/api/trend`
  pracují v rámci jedné šablony.

**Ověřeno naživo:** 25 testů proti nasazené aplikaci, 0 chyb — včetně dvou listů pro jednoho
hráče, odmítnutí polních os v brankářské šabloně a rozpoznání nesouhlasné šablony.
Testovací data smazána, kádr (22 osob) zůstal.

**Opraveno mimochodem:** `/api/trend` neměl `.bind(player_id)` — endpoint padal při každém
volání ze záložky Porovnání. Nebylo to vidět, protože testy trend nevolaly.

**Rozpracované:** notifikace na e-mail a Telegram. Migrace `005_notifikace.sql` je napsaná
(tabulka `udalosti`, kanály u osoby, čas souhrnu v nastavení), **zatím neaplikovaná**.
Souhrn má chodit cronem podle času v Nastavení, ne po jedné zprávě za událost.
Čeká se na token Telegram bota.

---

## 2026-08-06 (4) — kádr v databázi + obnova zapomenutého hesla

**Hotové:**

- **Kádr nahraný:** 19 hráčů (jména sedí s `ricmanice_hraci.txt`) + 3 trenéři
  (Maxla, Julek, Maso). Brankářskou šablonu mají Peša Robin a Trnka Ferdinand.
- **Heslo přestěhováno z Worker secretu do D1** jako PBKDF2 hash (migrace `003_auth.sql`).
  Bez toho nešlo heslo změnit z aplikace — Worker si secret sám přepsat nemůže.
  `ADMIN_HESLO` slouží už jen k prvnímu přihlášení; nouzové odemčení `DELETE FROM auth`.
- **Nastavení → Změna hesla** a **přihlašovací stránka → Zapomenuté heslo**
  (jednorázový odkaz mailem, platnost 15 min, po použití padají všechny ostatní odkazy).
- E-mail přes **Cloudflare Email Sending**, binding `[[send_email]] name = "EMAIL"`,
  odesílatel `hodnoceni@maxferit.cz` — stejný mechanismus jako JobWatch.

**Ověřeno naživo:** 27 testů obnovy hesla, 0 chyb (včetně jednorázovosti odkazu, brzdy na
3 žádosti za 15 minut a toho, že odpověď neprozradí povolené adresy). Cloudflare maily
přijal k odeslání — v `wrangler tail` není `E_SENDER_NOT_VERIFIED` ani `E_RECIPIENT_NOT_ALLOWED`.

**Dvě chyby nalezené a opravené při ověřování:**

1. workerd nedovolí PBKDF2 nad **100 000 iterací** („iteration counts above 100000 are not
   supported") — nastavení hesla končilo na 500. Sníženo na 100 000.
2. při přepisu přihlašování se ztratila hláška „na serveru není nastavené heslo" a server
   vracel mlčky „špatné heslo". Vráceno jako samostatný stav (500 s vysvětlením).

**Nedovysvětleno:** secret `ADMIN_HESLO` přestal odpovídat hodnotě, se kterou byl nastavený
(přihlášení hlásilo špatné heslo, ačkoli hodnota seděla). Po `wrangler secret put` se stejnou
hodnotou začalo fungovat. Příčinu se nepodařilo doložit; heslo od té doby žije v databázi,
takže na secretu už provoz nestojí.

**Zbývá:**

1. **Kumulovaná pozice** (Ferda je brankář i hráč v poli) — přesunout šablonu z osoby na
   hodnocení. Návrh je popsaný, čeká na odsouhlasení.
2. **Notifikace** na Telegram/e-mail při novém hodnocení, zapínatelné per osoba.
3. Vlastní doména pod maxferit.cz.

---

## 2026-08-06 (3) — NASAZENO do cloudu + frontpage (čas, commit, dark/light, CS/EN)

**Živě na https://hodnoceni-hracu.bass443.workers.dev**

**Hotové:**

- D1 `hodnoceni-hracu` (EEUR, id `8fe85587-7409-4b95-83f3-d23f340aa2ad`), schéma nahrané,
  secrety `ADMIN_HESLO` a `SESSION_KEY` nastavené, Worker i statické soubory nasazené.
- **Horní lišta na každé stránce:** čas, commit běžící verze (celý hash v tooltipu),
  přepínač tmavý/světlý vzhled, přepínač CS/EN. Volby se pamatují v `localStorage`.
- **Kompletní překlad CS/EN** — `web/src/i18n.js`, včetně popisů os, kotev škály, formulací
  v první osobě a celého tištěného listu. Jazyk jde vynutit adresou `?lang=en`.
- **Verze do buildu** — `scripts/gen-version.mjs` běží jako `predeploy`, zapisuje commit
  do `web/version.json`, aplikace ho čte přes `/api/version`.
- Server přestal vracet texty: posílá klíče (`prava`, `hrac`, `minule`) a překládá prohlížeč.
  Přepnutí jazyka proto nic nedotahuje z databáze.
- Bezpečnostní drobnosti pro veřejnou adresu: prodleva 700 ms u špatného hesla,
  `preview_urls: false`.

**Ověřeno naživo proti nasazené aplikaci:** 48 API testů (0 chyb), vykreslení listů z ostrých
dat česky i anglicky, headless prohlížeč na `/` i `/h/<token>` v obou jazycích. Detaily
v `known_good.md`.

**Databáze je prázdná.** Testovací data byla po ověření smazána, kádr se zadává v aplikaci
v záložce Lidé. `migrations/002_seed.sql` je proto schválně prázdný (jen zakomentovaná šablona).

**Zbývá:**

1. Zadat reálný kádr (19 hráčů) v záložce Lidé.
2. Odhodnotit, rozeslat odkazy na sebehodnocení, projít Porovnání, vytisknout.
3. Navěsit vlastní doménu pod maxferit.cz (custom domain u Workeru, DNS je na stejném účtu).

**Otevřená otázka:** mají mít k listu přístup rodiče, nebo jen hráči?

---

## 2026-08-06 (2) — aplikace: fáze 2 + 3 hotové, ověřené lokálně

**Hotové:**

- **Worker** (`worker/src/index.ts`) — API, autorizace, D1. Obsluhuje i statické soubory
  z `web/` přes `assets` binding: jeden deploy, jedna doména, žádné CORS.
- **Aplikace trenéra** (`web/index.html` + `app.js`) — záložky Lidé, Hodnotit, Listy,
  Porovnání, Odkazy, Nastavení.
- **Sebehodnocení hráče** (`/h/<token>`) — osy formulované v první osobě, nepovinná otázka
  „Na čem chceš pracovat?".
- **Tiskové listy z databáze** (`listy.html`) — volitelný druhý polygon: trenér minule /
  sebehodnocení hráče / žádný.
- **Tolerance** v Nastavení: řeší se jen osy, kde je rozdíl větší; ukládá se znaménko
  (+ slepé místo / − sebedůvěra), nad 3 rozcházející se osy aplikace doporučí vybrat 2–3 témata.
- Schéma rozšířeno: `players.role` (hráč/trenér), `evaluations.autor_id`,
  `evaluations.poznamka`, seed nastavení.

**Ověřeno naživo** proti běžícímu Workeru a lokální D1 — 45 API testů + vykreslení listů
z ostrých dat + headless prohlížeč. Detaily a čísla v `known_good.md`.

**Chyba, která se cestou našla a opravila:** Cloudflare asset server přesměrovával `/h.html`
na `/h`, čímž z adresy zmizel token sebehodnocení a hráči se stránka neotevřela. Řešení:
`html_handling: "none"` v `wrangler.jsonc` a mapování cest ve Workeru.

**Změna oproti fázi 1:** offline generátor (`frontend/tisk.html` + `data/kadr.js`) zrušen,
nahradila ho aplikace. Data by jinak žila na dvou místech. Samostatný referenční list
`docs/vzor-list.html` zůstává — otevře se dvojklikem a je pořád zdrojem pravdy pro geometrii.

**Rozpracované:** nic.

**Zbývá — nejbližší kroky:**

1. **Nasadit.** Chybí `wrangler d1 create` + zapsat `database_id` do `wrangler.jsonc`
   + `wrangler secret put ADMIN_HESLO` a `SESSION_KEY` + `npm run deploy`. Postup v `docs/BUILD.md`.
2. **Doplnit reálný kádr** (19 hráčů) — buď v aplikaci (Lidé), nebo v `migrations/002_seed.sql`.
3. Projít aplikaci klikáním a odhodnotit kádr; pak nasadit vlastní doménu pod maxferit.cz.

**Otevřená otázka:** mají mít k listu přístup rodiče, nebo jen hráči?

---

## 2026-08-06 (1) — založení projektu, fáze 1

**Hotové:**

- Repozitář založen podle `project-standard`, **private** (obsahuje osobní údaje nezletilých).
- Fáze 1 — tiskový generátor listů A4 z lokálního souboru, ověřený headless prohlížečem
  (2 listy, 2 SVG, 14 polygonů).
- Radar převzatý beze změny z `docs/vzor-list.html`.
- `migrations/001_init.sql` podle zadání, dokumentace v `docs/`.

**Rozhodnuto:**

- admin auth = jedno heslo jako Worker secret + podepsaná session cookie
- doména = nakonec vlastní pod `maxferit.cz`
- osobní data (jména i posudky) jdou do repa → repo musí zůstat private
