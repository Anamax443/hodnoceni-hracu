# STATUS — where the project stands

Snapshot as of **7 Aug 2026**. It answers three questions: what runs, what has been
verified, and what is missing. Reasons and decisions are in [HANDOFF.md](../HANDOFF.md)
(a diary, newest entry first — Czech only).

**Live:** https://hodnoceni.maxferit.cz · fallback `hodnoceni-hracu.bass443.workers.dev`
**Version:** the running commit is shown in the top bar and at `/api/version`.

---

## What runs

| Area | State | Note |
|---|---|---|
| Squad register (People) | ✅ | 22 people loaded; positions, nicknames, roles; click a name to edit |
| Several templates per player | ✅ | goalkeeper + outfield + leader; each its own series, link and sheet |
| Squad export / import | ✅ | `.xlsx` with Text formatting, CSV, dry-run import |
| Coach evaluation | ✅ | 6 axes 1–10, append-only, templates `pole` / `brankar` / `leader` |
| Bulk evaluation | ✅ | one score for several players, merged into the latest record |
| Editing an evaluation | ✅ | load, correct, save = **a new version**; own records only, blind scoring still holds |
| Player self-evaluation | ✅ | single-use link, blind guard verified live |
| Coach × player comparison | ✅ | tolerance, sign, trend, version history |
| Player × player comparison | ✅ | axis × player table with the gap |
| Agreement between coaches | ✅ | axis × coach matrix, final wording for the sheet |
| Printable A4 sheets | ✅ | 1 sheet = 1 page, verified by headless print to PDF |
| Combined sheet | ✅ | optionally all of a player’s templates on one A4, verified by print to PDF |
| Accounts and passwords | ✅ | sign in by name or e-mail, PIN from 4 characters, lockout after 5 attempts |
| Password recovery | ✅ | single-use link, 15 minutes, Telegram or e-mail |
| Notifications — Telegram | ✅ | delivery confirmed |
| Notifications — e-mail | ✅ | Cloudflare Email Sending |
| Notifications — SMS | ⚠️ | built and wired, but the **GoSMS account is unverified and has no credit** |
| Command bar | ✅ | resolved locally, no tokens spent |
| Language model | ⚠️ | Workers AI verified; Claude waiting for `ANTHROPIC_API_KEY` |
| Mobile | ✅ | hamburger menu, thumb-sized controls, tables scroll inside their card |
| In-app documentation | ✅ | 📖 tab, Czech and English |

## What has been verified live

Evidence and numbers in [known_good.md](../known_good.md). In short:

- API tests against the deployed app (48 + 45 + 27 + 25 + 13 runs, 0 failures)
- blind guard: a required coach who has not submitted receives no other coach's numbers
- sign-in lockout: the 5th failed attempt locked, further ones returned 429
- `.xlsx` export opened in Excel via COM: phone has `@` (Text) format, value intact
- printing: 1 page, MediaBox 595 × 842 pt (A4 portrait)
- language model: Workers AI answered in ~0.7 s
- editing an evaluation: 15 API checks + 23 browser click-through checks (locally, on a fresh
  D1); live only the migration and the deploy so far — there is no real data to click through
- several templates per player: 15 API checks + 16 click-through checks; the combined sheet
  printed to PDF fits **one A4**, three pages without the switch
- written notes and goals do not travel between templates: 5 checks (an empty form switches
  without asking; with text typed it asks, and the text stays with its own template)

## What is missing

1. **Verify the GoSMS account and top up credit.** Until then the sender is `GoSMS-test`
   and a real SMS will not go out (the last attempt ended in `400`). The dry run works.
2. **Enter the first real evaluations.** App and squad are ready; there are no evaluations yet.
3. **Julek and Maso have neither their own password nor a channel.** Once they have Telegram
   or a verified e-mail, send them an invitation from People, then drop the shared password
   (`DELETE FROM auth`).
4. **Add positions for the remaining players** (only Ferda has them so far) **and assign
   templates** — after the migration every player has just `outfield`. Anyone who should get
   a goalkeeper or leader sheet needs that template ticked in People.
5. **An `ANTHROPIC_API_KEY`**, if the paid model is to be used. Without it — and with an
   exhausted credit — the command bar keeps working on the free model.

## Open questions

- Should parents have access to the printed sheet, or only players?
- WhatsApp as another channel: no monthly fee to run, but it needs a number that is not on
  regular WhatsApp, a Meta Business Portfolio and an approved template. Not built.
