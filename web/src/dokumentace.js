/* =====================================================================
   DOKUMENTACE — text, který se ukazuje v záložce 📖 Dokumentace.

   Je tady schválně jako celé odstavce, ne po klíčích v i18n.js: souvislý
   text se v překladovém slovníku neudržuje, rozpadl by se na střepy.
   Obě jazykové verze drží pohromadě, ať se nestane, že se jedna změní
   a druhá zůstane rok pozadu.

   Pravidlo pro úpravy: popisovat, jak se aplikace CHOVÁ, ne jak je
   napsaná. Když se chování změní, změň i tenhle text — je to jediná
   nápověda, kterou trenér uvidí.
   ===================================================================== */

const CS = `
<h2>Co tahle aplikace dělá</h2>
<p>Vede hodnocení mládežnických fotbalistů: trenér každému hráči dá známky
1–10 na šesti osách, hráč si nezávisle vyplní stejné osy sám za sebe a
aplikace obojí položí přes sebe. Zajímavé nejsou známky, ale <b>rozdíly</b> —
tam, kde se pohled trenéra a hráče rozchází, je téma na rozhovor.</p>
<p>Výstupem je tiskový list A4 s radarem, se kterým se dá jít za hráčem
nebo za rodiči.</p>

<h2>Lidé</h2>
<p>Kartotéka kádru. U každého člověka se vede:</p>
<ul>
  <li><b>Jméno a přezdívka</b> — přezdívka se ukazuje všude, kde se jméno
      vypisuje. Hodí se, když jsou v kádru tři stejná příjmení.</li>
  <li><b>Role</b> — hráč, nebo trenér. Trenér se přihlašuje, hráč ne.</li>
  <li><b>Pozice</b> — může jich být víc (brankář i střední záložník).
      Tisknou se na list.</li>
  <li><b>Funkce</b> — volný text, třeba „Kapitán“.</li>
  <li><b>Šablona</b> — sada os. Polní hráč a brankář mají jiné. U osoby je
      to jen výchozí volba, skutečná šablona se vybírá až u hodnocení.</li>
  <li><b>Aktivní</b> — vyřazení hráči se nemažou, jen se odškrtnou. Zůstávají
      i s historií a se svým číslem, které se už nikdy nepřidělí nikomu jinému.</li>
  <li><b>Kanály</b> — e-mail, Telegram chat id, telefon a k nim přepínače,
      kam mají chodit souhrny.</li>
</ul>

<h3>Export a import</h3>
<p><b>Export do Excelu</b> stáhne sešit <code>.xlsx</code>. Telefon a chat id
v něm mají formát Text, takže z <code>+420604577765</code> Excel neudělá
<code>4,20605E+11</code>. Když ještě není zadaný nikdo, stáhne se samotná
hlavička — je to prázdná šablona, kterou lze vyplnit v tabulce a nahrát zpátky.
<b>Export CSV</b> dělá totéž pro programy mimo Excel; CSV ale žádné formáty
buněk nenese.</p>
<p><b>Import</b> bere <code>.xlsx</code> i <code>.csv</code> a běží ve dvou
krocích: nejdřív řekne, co by se stalo („řádků 22, přibylo by 19, upravilo by
se 3“), a teprve po potvrzení zapisuje. Řádek se páruje k člověku podle
<code>id</code>, jinak podle přihlašovacího jména, jinak podle jména a role —
jinak by z každé opravy vznikl nový člověk. Vadné řádky se přeskočí a vypíšou
s číslem řádku tak, jak ho vidíš v Excelu.</p>
<p><b>Import nikdy nemění hesla ani hodnocení.</b> Jde výhradně o kartotéku lidí.</p>

<h2>Příkazový řádek</h2>
<p>Pruh nad obsahem. Napiš jméno hráče a aplikace nabídne, co s ním: <b>Hodnotit</b>,
<b>Porovnat</b>, <b>Listy</b>. Napiš dvě jména a nabídne srovnání. Povel se dá
říct i celý — „listy Robin", „porovnej Robina a Ferdu", „hodnotit Ferda".</p>
<p>Hledání a rozřazení dělá <b>samotná aplikace</b> nad kádrem, který už má
načtený: je to okamžité a nestojí to nic. Jazykový model se ptá teprve tehdy,
když si aplikace s větou neporadí — a jen když je v Nastavení zapnutý.</p>

<h2>Hodnotit</h2>
<p>Vyber hráče, období a šablonu a dej známky 1–10 na šesti osách. Nepovinně
lze připsat poznámku. Hodnocení se <b>nikdy nepřepisuje</b>: každé uložení je
nový záznam, takže je vidět vývoj i to, kdo co kdy napsal.</p>
<p>Hráč, který chytá i hraje v poli, může mít v jednom období obě šablony a
dostane dva listy. Vedle herních šablon je i <b>leader</b> — samostatná šestice
os na vůdcovství (vedení na hřišti, příklad v tréninku, reakce na chybu a tlak,
fair play, podpora spoluhráčů, spolehlivost). Je to <i>druhý list</i> vedle
herního, ne sedmá osa: sedm vrcholů by změnilo tvar radaru a nešlo by porovnat
se staršími hodnoceními. Osy popisují chování, které je vidět, ne povahu.</p>

<h3>Oprava a úprava hodnocení</h3>
<p>Když v hodnocení něco nesedí, nemusíš vyplňovat celý formulář znovu. Existující
hodnocení se dá <b>načíst, upravit a uložit</b> — a uložením vzniká <b>nová verze</b>.
Původní se nemaže ani nepřepisuje, zůstává v historii a dá se k němu vrátit i vytisknout.</p>
<p>Vede k tomu dvojí cesta:</p>
<ul>
  <li><b>V Hodnotit</b> — když v tomhle období od tebe hodnocení už je, aplikace to
      nad formulářem řekne a nabídne <i>Upravit ho</i>. Nabídka ukazuje jen datum
      a šablonu, <b>žádná čísla</b>.</li>
  <li><b>V Porovnání → Historie hodnocení</b> — tlačítko <i>Upravit</i> u konkrétní
      verze. Takhle jde opravit i hodnocení ze staršího období; nová verze se uloží
      do období té upravované, ne do právě nastaveného.</li>
</ul>
<p>Nabízejí se jen <b>tvoje</b> hodnocení. Sebehodnocení hráče takhle upravit nejde
a uzavřená shoda trenérů se řeší v Shodě. V historii je u nové verze poznámka,
ze které verze vznikla — jinak by úprava vypadala stejně jako druhé samostatné hodnocení.</p>
<p>Známkuje se dál naslepo: dokud si úpravu sám nevyžádáš, formulář žádná dřívější
čísla neukáže. Předvyplnění je nástroj na opravu, ne na hodnocení.</p>

<h3>Hromadné hodnocení</h3>
<p>Když má víc hráčů stejnou úroveň v jedné disciplíně, nemusíš proklikat každého
zvlášť. Dole v Hodnotit otevřeš <b>Hodnotit víc hráčů najednou</b>, vyplníš jen
osy, na kterých se shodují, a zaškrtneš hráče. Aplikace napřed spočítá, koho se
to týká, a <b>zapíše až po potvrzení</b>.</p>
<p>Vyplněné osy se <b>doplní k poslednímu hodnocení</b> hráče v tomhle období
a šabloně; ostatní osy zůstanou beze změny a vznikne nový záznam. Kdo od tebe
v období hodnocení ještě nemá, se nezaloží — chybějícím osám by nebylo co
doplnit — a vypíše se jmenovitě, ať ho doplníš jednotlivě. Základ se bere jen
z <b>tvých</b> hodnocení, aby se tiše nesmíchaly dva pohledy.</p>

<h2>Sebehodnocení hráče</h2>
<p>V záložce <b>Odkazy</b> se hráči vygeneruje jednorázový odkaz. Osy jsou
formulované v první osobě a na konci je nepovinná otázka, na čem chce hráč
pracovat. Odkaz nese i šablonu, aby hráč vyplňoval tytéž osy, které známkoval
trenér.</p>
<p><b>Hráč nevidí hodnocení trenéra, dokud neodešle svoje.</b> To není
nastavení, to hlídá server.</p>

<h2>Tolerance a znaménko rozdílu</h2>
<p>Rozdíl o jeden bod není signál, je to šum. Proto se řeší jen osy, kde je
rozdíl <b>větší než tolerance</b> (výchozí 2, mění se v Nastavení). Znaménko
má výklad:</p>
<ul>
  <li><b>+</b> trenér dal víc než hráč sám sobě → hráč o své silné stránce neví
      (slepé místo).</li>
  <li><b>−</b> hráč si dal víc než trenér → sebedůvěra, kterou výkon zatím
      nedohnal.</li>
</ul>
<p>Když se rozchází víc než tři osy, aplikace doporučí vybrat dvě až tři témata.
Na víc není při jednom rozhovoru nikdo zvědavý.</p>

<h2>Porovnat hráče mezi sebou</h2>
<p>Druhá karta v Porovnání. Vybereš šablonu a zaškrtneš hráče (dva brankáře, dva
stopery) a dostaneš tabulku osa × hráč: vyšší známka tučně, sloupec <b>Rozdíl</b>
říká, o kolik se nejlepší a nejhorší liší, a osy s rozdílem 3 a víc se zvýrazní —
tam se ti hráči opravdu liší, jinde jsou na tom stejně.</p>
<p>Srovnávají se jen hodnocení od trenérů a vždy v rámci jedné šablony;
sebehodnocení hráče je jiná optika a míchat je by lhalo. Kdo tou šablonou
v období hodnocení nemá, vypíše se pod tabulkou místo tichého vynechání.</p>

<h2>Shoda</h2>
<p>Když hráče hodnotí víc trenérů, tahle záložka ukáže matici osa × trenér a
u každé osy řekne, jestli se shodli, nebo o kolik se rozcházejí. Vybere se
výsledná hodnota a jedno finální slovní znění, které jde na list. Trenéra lze
označit jako <b>povinného</b> — dokud neodevzdá, ostatní jeho čísla nevidí a
dostanou jen informaci, že se čeká na něj.</p>

<h2>Listy a tisk</h2>
<p>Tiskový list A4 s radarem. Druhý polygon se dá přepnout: minulé hodnocení
trenéra, sebehodnocení hráče, nebo žádný. Vytisknout jde i konkrétní starší
verze — v Porovnání je historie všech verzí s datem a autorem a dá se mezi
dvěma vybranými posouvat šipkami.</p>

<h2>Notifikace</h2>
<p>Aplikace posílá <b>souhrn</b>, ne zprávu za každou událost. Zpráva nese jen
„kdo a co udělal“ — <b>nikdy známky ani slovní posudky</b>. Kanály se zapínají
u konkrétního trenéra v Lidech.</p>
<p>Intervaly jsou dva a jsou nezávislé:</p>
<ul>
  <li><b>Když se něco děje</b> — souhrn nejvýš jednou za N dní (výchozí 3).</li>
  <li><b>Když se nic neděje</b> — po N dnech přijde zpráva „nic se nezměnilo“
      (výchozí 14). Bez ní by nešlo poznat, jestli se nic neděje, nebo se něco
      rozbilo.</li>
</ul>

<h3>Telegram</h3>
<p>Chodí přes klubového bota. <b>Bot nesmí napsat první</b> — dokud mu člověk
nepošle aspoň jednu zprávu, neexistuje jeho chat id a není kam psát. Tlačítko
v Lidech chat id dotáhne, druhé pošle zkušební zprávu.</p>

<h3>E-mail</h3>
<p>Odchází z adresy klubu přes Cloudflare. Adresa příjemce musí být ověřená —
neověřená pošta se tiše zahodí, proto je po ruce log komunikace.</p>

<h3>SMS</h3>
<p>SMS je <b>mimořádný nástroj</b>: stojí peníze a ruší. V Nastavení je proto
vypínač <b>Povolit odesílání SMS</b> a ve výchozím stavu je vypnutý. Dokud se
nezapne, neodejde žádná SMS ani člověku, který ji má zapnutou u sebe — pokus
se zapíše do logu jako přeskočený, i s důvodem.</p>
<p>Posílá se přes českou bránu GoSMS; příjemce uvidí jako odesílatele jméno
brány, ne klub. Značka klubu proto patří do textu zprávy. Pojistkou proti
smyčce je denní strop.</p>
<p>Tlačítko <b>SMS nanečisto</b> ověří přihlášení k bráně, kanál i tvar čísla,
ale nic neodešle a nic nestojí. Funguje i při vypnutém kanálu.</p>

<h2>Jazykový model</h2>
<p>V Nastavení se vybírá, kdo obsluhuje příkazový řádek, když si aplikace neporadí
sama: <b>vypnuto</b> (výchozí — model se nevolá vůbec), <b>Cloudflare Workers AI</b>
(zdarma, denní limit) nebo <b>Claude</b> (placený). Tlačítko <i>Vyzkoušet spojení</i>
pošle jednu holou větu bez jediného údaje o hráčích a řekne, jestli model odpověděl.</p>
<p>Model dostane jen napsanou větu a jména kádru — <b>ne známky a ne posudky</b> —
a sám nic neprovede: vrátí návrh akce, kterou spustí aplikace. Každé volání se
zapíše do logu komunikace i s tím, jak dlouho trvalo.</p>
<p><b>Když u Claude dojde kredit</b>, vyčerpá se limit nebo má výpadek, povel
dokončí model zdarma a důvod se napíše — aplikace kvůli fakturaci nepřestane
fungovat. Chyba ve vlastním požadavku se ale zálohou nezakrývá, ta se ukáže.</p>

<h2>Log komunikace</h2>
<p>V Nastavení je posledních sto pokusů o odeslání: kdy, kanál, platforma
(GoSMS, Telegram, Cloudflare, model), komu, typ a výsledek i s důvodem, proč to
poskytovatel odmítl. Slouží k tomu, aby „nic mi nepřišlo” šlo dohledat.</p>
<p>Ukládají se <b>metadata, ne obsah</b>. Výjimkou je text SMS, a to kvůli
počtu segmentů a sporům o fakturaci — hodnocení v něm stejně nikdy není.
<b>Odkazy s tokeny se nelogují nikdy</b>: záznam s platným odkazem na obnovu
hesla je reset čekající na zneužití.</p>

<h2>Přihlášení, hesla a PIN</h2>
<p>Každý trenér má vlastní účet. Do pole „Kdo jsi“ se dá napsat
<b>přihlašovací jméno i e-mail</b>. Heslo smí být krátké, klidně
<b>4místný PIN</b> — trenéři to ťukají do mobilu na hřišti.</p>
<p>Krátký PIN je únosný jen díky zámku: po <b>pěti marných pokusech</b> na
jeden účet (nebo patnácti z jedné adresy) se přihlášení na patnáct minut
zamkne a aplikace to řekne narovinu. Úspěšné přihlášení počitadlo nuluje.
Zámek je schválně krátký — jinak by pár špatných pokusů stačilo k vyřazení
trenéra z aplikace.</p>
<p><b>Zapomenuté heslo</b> pošle jednorázový odkaz na kanál, který má člověk
vyplněný. Platí patnáct minut a jen jednou. Jestli takový účet existuje,
aplikace neřekne — jinak by šlo zjišťovat, kdo účet má. Nesmyslný tvar vstupu
a vyčerpanou brzdu ale řekne nahlas, ať se nečeká na odkaz, který nikam
nejde. Stránka s novým heslem vždycky napíše, čí heslo zrovna nastavuješ.</p>
<p>Ze starých časů existuje ještě <b>společné heslo</b> bez jména. Používá se
tak, že se pole „Kdo jsi“ nechá prázdné. Až budou mít všichni trenéři svůj
účet, zruší se.</p>

<h2>Ochrana údajů</h2>
<p>V aplikaci jsou jména, známky a slovní posudky nezletilých. Proto:</p>
<ul>
  <li>hodnocení vidí jen přihlášený trenér;</li>
  <li>hráč vidí svůj list, ne hodnocení ostatních, a cizí odkaz mu nic nedá;</li>
  <li>notifikace nenesou známky ani posudky;</li>
  <li>zdrojový kód i data zůstávají v neveřejném repozitáři.</li>
</ul>

<h2>Na telefonu a na papíře</h2>
<p>Na úzké obrazovce se záložky schovají pod tlačítko <b>☰</b>, které zároveň
ukazuje, kde zrovna jsi. Známky mají větší plochu na palec a široké tabulky se
posouvají do stran uvnitř karty, takže stránka nikam neuteče.</p>
<p>Tiskový list je <b>A4 na výšku</b> a náhled v prohlížeči má rozměr papíru
i s okraji — co vidíš, to vyjede z tiskárny. Jeden hráč je jedna stránka
a podpis trenéra sedí dole u kraje, aby nad ním zůstalo místo na poznámky
od ruky.</p>

<h2>Provoz</h2>
<p>Aplikace běží na Cloudflare, data jsou v databázi D1 v Evropě. Dole v liště
je čas, přepínač vzhledu, jazyk a <b>commit běžící verze</b> — po najetí myší
se ukáže celý hash a čas sestavení. Když se něco opraví, jde tím ověřit, že
opravená verze opravdu běží.</p>
`;

