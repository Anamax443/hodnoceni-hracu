# STATUS — where the project stands

Snapshot as of **9 Aug 2026**. It answers three questions: what runs, what has been
verified, and what is missing. Reasons and decisions are in [HANDOFF.md](../HANDOFF.md)
(a diary, newest entry first — Czech only).

**Live:** https://hodnoceni.maxferit.cz · fallback `hodnoceni-hracu.bass443.workers.dev`
**Version:** the running commit is shown in the top bar and at `/api/version`.

---

## What runs

| Area | State | Note |
|---|---|---|
| Squad register (People) | ✅ | 22 people (18 active players + 3 coaches); positions, nicknames, roles; click a name to edit |
| Several templates per player | ✅ | goalkeeper + outfield + leader; each its own series, link and sheet |
| Squad export / import | ✅ | `.xlsx` with Text formatting, CSV, dry-run import |
| Coach evaluation | ✅ | 6 axes 1–10, append-only, templates `pole` / `brankar` / `leader` |
| Bulk evaluation | ✅ | one score for several players, merged into the latest record |
| Editing an evaluation | ✅ | load, correct, save = **a new version**; own records only, blind scoring still holds |
| Player self-evaluation | ✅ | single-use link, blind guard verified live |
| Coach × player comparison | ✅ | tolerance, sign, trend, version history |
| Player × player comparison | ✅ | axis × player table with the gap |
| Compare anything with anything | ✅ | 2–8 records (player × period × author) side by side; across periods and authors, within one template |
| Links for selected | ✅ | tick boxes work per link (player × template), not per player |
| Agreement between coaches | ✅ | axis × coach matrix, final wording for the sheet |
| Printable A4 sheets | ✅ | 1 sheet = 1 page, verified by headless print to PDF |
| Combined sheet | ✅ | optionally all of a player’s templates on one A4, verified by print to PDF |
| Colour by template | ✅ | outfield blue, goalkeeper teal, leader crimson; template name in the sheet header, matching labels in the app |
| Printing selected per sheet | ✅ | a tick box on every player × template row, `ids=id:sablona` |
| Accounts and passwords | ✅ | sign in by name or e-mail, PIN from 4 characters, lockout after 5 attempts |
| Password recovery | ✅ | single-use link, 15 minutes, Telegram or e-mail |
| Notifications — Telegram | ✅ | delivery confirmed |
| Notifications — e-mail | ✅ | Cloudflare Email Sending |
| Notifications — SMS | ⚠️ | built and wired, but the **GoSMS account is unverified and has no credit** |
| Command bar | ✅ | **one field for commands and questions**, above every tab; resolved locally, the model only for awkward sentences |
| Analyses — summaries | ✅ | weakest squad axes, biggest gaps, who is missing; computed in the app, nothing leaves |
| Analyses — asking the model | ✅ | **enabled in production** (`aiAnalyzy = ano`) — full player data is sent to the model, see Personal data below |
| Language model | ✅ | production model `@cf/openai/gpt-oss-120b` (Workers AI, free); Claude waiting for `ANTHROPIC_API_KEY` |
| Mobile | ✅ | hamburger menu, thumb-sized controls, tables scroll inside their card |
| In-app documentation | ✅ | 📖 tab, Czech and English |

## How much data is in the app

Aggregate numbers from the production database as of 9 Aug 2026 (counts only — no names, no scores):

| | |
|---|---|
| people in the register | 22 (18 active players, 3 coaches, 1 inactive) |
| players with positions filled in | 4 of 18 |
| coach evaluations | **16** across 11 players, one period |
| by template | outfield 11 (10 players) · goalkeeper 3 (2 players) · leader 2 (2 players) |
| player self-evaluations | **0** |
| self-evaluation links generated | **0** |
| closed agreements between coaches | 0 |
| rows in `auth` | 1 (still the shared password) |

**The conversation over the gap between the two views — the whole point of the tool — has not
happened yet.** The coach side runs, the player side does not: until the links go out there is
nothing to compare and the second polygon on the sheet stays empty.

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

1. **Send the players their self-evaluation links.** Not one has been generated yet, so the
   players have filled in nothing. Without it the sheet has no second polygon and the
   conversation over the gap — the reason the tool exists — has nothing to stand on.
   **This is the main thing right now.**
2. **Verify the GoSMS account and top up credit.** Until then the sender is `GoSMS-test`
   and a real SMS will not go out (the last attempt ended in `400`). The dry run works.
3. **Julek and Maso have neither their own password nor a channel.** Once they have Telegram
   or a verified e-mail, send them an invitation from People, then drop the shared password
   (`DELETE FROM auth`).
4. **Add positions for the remaining players** — 4 of 18 have them. Templates are already
   assigned (goalkeeper and leader evaluations exist in the database), so most of this point
   is done; what remains are the positions, which get printed on the sheet.
5. **Evaluate the remaining 7 players** — 11 of 18 active players have an evaluation.
6. **An `ANTHROPIC_API_KEY`**, if the paid model is to be used. Without it — and with an
   exhausted credit — the command bar keeps working on the free model.

## Open questions

- **GDPR around model-driven analyses — no longer hypothetical.** `aiAnalyzy` is **switched
  on** in production, so every squad question sends the model scores, written assessments and
  goals of minors. Decided deliberately (8 Aug 2026), but **a record of processing activities
  and information for parents are still missing** — and with the switch on that is a debt, not
  a note for later. Workers AI (Cloudflare, the same account as the app) is the less
  problematic route than Claude (a US third party); the production model today is
  `@cf/openai/gpt-oss-120b`, i.e. Cloudflare.
- Should parents have access to the printed sheet, or only players?
- WhatsApp as another channel: no monthly fee to run, but it needs a number that is not on
  regular WhatsApp, a Meta Business Portfolio and an approved template. Not built.
