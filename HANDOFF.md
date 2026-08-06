# HANDOFF — deník stavu: hodnoceni-hracu

Append-only. Nejnovější záznam nahoru. Slouží k pokračování z jiného počítače / po pauze.

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