const EN = `
<h2>What this app does</h2>
<p>It keeps evaluations of youth footballers: the coach scores each player
1–10 on six axes, the player fills in the same axes independently, and the app
overlays both. The scores are not the point — the <b>differences</b> are.
Where the coach and the player disagree, there is something to talk about.</p>
<p>The output is a printable A4 sheet with a radar chart.</p>

<h2>People</h2>
<p>The squad register. For each person the app keeps:</p>
<ul>
  <li><b>Name and nickname</b> — the nickname appears wherever names are shown,
      which helps when three players share a surname.</li>
  <li><b>Role</b> — player or coach. Coaches sign in, players do not.</li>
  <li><b>Positions</b> — there can be several (goalkeeper and midfielder).</li>
  <li><b>Function</b> — free text, e.g. “Captain”.</li>
  <li><b>Template</b> — the set of axes. Outfield players and goalkeepers differ.
      On a person it is only the default; the real template is chosen per evaluation.</li>
  <li><b>Active</b> — players are never deleted, only unticked. They keep their
      history and their number, which is never given to anybody else.</li>
  <li><b>Channels</b> — e-mail, Telegram chat id, phone, and switches for digests.</li>
</ul>

<h3>Export and import</h3>
<p><b>Export to Excel</b> downloads an <code>.xlsx</code> workbook. Phone and chat
id are formatted as Text, so <code>+420604577765</code> does not turn into
<code>4.20605E+11</code>. With nobody on file you still get the header row as an
empty template. <b>Export CSV</b> serves tools other than Excel, but CSV carries
no cell formats.</p>
<p><b>Import</b> accepts <code>.xlsx</code> and <code>.csv</code> and runs in two
steps: first it reports what would happen, and only writes after you confirm.
A row is matched to a person by <code>id</code>, else by sign-in name, else by
name and role — otherwise every correction would create a new person. Invalid
rows are skipped and listed with the row number as Excel shows it.</p>
<p><b>Import never touches passwords or evaluations.</b></p>

<h2>Command bar</h2>
<p>The strip above the content. Type a player's name and the app offers what to do:
<b>Evaluate</b>, <b>Compare</b>, <b>Sheets</b>. Type two names and it offers a
comparison. Whole commands work too — “sheets Robin”, “compare Robin and Ferda”,
“evaluate Ferda”.</p>
<p>Matching and routing are done by <b>the app itself</b>, over the squad it has
already loaded: instant, and it costs nothing. The language model is asked only
when the app cannot resolve the sentence — and only if it is switched on in Settings.</p>

<h2>Evaluate</h2>
<p>Pick a player, a period and a template, then score six axes 1–10, optionally
with a note. Evaluations are <b>never overwritten</b>: every save is a new record,
so the progression stays visible, including who wrote what and when.</p>
<p>Besides the playing templates there is <b>leader</b> — a separate set of six
axes for leadership (leading on the pitch, example in training, response to
mistakes and pressure, fair play, supporting team-mates, reliability). It is a
<i>second sheet</i> alongside the playing one, not a seventh axis: seven vertices
would change the radar's shape and break comparison with older evaluations. The
axes describe visible behaviour, not personality.</p>

<h3>Correcting and editing an evaluation</h3>
<p>When something in an evaluation is wrong, you don't have to fill the whole form
again. An existing evaluation can be <b>loaded, edited and saved</b> — and saving
creates a <b>new version</b>. The original is neither deleted nor overwritten; it
stays in the history and can still be opened and printed.</p>
<p>There are two ways in:</p>
<ul>
  <li><b>In Evaluate</b> — if you already have an evaluation in this period, the app
      says so above the form and offers <i>Edit it</i>. The offer shows only the date
      and the template, <b>no scores</b>.</li>
  <li><b>In Comparison → Evaluation history</b> — the <i>Edit</i> button on a given
      version. This also works for an older period; the new version is saved into the
      period of the edited one, not into the currently configured period.</li>
</ul>
<p>Only <b>your own</b> evaluations are offered. A player's self-evaluation cannot be
edited this way and a closed coach consensus belongs in Consensus. In the history the
new version carries a note saying which version it came from — otherwise an edit would
look exactly like a second, independent evaluation.</p>
<p>Scoring stays blind: unless you ask for an edit yourself, the form shows no earlier
numbers. Pre-filling is a tool for corrections, not for scoring.</p>

<h3>Bulk evaluation</h3>
<p>When several players are at the same level in one discipline, you don't have to
click through them one by one. At the bottom of Evaluate open <b>Evaluate several
players at once</b>, fill in only the axes where they agree, and tick the players.
The app first reports who is affected and <b>writes only after you confirm</b>.</p>
<p>The axes you set are <b>merged into each player's latest evaluation</b> for this
period and template; the other axes stay untouched and a new record is created.
Players with no evaluation from you in this period are skipped — there would be
nothing to merge into — and listed by name so you can do them individually. The
base is taken from <b>your own</b> evaluations only, so two viewpoints never get
silently mixed.</p>

<h2>Player self-evaluation</h2>
<p>Under <b>Links</b> you generate a single-use link for a player. The axes are
phrased in the first person and there is an optional question about what the
player wants to work on. The link also carries the template, so the player fills
in the same axes the coach scored.</p>
<p><b>A player cannot see the coach's scores before submitting their own.</b>
That is enforced by the server, not by a setting.</p>

<h2>Tolerance and the sign of a difference</h2>
<p>A one-point gap is noise, not a signal, so only axes with a difference
<b>larger than the tolerance</b> (default 2, configurable) are discussed.
The sign carries meaning:</p>
<ul>
  <li><b>+</b> the coach scored higher than the player did → a strength the
      player is unaware of (a blind spot).</li>
  <li><b>−</b> the player scored higher than the coach → confidence the
      performance has not caught up with yet.</li>
</ul>
<p>When more than three axes disagree, the app suggests picking two or three
topics. Nobody takes more than that from a single conversation.</p>

<h2>Comparing players with each other</h2>
<p>The second card under Comparison. Pick a template and tick the players (two
goalkeepers, two centre backs) and you get an axis × player table: the higher score
in bold, a <b>Gap</b> column showing the distance between the best and the worst,
and axes with a gap of 3 or more highlighted — that is where they genuinely differ;
elsewhere they are level.</p>
<p>Only coach evaluations are compared, always within one template; a player's
self-evaluation is a different lens and mixing the two would lie. Anyone without an
evaluation in that template and period is listed under the table rather than
silently dropped.</p>

<h2>Agreement</h2>
<p>When several coaches evaluate one player, this tab shows an axis × coach
matrix and marks where they agree. You pick the resulting value and one final
wording for the sheet. A coach can be marked as <b>required</b>: until they
submit, they see no numbers from the others, only a note that they are the
one being waited for.</p>

<h2>Sheets and printing</h2>
<p>A printable A4 sheet with the radar. The second polygon can be switched:
the coach's previous evaluation, the player's self-evaluation, or none. Older
versions can be printed too — Comparison lists every version with date and
author and lets you step between two of them.</p>

<h2>Notifications</h2>
<p>The app sends a <b>digest</b>, not one message per event, and the message
carries only who did what — <b>never scores or written assessments</b>.
Channels are enabled per coach under People.</p>
<p>There are two independent intervals: a digest at most every N days when
something happens (default 3), and a “nothing has changed” message after N
quiet days (default 14). Without the second one, silence would be
indistinguishable from a breakage.</p>

<h3>Telegram</h3>
<p>Sent through the club bot. <b>The bot cannot message first</b> — until a
person writes to it, their chat id does not exist. One button fetches the chat
id, another sends a test message.</p>

<h3>E-mail</h3>
<p>Sent from the club address through Cloudflare. The recipient address must be
verified; unverified mail is dropped silently, which is what the communication
log is for.</p>

<h3>SMS</h3>
<p>SMS is a <b>last-resort tool</b>: it costs money and interrupts people.
Settings therefore has an <b>Allow sending SMS</b> switch, off by default.
While it is off, no SMS goes out even to someone who has it enabled — the
attempt is logged as skipped, with the reason.</p>
<p>Messages go through the Czech gateway GoSMS, so the recipient sees the
gateway's sender name, not the club; the club name belongs in the message text.
A daily cap guards against loops. The <b>Dry run SMS</b> button verifies the
gateway login, the channel and the number format without sending anything and
without spending credit — it works even while the channel is off.</p>

<h2>Language model</h2>
<p>Settings is where you choose who serves the command bar when the app cannot
resolve a sentence itself: <b>off</b> (the default — the model is never called),
<b>Cloudflare Workers AI</b> (free, daily limit) or <b>Claude</b> (paid). The
<i>Test the connection</i> button sends one bare sentence with no player data and
reports whether the model answered.</p>
<p>The model receives only the typed sentence and the squad names — <b>no scores and
no written assessments</b> — and never acts on its own: it returns a proposed action
that the app performs. Every call is written to the communication log, including how
long it took.</p>
<p><b>When Claude runs out of credit</b>, hits its limit, or has an outage, the free
model finishes the command and the reason is stated — the app does not stop working
over billing. An error in the request itself is not papered over by the fallback;
that one is shown.</p>

<h2>Communication log</h2>
<p>Settings shows the last hundred send attempts: time, channel, platform
(GoSMS, Telegram, Cloudflare, model), recipient, type and result including the
provider's reason for a refusal. It exists so that “I got nothing” can be
investigated.</p>
<p>It stores <b>metadata, not content</b>. The exception is the SMS text, kept
because of segment counting and billing disputes — it never contains evaluation
data anyway. <b>Links with tokens are never logged</b>: a stored password-reset
link is a reset waiting to be abused.</p>

<h2>Sign-in, passwords and PINs</h2>
<p>Every coach has their own account and can sign in with either the
<b>sign-in name or the e-mail</b>. The password may be short — a <b>4-digit
PIN</b> is fine, because coaches type it on a phone at the pitch.</p>
<p>A short PIN is only defensible because of the lockout: after <b>five failed
attempts</b> on one account (or fifteen from one address) sign-in is locked for
fifteen minutes and the app says so plainly. A successful sign-in clears the
counter. The lock is deliberately short — otherwise a handful of wrong attempts
would lock a coach out of the app.</p>
<p><b>Forgot password</b> sends a single-use link to the channel on file, valid
for fifteen minutes. Whether such an account exists is never revealed, but a
malformed entry and an exhausted rate limit are reported plainly, so nobody
waits for a link that was never sent. The page for setting the new password
always states whose password is being changed.</p>
<p>A legacy <b>shared password</b> still exists; you use it by leaving the
“Who are you” field empty. It will be removed once every coach has an account.</p>

<h2>Data protection</h2>
<p>The app holds names, scores and written assessments of minors. Therefore:
evaluations are visible only to a signed-in coach; a player sees their own
sheet and nothing of the others; notifications carry no scores or assessments;
and both the source code and the data stay in a private repository.</p>

<h2>On a phone and on paper</h2>
<p>On a narrow screen the tabs collapse under a <b>☰</b> button, which also shows
where you currently are. Scores get a bigger touch target and wide tables scroll
sideways inside their card, so the page itself never runs away.</p>
<p>The printed sheet is <b>A4 portrait</b>, and the browser preview has the paper's
dimensions including margins — what you see is what comes out of the printer. One
player is one page, and the coach's signature sits at the bottom edge so there is
room above it for handwritten notes.</p>

<h2>Operations</h2>
<p>The app runs on Cloudflare with a D1 database in Europe. The bar at the top
shows the time, the theme and language switches, and the <b>commit of the
running version</b> — hover for the full hash and build time. After a fix, that
is how you confirm the fixed version is really live.</p>
`;

/** HTML dokumentace pro zvolený jazyk. */
export function dokumentaceHtml(jazyk) {
    return jazyk === 'en' ? EN : CS;
}
