-- 008_shoda.sql — hodnocení jako shoda mezi trenéry
--
-- PROČ: dosud bral tiskový list poslední uložené hodnocení bez ohledu na autora.
-- Jakmile hodnotí dva trenéři, druhý tím tiše přepsal prvního. To nebyl záměr.
--
-- Nově: každý povinný trenér oznámkuje NASLEPO (nevidí, co dal druhý — jinak by
-- se k němu přisunul a shoda by byla falešná). Teprve pak se porovnají:
--   rozdíl <= tolerance  -> osa je odsouhlasená
--   rozdíl >  tolerance  -> NESOULAD, řeší se rozhovorem mezi trenéry
--
-- Původní hodnocení obou zůstávají (append-only). Shoda se ukládá jako další
-- řádek s autor='shoda' — je vidět, kde se rozcházeli a na čem se dohodli.
-- Nesoulad je informace o hráči nebo o měřítkách trenérů, ne jen překážka.

-- Čí hodnocení musí být na stole, než se dá uzavřít shoda.
ALTER TABLE players ADD COLUMN hodnoceni_povinne INTEGER NOT NULL DEFAULT 0;

-- Výchozí stav podle zadavatele.
UPDATE players SET hodnoceni_povinne = 1 WHERE role = 'trener' AND login IN ('maxla', 'julek');

-- Poznámka k uzavření shody: proč se rozcházeli a jak to dopadlo.
-- Na tiskový list se nedostane, je to zápis pro trenéry.
ALTER TABLE evaluations ADD COLUMN poznamka_shody TEXT;
