# STATUS — where the project stands

Snapshot as of **16 Aug 2026**. It answers three questions: what runs, what has been
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
| Coach evaluation | ✅ | **7 axes** 1–10, append-only, templates `pole` / `brankar` / `leader` |
| Bulk evaluation | ✅ | one score for several players, merged into the latest record |
| Editing an evaluation | ✅ | load, correct, save = **a new version**; own records only, blind scoring still holds |
| Player self-evaluation | ✅ | **the link can be filled in repeatedly**, every fill-in is archived; blind guard verified live |
| Self-evaluation over time | ✅ | printable sheet with the run of fill-ins (chart: first × latest, table: all) |
| Coach × player comparison | ✅ | tolerance, sign, trend, version history |
| Player × player comparison | ✅ | axis × player table with the gap |
| Compare anything with anything | ✅ | 2–8 records (player × period × author) side by side; across periods and authors, within one template |
| Links for selected | ✅ | tick boxes work per link (player × template), not per player |
| Agreement between coaches | ✅ | axis × coach matrix, final wording for the sheet |
| Printable A4 sheets | ✅ | 1 sheet = 1 page, verified by headless print to PDF |
| Combined sheet | ✅ | optionally all of a player’s templates on one A4, verified by print to PDF |
| Colour by template | ✅ | outfield blue, goalkeeper teal, leader crimson; template name in the sheet header, matching labels in the app |
| Printing selected per sheet | ✅ | a tick box on every player × template row, `ids=id:sablona` |
| Accounts and passwords | ✅ | sign in by name or e-mail, PIN from 4 characters, lockout after 5 attempts; **the PIN alone identifies the coach** without typing a name |
| Password recovery | ✅ | single-use link, 15 minutes, Telegram or e-mail |
| Notifications — Telegram | ✅ | delivery confirmed |
| Notifications — e-mail | ✅ | Cloudflare Email Sending |
| Notifications — SMS | ✅ | **confirmed for real on 9 Aug 2026** — dry run plus a delivered message; channel on (`smsAktivni = 1`), cap 50/day |
| SMS header | ✅ | editable in Settings, preview with segment count and a warning for characters outside GSM-7; empty = club name |
| Positions tab | ✅ | the reverse view of People: pick a position and tick who plays it; only that one position is saved, the rest stay untouched |
| Renaming applies backwards | ✅ | fixing a name or nickname also shows on older evaluations; the template is frozen at the time of recording (by design) |
| Physical condition as a 7th axis | ✅ | on every template; older six-axis evaluations still draw as a hexagon, and a difference is computed only where both sides scored |
| Bulk export/import of evaluations | ✅ | CSV for Excel; the import is append-only, requires a coach signature and refuses self-evaluations |
| Curves distinguishable in B&W | ✅ | coach solid line + filled dot, second view dashed + hollow square; the legend draws the real line, not a coloured chip |
| Channel status in the top bar | ✅ | Model / SMS / Telegram / E-mail with ● ○ ✕; TG, SMS and e-mail really checked and for free, the model only reports its configuration (a query would eat the limit) |
| Documentation on its own pages | ✅ | `/dok/<key>` behind sign-in — 10 documents rendered from Markdown, with a signpost and a chapter list; no links to the (private) GitHub |
| Menu at the top of the documentation | ✅ | built from the headings that are actually in the text, so it cannot drift from the content |
| SMS test to any number | ✅ | in Settings, no link to the roster; dry run free, real send behind a confirmation |
| Communication log | ✅ | collapsed (the page no longer grows), search and CSV export of the **whole** log |
| Command bar | ✅ | **one field for commands and questions**, above every tab; resolved locally, the model only for awkward sentences |
| Analyses — summaries | ✅ | weakest squad axes, biggest gaps, who is missing; computed in the app, nothing leaves |
| Analyses — asking the model | ✅ | **enabled in production** (`aiAnalyzy = ano`) — full player data is sent to the model, see Personal data below |
| Language model | ✅ | production model `@cf/openai/gpt-oss-120b` (Workers AI, free); Claude waiting for `ANTHROPIC_API_KEY` |
| Mobile | ✅ | hamburger menu, thumb-sized controls, tables scroll inside their card |
| In-app documentation | ✅ | 📖 tab, Czech and English |

## How much data is in the app

> **Numbers here go stale, and stale numbers lie.** This section claimed "0 links, 0
> self-evaluations" at a point when the players had long had their links (sent over
> WhatsApp) and one had already filled his in. **Live numbers are in the app** — tab 📖,
> chapter *Project status*, where they are read straight from the database via
> `/api/stav-dat`. What follows is a snapshot.

Snapshot of the production database as of **16 Aug 2026** (counts only — no names, no scores):

| | |
|---|---|
| people in the register | 22 (18 active players, 3 coaches, 1 inactive) |
| players with positions filled in | 4 of 18 |
| coach evaluations | **16** across 11 of 18 players, one period |
| self-evaluation links generated | **4**, 1 of them used |
| player self-evaluations | **1** (1 player) |
| closed agreements between coaches | 0 |
| coaches with their own password | **3 of 3**; the shared password in `auth` still remains |

**The first conversation over the gap between the two views has something to stand on.**
One player filled his in, so both polygons are drawn on his sheet. Links go out **by hand
over WhatsApp**, which is a perfectly good route: it does not matter how it reached the
player. The channels in the app are convenience, not a precondition.

**The link is no longer single-use** (21 Aug 2026): the same link can be filled in
repeatedly and every fill-in is archived, so a run over time builds up. This applies to
links sent out earlier too — the one already used opened up again on deploy.

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
- repeated fill-ins of a link: 15 API checks + 22 click-through checks (locally) — an
  already-used link opens, a second and third submission go through, the archive keeps a
  record per fill-in; the self-evaluation-over-time sheet printed to PDF fits **one A4**
- **SMS for real (9 Aug 2026)**: dry run `ok`, seven seconds later a real message `ok` and
  delivered to the handset. The text stored in the log matches what went out, character for
  character
- SMS composition and segment counting verified by running the functions over five headers:
  an en dash and a typographic quote correctly report UCS-2, a plain hyphen does not, and
  `€` counts as two characters
- **self-evaluation for real (9 Aug 2026)**: a player opened a hand-delivered link and filled
  it in; the database holds 4 generated links, 1 used, 1 self-evaluation. The whole chain
  from creating a link to storing the player's scores has been through real use, not a test

## What is missing

1. **Get the links out to the rest of the squad.** This is under way — links go out by hand
   over WhatsApp and the first self-evaluation is in. The more players hand theirs in, the
   more sheets carry a second polygon and the more there is to talk about.
   **This is the main thing right now.**
2. **Drop the shared password** (`DELETE FROM auth`). All three coaches have had their own
   password since 16 Aug 2026 and the PIN alone identifies them, so the shared one is now
   only habit — and an evaluation saved under it does not know who wrote it. What is still
   missing is a channel (Telegram or a verified e-mail) for Julek and Maso, so they can
   recover a password themselves.
3. **Add positions for the remaining players** — 4 of 18 have them. Templates are already
   assigned (goalkeeper and leader evaluations exist in the database), so most of this point
   is done; what remains are the positions, which get printed on the sheet.
4. **Evaluate the remaining 7 players** — 11 of 18 active players have an evaluation.
5. **An `ANTHROPIC_API_KEY`**, if the paid model is to be used. Without it — and with an
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
