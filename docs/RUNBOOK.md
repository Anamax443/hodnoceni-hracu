# RUNBOOK — provoz

Co se dělá pravidelně a co dělat, když něco nesedí.

**Adresa:** https://hodnoceni.maxferit.cz
(záloha: `https://hodnoceni-hracu.bass443.workers.dev`)
**Přihlášení:** každý trenér má svoje jméno (`maxla`, `julek`, `maso`) a svoje heslo.
Hesla nejsou v repozitáři ani v secretech — jsou to hashe u řádku v `players`.

**Zapomenuté heslo:** na přihlašovací stránce *Zapomenuté heslo* → přihlašovací jméno →
odkaz přijde na Telegram nebo e-mail toho člověka (platí 15 minut, funguje jednou).

**Nový trenér / trenér bez hesla:** Lidé → vyplnit přihlašovací jméno a Telegram/e-mail →
Uložit → *Poslat odkaz na nastavení hesla*.

**Přechodné společné heslo** (prázdné přihlašovací jméno) zatím platí, aby nešlo vyzamknout
celý tým. Až budou mít všichni svůj účet, zrušit:

```powershell
npx wrangler d1 execute hodnoceni-hracu --remote --command="DELETE FROM auth"
```

**Nouzové odemčení, když se ztratí všechno:** nastavit heslo přímo do řádku nejde (je hashované),
ale jde vrátit společné heslo — `DELETE FROM auth` a pak `npx wrangler secret put ADMIN_HESLO`;
po přihlášení rozeslat trenérům nové odkazy.

---

## 1. Půlroční rutina (2× za sezónu)

