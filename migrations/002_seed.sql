-- 002_seed.sql — kádr SK Říčmanice, starší žáci
--
-- STAV: čeká na reálný soupis (19 hráčů). Zatím vzorová data, aby šlo
-- aplikaci vyzkoušet. Až přijde soupis, nahradí se řádky níž.
--
-- Hráče jde přidávat i v aplikaci (záložka Lidé). Tenhle soubor slouží
-- k prvnímu naplnění prázdné databáze.

INSERT INTO players (jmeno, prezdivka, post, role, sablona) VALUES
  ('Vzorový Jan',   'Vzorek', 'Střední záložník', 'hrac',   'pole'),
  ('Vzorový Petr',  'Vzorák', 'Brankář',          'hrac',   'brankar'),
  ('Trenér Karel',  NULL,     'Hlavní trenér',    'trener', 'pole');
