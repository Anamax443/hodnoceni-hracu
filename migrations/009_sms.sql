-- 009_sms.sql — SMS jako třetí kanál + log odeslané komunikace
--
-- SMS se hodí tam, kde Telegram nepomůže (kdo ho nemá) a e-mail vyžaduje
-- ověřenou adresu v Cloudflare. Provider je přepínač: ve výchozím stavu
-- 'console', který zprávu jen zaloguje — reálná SMS odejde, jen když se
-- SMS_PROVIDER přepne na 'twilio'. Jinak by se kredit protelefonoval testy.
--
-- Log komunikace řeší dvě věci najednou:
--   1) „nic mi nepřišlo" — je vidět, jestli zpráva odešla a s jakou chybou
--   2) brzda proti smyčce, která by odeslala stovky SMS
--
-- ZÁSADA: logují se METADATA, ne obsah zpráv. Výjimka je SMS, kde se text
-- ukládá kvůli počtu segmentů a sporům o fakturaci — obsah hodnocení v něm
-- stejně nikdy není. Tokeny se nelogují nikdy: záznam s platným obnovovacím
-- odkazem je reset hesla čekající na zneužití.

ALTER TABLE players ADD COLUMN telefon   TEXT;
ALTER TABLE players ADD COLUMN notif_sms INTEGER NOT NULL DEFAULT 0;

CREATE TABLE komunikace (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cas        TEXT NOT NULL DEFAULT (datetime('now')),
  kanal      TEXT NOT NULL,            -- 'email' | 'telegram' | 'sms'
  player_id  INTEGER REFERENCES players(id),
  adresa     TEXT,                     -- e-mail, chat id nebo telefon
  typ        TEXT NOT NULL,            -- 'souhrn' | 'obnova' | 'test'
  vysledek   TEXT NOT NULL,            -- 'ok' | 'chyba' | 'preskoceno'
  kod        TEXT,                     -- kód chyby od poskytovatele
  poznamka   TEXT                      -- u SMS text zprávy, jinak stručný důvod
);

CREATE INDEX idx_komunikace_cas ON komunikace(cas);

INSERT INTO settings (klic, hodnota) VALUES
  ('smsDenniStrop', '50')   -- pojistka: víc SMS za 24 h se neodešle
ON CONFLICT(klic) DO NOTHING;
