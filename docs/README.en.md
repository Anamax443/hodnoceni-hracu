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

**You can leave “Who are you” empty and type just your PIN** — the app works out who you
are and signs your evaluations with your name. On the pitch in gloves that is the
difference between four taps and typing out a login. If two people had the same PIN the
app does **not** guess: it asks for the name, because picking one of them would sign an
evaluation with somebody else's name.

An empty name also still works for the legacy **shared password**, which will be removed
once every coach has their own account — an evaluation saved under it does not know who
wrote it.

**That convenience has a price.** Four digits without a name are easier to guess than a
name with a password, and the app is on the public internet. What holds it is the lockout
on failed attempts and a delay after each one. So: **do not tell anyone your PIN and do
not put it in a message** somebody else might read.

## 4. The command bar

The strip above the tabs takes a player's name or a command:

- `Robin` → finds the player and offers **Evaluate / Compare / Sheets**
- `robin ferda` → offers a comparison of the two
- `sheets robin`, `compare robin and ferda`, `evaluate ferda` → runs straight away

The matching is done by **the app itself** over the squad it already has loaded — instant,
and it costs nothing. The language model is asked only about sentences the app cannot
resolve, and only if it is switched on (Settings → Language model).

## 5. Tabs

### Home

The first screen after signing in. Not a welcome poster: nothing happens for half a year
and then a round of evaluations arrives — that is when one glance has to show where the
squad stands.

- **club badge and period**, so it is clear what is being written into;
- **where it stands** — counted **per sheet**, not per player: someone with three templates
  has three series and three papers. The numbers come from the same data as Sheets;
- **what to do next** — concrete steps with a button where the work happens, shown **only
  when something is actually left**;
- **language model** — whether it answers and what is configured, taken from the last real
  use rather than a test query.

The **club badge** is the file `web/logo.png` in the repository. If it is missing, the image
hides itself and only the name stays — a broken icon looks like an app error when it is
merely a file nobody uploaded.

### People

Who is in the team: name, nickname, positions, role and the templates they are scored with.
Clicking a name opens that person for editing.

**The form opens on request** — with *+ Add person* or by clicking a name. It closes with
*Close* and after saving by itself.

**Only someone who left nothing behind can be deleted** — a typo, a double import, a coach
created by mistake. Anyone with an evaluation (their own or one they made) or a
self-evaluation link cannot be deleted and the app says why: **their numbers are history**.
Someone who left the team is retired by unticking *active*.

A player can have **several templates** ticked — outfield, goalkeeper and leader all at
once. Each one is its own series, its own self-evaluation link and its own sheet; they
cannot be merged into a single chart, but they can be printed on one page (Sheets →
combined sheet). The first ticked one is the default in the evaluation form.

**What is ticked here decides what the player can be scored with at all.** The evaluation
form and the bulk evaluation offer those templates only — an outfield player cannot be
scored with the goalkeeper set of axes.

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

### Positions

**The reverse view of People.** There you pick a player and tick their positions; here you
pick a **position** and tick who belongs there. Putting a line-up together, you think "who
can play right back for me", not "what is Vilém good at" — and clicking through eighteen
cards for that is a chore.

The selector shows **how many people hold each position** and opens on the emptiest one.
Next to every player you see their **other positions**, so it is clear who you are pulling
away from elsewhere.

**Only the selected position is saved.** The others a player has set stay untouched — this
form knows nothing about them and must not wipe them. If the ticks match what is already
stored, the app says so and writes nothing.

It is the same field as in People, just from the other side: what you tick here shows up
there on the player. Positions are printed on the sheet.

### Evaluate

Pick a player; the form appears below: seven axes with ten scores each, three written blocks
and the goals. Nothing is pre-filled and previous values are not shown — that is deliberate.

**Who is evaluating must be filled in.** Without a signature the evaluation is not saved —
the app says so and the server refuses it even when called directly — and the same applies
to bulk evaluation and to closing an agreement. Whoever is logged in under their own name
is pre-filled and the list is locked: the logged-in account signs it. With the shared
password the app cannot tell who is at the keyboard, so a coach has to be picked. A player's
self-evaluation is a different thing — the player signs it by arriving through their own link.

The **set of axes** is chosen in the form, but **only among those ticked for that player
in People** — a template they do not have is not offered at all, and with a single one
assigned the selector is locked. The default is the first ticked one, and everything they
have assigned is listed under the selector. A player
who keeps goal, plays outfield and leads the team is filled in as many times as they have
templates — after saving, the app offers *Score: goalkeeper* and the rest straight away.
They then get a sheet for each, and each series lives on its own; the sets cannot be merged
into one chart, because a different set of axes has a different shape.

