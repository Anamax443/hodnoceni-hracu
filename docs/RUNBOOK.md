# RUNBOOK — provoz

Co se dělá pravidelně a co dělat, když něco nesedí.

**Adresa:** https://hodnoceni-hracu.bass443.workers.dev
**Heslo trenéra:** v repozitáři není. Mění se v aplikaci — **Nastavení → Změna hesla**.

**Zapomenuté heslo:** na přihlašovací stránce tlačítko *Zapomenuté heslo* → zadat adresu →
přijde jednorázový odkaz (platí 15 minut, funguje jednou). Odkaz chodí jen na adresy
v secretu `OBNOVA_EMAILY`; teď je tam `maxla@seznam.cz`. Nová adresa musí být nejdřív
ověřená v Cloudflare (Email Routing → destination addresses), pak
`npx wrangler secret put OBNOVA_EMAILY`.

**Když se ztratí heslo i přístup k té schránce:**

```powershell
npx wrangler d1 execute hodnoceni-hracu --remote --command="DELETE FROM auth"
npx wrangler secret put ADMIN_HESLO
```

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

Ulož hodnocení znovu se správnými hodnotami. Databáze je append-only — vznikne nový záznam
a aplikace pracuje s tím posledním. Původní zůstane v historii, což je záměr.

---

## 8. Bezpečnostní minimum

- Repozitář i databáze **private**. Jde o jména, známky a slovní posudky nezletilých.
- Vytištěné listy jsou hráčova věc. Ne na nástěnku, ne do skupinového chatu.
- Odkaz na sebehodnocení posílat jen konkrétnímu hráči — kdo odkaz má, může vyplnit za něj.
- Hodnocení jednoho hráče se nikdy neukazuje jinému.
- Zálohy (`zaloha*.sql`) neukládat na sdílené disky.
- Admin heslo je jedno společné. Když se změní tým trenérů, změň heslo
  (`npx wrangler secret put ADMIN_HESLO`).
- Aplikace je na veřejné adrese. Špatné heslo má 700ms prodlevu, aby hádání ve smyčce
  nebylo praktické; náhledová URL jednotlivých verzí jsou vypnutá.
