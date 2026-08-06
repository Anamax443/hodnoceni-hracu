-- 003_auth.sql — heslo v databázi + obnova zapomenutého hesla
--
-- PROČ: heslo bylo Worker secret (ADMIN_HESLO). Secret si Worker sám přepsat
-- nemůže, takže nešlo heslo změnit z aplikace ani obnovit odkazem z mailu.
-- Heslo se proto ukládá jako PBKDF2 hash se solí přímo do D1.
--
-- Dokud v `auth` není řádek, přihlašuje se pořád proti secretu ADMIN_HESLO
-- (bootstrap). Jakmile se heslo jednou nastaví z aplikace, secret se ignoruje
-- — jinak by staré sdílené heslo platilo napořád i po změně.
--
-- Nouzové odemčení, když se ztratí i obnova: smazat řádek a přihlásit se
-- znovu secretem:  DELETE FROM auth;

CREATE TABLE auth (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  heslo_hash   TEXT NOT NULL,
  heslo_sul    TEXT NOT NULL,
  iterace      INTEGER NOT NULL,
  zmeneno      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Jednorázové odkazy na nastavení nového hesla. Stejná logika jako u tokenů
-- hráčů: krátká platnost, jedno použití, kryptograficky náhodné.
CREATE TABLE obnova (
  token        TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  platny_do    TEXT NOT NULL,
  pouzit       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_obnova_cas ON obnova(created_at);
