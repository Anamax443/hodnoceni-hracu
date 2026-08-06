# BUILD — jak postavit hodnoceni-hracu od nuly

> **Test hotovosti:** dostane se nový člověk (nebo já po výměně PC) JEN z tohoto dokumentu
> k běžící aplikaci? Když ne, doplň, co chybělo.

---

## A. Fáze 1 — tiskové listy (aktuální stav)

### 1. Závislosti

Žádné. Ani Node, ani server, ani build. Stačí prohlížeč (Edge, Chrome, Firefox).

### 2. Získání kódu

```
git clone https://github.com/Anamax443/hodnoceni-hracu.git
cd hodnoceni-hracu
```

Repozitář je **private** a obsahuje osobní údaje nezletilých. Klonovat jen na zařízení,
které je pod kontrolou.

### 3. Konfigurace

Žádné secrety. Jediný editovaný soubor je `frontend/data/kadr.js`
(kádr, hodnocení, název období) — popis v [README.md](README.md).

### 4. Spuštění

```
frontend\tisk.html
```

Otevřít dvojklikem. Hotovo — v prohlížeči jsou listy A4, tlačítkem nahoře jdou na tiskárnu.

### 5. Ověření, že to funguje

Bez prohlížeče (nebo v CI) headless přes Edge:

```powershell
$edge = (Get-Command msedge.exe).Source
& $edge --headless --disable-gpu --virtual-time-budget=3000 --dump-dom `
    "file:///D:/git/hodnoceni-hracu/frontend/tisk.html" > dump.html
```

V `dump.html` musí sedět:

- `id="stav"` obsahuje `Listů k tisku: N` (ne `Chyba v datech`)
- počet `class="page"` = počet aktivních hráčů
- počet `<polygon` = počet listů × (5 mřížka + 1 za každý vykreslený polygon)

---

## B. Fáze 2+ — Cloudflare (plán, zatím nepostaveno)

Postavit **až po tom**, co je jednou ručně odhodnocen celý kádr. Do té doby se osy ještě
mohou změnit a měnit je v databázi s historickými záznamy je nepříjemné.

### 1. Závislosti

- Node.js 22 LTS
- `npm i -D wrangler`
- účet Cloudflare **bass443** (stejný jako maxferit.cz, jobwatch, domlov)

### 2. Databáze

```powershell
npx wrangler d1 create hodnoceni-hracu
# vraceny database_id zapsat do worker/wrangler.toml
npx wrangler d1 execute hodnoceni-hracu --remote --file=migrations/001_init.sql
npx wrangler d1 execute hodnoceni-hracu --remote --file=migrations/002_seed.sql
```

Lokální vývoj: totéž bez `--remote`.

### 3. Secrety

```powershell
npx wrangler secret put ADMIN_HESLO      # prihlasovaci heslo trenera
npx wrangler secret put SESSION_KEY      # nahodny klic pro podpis session cookie (32+ bajtu)
```

Nikdy do gitu. `.dev.vars` pro lokální běh je v `.gitignore`.

Generování `SESSION_KEY`:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

### 4. Nasazení

```powershell
npx wrangler deploy                      # Worker (API)
npx wrangler pages deploy frontend       # Pages (frontend)
```

### 5. Doména

Zatím `*.pages.dev`. Cílově vlastní pod **maxferit.cz** (rozhodnuto 2026-08-06) — DNS
je na Cloudflare u účtu bass443, takže se přidá jen custom domain u Pages projektu
a CNAME záznam vznikne sám.

### 6. Ověření, že běží

```
GET https://<worker>/health   ->  {"status":"ok","module":"hodnoceni-hracu","timestamp":"…"}
```

Plus commit hash zabudovaný do buildu — na nasazené aplikaci musí být vidět běžící verze.

### 7. Zálohy

```powershell
npx wrangler d1 export hodnoceni-hracu --remote --output=zaloha.sql
```

Databáze obsahuje osobní údaje nezletilých. Zálohu neukládat na sdílené disky ani
do veřejného repa.

---

## C. Certifikáty / přístupy / práva

- GitHub: účet **Anamax443**, repo private
- Cloudflare: účet **bass443**
- žádné podpisové certifikáty, žádné servisní účty
