-- 001_init.sql — výchozí schéma (Cloudflare D1 / SQLite)
--
-- ZÁSADA: append-only. Hodnocení se nikdy nepřepisuje, každé uložení je
-- nový řádek s datem. Historie vzniká sama, zvláštní tabulka pro
-- verzování není potřeba.
--
-- Aplikuje se až ve fázi 2. Ve fázi 1 slouží jako závazný popis modelu.

CREATE TABLE players (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  jmeno        TEXT NOT NULL,
  prezdivka    TEXT,
  post         TEXT,
  sablona      TEXT NOT NULL DEFAULT 'pole',  -- 'pole' | 'brankar'
  aktivni      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE evaluations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id    INTEGER NOT NULL REFERENCES players(id),
  datum        TEXT NOT NULL DEFAULT (datetime('now')),
  obdobi       TEXT NOT NULL,               -- napr. '2025/2026 zima'
  autor        TEXT NOT NULL,               -- 'trener' | 'hrac'
  sablona      TEXT NOT NULL,               -- kopie sablony v dobe hodnoceni
  hodnoty      TEXT NOT NULL,               -- JSON: {"prava":7,"leva":4,...}
  fyzicky      TEXT,                        -- pouze autor='trener'
  hlavou       TEXT,
  parta        TEXT,
  cile         TEXT,                        -- JSON pole retezcu
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_eval_player ON evaluations(player_id, obdobi);

CREATE TABLE tokens (
  token        TEXT PRIMARY KEY,            -- nahodny, min. 32 znaku
  player_id    INTEGER NOT NULL REFERENCES players(id),
  obdobi       TEXT NOT NULL,
  pouzit       INTEGER NOT NULL DEFAULT 0,
  platny_do    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  klic         TEXT PRIMARY KEY,
  hodnota      TEXT NOT NULL
);

INSERT INTO settings (klic, hodnota) VALUES ('tolerance', '2');
