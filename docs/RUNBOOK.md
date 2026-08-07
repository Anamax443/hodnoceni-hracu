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
3. **Odkazy** → vygenerovat pro všechny hráče, rozeslat jednotlivě.
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
| „Tenhle účet ještě nemá nastavené heslo" | trenér má login, ale heslo si nenastavil | Lidé → *Poslat odkaz na nastavení hesla* |
| souhrn nechodí | vypnutý, nikdo nemá kanál, nebo neuplynul interval | Nastavení → stav rozesílky to napíše; *Poslat souhrn teď* obejde interval |
| Telegram: „chat not found" | trenér botovi nikdy nenapsal, nebo špatné chat id | ať napíše `@skricmanice_bot`, pak Lidé → *Dotáhnout chat id* |
| e-mail: `E_RECIPIENT_NOT_ALLOWED` | adresa není ověřená destination address | ověřit v Cloudflare (Email Routing) |
| e-mail: `E_SENDER_NOT_VERIFIED` | doména odesílatele není onboardovaná | Cloudflare → Email Service → Email Sending |
| přihlášení hlásí „moc špatných pokusů" (429) | zámek po 5 marných pokusech na účet | počkat 15 minut, nebo si nechat poslat odkaz *Zapomenuté heslo*; nouzově `DELETE FROM prihlaseni_pokusy` |
| PIN nebere, ačkoli byl právě nastavený | odkaz na obnovu měnil **společné** heslo, ne účet | přihlásit se s prázdným „Kdo jsi", nebo si nechat poslat nový odkaz na svoje jméno / e-mail — stránka nového hesla píše, čí heslo nastavuje |
| SMS neodchází, v logu `VYPNUTO` | `smsAktivni = 0`, mimořádný kanál je vypnutý | Nastavení → *Povolit odesílání SMS* |
| SMS: `NO_CREDENTIALS` / `NO_CHANNEL` | chybí `GOSMS_*` secrety nebo `GOSMS_KANAL` | doplnit dle `docs/BUILD.md`; *SMS nanečisto* to ověří zdarma |
| GoSMS vrací `400` u ostrého odeslání | účet neověřený a bez kreditu (odesílatel `GoSMS-test`) | ověřit účet v portálu a dobít kredit; text chyby je v logu komunikace |
| v Excelu je z telefonu `4,20605E+11` | otevřel se **CSV**, které formát buněk nenese | použít **Export do Excelu** (`.xlsx`), tam je sloupec Text |
| import z Excelu udělal duplikáty | v souboru chyběl sloupec `id` a lišilo se jméno | v souboru nechat `id`; párování je id → login → jméno + role |
| příkazový řádek hlásí, že nerozumí | jméno není v kádru, nebo je model vypnutý | zkus příjmení či přezdívku; volnější věty umí až model (Nastavení → Jazykový model) |
| model hlásí vyčerpaný kredit u Claude | na účtu Anthropic není kredit | nic dělat nemusíš — povel dokončí model zdarma a důvod je v logu; trvale: dobít kredit, nebo přepnout na Workers AI |
| model odpovídá `5028 … was deprecated` | Cloudflare model vyřadil | vybrat jiný v Nastavení; seznam v kódu (`AI_MODELY`) srovnat podle `npx wrangler ai models` |
| hromadné hodnocení někoho vynechalo | ten hráč nemá od tebe v období hodnocení | vypíše se jmenovitě — ohodnoť ho jednotlivě, pak hromadné doplní zbytek |
| srovnání hráčů je prázdné | vybraní nemají hodnocení tou šablonou v období | zkontroluj šablonu a období; kdo chybí, je vypsaný pod tabulkou |
| tiskne se druhá prázdná stránka | slovní blok se přelil, nebo vlastní CSS přebilo tiskovou sekci | zkrátit text; tisková pravidla musí zůstat na **konci** `web/src/styl.css` |
| hráč tvrdí, že vyplnil, ale nevidím to | vyplnil odkaz na jiné období | zkontroluj `období` v Nastavení |
| Porovnání hlásí, že něco chybí | jedna strana ještě nevyplnila | tabulka se ukáže, až budou obě |

---

## 4. Tisk vypadá špatně

| Problém | Příčina | Oprava |
|---|---|---|
| bílý list bez modrého pruhu a barevných bloků | vypnutá grafika na pozadí | v dialogu tisku zapnout **Grafika na pozadí / Background graphics** |
| hráč se přelil na dvě stránky | dlouhý slovní blok | zkrátit text, nebo ubrat cíl |
| useknuté okraje | vlastní okraje v dialogu | nastavit okraje na **Výchozí** — stránka si je řídí sama (A4, 12 mm) |
| „Nejsi přihlášený" místo listů | vypršela session | přihlásit se v aplikaci a otevřít listy znovu |

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
- Aplikace je na veřejné adrese. Špatné heslo má 700ms prodlevu, aby hádání ve smyčce
  nebylo praktické; náhledová URL jednotlivých verzí jsou vypnutá.
