-- 010_komunikace_platforma.sql — do logu komunikace přibývá platforma a podrobnost chyby
--
-- Sloupec `kanal` říká jen „sms", ale která brána to nesla (GoSMS, Twilio, nebo
-- jen console) z něj poznat nešlo. U e-mailu a Telegramu je platforma jediná,
-- u SMS se přepíná — a při reklamaci je to první otázka.
--
-- `podrobnosti` nese text chyby od poskytovatele. Bez něj se v logu četlo pouhé
-- „chyba 400" a příčina se musela dohledávat jinde.

ALTER TABLE komunikace ADD COLUMN platforma   TEXT;
ALTER TABLE komunikace ADD COLUMN podrobnosti TEXT;
