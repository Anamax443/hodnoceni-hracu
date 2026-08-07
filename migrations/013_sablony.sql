-- 013_sablony.sql — hráč může mít víc šablon najednou
--
-- Ferda chytá, hraje v poli a je kapitán. Doteď měl u sebe v kartotéce jednu
-- „výchozí" šablonu a zbylé dvě si musel trenér u každého hodnocení vybrat
-- ručně — a nikde nebylo vidět, že mu dvě řady chybí.
--
-- Šablona zůstává i nadále na HODNOCENÍ (evaluations.sablona) — tohle je jen
-- seznam „kterými šesticemi os se tenhle hráč známkuje", ze kterého se pozná,
-- co má být hotové: každá šablona je vlastní řada, vlastní odkaz na
-- sebehodnocení a vlastní tiskový list.
--
-- `players.sablona` zůstává jako zrcadlo první šablony ze seznamu, aby starší
-- dotazy a ruční SQL nevracely nesmysl. Pravda je `sablony`.

ALTER TABLE players ADD COLUMN sablony TEXT NOT NULL DEFAULT '["pole"]';

UPDATE players SET sablony = '["' || sablona || '"]';
