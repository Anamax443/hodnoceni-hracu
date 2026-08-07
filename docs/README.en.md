# Coach's manual — Player evaluation

English mirror of [README.md](README.md). The app itself is bilingual: switch with
**English / Čeština** in the top bar, or force it with `?lang=en` in the address.
The 📖 Documentation tab inside the app carries the same content and is the one that
gets updated first.

**Live:** https://hodnoceni.maxferit.cz

---

## 1. What it is for

Six axes, scores 1–10, twice: once by the coach, once by the player. The point is not
the scores — it is the **differences**. Where the two views disagree, there is something
to talk about. The output is a printable A4 sheet with a radar chart that you can take
to the player or to the parents.

## 2. Three rules it stands on

1. **Score blind.** Previous values are deliberately hidden. A visible last-season number
   pulls the new one towards itself and the data series stops meaning anything.
2. **The player fills in first, then sees yours.** Enforced by the server, not by hiding
   things in the interface.
3. **Nothing is ever overwritten.** Every save is a new record, so the history builds itself.

### The 1–10 scale

| Range | Meaning |
|---|---|
| 1–3 | starting out, only calm and unpressured |
| 4–5 | fine in training, wobbles in a match |
| 6–7 | reliable in a match too |
| 8–9 | a strength, the team leans on it |
| 10 | above the standard for this age group |

The bar is the age category, not the best player in the squad.

## 3. Signing in

Type your **sign-in name or e-mail** into “Who are you”. The password may be short —
a **4-digit PIN** is fine, because you type it on a phone at the pitch. After **five
failed attempts** sign-in locks for fifteen minutes and says so.

**Forgot password** sends a single-use link to the channel you have on file (Telegram or
e-mail), valid for fifteen minutes. Whether such an account exists is never revealed —
but a malformed entry and an exhausted rate limit are reported plainly, so you are not
left waiting for a link that was never sent. The page for setting the new password always
states **whose** password you are changing.

A legacy **shared password** still works: leave “Who are you” empty. It will be removed
once every coach has their own account.

## 4. The command bar

The strip above the tabs takes a player's name or a command:

- `Robin` → finds the player and offers **Evaluate / Compare / Sheets**
- `robin ferda` → offers a comparison of the two
- `sheets robin`, `compare robin and ferda`, `evaluate ferda` → runs straight away

The matching is done by **the app itself** over the squad it already has loaded — instant,
and it costs nothing. The language model is asked only about sentences the app cannot
resolve, and only if it is switched on (Settings → Language model).

## 5. Tabs

### People

Who is in the team: name, nickname, positions, role and the templates they are scored with.
Clicking a name opens that person for editing.

A player can have **several templates** ticked — outfield, goalkeeper and leader all at
once. Each one is its own series, its own self-evaluation link and its own sheet; they
cannot be merged into a single chart, but they can be printed on one page (Sheets →
combined sheet). The first ticked one is the default in the evaluation form.

A player can hold **several positions**. **Function** is free text (“Captain”) and is
printed on the sheet. **Active** is unticked instead of deleting — the history stays, and
the number a player was given is never reused.

**Export and import.** *Export to Excel* downloads an `.xlsx` workbook where phone and
chat id are formatted as Text, so `+420604577765` does not become `4.20605E+11`. With
nobody on file you still get the header row as an empty template. *Import* accepts `.xlsx`
and `.csv`, first reports what would happen, and writes only after you confirm. Rows are
matched by `id`, then sign-in name, then name and role. **Passwords and evaluations are
never touched.** Values are written as ordinary words (`coach`, `outfield`, `centre
midfielder`, `yes` / `no`) in the language you have switched on.

### Evaluate

Pick a player; the form appears below: six axes with ten scores each, three written blocks
and the goals. Nothing is pre-filled and previous values are not shown — that is deliberate.

The **set of axes** is chosen in the form. A player who keeps goal and plays outfield can
have both in one period and gets two sheets. There is also a **leader** template —
leadership: leading on the pitch, example in training, response to mistakes and pressure,
fair play, supporting team-mates, reliability. It is a *second sheet* alongside the playing
one, not a seventh axis, and it describes visible behaviour rather than personality.

Careful when sending links: **a self-evaluation link carries the template** you scored the
player with. If you later score them with a different set of axes, generate a new link.

**Goals:** two or three, concrete and checkable. Not “improve the left foot” but “left foot:
5 extra minutes every training, a 10-metre pass”. The player must be able to tell whether
they did it.

**If you make a mistake**, you don't have to fill everything in again. An evaluation can be
loaded, corrected and saved — that creates a **new version** and the original stays in the
history. There are two ways in:

- in **Evaluate**, the app says above the form that you already have an evaluation in this
  period (date and template only, **no scores**) and offers *Edit it*;