**Leader** is one of those sets — leading on the pitch, example in training, response to
mistakes and pressure, fair play, supporting team-mates, reliability. It is a *sheet of its
own* alongside the playing one, not a seventh axis, and it describes visible behaviour
rather than personality.

**The three written blocks** are the remaining three corners of the model and carry no
number on purpose. What belongs in each is written under the field in the form too —
without it three coaches write three different things:

- **Physical** — fitness, speed, strength, growth, health. (“Lasts the whole match, still
  gets outmuscled in duels.”) There is no number because at this age it would measure
  biological age, not the work done.
- **Mental** — focus, reaction to mistakes and to pressure, confidence, effort in training.
  (“Takes a long time to recover from an own mistake, plays again by the end.”)
- **Social** — team-mates, coach, referee; whether they pull the others along or tag along.
  (“Younger players come to them for advice.”)

**Where this comes from.** The split into one chart and three written blocks rests on two
schools, and both are linked under the blocks in the app itself:

- **English** — the [FA 4 Corner Model](https://learn.englandfootball.com/articles-and-resources/coaching/resources/2022/the-fa-4-corner-model)
  of the English Football Association: four equal corners (technical/tactical, physical,
  psychological, social), none of which works in isolation. The technical/tactical corner
  is the radar with numbers here; the other three are the written blocks.
- **Spanish** — the structured training of [Paco Seirul·lo](https://barcainnovationhub.fcbarcelona.com/blog/paco-seirul%C2%B7los-proposal-for-team-sports-training-structured-training-game-spaces-and-preferential-simulation-situations/)
  at FC Barcelona ([in Spanish](https://barcainnovationhub.fcbarcelona.com/es/blog/la-propuesta-de-paco-seirul%C2%B7lo-para-el-entrenamiento-en-deportes-de-equipo-el-entrenamiento-estructurado-los-espacios-de-juego-y-las-situaciones-simuladoras-preferenciales/)):
  the player as eight interrelated structures — conditional, coordinative, cognitive,
  socio-affective, emotive-volitional, creative-expressive, mental and bioenergetic.

If you would rather watch than read: the English model has a video on
[The Boot Room](https://www.thefa.com/bootroom/resources/coaching/the-fas-4-corner-model) (the FA),
the Spanish one in [Paco Seirulo — El padre del Microciclo Estructurado](https://www.youtube.com/watch?v=YQLnAQF_H2U).
The videos live on other people's sites and may disappear; the articles above are the durable part.

For the three blocks here that maps roughly as: *Physical* = conditional and bioenergetic,
*Mental* = cognitive and emotive-volitional, *Social* = socio-affective and
creative-expressive. Both schools say the same thing: a player is more than what can be
measured, and what cannot be measured is written as a sentence, not a score.

**The written notes and the goals belong to that template**, not to the person — “goal
kicks” does not belong on a leader sheet. Switching the template therefore clears them; if
you have anything typed, the app asks first so nothing is lost.

Careful when sending links: **a self-evaluation link carries one set of axes**. A player
with several templates gets a link for each of them.

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

**The period is a list built from saved evaluations, not a free-text box.** It holds every
period that has an evaluation in it, plus the one from Settings (that is where evaluations
go now, even if it is still empty), and says how many sheets each one yields. A free-text
box let you type a period that is not in the database, and the result did not look like an
error: printing went through and out came blank pages.

The last option is **“all periods — the whole history”**: a player gets a sheet for every
period they have an evaluation in. The *Who gets printed* table then spans all periods, so
✓ means “in at least one”, not “this season”. Progress in the chart only ever looks
backwards — an autumn sheet is compared with what came before it, not with the spring
that followed.

A player with several templates gets **a sheet for each of them**. The *Who gets printed*
table therefore has a row per template and shows which one still has no evaluation; an empty
one is printed as a blank form so it does not drop out of sight.

**Tick boxes work per sheet, not per player.** Ferda has three templates and therefore three
rows, each with its own tick box: to print only his goalkeeper sheet, untick the other two.
The tick box in the header selects and deselects everything.

The **Combined sheet** tick box puts them on **one page**: the radars side by side, each
captioned, with the written notes and goals merged from all templates (each part says which
template it came from). Unticked, every template gets its own page.

The second tick box, **Add a page explaining the axes**, appends **one extra page**: what
each axis measures and what mastering it looks like, written from the player's point of
view — the same sentence they see in their self-evaluation. It does not belong on the player
sheet: *one player = one A4* is a rule. The page covers the whole stack, so it is printed
once rather than per player.

Next to every score stands **the name of its level** — on screen and on paper: *4/10
building*, *7/10 reliable*, *10/10 exceptional*. A bare seven means nothing until the reader
looks up the band in the legend, and a parent who sees the sheet twice a year will not look
it up. The bands stay in the legend under the chart; the name is only a shortcut to them.

#### Colour by template

Every template has its own colour, so a stack of printed sheets can be told apart at a glance:

| Template | Colour | |
|---|---|---|
| outfield | blue | `#2196F3` |
| goalkeeper | teal | `#00838F` |
| leader | crimson | `#AD1457` |

The colour is carried by the header, the player's name bar, the radar and the legend swatch.
**The header also spells out the template name** — colour is only the second signal. On a
black-and-white printer, when printing without background graphics, and to a colour-blind
reader the sheet still has to make sense, which is why the name is always visible. The
combined sheet belongs to all templates at once, so its header stays grey, the colours are
carried by the individual radars, and the header shows a badge per template on the page.

The same colours appear in the app (labels under People, Evaluate, Links and Comparison) and
on the self-evaluation page the player fills in. The app's dark theme uses its own, lighter
shades — the paper ones are unreadable on a dark background. Paper stays paper.

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

#### Compare anything with anything

The third card. Pick **two to eight records** and they are put side by side, axis by axis.
A record is **player + period + who evaluated**, so this can compare what nothing else can:
two periods of the same player, a self-evaluation against the coach, two coaches against each
other, or players from different periods — or all of it at once. Only records that actually
exist are offered.

**The template is the one boundary this cannot cross.** The goalkeeper and outfield sets do
not share a single axis, so "Catching 8" against "Left foot 3" would not be a comparison.

**Columns sort themselves**, not by the order you ticked them: periods chronologically, and
within a period the coach comes before the player. With two columns the *difference* is the
second minus the first, so **+ means improvement** across periods and "the player scored
themselves higher" for coach vs. self-evaluation — the same reading as the top card. With
three or more columns the sign is not shown (there would be nothing to sign it against) and
a gap column takes its place.

### Links

Single-use self-evaluation links for the active players in the period, with *Copy* and
*Invalidate* and the state (waiting / filled in). Send the link **to the individual player**,
not to a team group: whoever has it can fill the self-evaluation in for them.

**A link carries one set of axes**, so a player with several templates gets one link per
template — the *Template* column says which is which. An unused link for the same template is
not created twice; how many were skipped is reported after generating.

**Generate for whom** is the table above the button, and **tick boxes work per link, not per
player**: someone with three templates has three rows and you can generate just one of them.
Everything is ticked by default; the box in the header selects and deselects the whole column.
A combination that already has an unfilled link says so — it cannot be generated again, that
would only blur which one is valid.

**The app does not send the link.** You copy it and send it yourself. Notification channels
are configured for coaches only and carry just who did what, never content.

### Settings

Tolerance, period, season, club, category, the bar, the goals heading, **preferred
formations**, your own password, digest notifications, the SMS switch and the language model.

**Period** stays a free-text field — no list can know a new round in advance — but it
suggests the periods already in the data. Pick from the suggestions when you mean the
current one: “Winter” instead of “winter” is not a typo the application can catch, it is
a new, empty period that no earlier evaluation pairs with.

**Preferred formations** are the ones the team plays, separated by commas (“1-4-4-2,
1-4-3-3”). They do not change the scoring — the axes are the same for every formation.
They are shared memory for the coaches and **context for the analyses**: “right-back in
1-4-4-2” means something different than in 1-3-5-2, and without it the model guesses.

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

**SMS header.** Because the sender ID belongs to the gateway, the header is the only thing
telling the recipient who is writing. It is set in Settings and prefixes every message
alike; an empty field means the club name. The preview below the field shows the message
as it will arrive and counts segments. **Beware of en dashes, typographic quotes and
ellipses** — stripping diacritics does not catch them, yet they are not in the SMS
alphabet, so they double the price of the message. The preview warns about it.

**A test to any number** lives in Settings and does not have to be in the roster — it
checks the gateway, not a player. The free dry run sits next to a real send, which asks
first because it spends credit.

The communication log is **collapsed** and opens on click, so the Settings page does not
grow with everything the app has ever sent. **Search** filters as you type and **Export to
CSV** downloads the whole log from the database, not just the hundred rows shown.

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
