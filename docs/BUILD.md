# BUILD — jak postavit hodnoceni-hracu od nuly

> **Test hotovosti:** dostane se nový člověk (nebo já po výměně PC) JEN z tohoto dokumentu
> k běžící aplikaci? Když ne, doplň, co chybělo.

---

## 1. Závislosti

- **Node.js 22+** (ověřeno na v24.13.1)
- `npm install` stáhne jedinou závislost: **wrangler** (ověřeno na 4.119.0)
- pro nasazení účet **Cloudflare** (bass443 — stejný jako maxferit.cz, jobwatch, domlov)
- žádný framework, žádný bundler, žádný build krok

## 2. Získání kódu

```powershell
git clone https://github.com/Anamax443/hodnoceni-hracu.git
cd hodnoceni-hracu
npm install
```

Repozitář je **private** a data obsahují osobní údaje nezletilých. Klonovat jen na zařízení,
které je pod kontrolou.

## 3. Secrety

Dva, oba povinné:

| Secret | K čemu |
|---|---|
| `ADMIN_HESLO` | přihlášení trenéra do aplikace |
| `SESSION_KEY` | podpis session cookie; 32+ náhodných bajtů |

Vygenerování `SESSION_KEY`:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

**Lokálně** — zkopíruj `.dev.vars.example` na `.dev.vars` a vyplň. `.dev.vars` je
v `.gitignore` a nikdy nesmí do repozitáře.

**V produkci:**

```powershell
npx wrangler secret put ADMIN_HESLO
npx wrangler secret put SESSION_KEY
```

## 4. Lokální běh

```powershell
npm run db:init:local     # schema do lokalni D1
npm run db:seed:local     # kadr
npm run dev               # http://127.0.0.1:8787
```

Lokální databáze žije v `.wrangler/` (v `.gitignore`). Smazáním složky se resetuje.

## 5. Ověření, že to funguje

```powershell
curl http://127.0.0.1:8787/health
# {"status":"ok","module":"hodnoceni-hracu","timestamp":"…"}
```

Dál: přihlásit se, přidat hráče, zadat hodnocení, vygenerovat odkaz, otevřít ho v jiném
prohlížeči (jinak sdílíš session), vyplnit sebehodnocení, podívat se na Porovnání a vytisknout
list. Tím je projetá celá cesta.

Automatizované ověření API včetně bezpečnostních pravidel je popsané v `known_good.md`.

## 6. Nasazení do produkce

### 6.1 Databáze

```powershell
npx wrangler d1 create hodnoceni-hracu
```

Vrácené `database_id` zapiš do `wrangler.jsonc` (nahradí nulový placeholder). Pak:

```powershell
npm run db:init
npm run db:seed     # jen poprve, do prazdne databaze
```

### 6.2 Secrety

Viz bod 3 (`wrangler secret put`).

### 6.3 Deploy

```powershell
npm run deploy
```

Nasadí Worker i statické soubory z `web/` najednou. Adresa bude
`https://hodnoceni-hracu.<účet>.workers.dev`.

### 6.4 Doména

Cílově vlastní pod **maxferit.cz** (rozhodnuto 2026-08-06). DNS je na Cloudflare u účtu
bass443, takže stačí přidat custom domain k Workeru — CNAME vznikne sám. Do té doby
`*.workers.dev`.

### 6.5 Ověření nasazení

```
GET https://<adresa>/health   ->  {"status":"ok","module":"hodnoceni-hracu","timestamp":"…"}
```

Pak se přihlásit a zkontrolovat, že jsou vidět data. Po každém nasazení si poznamenej
commit hash, ať je jasné, co běží.

## 7. Zálohy

```powershell
npm run db:export     # zaloha.sql z produkcni databaze
```

Před každým půlročním kolem. Záloha obsahuje osobní údaje nezletilých — neukládat na sdílené
disky ani do repozitáře (`zaloha*.sql` je v `.gitignore`).

## 8. Přístupy

- GitHub: účet **Anamax443**, repo **private**
- Cloudflare: účet **bass443**
- žádné podpisové certifikáty, žádné servisní účty