- in **Comparison → Evaluation history**, the *Edit* button on a given version — this also
  works for an older period.

Only **your own** evaluations are offered; a player's self-evaluation cannot be edited this
way. Scoring stays blind — unless you ask for an edit yourself, the form shows no earlier
numbers.

#### Evaluate several players at once

When several players are at the same level in one discipline, open **Evaluate several
players at once** at the bottom of the tab, fill in only the axes where they agree, and tick
the players. The app reports who is affected and **writes only after you confirm**.

The axes you set are merged into each player's latest evaluation for this period and
template; the rest stay untouched and a new record is created. Players with no evaluation
from you in this period are skipped and listed by name. The base is taken from **your own**
evaluations only.

### Sheets

Printable A4 sheets. Pick the period, the second polygon (coach's previous evaluation,
the player's self-evaluation, or none) and who to print.

A player with several templates gets **a sheet for each of them**. The *Who gets printed*
table therefore has a row per template and shows which one still has no evaluation; an empty
one is printed as a blank form so it does not drop out of sight.

The **Combined sheet** tick box puts them on **one page**: the radars side by side, each
captioned, with the written notes and goals merged from all templates (each part says which
template it came from). Unticked, every template gets its own page.

Sheets open in a new tab. **In the print dialogue enable “Background graphics”** — without
it you get a white page with no blue name bar and no coloured blocks. Leave margins on
“Default”; the page sets its own (A4, 12 mm). Check before printing: the number of pages in
the preview should match the number of players.

### Comparison

Pick a player and you see a table: your score, their score, the difference, and whether the
axis needs attention.

- **+** the player scored higher than you = a blind spot, they lack feedback
- **−** the player scored lower than you = confidence, possibly something outside football

Only axes where the difference is **larger than the tolerance** (default 2) are discussed.
When more than three axes disagree, the app suggests picking two or three topics.

#### Comparing players with each other

The second card. Pick a template and tick two or more players and you get an **axis × player**
table: the higher score in bold, a *Gap* column showing the distance between the best and the
worst, and axes with a gap of 3 or more highlighted. The last row is the average — an
orientation figure, not a school grade. Only coach evaluations are compared, always within
one template.

### Links

Single-use self-evaluation links for the active players in the period, with *Copy* and
*Invalidate* and the state (waiting / filled in). Send the link **to the individual player**,
not to a team group: whoever has it can fill the self-evaluation in for them.

### Settings

Tolerance, period, season, club, category, the bar, the goals heading, your own password,
digest notifications, the SMS switch and the language model.

### 📖 Documentation

The last tab: the same content as this file, inside the app, following the interface language.

## 6. Notifications

The app sends a **digest**, not one message per event, and it carries only who did what —
**never scores or written assessments**. Channels are enabled per coach under People.

Two independent intervals: a digest at most every N days when something happens (default 3),
and a “nothing has changed” message after N quiet days (default 14) — without the second one,
silence would be indistinguishable from a breakage.

**Telegram:** the coach has to message the bot once; Telegram does not allow a bot to write
first. **E-mail:** the address must be verified in Cloudflare beforehand.

**SMS is a last-resort tool.** Settings has an *Allow sending SMS* switch, off by default;
while it is off nothing goes out, even to someone who has SMS enabled — the attempt is
logged as skipped, with the reason. The recipient sees the gateway's sender name, so the
club name belongs in the message text. *Dry run SMS* checks the gateway, the channel and the
number format without sending anything.

### Language model

The command bar handles ordinary commands on its own and **costs nothing**. The model is
asked only about sentences the app cannot resolve. In Settings you choose who:

- **Off** (default) — the model is never called
- **Cloudflare Workers AI** — free, daily limit
- **Claude** — paid, needs the `ANTHROPIC_API_KEY` secret

The model receives the typed sentence and the squad names — **no scores, no written
assessments** — and never acts on its own: it proposes an action that the app performs.
Every call is written to the communication log. **When Claude runs out of credit** or hits
its limit, the free model finishes the command and the reason is stated.

### Sent messages

Settings shows the last hundred send attempts: time, channel, platform, recipient, type and
result including the provider's reason for a refusal — so “I got nothing” can be
investigated. Metadata is stored, not message content; links with tokens are never logged.

## 7. On a phone

Below 720 px the tabs collapse under **☰**, which also shows where you are. Scores get a
bigger touch target and wide tables scroll sideways inside their card.

## 8. The half-season routine

1. In Settings, update the **period** and the goals heading.
2. Under Links, generate links and send them to the players.
3. Score the squad under Evaluate — blind.
4. Once both sides are in, go through Comparison and pick 2–3 topics per player.
5. Print the sheets (second polygon = the player's self-evaluation).
6. Hand them out individually and talk them through.
