-- 001_init.sql — výchozí schéma (Cloudflare D1 / SQLite)
--
-- ZÁSADA: append-only. Hodnocení se nikdy nepřepisuje, každé uložení je
-- nový řádek s datem. Historie vzniká sama, zvláštní tabulka pro
-- verzování není potřeba.

-- Osoby kolem týmu. Tabulka drží hráče i trenéry, rozlišuje je `role`.
-- Trenér se nehodnotí a netiskne se mu list — je v seznamu proto, aby
-- se dalo zaznamenat, kdo hodnocení pořídil (evaluations.autor_id).
CREATE TABLE players (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  jmeno        TEXT NOT NULL,
  prezdivka    TEXT,
  post         TEXT,
  role         TEXT NOT NULL DEFAULT 'hrac',   -- 'hrac' | 'trener'
  sablona      TEXT NOT NULL DEFAULT 'pole',   -- 'pole' | 'brankar'
  aktivni      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE evaluations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id    INTEGER NOT NULL REFERENCES players(id),
  datum        TEXT NOT NULL DEFAULT (datetime('now')),
  obdobi       TEXT NOT NULL,               -- napr. '2025/2026 zima'
  autor        TEXT NOT NULL,               -- 'trener' | 'hrac'
  autor_id     INTEGER REFERENCES players(id),  -- ktery trener; u autor='hrac' NULL
  sablona      TEXT NOT NULL,               -- kopie sablony v dobe hodnoceni
  hodnoty      TEXT NOT NULL,               -- JSON: {"prava":7,"leva":4,...}
  fyzicky      TEXT,                        -- pouze autor='trener'
  hlavou       TEXT,
  parta        TEXT,
  cile         TEXT,                        -- JSON pole retezcu
  poznamka     TEXT,                        -- pouze autor='hrac': na cem chce pracovat
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

CREATE INDEX idx_token_player ON tokens(player_id, obdobi);

CREATE TABLE settings (
  klic         TEXT PRIMARY KEY,
  hodnota      TEXT NOT NULL
);

-- tolerance = o kolik se smi hodnoceni trenera a hrace lisit, aniz by
-- se osa resila. Rozdil > tolerance => osa jde k osobnimu rozhovoru.
INSERT INTO settings (klic, hodnota) VALUES
  ('tolerance',   '2'),
  ('obdobi',      '2025/2026 zima'),
  ('sezona',      '2025/2026'),
  ('klub',        'SK ŘÍČMANICE'),
  ('kategorie',   'Starší žáci'),
  ('latka',       'starší žák'),
  ('cileNadpis',  'Na čem makáme do zimy');