1. **Záloha** — `npm run db:export`.
2. **Nastavení** → přepiš `období` (např. „2025/2026 jaro") a nadpis nad cíli.
3. **Odkazy** → v tabulce *Komu vygenerovat* nechat zaškrtnuté všechno (nebo odškrtat, koho
   teď nechceš) → *Vygenerovat vybrané odkazy* → **rozeslat jednotlivě**. Aplikace odkaz
   neposílá, kopíruje se tlačítkem.
4. **Hodnotit** → projít kádr. Naslepo, bez koukání na minulé kolo.
5. Počkat, až hráči vyplní (stav vidíš v Odkazech i v Listech).
6. **Porovnání** → u každého vybrat 2–3 témata k rozhovoru.
7. **Listy** → druhý polygon „sebehodnocení hráče" → tisk → rozhovory.

---

## 1b. Kdo je v týmu

Databáze začíná prázdná. Lidé se zadávají v aplikaci v záložce **Lidé** — hráči
(hodnotí se, tisknou se jim listy) i trenéři (nehodnotí se, jen se u hodnocení
zaznamená, kdo ho pořídil).

## 2. Aplikace neodpovídá

```
GET https://hodnoceni-hracu.bass443.workers.dev/health
```

Když nevrátí `{"status":"ok"}`:

```powershell
npx wrangler tail              # zive logy Workeru
```

Plus Cloudflare dashboard → Workers → Logs. `observability` je v `wrangler.jsonc` zapnutá.

---

## 3. Časté situace

| Co se děje | Příčina | Co s tím |
|---|---|---|
| „Nepřihlášen" hned po přihlášení | session cookie se neuloží | přes HTTP se `Secure` cookie neposílá — v produkci musí být HTTPS |
| trenér se nemůže přihlásit | špatné nebo nenastavené `ADMIN_HESLO` | `npx wrangler secret put ADMIN_HESLO`, pak `npm run deploy` |
| „Na serveru není nastaveno ADMIN_HESLO" | secret chybí úplně | totéž |
| všichni se odhlásili najednou | změnil se `SESSION_KEY` | staré cookies přestanou platit, stačí se přihlásit znovu |
| commit v liště nesedí s gitem | nasazovalo se s necommitnutými změnami | `/api/version` má `cisto: false`; commitnout a nasadit znovu |
| aplikace je celá anglicky | jazyk prohlížeče nebo dřívější volba | tlačítko **Čeština** v horní liště, nebo adresa s `?lang=cs` |
| po přepnutí jazyka zmizely rozepsané známky | u hráče se zachovají, u trenéra ne | trenér ať si jazyk zvolí před vyplňováním formuláře |
| hráči odkaz nefunguje | vypršel, byl zneplatněn, nebo už ho vyplnil | Odkazy → zneplatnit starý → vygenerovat nový |
| ve formuláři nejde vybrat brankář (nebo leader) | hráč tu šesticí os nemá zaškrtnutou; nabízejí se jen přiřazené | Lidé → hráč → zaškrtnout šablonu → Uložit |
| v hromadném hodnocení chybí půlka kádru | seznam ukazuje jen ty, kdo mají zvolenou šesticí os | přepnout šablonu, nebo ji hráčům zaškrtnout v Lidech |
| API vrátí „Hráč nemá přiřazenou šablonu…" | formulář zůstal otevřený z doby, kdy šablonu ještě měl | obnovit stránku; opravit starší záznam v té šabloně jde dál přes *Upravit ho* |
| „Tenhle účet ještě nemá nastavené heslo" | trenér má login, ale heslo si nenastavil | Lidé → *Poslat odkaz na nastavení hesla* |
| souhrn nechodí | vypnutý, nikdo nemá kanál, nebo neuplynul interval | Nastavení → stav rozesílky to napíše; *Poslat souhrn teď* obejde interval |
| Telegram: „chat not found" | trenér botovi nikdy nenapsal, nebo špatné chat id | ať napíše `@skricmanice_bot`, pak Lidé → *Dotáhnout chat id* |
| e-mail: `E_RECIPIENT_NOT_ALLOWED` | adresa není ověřená destination address | ověřit v Cloudflare (Email Routing) |
| e-mail: `E_SENDER_NOT_VERIFIED` | doména odesílatele není onboardovaná | Cloudflare → Email Service → Email Sending |
| přihlášení hlásí „moc špatných pokusů" (429) | zámek po 5 marných pokusech na účet | počkat 15 minut, nebo si nechat poslat odkaz *Zapomenuté heslo*; nouzově `DELETE FROM prihlaseni_pokusy` |
| PIN nebere, ačkoli byl právě nastavený | odkaz na obnovu měnil **společné** heslo, ne účet | přihlásit se s prázdným „Kdo jsi", nebo si nechat poslat nový odkaz na svoje jméno / e-mail — stránka nového hesla píše, čí heslo nastavuje |
| SMS neodchází, v logu `VYPNUTO` | `smsAktivni = 0`, mimořádný kanál je vypnutý | Nastavení → *Povolit odesílání SMS* |
| SMS: `NO_CREDENTIALS` / `NO_CHANNEL` | chybí `GOSMS_*` secrety nebo `GOSMS_KANAL` | doplnit dle `docs/BUILD.md`; *SMS nanečisto* to ověří zdarma |
| GoSMS vrací `400` u ostrého odeslání | účet neověřený nebo bez kreditu | dobít kredit v portálu — 2026-08-09 to `400` odstranilo; text chyby je v logu komunikace |
| SMS dorazila, ale stála dvakrát tolik | v textu je znak mimo GSM-7 (`–`, `„`, `…`) → UCS-2, segment jen 70 znaků místo 160 | náhled u *Hlavička SMS* v Nastavení viníka pojmenuje; nahradit za `-`, `"`, `...` |
| potřebuju dohledat starší odeslání než posledních 100 | tabulka v Nastavení je jen pohled, ne archiv | *Export do CSV* u logu komunikace — jde bez limitu do celé tabulky |
| v Excelu je z telefonu `4,20605E+11` | otevřel se **CSV**, které formát buněk nenese | použít **Export do Excelu** (`.xlsx`), tam je sloupec Text |
| import z Excelu udělal duplikáty | v souboru chyběl sloupec `id` a lišilo se jméno | v souboru nechat `id`; párování je id → login → jméno + role |
| příkazový řádek hlásí, že nerozumí | jméno není v kádru, nebo je model vypnutý | zkus příjmení či přezdívku; volnější věty umí až model (Nastavení → Jazykový model) |
| model hlásí vyčerpaný kredit u Claude | na účtu Anthropic není kredit | nic dělat nemusíš — povel dokončí model zdarma a důvod je v logu; trvale: dobít kredit, nebo přepnout na Workers AI |
| model odpovídá `5028 … was deprecated` | Cloudflare model vyřadil | vybrat jiný v Nastavení; seznam v kódu (`AI_MODELY`) srovnat podle `npx wrangler ai models` |
| „Model nevrátil text… spotřeboval limit na uvažování" | uvažující model (`gpt-oss`) nedostal dost tokenů | strop se mu zvedá automaticky; když to hlásí dál, vyber model, který neuvažuje (Llama) |
| odpovědi z `gpt-oss` chodí pomalu (5–10 s) | uvažuje nahlas, než odpoví | je to daň za sílu; na povely a rychlé otázky je Llama 70B svižnější (pod 2 s) |
| v odpovědi jsou hvězdičky `**takhle**` | model píše markdown i po zákazu | tučné se překládá, zbytek se zobrazí, jak přišel — na obsah to nemá vliv |
| hromadné hodnocení někoho vynechalo | ten hráč nemá od tebe v období hodnocení | vypíše se jmenovitě — ohodnoť ho jednotlivě, pak hromadné doplní zbytek |
| srovnání hráčů je prázdné | vybraní nemají hodnocení tou šablonou v období | zkontroluj šablonu a období; kdo chybí, je vypsaný pod tabulkou |
| tiskne se druhá prázdná stránka | slovní blok se přelil, nebo vlastní CSS přebilo tiskovou sekci | zkrátit text; tisková pravidla musí zůstat na **konci** `web/src/styl.css` |
| hráč tvrdí, že vyplnil, ale nevidím to | vyplnil odkaz na jiné období | zkontroluj `období` v Nastavení |
| Porovnání hlásí, že něco chybí | jedna strana ještě nevyplnila | tabulka se ukáže, až budou obě |
| na otázku v liště přijde „tomuhle nerozumím" | `aiAnalyzy` je vypnuté (výchozí stav) | Nastavení → *Povolit otázky na kádr*; tabulky v Analýzách jedou i bez toho |
| otázka místo odpovědi otevřela kartu hráče | ve větě je slovo, které trefilo jméno | přidej tázací slovo nebo otazník („**kolik** máme hráčů", „…?“) — podle nich se otázka pozná |
| Analýzy hlásí „Jazykový model je vypnutý" | `aiPoskytovatel = vypnuto` | Nastavení → Jazykový model → Cloudflare Workers AI |
| „Kde se pohledy nejvíc rozchází" je prázdné | hráči nevyplnili sebehodnocení | Odkazy → vygenerovat a rozeslat; bez druhé strany není co porovnávat |
| model v analýze tvrdí něco, co v tabulce není | model formuluje, nepočítá — a mýlí se sebejistě | čísla pod odpovědí platí, věta ne; případně zkusit silnější model |
| vytištěné listy se pletou dohromady | víc šablon vypadá na první pohled stejně | každá šablona má barvu a název v hlavičce — modrá hráč v poli, petrolejová brankář, vínová leader |

---

## 4. Tisk vypadá špatně

| Problém | Příčina | Oprava |
|---|---|---|
| bílý list bez barevného pruhu se jménem a bez barevných bloků | vypnutá grafika na pozadí | v dialogu tisku zapnout **Grafika na pozadí / Background graphics**. Značka šablony v hlavičce je čitelná i bez toho (barevný text a rámeček), takže i takhle vytištěný list poznáš |
| nepoznám, jestli je to brankářský nebo polní list | — | v hlavičce je **název šablony** a barva celého listu: modrá hráč v poli, petrolejová brankář, vínová leader. Kumulovaný list je šedý, protože patří všem šablonám najednou |
| vytisklo se víc listů, než jsem chtěl | zaškrtnuté byly i ostatní šablony toho hráče | v tabulce *Kdo se vytiskne* má **každý řádek vlastní zaškrtávátko** — odškrtni, co nechceš |
| hráč se přelil na dvě stránky | dlouhý slovní blok | zkrátit text, nebo ubrat cíl |
| useknuté okraje | vlastní okraje v dialogu | nastavit okraje na **Výchozí** — stránka si je řídí sama (A4, 12 mm) |
| „Nejsi přihlášený" místo listů | vypršela session | přihlásit se v aplikaci a otevřít listy znovu |

---

## 4b. Hráč, který chytá i hraje v poli (i vede mužstvo)

Lidé → Upravit → v **Šablony os** zaškrtni všechny, které se ho týkají. Každá je
vlastní řada, vlastní odkaz na sebehodnocení i vlastní list — v Listech pak má řádek
na každou z nich a je vidět, která ještě hodnocení nemá.

Chceš to na jednom papíru? Listy → **Kumulovaný list** — radary vedle sebe na jedné
stránce, slovní bloky a cíle složené ze všech šablon. Ověřeno tiskem do PDF: jedna A4.

Odkazy na sebehodnocení se generují na každou šablonu zvlášť (odkaz nese jednu šestici
os), takže takový hráč dostane víc odkazů. Nevyplněný odkaz na tutéž šablonu se
podruhé nezakládá — kolik se jich přeskočilo, hlásí zpráva po generování.

**Tisknout jde i jeden jeho list.** V tabulce *Kdo se vytiskne* má každý řádek (hráč ×
šablona) vlastní zaškrtávátko — když chceš od Ferdy jen brankářský, zbylé dva odškrtni.
Zaškrtávátko v záhlaví označí a odznačí všechno.

---

## 4c. Analýzy — co od nich čekat

**Tabulky se počítají v aplikaci a jsou tam vždycky.** Nejslabší osy kádru, největší
rozpory mezi pohledem trenéra a hráče, kdo ještě nemá hodnocení nebo sebehodnocení.
Nic z toho nikam neodchází a nestojí to nic.

**Ptá se jedním polem — příkazovým řádkem nahoře, z libovolné záložky.** Napiš otázku
běžnou větou („kolik máme hráčů", „u koho je největší rozpor") a odpověď přijde rovnou
v liště; tlačítko *Ukázat čísla* otevře tabulky, ze kterých vznikla. Týž řádek dál plní
povely („Robin", „porovnej Robina a Ferdu") — otázku od povelu pozná podle tázacího slova
nebo otazníku. V Analýzách žádné druhé pole na otázky není.

**Otázky jsou vypnuté, dokud se nezapnou.** Nastavení → *Povolit otázky na kádr*. Je to
zvlášť od volby modelu schválně: příkazovému řádku stačí na povely jména kádru, ale otázce
odejdou **známky, slovní posudky i cíle konkrétních hráčů**. S vypnutými otázkami umí lišta
jen přepínat záložky.

Co od modelu čekat a co ne:

| | |
|---|---|
| co umí | shrnout, na co se zaměřit, u koho je největší rozpor, jak formulovat téma k rozhovoru |
| co neumí | počítat — čísla dostává hotová a má zakázáno cokoli dopočítávat |
| co neví | nic o zápasech, docházce ani o tom, co se stalo na tréninku |
| jak si ho ověřit | čísla jsou v tabulkách pod odpovědí; když věta neodpovídá tabulce, platí tabulka |

Na souhrny stačí model zdarma (Workers AI). Na formulace k rozhovoru je znát rozdíl —
tam se hodí silnější model, případně Claude (`ANTHROPIC_API_KEY`, kaskáda je postavená
a při vyčerpaném kreditu spadne zpátky na model zdarma).

---

## 5. Změna os

**Nedělat uprostřed sezóny.** Jiný počet vrcholů = jiný tvar polygonu, hodnocení už nejde
porovnat s předchozím obdobím.

Když je změna nutná, tak mezi sezónami: upravit `web/src/sablony.js` a nasadit. Stará
hodnocení se vykreslují šablonou, se kterou byla pořízena (`evaluations.sablona`), takže se
historie nerozbije — ale porovnávat napříč šablonami stejně nejde.

---

## 6. Nový hráč / odchod hráče

- **Přišel:** Lidé → vyplnit formulář → Uložit.
- **Odešel:** Lidé → Upravit → odškrtnout *aktivní*. Nemazat, historie má zůstat.

---

## 7. Oprava překlepu v hodnocení

Hodnocení se dá načíst do formuláře, opravit a uložit — vznikne **nová verze**, původní
zůstane v historii. Databáze je dál append-only, nic se nepřepisuje a aplikace pracuje
s tou poslední verzí.

- **Hodnotit** → vyber hráče a sebe v *Hodnotí* → nad formulářem se ukáže, že v tomhle
  období od tebe hodnocení už je, a nabídne *Upravit ho*.
- **Porovnání** → *Historie hodnocení* → *Upravit* u konkrétní verze. Takhle jde opravit
  i hodnocení ze staršího období — nová verze se uloží do období té upravované.

Nabízejí se jen vlastní hodnocení. Sebehodnocení hráče tudy upravit nejde (server to
odmítne) a uzavřená shoda trenérů se řeší v záložce Shoda.

---

## 8. Bezpečnostní minimum

- Repozitář i databáze **private**. Jde o jména, známky a slovní posudky nezletilých.
- Vytištěné listy jsou hráčova věc. Ne na nástěnku, ne do skupinového chatu.
- Odkaz na sebehodnocení posílat jen konkrétnímu hráči — kdo odkaz má, může vyplnit za něj.
- Hodnocení jednoho hráče se nikdy neukazuje jinému.
- Zálohy (`zaloha*.sql`) neukládat na sdílené disky.
- Každý trenér má vlastní heslo. Když někdo z týmu odejde, stačí ho v Lidech
  deaktivovat — tím se přestane moct přihlásit.
- Notifikace nesou jen „kdo a co". Známky ani slovní bloky do Telegramu a e-mailu nepatří.
- **Analýzy jsou jediné místo, odkud data odcházejí ven** — a jen se zapnutým přepínačem
  `aiAnalyzy`. Modelu pak jdou jména, známky, slovní posudky i cíle. Souhrnné tabulky se
  počítají v aplikaci a neposílají nic. Než to zapneš, věz, co posíláš a komu: Workers AI
  běží na Cloudflare (týž účet jako aplikace), Claude je americká třetí strana.
  GDPR záznam o činnosti zpracování a informace pro rodiče zatím **nejsou** — viz STATUS.
- Log komunikace nese u analýzy jen rozsah podkladů (kolik listů, kolik os nad tolerancí),
  nikdy jejich obsah.
- Aplikace je na veřejné adrese. Špatné heslo má 700ms prodlevu, aby hádání ve smyčce
  nebylo praktické; náhledová URL jednotlivých verzí jsou vypnutá.
