-- 011_prihlaseni_pokusy.sql — zámek proti hádání hesla hrubou silou
--
-- Heslo smí být 4místný PIN, což je 10 000 kombinací. Sedmisetmilisekundová
-- prodleva u špatného pokusu je zdrží, ale nezastaví: robot je vyzkouší za
-- pár hodin i tak. Tabulka drží nezdařené pokusy a po pár marných zkouškách
-- se účet na chvíli zamkne.
--
-- Počítá se dvakrát a nezávisle:
--   ucet:<login>  — brání hádání hesla konkrétního trenéra
--   ip:<adresa>   — brání projíždění všech účtů z jednoho místa
--
-- Zámek na účet je schválně krátký: kdyby držel dlouho, stačilo by pár
-- špatných pokusů a útočník by trenéra vyřadil z aplikace místo prolomení.

CREATE TABLE prihlaseni_pokusy (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  cas  TEXT NOT NULL DEFAULT (datetime('now')),
  klic TEXT NOT NULL,      -- 'ucet:<login>' nebo 'ip:<adresa>'
  ip   TEXT                -- kvůli dohledání, odkud to šlo
);

CREATE INDEX idx_pokusy_klic_cas ON prihlaseni_pokusy(klic, cas);
