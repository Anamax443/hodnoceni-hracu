-- 007_ucty.sql — účty po lidech místo jednoho společného hesla
--
-- PROČ: obnova hesla má být pro každého zvlášť. To ale nejde, dokud existuje
-- jedno sdílené heslo — není komu odkaz poslat a není koho identifikovat.
-- Zároveň tím padá další slabina: dosud nešlo poznat, kdo se přihlásil
-- a kdo hodnocení pořídil (autor se vybíral z rozbalovátka).
--
-- Heslo se ukládá stejně jako dosud: PBKDF2-SHA256 se solí, 100 000 iterací
-- (víc workerd nedovolí).
--
-- PŘECHOD: společné heslo v tabulce `auth` zůstává funkční, dokud ho někdo
-- ručně nesmaže (`DELETE FROM auth`). Kdo nechá přihlašovací jméno prázdné,
-- přihlásí se pořád jím. Jinak by se dal celý tým vyzamknout.

ALTER TABLE players ADD COLUMN login          TEXT;
ALTER TABLE players ADD COLUMN heslo_hash     TEXT;
ALTER TABLE players ADD COLUMN heslo_sul      TEXT;
ALTER TABLE players ADD COLUMN heslo_iterace  INTEGER;
ALTER TABLE players ADD COLUMN heslo_zmeneno  TEXT;

-- Přihlašovací jméno musí být jedinečné, ale hráči ho nemají (NULL).
CREATE UNIQUE INDEX idx_players_login ON players(login) WHERE login IS NOT NULL;

-- Obnova se váže na konkrétní osobu, ne na adresu ze secretu.
ALTER TABLE obnova ADD COLUMN player_id INTEGER REFERENCES players(id);

-- Trenéři z prvního nasazení dostanou přihlašovací jméno podle jména.
UPDATE players SET login = lower(jmeno) WHERE role = 'trener' AND login IS NULL;
