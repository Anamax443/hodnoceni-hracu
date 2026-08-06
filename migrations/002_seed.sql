-- 002_seed.sql — kádr SK Říčmanice, starší žáci
--
-- STAV: čeká na reálný soupis (19 hráčů). Zatím vzorová data, aby šlo
-- schéma vyzkoušet. Až přijde soupis, nahradí se řádky níž — jménem,
-- přezdívkou, postem a šablonou ('pole' / 'brankar').
--
-- Zdroj pravdy pro fázi 1 je frontend/data/kadr.js. Tenhle soubor se
-- z něj vyplní až při přechodu na fázi 2, aby data nežila na dvou
-- místech současně.

INSERT INTO players (jmeno, prezdivka, post, sablona) VALUES
  ('Vzorový Jan',  'Vzorek', 'Střední záložník', 'pole'),
  ('Vzorový Petr', 'Vzorák', 'Brankář',          'brankar');
