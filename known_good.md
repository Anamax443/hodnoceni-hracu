# known_good — ověřené funkční stavy

Stavy, o kterých je doloženo, že fungovaly. Když se něco rozbije, tohle je bod návratu.
Nový záznam nahoru.

---

## 2026-08-06 — fáze 1, tiskové listy

**Commit:** `6faaf785badc04a72a91fdbc8d5974528fb29b79`

**Co bylo ověřeno:** `frontend/tisk.html` se vykreslí z `frontend/data/kadr.js`
(2 vzoroví hráči — jeden v poli, jeden brankář).

**Jak:** headless Edge nad souborem na disku, kontrola vygenerovaného DOM.

```powershell
$edge = (Get-Command msedge.exe).Source
& $edge --headless --disable-gpu --virtual-time-budget=3000 --dump-dom `
    "file:///D:/git/hodnoceni-hracu/frontend/tisk.html" > dump.html
```

**Naměřeno:**

| Kontrola | Očekáváno | Naměřeno |
|---|---|---|
| `id="stav"` | `Listů k tisku: 2` | `Listů k tisku: 2` |
| `class="page"` | 2 | 2 |
| `<svg` | 2 | 2 |
| `<polygon` | 14 (2 listy × [5 mřížka + předchozí + aktuální]) | 14 |
| jména v `class="name"` | s českými uvozovkami | `Vzorový Jan „Vzorek“`, `Vzorový Petr „Vzorák“` |
| chybový rámeček | nevykreslen | nevykreslen (stav by jinak hlásil „Chyba v datech") |

**Co ověřeno NEBYLO:** fyzický tisk na papír (zalomení stránek na reálné tiskárně,
grafika na pozadí). Ověřit při prvním tisku kádru a doplnit sem.

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
