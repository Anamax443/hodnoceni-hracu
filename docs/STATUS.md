# STATUS — kde projekt stojí

Snímek k **7. 8. 2026**. Odpovídá na tři otázky: co běží, co je ověřené a co chybí.
Podrobnosti a důvody rozhodnutí jsou v [HANDOFF.md](../HANDOFF.md) (deník, nejnovější nahoře).

**Živě:** https://hodnoceni.maxferit.cz · záloha `hodnoceni-hracu.bass443.workers.dev`
**Verze:** commit běžící aplikace je v horní liště a v `/api/version`.

---

## Co běží

| Oblast | Stav | Poznámka |
|---|---|---|
| Kádr a kartotéka (Lidé) | ✅ | 22 osob nahráno, pozice, přezdívky, role |
| Export / import kádru | ✅ | `.xlsx` s formátem Text, CSV, import nanečisto |
| Hodnocení trenérem | ✅ | 6 os 1–10, append-only, šablony `pole` / `brankar` / `leader` |
| Hromadné hodnocení | ✅ | jedna známka pro víc hráčů, doplní se k poslednímu záznamu |
| Úprava hodnocení | ✅ | načíst, opravit, uložit = **nová verze**; jen vlastní, naslepo platí dál |
| Sebehodnocení hráče | ✅ | jednorázový odkaz, blind guard ověřený naostro |
| Porovnání trenér × hráč | ✅ | tolerance, znaménko, trend, historie verzí |
| Srovnání hráčů mezi sebou | ✅ | tabulka osa × hráč, rozptyl |
| Shoda mezi trenéry | ✅ | matice osa × trenér, finální znění na list |
| Tiskové listy A4 | ✅ | 1 hráč = 1 stránka, ověřeno headless tiskem do PDF |
| Účty a hesla | ✅ | login i e-mail, PIN od 4 znaků, zámek po 5 pokusech |
| Obnova hesla | ✅ | jednorázový odkaz, 15 minut, Telegram i e-mail |
| Notifikace — Telegram | ✅ | ověřeno doručením |
| Notifikace — e-mail | ✅ | Cloudflare Email Sending |
| Notifikace — SMS | ⚠️ | postaveno a zapojeno, ale **účet GoSMS neověřený a bez kreditu** |
| Příkazový řádek | ✅ | rozřazení lokálně, bez tokenů |
| Jazykový model | ⚠️ | Workers AI ověřené; Claude čeká na `ANTHROPIC_API_KEY` |
| Mobil | ✅ | hamburger, ovládání na palec, tabulky se posouvají v kartě |
| Dokumentace v aplikaci | ✅ | záložka 📖, česky i anglicky |

## Co je ověřené naostro

Doklady a čísla v [known_good.md](../known_good.md). Ve zkratce:

- API testy proti nasazené aplikaci (48 + 45 + 27 + 25 + 13 běhů, 0 chyb)
- blind guard: povinný trenér bez odevzdaného hodnocení nedostane cizí čísla
- zámek přihlášení: 5. marný pokus zamkl, další vracely 429
- export `.xlsx` otevřený Excelem přes COM: telefon má formát `@`, hodnota doslova
- tisk: 1 stránka, MediaBox 595 × 842 pt (A4 na výšku)
- jazykový model: Workers AI odpověděl za ~0,7 s
- úprava hodnocení: 15 kontrol API + 23 proklikáním v prohlížeči (lokálně, čerstvá D1);
  živě zatím jen migrace a nasazení — ostrá data k proklikání nejsou

## Co chybí

1. **Ověřit účet GoSMS a dobít kredit.** Do té doby je odesílatel `GoSMS-test`
   a ostrá SMS neprojde (poslední pokus skončil `400`). Zkouška nanečisto funguje.
2. **Zadat první reálná hodnocení.** Aplikace i kádr jsou připravené, hodnocení zatím žádné.
3. **Julek a Maso nemají vlastní heslo ani kanál.** Až budou mít Telegram nebo ověřený
   e-mail, poslat pozvánku z Lidí; pak zrušit společné heslo (`DELETE FROM auth`).
4. **Doplnit pozice zbylým hráčům** (má je zatím jen Ferda).
5. **Klíč `ANTHROPIC_API_KEY`**, pokud se má zkoušet placený model. Bez něj i s vyčerpaným
   kreditem jede příkazový řádek dál na modelu zdarma.

## Otevřené otázky

- Mají mít k tištěnému listu přístup rodiče, nebo jen hráči?
- WhatsApp jako další kanál: provozně bez paušálu, ale chce číslo mimo běžný WhatsApp,
  Meta Business Portfolio a schválenou šablonu. Nepostaveno.
