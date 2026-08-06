# BUILD — jak postavit hodnoceni-hracu od nuly

> **Test hotovosti:** dostane se nový člověk (nebo já po výměně PC) JEN z tohoto dokumentu
> k běžící aplikaci? Když ne, doplň, co chybělo.

**Aktuálně nasazeno na:** https://hodnoceni-hracu.bass443.workers.dev

---

## 1. Závislosti

- **Node.js 22+** (ověřeno na v24.13.1)
- `npm install` stáhne jedinou závislost: **wrangler** (ověřeno na 4.119.0)
- účet **Cloudflare** — bass443, account id `a37a36270aa2db7382f62912ba5a0130`
- žádný framework, žádný bundler, žádný build krok

## 2. Získání kódu

```powershell
git clone https://github.com/Anamax443/hodnoceni-hracu.git
cd hodnoceni-hracu
npm install
npx wrangler login        # jen pokud jeste nejsi prihlaseny
npx wrangler whoami       # musi ukazat ucet bass443
```

Repozitář je **private**. Klonovat jen na zařízení, které je pod kontrolou.

## 3. Databáze

Už existuje: D1 `hodnoceni-hracu`, region EEUR, id `8fe85587-7409-4b95-83f3-d23f340aa2ad`
(zapsané ve `wrangler.jsonc`).

Kdyby se stavěla znovu od nuly:

```powershell
npx wrangler d1 create hodnoceni-hracu
# vracene database_id zapsat do wrangler.jsonc
npm run db:init
```

`npm run db:seed` je schválně prázdný — kádr se zadává v aplikaci v záložce **Lidé**,
aby v nasazené aplikaci nezůstali smyšlení lidé, které přes UI nejde smazat.
Kdo chce nahrát kádr hromadně, odkomentuje si šablonu v `migrations/002_seed.sql`.

## 4. Secrety

Dva, oba povinné a oba už nastavené:

| Secret | K čemu |
|---|---|
| `ADMIN_HESLO` | **jen první přihlášení**, než se heslo poprvé nastaví z aplikace |
| `SESSION_KEY` | podpis session cookie; 32+ náhodných bajtů |
| `OBNOVA_EMAILY` | adresy oddělené čárkou, kam smí přijít odkaz na obnovu hesla |

```powershell
npx wrangler secret list                  # co je nastavene
npx wrangler secret put ADMIN_HESLO
npx wrangler secret put SESSION_KEY       # rotace klice = vsichni se odhlasi
npx wrangler secret put OBNOVA_EMAILY
```

**Heslo se běžně mění v aplikaci** (Nastavení → Změna hesla), ne přes secret — ukládá se
jako hash do D1 a od té chvíle se `ADMIN_HESLO` ignoruje. Když se heslo ztratí i s obnovou:

```powershell
npx wrangler d1 execute hodnoceni-hracu --remote --command="DELETE FROM auth"
# pak plati zase secret ADMIN_HESLO
```

Adresy v `OBNOVA_EMAILY` musí být **ověřené destination addresses** v Cloudflare
(Email Routing), jinak odeslání skončí na `E_RECIPIENT_NOT_ALLOWED`. Nová adresa trenéra
= nejdřív ji ověřit v Cloudflare, teprve pak přidat do secretu.

Generování `SESSION_KEY`:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

Nikdy do gitu. Pro lokální vývoj slouží `.dev.vars` (šablona `.dev.vars.example`, soubor
je v `.gitignore`).

## 5. Nasazení

```powershell
npm run deploy
```

`predeploy` nejdřív zapíše commit hash a čas do `web/version.json`, pak se nahraje Worker
i statické soubory z `web/` najednou. Hash je pak vidět v horní liště aplikace a na
`/api/version` — po nasazení se hodí ověřit, že sedí s tím, co je v gitu.

## 6. Ověření nasazení

```powershell
curl https://hodnoceni-hracu.bass443.workers.dev/health
# {"status":"ok","module":"hodnoceni-hracu","timestamp":"…"}

curl https://hodnoceni-hracu.bass443.workers.dev/api/version
# {"commit":"…","commitFull":"…","branch":"main","cisto":true,"builtAt":"…"}
```

`cisto: false` znamená, že se nasazovalo s necommitnutými změnami — pak hash neodpovídá
tomu, co je v repozitáři.

Dál se přihlásit, přidat člověka, zadat hodnocení, vygenerovat odkaz, otevřít ho v jiném
prohlížeči (jinak sdílíš session), vyplnit sebehodnocení, projít Porovnání a vytisknout list.
Tím je projetá celá cesta.

Automatizované ověření API včetně bezpečnostních pravidel je popsané v `known_good.md`.

## 7. Doména

Zatím `hodnoceni-hracu.bass443.workers.dev`. Cílově vlastní pod **maxferit.cz**
(rozhodnuto 2026-08-06) — DNS je na Cloudflare u téhož účtu, takže se přidá custom domain
k Workeru (dashboard → Workers → Settings → Domains & Routes) a CNAME vznikne sám.

Náhledová URL jednotlivých verzí jsou schválně vypnutá (`preview_urls: false`), aby
existovala jediná veřejná adresa.

## 8. Zálohy

```powershell
npm run db:export     # zaloha.sql z produkcni databaze
```

Před každým půlročním kolem. Záloha obsahuje osobní údaje nezletilých — neukládat na sdílené
disky ani do repozitáře (`zaloha*.sql` je v `.gitignore`).

## 9. Přístupy

- GitHub: účet **Anamax443**, repo **private**
- Cloudflare: účet **bass443**
- žádné podpisové certifikáty, žádné servisní účty

## 10. Lokální vývoj (nepovinné)

Ostrý provoz je v cloudu; lokální běh je jen pro vývoj.

```powershell
Copy-Item .dev.vars.example .dev.vars   # a vyplnit
npm run db:init:local
npm run dev                             # http://127.0.0.1:8787
```

Lokální databáze žije v `.wrangler/` (v `.gitignore`). Smazáním složky se resetuje.
Přes `http://` se neposílá `Secure` cookie — Worker to pozná a nastaví ji bez `Secure`,
takže přihlášení funguje i lokálně.
