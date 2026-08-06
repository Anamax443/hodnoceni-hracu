-- 002_seed.sql — první naplnění kádru
--
-- Schválně tu nejsou žádná vzorová jména: nasazená aplikace by pak měla
-- v seznamu smyšlené lidi, které přes UI nejde smazat (jen deaktivovat).
--
-- Kdo je v týmu, se běžně zadává v aplikaci v záložce Lidé. Tenhle soubor
-- je pro případ, že je jednodušší nahrát celý kádr najednou — odkomentuj
-- a přepiš. Role: 'hrac' nebo 'trener'. Šablona: 'pole' nebo 'brankar'.

-- INSERT INTO players (jmeno, prezdivka, post, role, sablona) VALUES
--   ('Příjmení Jméno', 'Přezdívka', 'Střední záložník', 'hrac',   'pole'),
--   ('Příjmení Jméno', NULL,        'Brankář',          'hrac',   'brankar'),
--   ('Příjmení Jméno', NULL,        'Hlavní trenér',    'trener', 'pole');

SELECT 'Seed je prázdný — kádr se zadává v aplikaci (záložka Lidé).' AS poznamka;
