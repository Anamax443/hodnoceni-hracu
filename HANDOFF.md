# HANDOFF — deník stavu: hodnoceni-hracu

Append-only. Nejnovější záznam nahoru. Slouží k pokračování z jiného počítače / po pauze.

## 2026-08-06 — založení projektu, fáze 1 hotová

**Hotové:**

- Repozitář založen podle `project-standard`, **private** (obsahuje osobní údaje nezletilých).
- Fáze 1 — tiskový generátor listů A4 z lokálního souboru:
  - `frontend/tisk.html` + `src/sablony.js`, `src/radar.js`, `src/list.js`, `src/styl.css`
  - data v `frontend/data/kadr.js` (zatím dva vzoroví hráči)
  - klasické `<script>`, žádný build — stránka se otevírá dvojklikem z disku
- Radar převzatý beze změny z `docs/vzor-list.html` (referenční výstup, zmrazený).
- `migrations/001_init.sql` — schéma D1 podle zadání, aplikuje se až ve fázi 2.
- Dokumentace: `docs/README.md` (trenér), `docs/TECHNICAL.md`, `docs/BUILD.md`,
  `docs/RUNBOOK.md`, `docs/ZADANI.md`.

**Ověřeno naživo:** headless Edge `--dump-dom` nad `frontend/tisk.html` → 2 listy,
2 SVG, 14 polygonů (5 mřížka + 2 hodnocení na list), stav „Listů k tisku: 2",
české uvozovky u přezdívky sedí. Zápis v `known_good.md`.

**Rozhodnuto:**

- admin auth (fáze 2) = jedno heslo jako Worker secret + podepsaná session cookie
- doména = nakonec vlastní pod `maxferit.cz`, do té doby `*.pages.dev`
- osobní data (jména i posudky) jdou do repa → repo musí zůstat private

**Rozpracované:** nic.

**Zbývá — nejbližší krok:**

1. **Doplnit reálný kádr** (19 hráčů) do `frontend/data/kadr.js` — vzorové bloky smazat.
2. Ručně odhodnotit celý kádr a vytisknout. Teprve tím je fáze 1 uzavřená.
3. Až pak fáze 2 (D1 + Worker + admin CRUD). Dřív ne — do té doby se osy ještě mohou
   změnit a měnit je v databázi s historickými záznamy je nepříjemné.

**Otevřené otázky (před fází 3):**

- Mají mít k listu přístup rodiče, nebo jen hráči?
- Sebehodnocení: jen 6 os, nebo i krátká otevřená otázka („na čem chceš pracovat")?
