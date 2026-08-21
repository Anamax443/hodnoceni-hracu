-- 014_odkaz_opakovane.sql — odkaz na sebehodnocení jde vyplnit opakovaně
--
-- Doteď byl odkaz jednorázový: po odeslání se zamkl a hráč už se k formuláři
-- nedostal. Jenže sebehodnocení má smysl opakovat — půl roku stará sedmička
-- a dnešní sedmička nejsou totéž a z řady vyplnění je vidět progres.
--
-- Zápis byl append-only už předtím: každé odeslání zakládá nový řádek
-- v `evaluations` (autor='hrac'). Archiv tedy vzniká sám, stačilo přestat
-- bránit druhému vyplnění.
--
-- `pouzit` zůstává jako příznak „aspoň jednou vyplněno" (kvůli starším
-- dotazům a přehledům), `pouziti` je počet vyplnění a `naposledy` čas toho
-- posledního. Platí to i pro odkazy vydané dřív: jednorázově vyplněné mají
-- po migraci `pouziti = 1` a od nasazení jdou vyplnit znovu.

ALTER TABLE tokens ADD COLUMN pouziti INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tokens ADD COLUMN naposledy TEXT;

UPDATE tokens SET pouziti = pouzit;
