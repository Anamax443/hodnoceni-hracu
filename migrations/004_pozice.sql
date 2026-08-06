-- 004_pozice.sql — N pozic u hráče + šablona os na hodnocení, ne na osobě
--
-- PROČ: hráč může být použitelný na víc postů najednou — levý bek, pravé křídlo
-- i brankář. Jedna kolonka „post" to neunese.
--
-- Zvlášť se tím rozděluje to, co se dřív pletlo dohromady:
--   pozice  = kde hráč hraje (klidně N postů, popisné, tiskne se na list)
--   sablona = kterých šest os se známkuje ('pole' | 'brankar')
--
-- Šablona se proto stěhuje na HODNOCENÍ. Ferda může být v jednom období
-- oznámkovaný jako brankář i jako hráč v poli a každá řada žije zvlášť —
-- míchat brankářské a polní osy do jednoho grafu nedává smysl.
-- `players.sablona` zůstává jako výchozí volba ve formuláři, ne jako závazek.
--
-- Token na sebehodnocení nese šablonu taky: hráč musí vyplňovat tytéž osy,
-- které známkoval trenér, jinak by porovnání srovnávalo hrušky s jablky.

-- JSON pole klíčů pozic, např. ["levy_bek","prave_kridlo","brankar"].
-- Klíče, ne texty — překládají se až v prohlížeči (web/src/i18n.js).
ALTER TABLE players ADD COLUMN pozice TEXT NOT NULL DEFAULT '[]';

-- `post` zůstává jako volný text pro funkci a poznámku (Kapitán, Hlavní trenér).

ALTER TABLE tokens ADD COLUMN sablona TEXT NOT NULL DEFAULT 'pole';
