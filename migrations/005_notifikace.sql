-- 004_notifikace.sql — souhrnné notifikace na e-mail a Telegram
--
-- ZÁSADA: notifikace nese jen „kdo a co", nikdy obsah hodnocení. Známky ani
-- slovní bloky do e-mailu a už vůbec ne do Telegramu nepatří — jsou to posudky
-- nezletilých a obojí je třetí strana. Detail se otevírá v aplikaci.
--
-- Rozesílá se souhrnně (cron), ne po jedné zprávě za událost. Při 19 hráčích
-- by jednotlivé zprávy byly spam, který se do týdne začne ignorovat.

-- Kanály se zapínají u konkrétní osoby. Prakticky u trenérů — hráči do aplikace
-- nechodí, ti mají jednorázový odkaz.
ALTER TABLE players ADD COLUMN email            TEXT;
ALTER TABLE players ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE players ADD COLUMN notif_email      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN notif_telegram   INTEGER NOT NULL DEFAULT 0;

-- Co se stalo. Rozesílka si bere nerozeslané řádky a po odeslání je označí.
CREATE TABLE udalosti (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  typ          TEXT NOT NULL,          -- 'hodnoceni' (trener) | 'sebehodnoceni' (hrac)
  player_id    INTEGER NOT NULL REFERENCES players(id),
  obdobi       TEXT NOT NULL,
  autor_id     INTEGER REFERENCES players(id),   -- který trenér; u sebehodnocení NULL
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  odeslano     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_udalosti_odeslano ON udalosti(odeslano, id);

INSERT INTO settings (klic, hodnota) VALUES
  ('notifFrekvence',  'denne'),   -- 'denne' | 'tydne' | 'vypnuto'
  ('notifCas',        '19:00'),   -- místní čas (Europe/Prague), cron běží každou hodinu
  ('notifDenVTydnu',  '7'),       -- 1=pondělí … 7=neděle; platí jen pro 'tydne'
  ('notifPosledni',   '');        -- kdy naposledy odešel souhrn (pojistka proti dvojímu odeslání)
