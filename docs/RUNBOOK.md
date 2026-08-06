# RUNBOOK — provoz

Co se dělá pravidelně a co dělat, když něco nesedí.

---

## 1. Půlroční rutina (2× za sezónu)

1. V `frontend/data/kadr.js` přepiš `NASTAVENI.obdobi` a `NASTAVENI.cileNadpis`
   (např. „zimní hodnocení" / „Na čem makáme do jara").
2. U každého hráče přesuň staré `hodnoceni` do `predchozi` a nové `hodnoceni` **nech
   prázdné**, dokud neoznámkuješ.
3. Oznámkuj naslepo — bez koukání na `predchozi`. To je celý smysl.
4. Dopiš tři slovní bloky a 2–3 cíle.
5. Vytiskni (`frontend/tisk.html` → tlačítko nahoře).
6. `git commit` + `git push`. Tím vzniká historie — jiná záloha není potřeba.
7. Rozdej listy jednotlivě, ne v šatně na hromadě.

---

## 2. Když se listy nevykreslí

Nahoře na stránce je červený rámeček s hláškou. Podle ní:

| Hláška obsahuje | Příčina | Oprava |
|---|---|---|
| `HRACI is not defined` | syntaktická chyba v `kadr.js` — soubor se vůbec nenačetl | nejčastěji chybějící nebo přebývající čárka mezi bloky hráčů |
| `neznámou šablonu` | překlep v `sablona` | povoleno jen `'pole'` nebo `'brankar'` |
| `Cannot read properties of undefined` | chybí `NASTAVENI` | zkontroluj začátek `kadr.js` |

Stránka je prázdná a nic nehlásí → soubor `kadr.js` je prázdný nebo je `HRACI` prázdné pole.

Osa je vykreslená na nule, ačkoliv jsi ji známkoval → překlep v názvu klíče osy. Seznam
platných klíčů je v `frontend/src/sablony.js`.

---

## 3. Tisk vypadá špatně

| Problém | Příčina | Oprava |
|---|---|---|
| bílý list bez modrého pruhu a barevných bloků | vypnutá grafika na pozadí | v dialogu tisku zapnout **Grafika na pozadí / Background graphics** |
| hráč se přelil na dvě stránky | dlouhý slovní blok | zkrátit text, nebo ubrat cíl |
| useknuté okraje | vlastní okraje v dialogu | nastavit okraje na **Výchozí** — stránka si je řídí sama (A4, 12 mm) |
| graf je rozmazaný | tisk do PDF v nízkém rozlišení | SVG je vektorové, zkontroluj nastavení PDF tiskárny |

---

## 4. Změna os

**Nedělat uprostřed sezóny.** Jiný počet vrcholů = jiný tvar polygonu, hodnocení už nejde
porovnat s předchozím obdobím.

Když je změna nutná, tak mezi sezónami: upravit `frontend/src/sablony.js` a v `kadr.js`
u všech hráčů odpovídajícím způsobem přejmenovat klíče. Ve fázi 2+ se stará hodnocení
vykreslují šablonou, se kterou byla pořízena (sloupec `evaluations.sablona`), takže se
historie nerozbije — ale porovnávat napříč šablonami stejně nejde.

---

## 5. Nový hráč / odchod hráče

- **Přišel:** zkopíruj blok hráče v `kadr.js`, přepiš, `predchozi: null`.
- **Odešel:** `aktivni: false`. Nemazat — historie hodnocení má zůstat.

---

## 6. Fáze 2+ (až bude nasazeno)

### Aplikace neodpovídá

```
GET https://<worker>/health
```

Když nevrátí `{status:"ok"}`, podívej se na `npx wrangler tail` a do Cloudflare dashboardu
(Workers → Logs).

### Generování odkazů pro sebehodnocení

Admin `/tokeny` → tlačítko u hráče → zkopírovat odkaz → poslat hráči. Odkazy se rozesílají
ručně, e-mail aplikace neumí a nebude.

Token je jednorázový. Druhé odeslání se odmítne. Když hráč odkaz ztratí, starý zneplatnit
a vygenerovat nový.

### Záloha databáze

```powershell
npx wrangler d1 export hodnoceni-hracu --remote --output=zaloha-RRRR-MM-DD.sql
```

Před každým půlročním kolem. Obsahuje osobní údaje nezletilých — neukládat na sdílené disky.

---

## 7. Bezpečnostní minimum

- Repozitář **private**. Obsahuje jména, známky a slovní posudky nezletilých.
- Vytištěné listy jsou hráčova věc. Ne na nástěnku, ne do skupinového chatu.
- Odkaz na sebehodnocení posílat jen konkrétnímu hráči, ne do týmové skupiny — kdo odkaz
  má, může vyplnit sebehodnocení za něj.
- Hodnocení jednoho hráče se nikdy neukazuje jinému.
