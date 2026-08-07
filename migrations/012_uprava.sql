-- 012_uprava.sql — úprava hodnocení = další verze, ne přepis
--
-- Oprava překlepu doteď znamenala vyplnit celý formulář znovu (šest známek,
-- tři slovní bloky, cíle) — kvůli jedné špatné číslici. Nově se dá starší
-- hodnocení načíst do formuláře, upravit a uložit. Zápis zůstává append-only:
-- vzniká NOVÝ řádek, původní se nemaže ani nepřepisuje.
--
-- `uprava_id` říká, ze které verze ta nová vznikla. Bez toho by v historii
-- byly dva záznamy vedle sebe a nešlo by poznat opravu překlepu od druhého,
-- samostatně pořízeného hodnocení. U běžného hodnocení zůstává NULL.

ALTER TABLE evaluations ADD COLUMN uprava_id INTEGER REFERENCES evaluations(id);
