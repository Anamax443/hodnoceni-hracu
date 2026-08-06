-- 006_notif_intervaly.sql — dva nezávislé intervaly místo „jak často"
--
-- PROČ: „posílej denně" neřeší podstatnou věc — když se nic neděje, nepřijde
-- nic a z ticha nejde poznat, jestli nikdo nic nedělá, nebo se něco rozbilo.
-- Proto se rozdělilo na:
--   notifDnyZmeny  = když se něco děje, souhrn nejvýš jednou za N dní
--   notifDnyTicho  = když se nic neděje, po N dnech přijde „nic se nezměnilo"
--
-- Ten druhý interval je liveness signál, ne notifikace.

DELETE FROM settings WHERE klic IN ('notifFrekvence', 'notifDenVTydnu');

INSERT INTO settings (klic, hodnota) VALUES
  ('notifZapnuto',  '1'),
  ('notifDnyZmeny', '3'),
  ('notifDnyTicho', '14')
ON CONFLICT(klic) DO NOTHING;
