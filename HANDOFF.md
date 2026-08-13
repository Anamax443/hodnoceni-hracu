# HANDOFF — deník stavu: hodnoceni-hracu

Append-only. Nejnovější záznam nahoru. Slouží k pokračování z jiného počítače / po pauze.

## 2026-08-13 (41) — období v Listech je nabídka z dat, ne volné pole

**Commit:** `77d7274` · **NASAZENO** 2026-08-13, Version ID `ca14b268-b138-47c0-8da7-976a4e8c0bba`.
Ověřeno živě: `/api/version` = `77d7274`, `cisto: true` na obou adresách; servírovaný
`app.js` nese `l-obdobi`, `nactiKdo`, `popisObdobi` i `obdobi-nabidka`; `/api/obdobi`
bez přihlášení `401`.

**Uživatel zakroužkoval dvě pole „Období"** — jedno v Nastavení, druhé v Tiskových listech —
a zeptal se: *„toto tam potřebujeme? na tiskových listech by měl být seznam období
z uložených hodnocení, list s volbou všechno a nebo to co je v db."*

**Co bylo špatně.** Období v Listech bylo volné textové pole předvyplněné z Nastavení.
Překlep v něm se nechoval jako chyba: tisk prošel a vyjely samé prázdné listy, protože
se hledalo období, které nikdo nikdy nezadal. Druhá, tišší vada: tabulka *Kdo se vytiskne*
se plnila **vždycky za období z Nastavení** bez ohledu na to, co v poli stálo — ✓ a pomlčky
tedy mohly platit pro něco jiného, než co se chystalo na papír.

**Co se z toho stalo:**
1. **Nabídka místo pole.** `GET /api/obdobi` vrací období, která jsou v `evaluations`,
   plus to z Nastavení (do něj se právě hodnotí, i když je prázdné). U každého stojí, kolik
   listů z něj vyjde — „zatím bez hodnocení" je poznat na první pohled. Tabulka *Kdo se
   vytiskne* se překresluje s výběrem, takže platí pro to, co se tiskne.
2. **„Všechna období — celá historie."** Hráč dostane papír za každé období, ve kterém
   hodnocení má. Jednotkou listu je pak hráč × období × šablona a kumulovaný list se
   skládá po hráči **a období** — jinak by se loňský brankářský radar slil s letošním
   polním na jednu stránku. **Období nese každý list zvlášť**, ne nastavení: na hromádce
   jich je několik a v hlavičce musí být to své.
3. **Nastavení zůstalo volné pole** — nové kolo žádná nabídka dopředu nezná — ale
   napovídá (`<datalist>`) období, která už v datech jsou. „Zima" místo „zima" totiž není
   překlep, který by aplikace poznala: je to nové, prázdné období, do kterého se nespáruje
   ani jedno starší hodnocení.

**Chronologii nese datum, ne název.** „2026/2027 jaro" je abecedně před „2026/2027 zima",
ale v sezoně je za ním. Období se proto řadí podle `MIN(datum)` svých záznamů — stejně,
jako to už dělaly sloupce v `/api/porovnani-vice`.

**Vada, kterou odhalil až test, a která tu byla i předtím:** polygon „minule" bral
*nejnovější hodnocení z jiného období*. Dokud šlo tisknout jen aktuální období, vycházelo
to; jakmile jde vybrat starší, stálo u podzimu jako „minule" **následující jaro** a vývoj
ukazoval pozpátku. `predchoziObdobi()` má nově omezení `datum <` datum vlastního záznamu
(u prázdného podkladu začátek jeho období), takže nejstarší list nemá s čím srovnávat —
a správně nemá nic.

Ověřeno proti lokálnímu `wrangler dev` na třech obdobích postavených proti abecedě,
vykreslením listů skutečným `list.js` a proklikem v headless Edge (CDP). Doklad
v `known_good.md` (28).

---

## 2026-08-12 (40) — jméno úrovně u čísla, vysvětlivky os (inspirace Marcet)

**Commit:** `9bf8004` · **NASAZENO** 2026-08-12, Version ID `4aaa792a-eda8-4140-a4aa-db7e8a0768f2`.

Uživatel poslal **hodnoticí zprávu z kempu Marcet (Barcelona)** pro Bedřicha Grunda
a chtěl ji probrat. Co z rozboru vzešlo:

**Co se v té zprávě ukázalo.** Stupnice 0–10 je optická — všech 32 dovedností má známku
4, 6 nebo 8, protože se zadává slovní úroveň (*Essential / Competent / Advanced*) a ta se
teprve mapuje na číslo. Souhrn kapitoly je **useknutý** průměr, ne zaokrouhlený (6,89 se
tiskne jako 6, tedy hůř, než jaká je skutečnost). Texty jsou šablonové: „video analysis"
je návrh č. 2 nebo 3 skoro u každé dovednosti a kapitoly 5.4 a 5.6 mají prakticky totožný
odstavec i všechny tři cíle. Překlad je místy rozbitý (*partidos* → „parties"). Nejnižší
udělovaný stupeň se jmenuje *Essential* a leží na 4/10 — nikdo nedostane trojku, protože
je to výstup placené služby, ne interní nástroj.

**Co se z toho vzalo:**
1. **Jméno úrovně u čísla.** Kotvy dostaly krátký název (`kotva.N.nazev`: začátek /
   buduje se / spolehlivé / opora / nadstandard) a ten stojí u čísla v radaru
   (*7/10 spolehlivé*) i jako tučný štítek v legendě. Pásma z legendy nezmizela — jméno
   je zkratka k nim, ne náhrada. `uroven(n)` v `i18n.js` je jediné místo, kde se číslo
   mapuje na pásmo, aby graf a legenda nemohly říkat každý něco jiného.
2. **Vysvětlivky os** jako **samostatná stránka** (zaškrtávátko v Listech, výchozí vypnuto).
   Marcet vysvětluje každou dovednost na vlastní stránce; nám by se to na list nevešlo
   a nemá — *jeden hráč = jedna A4*. Stránka je proto jedna pro celou hromádku, sekce po
   šablonách, u každé osy věta z pohledu hráče (tatáž, kterou vidí v sebehodnocení).

**Co se vědomě NEpřevzalo:** známkování povahy číslem (jejich kapitola 5 dává čísla
odpovědnosti a přístupu — naše zadání to zakazuje, od toho jsou slovní bloky), tři cíle
ke každé ose (32 × 3 = 96 cílů nikdo nečte) a šablonové texty.

**Co máme navíc a oni ne:** srovnání s předchozím obdobím a **sebehodnocení hráče** proti
pohledu trenéra. V Marcetu hráč svůj pohled neříká vůbec.

Ověřeno vyrenderováním obou stránek headless Edgem (`--headless=new --screenshot`) ze
skutečných modulů. Doklad v `known_good.md` (27).

**Zůstává otevřené** (probrané, nezadané): cíl označkovaný osou, které se týká, a externí
posudek u hráče (Marcet apod.) — u toho je potřeba rozhodnout, jestli stačí odkaz a pár
vět, nebo se má ukládat celé PDF.

---

## 2026-08-10 (39) — úvodní stránka, preferované sestavy, mazání osoby

**Commit:** `4660a43` · **NASAZENO** 2026-08-10, Version ID `62616f76-4b78-430f-9ec6-1f489d38cbe1`.

Tři přání z jednoho sezení.

**Úvodní stránka (záložka *Úvod*, nově výchozí).** Aplikace dosud spadla rovnou do tabulky
Lidí — na kartotéku, ne na stav. Nová první obrazovka nese znak klubu, období, čtyři
dlaždice (hráčů, listů ohodnocených trenérem, listů se sebehodnocením, kolik zbývá) a
**kroky „co udělat dál"** s tlačítkem tam, kde se to dělá. Kroky se ukazují jen tehdy,
když opravdu něco zbývá — seznam samých odškrtnutých úkolů nikdo nečte. Čísla jsou
z `/api/prehled`, tedy z týchž dat jako Listy; druhá pravda o stavu nevznikla. Poslední
karta je **stav jazykového modelu** (na přání uživatele) — z posledního skutečného
použití, ne ze zkušebního dotazu.

Počítá se **po listech**, ne po hráčích: kdo má tři šablony, má tři řady i tři papíry.

**Znak klubu** čeká jako `web/logo.png`; dokud tam soubor není, obrázek se schová a zůstane
název. Rozbitá ikona vedle jména vypadá jako chyba aplikace, a přitom je to nenahraný soubor.

**Preferované sestavy** (`sestavy`, výchozí `1-4-4-2`) jsou volný seznam oddělený čárkou,
ne pevná nabídka v kódu — uživatel rovnou řekl, že jich bude nejspíš víc. Hodnocení to
nemění (osy jsou pro každou sestavu stejné), ale jde to **do podkladů pro jazykový model**:
„pravý bek v 1-4-4-2" znamená něco jiného než v 1-3-5-2. Při té příležitosti dostal model
i kategorii a laťku, které v podkladech chyběly.

**Mazání osoby.** Doteď šlo jen odškrtnout „aktivní" — správně u hráče, který skončil,
ale nepoužitelné u překlepu nebo dvojitého importu. Formulář má teď *Smazat osobu*,
server ale pustí jen toho, po kom **nic nezůstalo**: kdo má hodnocení (svoje nebo pořízená)
nebo odkaz na sebehodnocení, dostane 409 a v něm napsáno, co ho drží a co dělat místo toho.
Historie zůstává celá.

Doklady v `known_good.md` (26).

---

## 2026-08-10 (38) — hodnocení se neuloží bez podpisu

**Commit:** `d2f178e` · **NASAZENO** 2026-08-10, Version ID `d8df854c-9f36-469e-b88b-726c7cf09765`.

Uživatel: *„při hodnocení musí být vždy vyplněna hodnotící osoba, nemůže být prázdná."*
Dosud šlo uložit hodnocení s volbou *— neuvedeno —* a v historii pak stál záznam,
u kterého se za půl roku nedalo zjistit, kdo ho psal. Shoda mezi trenéry navíc nemá
co s čím porovnávat, když jeden ze sloupců nemá jméno.

**Platí to na všech třech místech, kde vzniká hodnocení:** formulář, hromadné hodnocení
(dostalo vlastní pole *Hodnotí*, dřív žádné nemělo) a uzavření shody (pole *Uzavírá*).
Prázdná volba zůstala v nabídce jen jako výzva „vyber, kdo hodnotí" — uložení ji odmítne.

**Není to jen v prohlížeči.** Server u všech tří endpointů ověřuje, že autor existuje
a že je to trenér (`overTrenera()`), takže to platí i pro volání API napřímo a pro
formulář, který zůstal otevřený z doby před opravou.

**Kdo je přihlášený svým účtem, podepisuje se sám** — nabídka se předvyplní a zamkne,
protože server bere identitu ze session; jiná volba v nabídce by lhala. U společného
hesla (dnešní stav) aplikace nepozná, kdo sedí u počítače, a trenér se vybírá ručně.

**Sebehodnocení hráče se to netýká.** Chodí jiným endpointem přes jednorázový odkaz,
ukládá se s `autor='hrac'` a autorem je hráč sám.

**Hromadné hodnocení tím dostalo i opravu, o které se nevědělo:** základ se hledá mezi
hodnoceními *od téhož trenéra* (`autor_id IS ?`) a dosud se pod společným heslem hledal
mezi řádky bez autora. Teď se hledá pod tím, kdo je vybraný — takže co se doplňuje
a pod čí jméno se to zapíše, je jedna a tatáž věc.

Doklad o odmítnutí všech sedmi případů je v `known_good.md` (25).

---

## 2026-08-10 (37) — formulář osoby až na vyžádání, videa k oběma školám

**Commit:** `ddf2707` · **NASAZENO** 2026-08-10, Version ID `9316cb60-423a-41cc-8255-3535189a0466`.

**Formulář „Nová osoba" stál pod tabulkou pořád otevřený** a působilo to, jako by se
zrovna něco zakládalo — uživatel to popsal přesně: *„má se objevit až v případě, že chci
novou osobu, jinak to působí zmatečně."* Teď je zavřený (`hidden` na kartě) a otevře ho
buď tlačítko **+ Přidat osobu** nad tabulkou, nebo klik na jméno (úprava). Ve formuláři
přibylo **Zavřít**; po uložení se překreslí tabulka, takže se zavře sám.

**Videa k oběma školám.** Odkazy na články tam byly od commitu `3d46bcd`, ale uživatel je
nenašel — byly na jednom řádku v drobném písmu pod třetím polem. Teď jsou **na třech
řádcích s vlaječkou** (nadpis / 🇬🇧 / 🇪🇸) a u každé školy je i video:
[FA Boot Room](https://www.thefa.com/bootroom/resources/coaching/the-fas-4-corner-model)
a [Paco Seirulo — El padre del Microciclo Estructurado](https://www.youtube.com/watch?v=YQLnAQF_H2U).
U videí je napsáno, že jsou na cizích stránkách a můžou zmizet — články jsou to trvalejší.

**Poučení:** odkaz, který nikdo nenajde, je totéž jako odkaz, který tam není. Vejít se na
jeden řádek není hodnota; poznat na první pohled, co ke komu patří, ano.

---

## 2026-08-10 (36) — zkratka přes štítek i v Listech a Odkazech

**Commit:** `65fbed6` · **NASAZENO** 2026-08-10, Version ID `097d3ca7-bbb9-4392-a129-94e93da896aa`.

Uživatel ukázal tutéž tabulku ještě dvakrát — *Listy → Kdo se vytiskne* a *Odkazy →
Komu vygenerovat*. Tentýž štítek na třech místech nemůže jednou být zkratka a dvakrát
jen ozdoba: **klik vede na hodnocení odevšad, kde je vidět dvojice hráč × šablona.**

Nejužitečnější je to v Listech u řádku, který má ve sloupci *trenér* pomlčku — právě ten
list ještě hodnocení nemá a odsud je do něj jeden klik místo cesty přes dvě rozbalovátka.

Navigace je vytažená do `zapojZkratkyNaHodnoceni(kam)`, ať netře psát totéž třikrát;
štítek staví `stitekSablonyKlik(hracId, sablona)`. U tabulky **vygenerovaných odkazů**
je štítek klikací jen tehdy, když je hráč pořád aktivní — token může být i po někom,
kdo z týmu odešel, a ten ve výběru hodnocení není.

Ověřeno na nasazené verzi: `app.js` z custom domény i ze záložní adresy mají stejný ETag
a obsahují všechna čtyři místa. Samotné kliknutí neproklikáno — na stroji není prohlížeč
k automatizaci.

---

## 2026-08-10 (35) — štítek šablony v Lidech je zkratka na hodnocení

**Commit:** `f5768a3` · **NASAZENO** 2026-08-10, Version ID `b8aa638b-5ce0-4bc8-90ec-c0352abe0ace`.

V tabulce Lidí je vidět, že Ferda má tři šablony — ale dostat se k jeho brankářskému
hodnocení znamenalo přejít na *Hodnotit* a proklikat dvě rozbalovátka nad tím, co člověk
právě viděl. **Klik na štítek to teď udělá rovnou**: otevře formulář s tím hráčem a právě
tou šesticí os.

Řešeno stejným způsobem jako příchod z Historie: jednorázová schránka ve `stav`
(`naHodnoceni`), kterou si záložka *Hodnotit* po překreslení vybere. Štítek je `<button>`,
takže se na něj dá i tabulátorem; **vyřazený hráč klikací štítek nemá** — ve výběru hráčů
k hodnocení není, takže by zkratka vedla do formuláře s prázdným rozbalovátkem.

**Pozorování k ověřování nasazení:** minutu po `npm run deploy` vracela custom doména
**starý `app.js`** (`CF-Cache-Status: HIT`, starý ETag), zatímco `/api/version` už hlásila
nový commit — verze je zapečená v bundlu, asset jde přes cache zóny. Ani `?v=náhoda`
ani `Cache-Control: no-cache` to neobešly. Po ~2 minutách se ETag srovnal se záložní
adresou a obsah byl nový. **Po nasazení tedy neověřovat jen `/api/version`, ale i to,
že v `app.js` je opravdu ta změna** — a počítat s tím, že první minuty po nasazení
může trenér dostat starý skript.

---

## 2026-08-10 (34) — odkazy na anglickou a španělskou školu

**Commit:** `3d46bcd` · **NASAZENO** 2026-08-10, Version ID `23e4000e-33cc-4914-8da0-462f0436d279`.

Vysvětlivky pod bloky říkaly *co* do nich patří, ale ne *odkud to je*. Komu jedna věta
nestačí, neměl kam dojít — a nebylo poznat, že rozdělení na graf a tři bloky stojí na
metodice, ne na domácím nápadu.

Pod bloky (v hodnocení i v Shodě) je teď řádek s prameny a v dokumentaci aplikace
i v příručce CS/EN kapitola *Odkud to je*:

- **anglická škola** — [FA Four Corner Model](https://learn.englandfootball.com/articles-and-resources/coaching/resources/2022/the-fa-4-corner-model)
  anglické FA: čtyři rovnocenné rohy, žádný nefunguje sám o sobě
- **španělská škola** — strukturovaný trénink Paca Seirul·la (FC Barcelona,
  [Barça Innovation Hub](https://barcainnovationhub.fcbarcelona.com/blog/paco-seirul%C2%B7los-proposal-for-team-sports-training-structured-training-game-spaces-and-preferential-simulation-situations/)):
  hráč jako osm propojených struktur

Napsané je i **mapování** osmi struktur na naše tři bloky, ať je vidět, že se nemíchají
dvě různé věci: *Fyzicky* = kondiční + bioenergetická, *Hlavou* = kognitivní +
emotivně-volní, *V partě* = socio-afektivní + kreativně-expresivní.

Obě stránky **ověřené 10. 8. 2026** (staženy a zkontrolováno, že obsahují to, co u nich
stojí — čtyři rohy, osm struktur). Odkazy žijí v jednom souboru `web/src/zdroje.js`,
protože na ně sahá formulář i dokumentace a rozejít se nesmí.

**Pozorování k nasazení:** `hodnoceni.maxferit.cz` ohlásila nový commit hned,
`hodnoceni-hracu.bass443.workers.dev` ještě chvíli vracela předchozí. Záložní adresa
dobíhá pomaleji — ověřovat podle custom domény.

---

## 2026-08-10 (33) — u slovních bloků je napsané, co do nich patří

**Commit:** `2a5931a` · **NASAZENO** 2026-08-10, Version ID `4e466f8d-90d7-4452-90d3-6fdaff7cdb3c`.

**Uživatel zakroužkoval popisky** *Fyzicky*, *Hlavou*, *V partě* v kartě „Co půjde na list":
holé slovo nad prázdným polem. Nad formulářem sice byla společná věta o tom, že se tyhle
tři rohy neznámkují číslem, ale **co do kterého patří, neříkalo nic**. U aplikace, kde píšou
tři trenéři a texty se pak slévají do jednoho listu, to znamená tři různé výklady.

Pod každým polem je teď jedna věta: který roh modelu to je, co do něj patří a **příklad
věty**, aby bylo vidět, jak konkrétní se to má psát. Je to na obou místech, kde se bloky
vyplňují — v hodnocení i v Shodě — a v obou jazycích. Karta *Co půjde na list* navíc říká,
že tenhle text se hráči opravdu vytiskne a že je předvyplněný od prvního trenéra.

Vysvětlení vychází z **FA Four Corner Model** (`docs/ZADANI.md` §13), na kterém stojí celé
zadání: fyzický, psychologický a sociální roh; technicko-taktický je radar s čísly.

---

## 2026-08-10 (32) — známkovat jde jen tím, co má hráč zaškrtnuté

**Commit:** `fe9c640` · **NASAZENO** 2026-08-10, Version ID `803c719d-de81-4836-9fdd-ff001f172fc3`.

**Uživatel poslal snímek s kroužkem:** Mirda má v Lidech *hráče v poli* a *leadera*,
ale ve formuláři hodnocení mu šlo vybrat **brankáře**. Nabídka se plnila z `Object.keys(SABLONY)`,
tedy ze všech šablon, jaké aplikace zná — přiřazení hráče se v ní vůbec neuplatnilo.
Nápověda pod výběrem přitom správně vypisovala, co hráč má; ukazovala tedy na rozpor,
který sama nezpůsobila.

**Není to jen zbytečná volba.** Uložením by vznikla brankářská řada a brankářský tiskový
list u hráče, který nikdy nechytal — a v Listech by u něj svítilo hodnocení, které nikdo
nezadal úmyslně. Špatné číslo v datové řadě se hůř hledá než chybějící.

**Opraveno na dvou místech, protože UI není pravidlo:**
- formulář hodnocení nabízí jen přiřazené šablony; při jediné je výběr zamčený (`disabled`),
- hromadné hodnocení nabízí u zvolené šablony **jen hráče, kteří ji mají** — komentář
  v kódu to tvrdil už dřív, ale filtr tam nikdy nebyl (`hraciAktivni()` bez omezení),
- `POST /api/evaluations` cizí šablonu odmítne s 400. Pojistka platí na přímé volání API
  i na formulář, který zůstal otevřený z doby před opravou.

**Výjimka, která tam musí být:** oprava už pořízeného záznamu. Když se hráči šablona
mezitím odškrtne, musí jít jeho starší hodnocení opravit a uložit jako novou verzi —
server proto pustí i nepřiřazenou šablonu, pokud se rovná šabloně předlohy (`uprava_id`).
Ve formuláři taková šablona v nabídce zůstane a je u ní napsané, proč tam je.

**Nesouvisející, ale ze stejného dne:** na přání uživatele dostali `leader` **všichni
hráči** (19 řádků v ostré DB). První `UPDATE` šel přes `wrangler d1 execute --command`
a escapování uvozovek v PowerShellu rozbilo podmínku `NOT LIKE '%"leader"%'`, takže se
místo 10 chybějících trefilo všech 19 a devíti lidem přibyl `leader` **podruhé**.
Opraveno druhým během ze souboru a ověřeno dotazem. **Hromadné SQL do D1 posílat přes
`--file`, ne `--command`.**

---

## 2026-08-09 (31) — dokumentace lhala o číslech; čísla se berou z databáze

**Uživatel přistihl dokumentaci při lži.** V kapitole *Stav projektu* stálo „hráčům
neodešel ani jeden odkaz, žádné sebehodnocení není vyplněné" — zatímco on odkazy dávno
rozesílal **WhatsAppem** (kopíroval je z aplikace) a **první sebehodnocení už měl**.

**Jak to vzniklo:** čísla jsem do aplikační dokumentace opsal z `docs/STATUS.md`, což byl
snímek z rána, místo abych se podíval do databáze. Snímek nezestárl sám — zestárl tím, že
jsem ho vydával za současnost.

**Skutečnost z ostré databáze:** 4 vygenerované odkazy (1 použitý), **1 sebehodnocení**
od 1 hráče, 16 trenérských hodnocení u 11 z 18 hráčů.

**Oprava není přepsat číslo, ale odstranit ho z textu.** Nový `GET /api/stav-dat` vrací
počty a kapitola *Stav projektu* si je natáhne při otevření. Text drží význam, čísla říká
databáze. Ve `STATUS.md`, `STATUS.en.md` i `STATUS.html` zůstávají jako **otisk k datu**,
ale nově s poznámkou, kde jsou živá — a s příběhem té lži, ať je jasné, proč tam ta
poznámka je.

**Chyba v mém předpokladu, kterou to odhalilo:** bral jsem „rozeslat odkazy" jako funkci
aplikace. Není. **Odkaz je jednorázový a je jedno, kudy se k hráči dostane** — WhatsApp,
Messenger, papírek. Kanály v aplikaci (Telegram, e-mail, SMS) jsou pohodlí, ne podmínka,
a dokumentace to tak dřív neříkala. Teď to říká výslovně.

**Rozbité odkazy uvnitř dokumentů** (uživatel poslal snímek s kroužkem kolem `HANDOFF.md`).
Odkazy v Markdownu míří na cesty k souborům (`../HANDOFF.md`, `docs/STATUS.md`), které na
webu neexistují — klik končil na 404. Generátor je teď překládá na `/dok/<klíč>` podle
názvu souboru; cíle, které se na web nepřevádějí, se mění na obyčejný text, protože modrý
podtržený odkaz, který nikam nevede, je horší než žádný.

**Audit celé dokumentace** (na vyžádání): žádný rozbitý odkaz, žádná mrtvá kotva, žádný
odkaz na GitHub. Zmínky o GitHubu zůstaly jen v próze, kde patří — `BUILD.md` popisuje
`git clone`, `TECHNICAL.md` vysvětluje, proč se na GitHub neodkazuje. `ARCHITECTURE.md`
ve výpisu je věta o šabloně project-standard, ne odkaz. Zkontrolováno strojově: 9 odkazů
na `/dok/`, 0 rozbitých, 0 mrtvých kotev.

**NASAZENO** 2026-08-09, Version ID `e2050585-d37e-4bd6-bb1e-4814a0c8eff4`.

---

## 2026-08-09 (30) — dokumentace na vlastních stránkách, menu, stav modelu z provozu

**Model se hlásí podle skutečného použití, ne podle zkušebního dotazu.** Uživatel to
upřesnil dobře: „pokud by LLM model neodpovídal, tak aby tady vyskočil červený bod,
nemusí se bez aktivity kontrolovat." Odpověď na tu otázku už v aplikaci ležela — každé
volání modelu se zapisuje do logu komunikace. `/api/stav` teď čte **poslední záznam
s `kanal='ai'`**: chyba → červená, jinak zelená, žádný záznam → neutrální „zatím se
neptalo". Nulová cena a přitom skutečný stav.

Rozlišení, které se vyplatilo: `preskoceno` znamená, že model **odpověděl**, jen nerozuměl
větě. Kdyby se to počítalo jako porucha, svítila by červená pokaždé, když trenér napíše
něco mimo mísu. Červená patří jen `chyba`.

Lišta se obnovuje hned po volání modelu (příkazový řádek i analýzy), takže výpadek je
vidět v tu chvíli, ne až po dalším přihlášení.

**Dokumentace je na vlastních stránkách místo odkazů na GitHub.** Uživatel to zamítl
správně: repozitář je soukromý, takže by trenér místo dokumentu uviděl přihlašovací
stránku GitHubu. `scripts/gen-dokumenty.mjs` převede `.md` na HTML do
`worker/src/dokumenty.ts` (běží v `predeploy`, soubor je v `.gitignore`, zdrojem pravdy
zůstává Markdown) a Worker je servíruje na `/dok/<klíč>`.

**Kam to nešlo dát:** do `web/`. Cokoliv tam leží, servíruje ASSETS **veřejně, bez
přihlášení** — a i když v dokumentech osobní údaje nejsou, provozní podrobnosti (ID
kanálu, verze, otevřené díry v GDPR) na veřejný web nepatří. Trasa `/dok/` proto ověřuje
session.

**Vlastní převodník Markdownu**, ne knihovna: umí přesně to, co je v těch souborech.
Jedna past stála za ošetření — obsah `` `kódu` `` se musí odložit stranou dřív, než se
řeší tučné písmo, protože dokumentace popisuje i samotný Markdown a `**` uvnitř ukázky
by se jinak proměnilo ve formátování. Ověřeno: v deseti souborech nezůstala jediná
nedodělaná tabulka ani `**` mimo `<code>`.

**Menu na začátku dokumentace** (v aplikaci i na stránkách) se skládá **z nadpisů, které
v textu opravdu jsou**. Ručně psaný seznam by se dřív nebo později rozešel s obsahem.
Hned to něco našlo: v české dokumentaci stál osiřelý nadpis *Porovnat hráče mezi sebou*
bez jediné věty pod sebou, hned nad *Porovnat cokoliv s čímkoliv*. Do menu by se propsal
jako prázdná kapitola; odstraněn, téma pokrývá *Srovnání hráčů mezi sebou* níž.

**Cena:** bundle vyrostl ze 116 na 242 KiB gzip. Limit je řádově výš, ale dokumentace se
teď veze s každým nasazením.

**Ověřeno:** převod všech deseti souborů (žádná nedodělaná tabulka, žádné `**` mimo kód),
vyrenderovaná stránka STATUS v headless Edge — rozcestník, obsah kapitol i tabulky sedí.
Cestou opraven dvojitý nadpis: stránka má titulek z tabulky a k tomu se vypisoval `#`
z Markdownu, takže se úvodní `<h1>` z těla zahazuje.

**NASAZENO** 2026-08-09, Version ID `876a1720-22c0-4473-a240-b9c4ce6d6e98`.

**Neověřeno:** proklik v prohlížeči za přihlášením — jestli `/dok/` opravdu pustí
přihlášeného a odmítne nepřihlášeného, a jestli menu v aplikaci skáče na kapitoly.

---

## 2026-08-09 (29) — křivky rozlišené tvarem, ne barvou; cena SMS opravena

**Podnět od uživatele:** „když se to tiskne na čb tiskárně, tak to nějak tolik nevyzní."
Ukázal printscreen listu, kde jsou obě křivky po převodu do šedi skoro k nerozeznání.

**Kde byla chyba v úvaze.** List byl na barvoslepost i černobílý tisk myšlený od začátku,
ale jen u **šablon** — proto je v hlavičce vedle barvy vždycky název. U **křivek v grafu**
se na to zapomnělo: rozlišovala je barva (modrá vs. šedá) a průhlednost výplně, tedy dvě
věci, které převod do šedi smaže. Legenda to dokonce zhoršovala — byly to dva **barevné
obdélníčky**, ze kterých po vytištění zbyly dva stejné šedé čtverečky.

**Rozlišení teď nese tvar.** Tabulka `STYLY_RAD` v `radar.js`: plná/kolečko,
čárkovaná/čtvereček, tečkovaná/kosočtverec, čerchovaná/trojúhelník. Typ čáry i tvar značky
přežijí kopírku. Značky porovnávacích řad jsou **bílé s obrysem**, aby v místě křížení
nepřekryly tu druhou — plná značka by schovala právě to, na čem záleží.

**Výplň má nově jen hlavní řada** (28 %), porovnání žádnou. Dvě poloprůhledné výplně přes
sebe daly na papíře **tři** odstíny šedi a nešlo poznat, čí je která.

**Legenda kreslí kus skutečné čáry se značkou** (`vzorekRady()`), ze stejné tabulky jako
graf — nemůže se s ním tedy rozejít.

**Na scénář „dva trenéři a hráč":** styly to unesou, datová cesta ne. Server posílá jedno
`porovnani` a víc trenérů se řeší přes Shodu, kde se dohodnou na jednom výsledném
hodnocení. Nedodělával jsem cestu, kterou nikdo nevolá.

**Ověřeno:** vyrenderováno headless Edge do PNG v barvě i s filtrem `grayscale(1)`.
V šedé škále jdou obě křivky rozeznat na první pohled — plná s plnými kolečky proti
čárkované s prázdnými čtverečky — a legenda platí i po převodu.

**Cena SMS opravena.** Uživatel upozornil na rozpor: dokumentace psala „od 0,41 Kč", ale
portál u konkrétní zprávy ukazuje **0,93 Kč bez DPH / 1,13 Kč s DPH**. To „od" je objemová
sazba ceníku, ne sazba tohohle účtu. Dvě věci z toho plynou:

1. **Denní strop 50 je nad možnosti kreditu.** 21 Kč vystačí zhruba na 18 zpráv, takže
   pojistka by nikdy nezasáhla — kredit dojde dřív. Doporučeno snížit na 15, **zatím
   nezměněno** (čeká na rozhodnutí).
2. **Rozeslání odkazů SMS by spolklo celý kredit.** 18 hráčů × 1,13 Kč ≈ 20 Kč za jedno
   kolo. Telegram i e-mail jsou zdarma a ověřené; SMS patří jako záchrana pro toho, kdo
   nemá ani jedno.

**Odesílatel přenastaven uživatelem** z `GoSMS-test` na obecného `GoSMS.info`, takže zpráva
už nevypadá jako test. Zároveň zaškrtl *Povolit přístup k detailu zprávy přes API* — je
možné, že se tím doplní i ID zprávy, které se dnes do logu ukládá jako `ok`. Neověřeno,
ověření stojí jednu ostrou SMS.

**Doladěno po skutečném tisku.** Uživatel poslal vytištěný list a byly na něm vidět dvě
věci, které render nenapověděl:

1. **Výplň trenéra ležela přes čárkovanou čáru hráče.** Porovnání se kreslilo první
   a polygon trenéra i s výplní až na něj, takže všude, kde je hráč uvnitř, ztrácela jeho
   čára kontrast. Pořadí je nově **nejdřív všechny výplně, pak všechny čáry a značky** —
   čára nesmí být pod výplní.
2. **Výplň 28 % je na papíře moc.** Zalévá mřížku a graf ztěžkne. Vyrenderovány čtyři
   varianty (28 / 18 / 10 / 0 %) v šedé škále vedle sebe; **zvoleno 18 %** — pořád je
   poznat, která řada je vyplněná, ale mřížka i čárkovaná čára dýchají.

**Rozcestník po dokumentaci** (na přání uživatele): záložka 📖 má novou kapitolu *Kde je
co napsané* (CS i EN) s odkazy do repozitáře na README, STATUS, STATUS.html, HANDOFF,
known_good, RUNBOOK, TECHNICAL, BUILD a ZADANI — u každého jednou větou, na co odpovídá.
U seznamu stojí, že **repozitář je soukromý** a odkaz otevře jen ten, kdo má přístup.

**Stav kanálů v horní liště** (na přání uživatele: „chci vidět, že nám funguje veškerá
konektivita"). Čtyři štítky Model / SMS / Telegram / E-mail se značkou `●` `○` `✕`, popis
v tooltipu, klik otevře Nastavení. Stav nese **tvar i barva**, ať lišta platí i barvoslepému
čtenáři a na černobílém snímku — stejná úvaha jako u křivek výš.

**Kde to mohlo být drahé.** Nabízelo se sáhnout po `/api/ai/stav`, jenže ten posílá modelu
skutečnou větu. Při každém přihlášení by se denní limit Workers AI utrácel za kontrolování
místo za práci (u Claude rovnou peníze). Nový `/api/stav` je proto **levný**: Telegram
`getMe` a `gosmsToken()` ověří spojení doopravdy a zadarmo, e-mail se pozná z bindingu,
a **model hlásí jen to, co je nastavené** — v popisu to říká narovinu a odkazuje na
tlačítko v Nastavení. Vypnutý SMS kanál se hlásí jako `vypnuto`, ne jako porucha: je to
záměr a nesmí svítit stejně jako rozbité spojení.

**NASAZENO** 2026-08-09, Version ID `332b204e-e024-4552-a1dc-e3512fb2d2a5`
(předchozí kroky `0e574db2` a `c0123e9c`).

**Neověřeno:** všechno z tohohle záznamu čeká na proklik v prohlížeči — lišta se stavy,
rozcestník po dokumentaci i vytištěný list s 18% výplní. Ověřen je jen render radaru
a to, že se `app.js` s novým kódem opravdu servíruje.

---

## 2026-08-09 (28) — SMS naostro, hlavička zpráv, log komunikace se sbalil

**Zlom: dobitý kredit odblokoval bránu.** Účet GoSMS byl do dneška neověřený a bez
kreditu, každý ostrý pokus končil `400`. Po dobití (21 Kč) prošla nejdřív zkouška
nanečisto a o sedm vteřin později **skutečně doručená SMS**. Kanál `smsAktivni` je
zapnutý, strop 50/den.

**Chyba, kterou dobitý kredit teprve zpřítomnil.** Tlačítko *SMS nanečisto* posílalo
**ostré SMS**. V `posliSmsHlidane` se příznak `nanecisto` nepředával dál do `posliSms`,
takže požadavek šel na `…/messages/` místo `…/messages/test`. K tomu `posliSmsHlidane`
u nanečisto **záměrně přeskakuje obě pojistky** — vypínač i denní strop — protože
„zkouška nic nestojí". Dohromady: klik na nanečisto by odeslal skutečnou zprávu, obešel
vypnutý kanál, obešel strop a do logu se zapsal jako „(nanečisto)". Dosud to bylo
neškodné jen proto, že neověřený účet vracel `400` na obou cestách stejně. **Opraveno
dřív, než se na tlačítko sáhlo.** Do stropu se navíc přestaly počítat zkoušky nanečisto —
stejná logika, jakou už měl režim `console`.

**Hlavička SMS je teď nastavitelná — a hlavně jednotná.** Úvod zprávy se skládal na
**třech místech zvlášť a pokaždé jinak**: zkouška posílala `SK ŘÍČMANICE:`, obnova hesla
`Hodnoceni hracu:` a souhrn **neposílal nic**, takže u něj příjemce nepoznal, kdo mu
píše. Odesílatele přitom drží brána (vidí se GoSMS, ne klub), takže hlavička je jediné
místo, podle kterého to jde poznat. Skládá to jedna funkce `sHlavickou()`, prázdné
nastavení = název klubu (přejmenování klubu tedy nenechá starý text).

**Past, na kterou přišla až simulace.** Do zkoušky jsem si napsal hlavičku
„SK Říčmanice – mládež" a všiml si, že dlouhá pomlčka **přežije odstranění diakritiky** —
není to písmeno s háčkem. Jenže v GSM-7 abecedě není, takže by přepnula celou zprávu na
UCS-2 a segment by spadl ze 160 znaků na 70: **dvojnásobná cena za totéž**. Totéž udělají
české uvozovky nebo výpustka. Náhled proto počítá tak, jak počítá brána, viníka pojmenuje
a poradí náhradu. Ověřeno na pěti hlavičkách: `–` a `„` hlásí UCS-2, spojovník `-` ne,
`€` se počítá za dva znaky (rozšiřovací tabulka).

**Zkouška SMS se přestěhovala do Nastavení**, na libovolné číslo bez vazby na kartotéku —
ověřuje se brána, ne hráč, takže kvůli tomu není potřeba zakládat falešnou osobu. Ostré
tlačítko se ptá a hlídá **neuložený přepínač**: zaškrtnutí platí jen v prohlížeči, dokud
se neuloží, a Worker by zprávu zahodil jako „vypnuto" — vypadalo by to jako chyba brány.

**Log komunikace se sbalil.** Uživatel upozornil, že sto řádků nafukuje stránku Nastavení
a na mobilu se pod ně nedá dorolovat. Je z toho `<details>`, zavřený jeden řádek, otevřený
se posouvá sám v sobě (`max-height: 46vh`). K tomu **hledání** (filtruje i podle přeložených
popisků, takže „chyba" a „přeskočeno" najdou to, co je vidět) a **export do CSV**, který
bere **celý log z databáze**, ne jen těch sto zobrazených — jinak se ke staršímu odeslání
nedá dostat.

**Stav se publikoval i do aplikace.** Záložka 📖 má novou kapitolu *Stav projektu* (CS i EN):
co běží, co chybí — s tím, že hlavní dluh je nerozeslání odkazů na sebehodnocení — a
upozornění na zapnuté analýzy jazykovým modelem.

**Cestou:** lokální proměnná `stav` uvnitř bloku komunikace stínila globální stav
aplikace. Přejmenováno na `tridaStavu`, byla to nášlapná mina pro každou další úpravu.

**„Z plikace" byl planý poplach.** Uživatel hlásil chybějící písmeno v doručené zprávě.
Log ukládá text tak, jak odešel, a je v něm „z aplikace"; spuštění `bezDiakritiky` nad
tím textem vrátilo totéž. Šlo o překlep při přepisování do chatu.

**Ověřeno:** doručená SMS (log má `ok` u nanečisto i ostré), skládání zpráv a počítání
segmentů spuštěním funkcí, `node --check` nad všemi upravenými `.js`, nasazení.
**Neověřeno:** proklikání v prohlížeči ani na mobilu — k tomu je potřeba přihlášení,
které nemám. Sbalený log, hledání, export a náhled hlavičky **čekají na potvrzení od
uživatele**.

**NASAZENO** 2026-08-09 v commitu `5452411`, Version ID `1e5d8abc-be15-496b-8528-7c5813521006`.

**Zbývá:** rozeslat hráčům odkazy na sebehodnocení (pořád to hlavní), dohodnotit zbylých
7 hráčů, doplnit pozice, pozvánky pro Julka a Masa a pak `DELETE FROM auth`. Drobnost:
GoSMS nevrací ID zprávy v očekávaném tvaru, do logu se ukládá `ok` — nedoručenku tedy
nejde spárovat s konkrétním záznamem v portálu.

---

## 2026-08-09 (27) — model podle úkolu (místo „dirigenta")

**Otázka uživatele:** nemá silný model dirigovat slabší, zadávat jim jednoduché úkoly
a jen kontrolovat výsledek — aby se šetřily tokeny?

**Odpověď: dirigent by přidal náklady, ne ubral.** Silný model by běžel dvakrát (zadat
a zkontrolovat) a k tomu by se platil ten levný; kontrola odpovědi stojí zhruba tolik co
její vytvoření. Navíc to nejdražší je ušetřené už teď — běžné povely rozřadí prohlížeč
zadarmo a model se nezavolá vůbec.

**Skutečná ztráta byla o patro níž:** na rozřazení povelu jel model vybraný pro analýzy,
tedy uvažující `gpt-oss-120b`, který si i k „kterou záložku otevřít" napsal vnitřní úvahu.

**Postaveno: model podle úkolu.** `AI_UKOLY` páruje úkol s klíčem nastavení
(`povely → aiModelPovely`, `analyzy → aiModel`), `modelProUkol()` ho vrátí a při nesouladu
s poskytovatelem spadne na jeho výchozí. **Přidání dalšího úkolu = jeden řádek v `AI_UKOLY`
a klíč ve `VYCHOZI_NASTAVENI`** — nabídka v Nastavení i ukládání se poskládají samy
z `/api/ai/modely` (uživatel řekl „klidně N voleb, je-li potřeba"). Poskytovatel zůstal
společný: ten rozhoduje, jestli se platí a kam data jdou, a to nemá smysl mít po úkolech.

**Měření, které vyvrátilo můj vlastní předpoklad.** Čekal jsem, že na povely stačí nejmenší
model. Na povelu „ukaž mi papíry pro Jednu" (kádr 2 hráči):

| Model | Akce | Hráči | Čas |
|---|---|---|---|
| Llama 3.2 3B | `odkaz` ❌ | 1 ✅ | 234 ms |
| Llama 3.1 8B | `listy` ✅ | **2** ❌ | 1784 ms |
| **Llama 3.3 70B fp8-fast** | `listy` ✅ | 1 ✅ | **477 ms** |
| gpt-oss 120B | `listy` ✅ | 1 ✅ | 2135 ms |

**Nejmenší modely tu nešetří, jen se pletou** — a 70B je zároveň nejrychlejší ze správných.
Výchozí model na povely je proto 70B, ne 3B. (Jeden povel a malý kádr: orientační měření,
ne benchmark. Popisy modelů v Nastavení to teď říkají místo dřívějšího „na pokyny stačí".)

**Zkouška spojení** testuje **oba modely zvlášť** a píše, který je který — po rozdělení může
jeden odpovídat a druhý ne.

**Chyba, kterou odhalil až proklik:** do template literálu jsem napsal HTML komentář se
zpětnými apostrofy kolem cesty k API. Ty literál **ukončily**, zbytek se parsoval jako kód
a celá záložka Nastavení spadla na „ai is not defined". `node --check` to nechytil —
syntakticky to bylo platné. Odchytilo to až vykreslení stránky.

**Ověřeno lokálně:** povel jel na `llama-3.3-70b` (1855 ms), analýza na `gpt-oss-120b`
(5365 ms) — každý na svém. UI: dva výběry se správnými klíči `aiModelPovely` / `aiModel`,
uložení pošle oba, zkouška spojení vrátila dvě hlášky (312 ms / 1811 ms). Žádná výjimka
v konzoli, i18n 540 klíčů CS i EN.

**NASAZENO** 2026-08-09 v commitu `aa908bc` (Version ID `bd58a68e-20ff-4e16-b6ac-7096693728ba`).
Ověřeno živě: `/api/version` = `aa908bc`, `cisto: true` na obou adresách; `app.js` nese
kontejner `ai-ukoly` i třídu `ai-model`; `/api/ai/modely` a `/api/ai/prikaz` bez přihlášení `401`.

**Nasazení napodruhé — a dvě poučení:**
1. **`node --check` nekontroluje TypeScript.** Za `aiModelPovely` chyběla čárka; `.js`
   soubory prošly, ale `worker/src/index.ts` je TS a chybu zachytil až esbuild při deployi.
   Lokální `wrangler dev` běžel ještě na verzi před tou úpravou, takže testy prošly.
2. **`wrangler deploy` napřed spadl na `Assertion failed … src\win\async.c`** (libuv na
   Windows) a skutečnou chybu tím zakryl. Pomohlo pustit `npx wrangler deploy` přímo
   s `WRANGLER_SEND_METRICS=false` — tehdy se ukázalo `Expected "}" but found "aiAnalyzy"`.
   Když deploy spadne bez rozumné hlášky, zkusit tohle.

---

## 2026-08-09 (26) — „Ahoj Ferdo", ne „Ahoj Ferda"

**Nález z provozu** (snímek od uživatele): stránka sebehodnocení zdravila **„Ahoj Ferda"**.
Čeština má 5. pád a čtrnáctiletý to slyší okamžitě — od aplikace, která ho vyzývá
k upřímnosti, to zní jako od cizince.

**Druhá chyba, kterou to odhalilo:** oslovení bralo `prezdivka || jmeno`, jenže
`players.jmeno` je ve tvaru **„Příjmení Jméno"**. Hráč bez přezdívky by dostal
„Ahoj Trnka Ferdinand". Nikdo si toho nevšiml, protože Ferda přezdívku má — ale většina
kádru ji nemá.

**`osloveni(jmeno, prezdivka)` v `i18n.js`:** přezdívka má přednost (tak mu říkají
v kabině), jinak **poslední slovo** jména; a v češtině přes `vokativ()`. Anglicky se
neskloňuje, tam se jméno vrací beze změny.

Pravidla vokativu pokrývají místa, kde se čeština rozchází:

| | |
|---|---|
| `Ferda → Ferdo`, `Honza → Honzo` | -a → -o (platí i pro ženská jména) |
| `Marek → Marku`, `Radek → Radku` | vsuvné -e- vypadává |
| `Petr → Petře` × `Otokar → Otokare` | podle toho, co předchází -r |
| `Karel → Karle` × `Daniel → Danieli` | u -el rozhoduje souhláska/samohláska před ním |
| `Tomáš → Tomáši`, `Max → Maxi`, `Nikolas → Nikolasi` | měkké a -s/-x → -i |
| `Patrik → Patriku`, `Vojtěch → Vojtěchu` | zadopatrové → -u |
| `Maso → Maso`, `Jiří → Jiří` | končí samohláskou, nechává se |

**Ověřeno:** 40 jmen (kádr ze snímku, trenéři, běžná česká jména, dvě ženská), **40/40**.
Plus oslovení: s přezdívkou i bez ní, a že anglicky zůstane jméno holé.

**Pozn.:** kdyby pravidla u nějakého jména selhala, stačí trenérovi napsat přezdívku rovnou
v 5. pádě — projde beze změny, protože se chová jako každé jiné jméno.

**NASAZENO** 2026-08-09 v commitu `113a511` (Version ID `9a988b96-aab5-4ea3-b825-b90b3808f4a0`).
Ověřeno živě: `/api/version` = `113a511` na obou adresách, servírovaný `i18n.js` nese
`vokativ()` i `osloveni()` a `h.js` je používá.

---

## 2026-08-09 (25) — STATUS srovnaný: analýzy už NEJSOU vypnuté

Zápisy 21–24 srovnaly README, TECHNICAL, RUNBOOK i dokumentaci v aplikaci, ale **STATUS
soubory zůstaly u stavu z 8. 8.** — neznaly volné porovnání, výběr odkazů, jedno pole na
dotazy ani opravu gpt-oss.

**Podstatnější než chybějící řádky je jedna věta, která přestala platit.** STATUS.md,
STATUS.en.md i STATUS.html tvrdily, že otázky modelu jsou **vypnuté**. V ostré databázi je
ale `aiAnalyzy = ano` a `aiPoskytovatel = workers` s modelem `@cf/openai/gpt-oss-120b` —
uživatel to zapnul. Od té chvíle při každé otázce na kádr **odcházejí modelu známky,
slovní posudky a cíle konkrétních nezletilých**.

Z toho plyne posun v GDPR položce: dokud byl vypínač vypnutý, byl chybějící záznam
o činnosti zpracování a informace pro rodiče **příprava na budoucno**. Teď je to **dluh**.
Přeformulováno ve všech třech souborech; v STATUS.html to navíc přešlo z „postavené, ale
nedotažené" do „co dál".

**Ověřená čísla z ostré databáze k 9. 8. 2026** (jen počty): 22 osob, 16 hodnocení od
trenéra u 11 hráčů, **0 sebehodnocení, 0 vygenerovaných odkazů**, 1 období, 4 z 18 hráčů
mají pozice, 1 účet v `auth`. Proti včerejšku beze změny — hráčská strana pořád nezačala.

**Srovnáno:** `docs/STATUS.md`, `docs/STATUS.en.md`, `STATUS.html` (nové řádky v „co běží",
přepsaná tabulka vypínačů, datum). STATUS.html ověřen headless renderem: 10 sekcí, 2 tabulky,
žádná chyba parsování. Změna je čistě dokumentační, kód se nedotkl.

**NASAZENO** 2026-08-09 v commitu `40faeb6` (Version ID `f3104aa3-c27a-4c2b-ba32-1903ab5824d6`)
— na přání, aby otisk verze v liště seděl s HEAD repozitáře. V běžící aplikaci se tím nic
funkčního nezměnilo; jde jen o to, že „co přesně běží" je teď jeden commit, ne „ten předchozí
plus dokumentace navrch". Ověřeno živě: `/api/version` = `40faeb6` 10× po sobě na obou
adresách, `/health` OK, `/api/analyzy`, `/api/zaznamy`, `/api/tokens` i `/api/listy` bez
přihlášení dál `401`.

---

## 2026-08-09 (24) — porovnat cokoliv s čímkoliv

**Zadání:** „chci mít možnost porovnávat cokoliv s čímkoliv." Dosud uměla aplikace čtyři
oddělené způsoby (trenér × hráč, hráč × hráč, teď × minule, shoda mezi trenéry) a **každý
z nich byl zamčený v jednom období**. Robin na podzim proti Ferdovi na jaře, moje známka
proti Julkově, sebehodnocení z podzimu proti hodnocení z jara — nic z toho nešlo.

**Rozhodnutí (dotaz na uživatele):** položka výběru = **hráč + období + kdo hodnotil**,
a **jedna šablona zůstává tvrdou hranicí**. Brankářská a polní šestice nemají jedinou
společnou osu; napříč nimi by šel srovnat leda orientační průměr, a to je přesně ta „známka
na vysvědčení", které se projekt brání.

**Postaveno:**
- `GET /api/zaznamy?sablona=` — nabídne kombinace, které v databázi **opravdu jsou**
  (poslední hodnocení každé kombinace; starší verze jsou opravy a pro porovnání šum).
- `GET /api/porovnani-vice?ids=` — 2 až 8 záznamů vedle sebe. Míchané šablony `400`.
- Třetí karta v Porovnání. Staré dvě zůstaly jako zkratky pro obvyklé případy.

**Chyba, kterou odhalil až proklik:** sloupce se řadily podle pořadí v seznamu, takže
znaménko u „rozdílu" určovala náhoda — a uživatel pořadí neovlivní, zaškrtávátka mají pevné
pořadí. **Pořadí sloupců teď určuje server**: období chronologicky (podle nejstaršího
záznamu v něm), uvnitř období `trener` → `shoda` → `hrac`. Díky tomu znamená `+` totéž co
jinde v aplikaci: u dvou období **zlepšení**, u trenéra proti sebehodnocení **hráč si dal
víc**. U tří a víc sloupců se znaménko neukazuje a počítá se rozptyl.

**Ověřeno lokálně** (`wrangler dev`, data: hráč se dvěma obdobími a sebehodnocením, druhý
hráč, plus brankářská řada na test odmítnutí):

| Kontrola | Výsledek |
|---|---|
| `/api/zaznamy?sablona=pole` | 4 kombinace, správně popsané (jméno · období · autor) |
| `/api/zaznamy?sablona=brankar` | 1 |
| dva sloupce (trenér × hráč) | `braneni` 3/8, **rozdíl +5** |
| tři sloupce | `rozdil: null`, rozptyl 5 u bránění, 3 u levé |
| míchané šablony | `400` se srozumitelným vysvětlením |
| jeden záznam | `400` „Vyber aspoň dva záznamy." |
| **pořadí nezávisí na `ids`** | `16,17` i `17,16` → stejné pořadí i stejné `+5` |
| dvě období | `zima → jaro`, rozdíl `+2` = zlepšení, obojí zadání |
| UI (CDP) | 3 karty, 4 záznamy v nabídce, hlavičky sloupců, 1 zvýrazněná osa, přepnutí šablony přenačte nabídku, žádná výjimka |
| i18n | 536 klíčů CS i EN |

**NASAZENO** 2026-08-09 v commitu `41cdc31` (Version ID `3faaa807-6527-400f-aa21-cec0ee2437a6`).
Ověřeno živě: `/api/version` = `41cdc31` na obou adresách, `/api/zaznamy` i `/api/porovnani-vice`
bez přihlášení `401`, servírovaný `app.js` nese `tabulkaVolna` i `popisZaznamu`.

**Pozn. k ověřování statiky (potřetí):** `i18n.js` vypadal po nasazení starý na OBOU adresách
— byla to edge cache, ne chyba nasazení. S `?cachebust=…` vrátil nový soubor. Ověřovat
statiku s obejitím cache, jinak to svádí k závěru, že se soubor nenahrál.

---

## 2026-08-09 (23) — odkazy se generují vybraným, ne vždycky všem

**Zadání:** „chci generovat pro konkrétní lidi." Tlačítko v Odkazech generovalo natvrdo
celému aktivnímu kádru; API sice `player_id` + `sablona` umělo, ale UI to nenabízelo
a šlo jen po jednom.

**Řešení je stejné jako u tisku (zápis 17): co odkaz, to volba.** Nad tlačítkem je tabulka
*Komu vygenerovat* se zaškrtávátkem na **každé kombinaci hráč × šablona** — Ferdovi jde
vygenerovat jen brankářský odkaz, i když má šablony tři. Výchozí stav je všechno zaškrtnuté
(chování jako dřív), v záhlaví je označit/odznačit vše. U kombinace, na kterou už nevyplněný
odkaz visí, to je v tabulce napsané, takže je dopředu vidět, co se přeskočí.

**Sdílená logika místo druhé kopie.** `ids` má u odkazů **tentýž tvar jako u tiskových
listů** (`id` nebo `id:sablona`) — je to tatáž otázka „koho a kterou řadu". Rozebrání se
proto vytáhlo do `rozeberIds()` + `sablonyZVyberu()` a používají ho obě místa; v `/api/listy`
tím zmizela inline kopie. `player_id` + `sablona` zůstávají funkční kvůli starším voláním.

**Chyba, kterou odhalil test API:** neznámá šablona (`9:nesmysl`) hlásila „Vybraní hráči
nejsou v aktivním kádru", což je nesmysl — ten hráč v kádru je. Prázdný výběr po rozebrání
má teď vlastní hlášku.

**Ověřeno lokálně** (`wrangler dev` + lokální D1, hráč 9 se šablonami `pole`+`leader`,
hráč 10 `brankar`):

| `ids` | Očekáváno | Naměřeno |
|---|---|---|
| `9:leader` | jeden odkaz | `vytvoreno=1` — jen leader |
| `9:leader` podruhé | přeskočit | `vytvoreno=0, preskoceno=1` |
| `9` | doplnit chybějící | `vytvoreno=1` (pole), `preskoceno=1` (leader) |
| bez `ids` | celý kádr | `vytvoreno=0, preskoceno=3` — vše už viselo |
| `9:nesmysl` | srozumitelná chyba | „Ve výběru není platná kombinace hráč + šablona." |
| `999` | chyba | „Vybraní hráči nejsou v aktivním kádru." |

**Proklikáno v headless Edge přes CDP:** 3 zaškrtávátka s hodnotami `10:brankar`, `9:pole`,
`9:leader`, všechna zaškrtnutá, označit-vše v záhlaví; po odškrtnutí zbytku odešlo na server
`ids:"9:pole"`; bez zaškrtnutí hláška „Není vybraný ani jeden odkaz."; marker „už visí" se
u existujícího odkazu ukázal. Žádná výjimka v konzoli, i18n 526 klíčů CS i EN.

**Do dokumentace přibylo i to, co v ní chybělo:** že **aplikace odkaz neposílá** — kopíruje
se a rozesílá ručně, protože notifikační kanály má aplikace jen na trenéry. Ověřeno i to, že
z 18 aktivních hráčů nemá **nikdo** vyplněný telefon ani e-mail, takže automatické rozesílání
by dnes stejně nemělo kam.

**NASAZENO** 2026-08-09 v commitu `04ebd28` (Version ID `07a33467-63a3-4afb-b3ec-8fd9f8005680`).
Ověřeno živě: `/api/version` = `04ebd28` na obou adresách, servírovaný `app.js` nese tabulku
výběru i odesílání `ids`, `POST /api/tokens` bez přihlášení dál `401`. (Pozor při ověřování:
první dotaz na `i18n.js` vrátil ještě cachovanou starou verzi a vypadalo to, že klíče chybí —
nechybí, jen se to musí načíst znovu.)

---

## 2026-08-09 (22) — gpt-oss neodpovídal: uvažující model vyčerpal limit tokenů

**Hlášení z provozu:** „gpt-oss model neodpovídá." V ostrém nastavení byl
`@cf/openai/gpt-oss-120b`.

**Příčina byla jinde, než to vypadalo.** Volání proběhlo v pořádku, ale odpověď měla
`content: null`, `finish_reason: 'length'` a plný blok `reasoning`. **`gpt-oss` je
uvažující model a vnitřní uvažování se počítá do `max_tokens`** — se stropy nastavenými
pro běžný model (20 / 120 / 900) došly tokeny dřív, než začal psát odpověď.

Diagnostika trvala tak dlouho hlavně proto, že hláška zněla „Model odpověděl prázdnotou —
zkus jiný model", což příčinu zakrývalo. **Odchytilo se to až vypsáním syrové odpovědi.**

**Co se opravilo:**
- `textZWorkersAI()` — čtení textu podle rodiny modelu: `response`, `result.response`,
  `choices[0].message.content` (tvar OpenAI, tudy jede gpt-oss) i Responses API
  `output[].content[].text`. **`reasoning` se přeskakuje** — je to vnitřní monolog, ne
  odpověď pro trenéra.
- `jeUvazujici()` + `stropTokenu()` — uvažujícímu modelu se strop zečtyřnásobí, minimálně
  na 2000. Ostatním se nemění, ať se neplýtvá free tierem.
- `procNicNeprislo()` — místo „zkus jiný model" řekne důvod; u vyčerpaného limitu jmenovitě.
  Prázdná odpověď u analýzy nově **vyhodí chybu**, takže důvod skončí v logu komunikace,
  ne až v hlášení od uživatele.

**Druhý nález, mimo zadání:** model si u os pod tolerancí **dopočítával rozdíly a pletl si
znaménko** (u zápisu `3/4` hlásil −1 místo +1). Podklady mu proto nově dávají rozdíl
spočítaný u **každé** osy (`8/6 (-2)`), ne jen u těch nad tolerancí. Po opravě sedí
všechny: bránění +5, levá +1, přihrávka +1, zbytek 0. Znovu totéž pravidlo — co jde
spočítat, počítá kód.

**Třetí, kosmetika:** model píše markdown i po zákazu v pokynu. `**tučně**` se v odpovědi
překládá na `<strong>` (až po escapování, nic jiného z markdownu se nepřekládá), aby
v textu nezůstaly holé hvězdičky.

**Ověřeno lokálně** (`wrangler dev`, nastražený hráč, headless Edge přes CDP):

| | gpt-oss-120b | llama-3.3-70b-fp8-fast |
|---|---|---|
| zkouška spojení | ✅ „funguje", 1,1 s | ✅ „Ano", 0,2 s |
| analýza | ✅ trefila `+5 (3 vs 8)`, 4,1 s | ✅ 1,6 s |
| rozřazení povelu | ✅ „ukaž mi papíry pro Jednu" → `listy`, 2,7 s | ✅ |
| otázka z lišty (UI) | ✅ 4,8 s a 9,5 s | ✅ 0,5 s a 1,6 s |

**Latence je daň za uvažování** — gpt-oss je na povely v liště citelně pomalejší.
Popis modelu v Nastavení to nově říká.

**NASAZENO** 2026-08-09 v commitu `fd9b459` (Version ID `6bcd49ff-0742-418e-898e-70db78e8944c`).
Ověřeno živě: `/api/version` = `fd9b459` 8× po sobě na obou adresách. Roznášení po edge bylo
tentokrát nejdelší z dosavadních (~10 min) a **nerovnoměrné v obou směrech** — chvíli měla novou
verzi jen custom doména, chvíli jen workers.dev. Ověřovat opakovaně, nepřenasazovat.

---

## 2026-08-09 (21) — jedno pole na dotazy: ptá se z příkazového řádku

**Nález z provozu.** Uživatel napsal do příkazového řádku „kolik máme hráčů" a dostal
*„Tomuhle nerozumím. Zkus jméno hráče…"*. Analýzy přitom měl zapnuté (`aiAnalyzy = ano`,
model `gpt-oss-120b`) a fungovaly — jenže otázka patřila do **jiného pole**, o kus níž
v záložce Analýzy.

**Chyba návrhu, ne uživatele.** Na obrazovce byla dvě vstupní pole; nápadnější byla lišta
nahoře, která otázce nerozumí a nikam neodkázala. Zadání: *„chci se ptát odevšud v rámci
příkazového řádku, jen jedno pole na dotazy."*

**Řešení:** textarea z Analýz **zmizela**. Ptá se jedním polem — lištou, která je nad
každou záložkou, takže se odkudkoli. Odpověď se vypíše rovnou v liště a nese tlačítko
**Ukázat čísla**, které otevře Analýzy s tabulkami, ze kterých vznikla. V Analýzách zůstaly
tabulky a příklady otázek — ty se nově vloží do lišty a rovnou spustí, ať je vidět, kam
se otázky píšou.

**Pořadí v `spustPovel()`:**
1. **Vypadá to jako otázka?** → rovnou `/api/ai/analyza`.
2. Jinak lokální rozřazení (jména + klíčová slova, nestojí token).
3. Jinak rozřazovač `/api/ai/prikaz`.
4. Vrátí-li `nevim` → ber to jako otázku.

**Druhá chyba, kterou odhalil až proklik v prohlížeči:** otázka „u koho **je** největší
rozpor…" neodpověděla, ale otevřela kartu hráče „**Je**dna". `rozeberPovel` páruje slova
na jména **podle začátku**, takže krátké slovo ve větě trefí hráče. S ostrým kádrem by to
dělalo totéž. Proto se otázka pozná **jako první** a ne podle délky slova (dvouznakové
prefixy jsou v češtině běžné), ale podle **tázacího slova nebo otazníku** (`TAZACI_SLOVA`).

**Ověřeno lokálně** (`wrangler dev`, nastražený hráč: trenér bránění 3, hráč 8; headless
Edge přes CDP):
- otázka „kolik máme hráčů" ze záložky **Lidé** → *„Máme 2 aktivních hráčů."* za 0,5 s,
  s tlačítkem Ukázat čísla, **bez přepnutí záložky**,
- otázka „u koho je největší rozpor…" ze záložky **Listy** → trefila se do čísel
  („trenér dal 3 a hráč 8, rozdíl +5") za 1,6 s a zůstala na Listech,
- povel „hodnotit Jedna" dál přepne na Hodnotit,
- Analýzy: **žádné druhé pole**, 4 tabulky, 3 příklady, odkaz na lištu,
- žádná výjimka v konzoli; i18n 520 klíčů česky i anglicky, nechybí ani jeden.

**NASAZENO** 2026-08-09 v commitu `74946c4` (Version ID `f3808fce-9f9c-4307-ab6e-1956084e2b1f`).
Ověřeno živě: `/api/version` = `74946c4` (5× po sobě), `cisto: true`; servírovaný `app.js`
nese `odpovezNaOtazku` i `vypadaJakoOtazka` a **staré `an-otazka` je pryč**.

**Pozn. k nasazování (potřetí a nejvýrazněji):** hned po deployi vracela custom doména
**rozjeté kombinace** — `i18n.js` už nový, `app.js` ještě starý, a `/api/version` přeskakovala
mezi `c89b499` a `74946c4` podle toho, který edge uzel odpověděl. Za pár desítek vteřin se to
samo srovnalo. **Nepřenasazovat, ověřovat opakovaně** (nebo na `workers.dev`, která cache
zóny obchází a měla novou verzi hned).

Zápisy 16–19 srovnaly README, STATUS, TECHNICAL i dokumentaci v aplikaci, ale **BUILD
a RUNBOOK zůstaly pozadu** — o barvách šablon, tisku po listech ani o Analýzách nevěděly nic.
Provozní dokumenty čte člověk ve chvíli, kdy něco nefunguje, takže zaostávat nemají.

**RUNBOOK:**
- do tabulky častých situací přibylo šest řádků: analýzy nejdou zapnout, model je vypnutý,
  prázdné „kde se pohledy rozchází", model tvrdí něco mimo tabulku, a jak se poznají listy
  od sebe,
- **tisk**: čím se liší šablony na papíře a že značka v hlavičce je čitelná i bez grafiky
  na pozadí (barevný text a rámeček, ne bílý text na barvě); plus řádek „vytisklo se víc
  listů, než jsem chtěl" → každý řádek má vlastní zaškrtávátko,
- **nová §4c Analýzy** — co od modelu čekat (formulace) a co ne (výpočet, znalost zápasů
  a docházky), a že při rozporu platí tabulka, ne věta,
- **bezpečnostní minimum**: analýzy jsou jediné místo, odkud data odcházejí ven; log nese
  jen rozsah podkladů; GDPR záznam zatím není.

**BUILD:** `ANTHROPIC_API_KEY` platí i pro analýzy, popis vypínače `aiAnalyzy` a nová
tabulka „co je po čerstvém nasazení vypnuté a musí se zapnout ručně" (`smsAktivni`,
`aiPoskytovatel`, `aiAnalyzy`). Migrace nepřibyla — `aiAnalyzy` je řádek v `settings`
s výchozí hodnotou v kódu.

**STATUS.html:** nová sekce **„Kde odcházejí data ven"** s tabulkou tří vypínačů a jejich
výchozích stavů, plus bod do „co dál" o rozhodnutí ohledně zapnutí analýz a GDPR.

**NASAZENO** 2026-08-08 v commitu `c89b499` (Version ID `5c14f450-f3a3-448a-9eb5-9b3676f3fc6d`)
— na přání, i když změna byla čistě dokumentační. Jediné, co se tím v běžící aplikaci
změnilo, je **otisk verze v horní liště a v `/api/version`**; teď sedí s HEAD repozitáře,
což usnadňuje dohledávání („co přesně běží" = jeden commit, ne „ten předchozí plus docs").
Ověřeno živě: `c89b499`, `cisto: true` na vlastní doméně i na `workers.dev`, `/health` OK,
`/api/analyzy`, `/api/listy` i `/api/settings` dál bez přihlášení `401`.

---

## 2026-08-08 (19) — Analýzy: souhrny v kódu, formulace modelem

**Zadání:** „chtěl bych, abych mohl žádat třeba o analýzy". Postaveno jako **dvě vrstvy nad
sebou**, ne jako jeden chat nad databází.

**1. Spočítané podklady** (`GET /api/analyzy`, `podkladyProAnalyzu`). Průměry os za kádr od
nejnižší, osy nad tolerancí seřazené podle velikosti rozdílu, kdo nemá hodnocení a kdo
sebehodnocení. Počítá to Worker: přesné, zadarmo, okamžité a **nic neopustí aplikaci**.
Ukazuje se vždycky, i s vypnutým modelem.

**2. Otázka modelu** (`POST /api/ai/analyza`). Model dostane **tatáž hotová čísla** a jeho
prací je formulace, ne výpočet — v pokynu má výslovný zákaz cokoli dopočítávat. Kdyby
počítal sám, spletl by se a věta by zněla stejně sebejistě jako správná. Odpověď se
zobrazuje **nad** tabulkami a nese větu „ověř si čísla níž"; `podklady` se vrací i v API.

**Rozhodnutí o datech (vědomé, po dotazu):** modelu jdou **plná data** — jména, známky,
slovní bloky, cíle i poznámka hráče. Analýza nad samotnými čísly by přišla o polovinu toho,
co trenér napsal. Je to jediné místo, odkud z aplikace odcházejí ven údaje o konkrétním
nezletilém, proto:
- **vlastní vypínač** `settings.aiAnalyzy`, výchozí `ne` — odděleně od `aiPoskytovatel`,
  aby se to nezaplo omylem při přepnutí modelu; v Nastavení má u sebe varování,
- do **logu komunikace** jde jen rozsah podkladů (kolik listů, kolik os nad tolerancí),
  nikdy obsah,
- **Workers AI zůstává výchozí** — běží na Cloudflare, tedy na témže účtu; Claude je
  americká třetí strana.
- **GDPR zbývá:** záznam o činnosti zpracování a informace pro rodiče. Zapsáno do STATUS
  jako otevřená otázka.

**Popisky os posílá prohlížeč.** Worker texty nedrží (§3b) a z klíče `braneni` by model
slušnou větu nenapsal, takže mu jdou `popisky: {osy, sablony}` z i18n.

**Pravidla, která zůstala:** §7.4 se neporušuje — trend je dál šipkový a bez souhrnného
čísla; průměr je jen tam, kde už byl zavedený (srovnání hráčů), a jako orientační souhrn.
Na tištěný list z analýz nejde nic. Do analýzy se bere uzavřená shoda trenérů, když
existuje — stejné pravidlo jako na listu, ať papír a analýza neříkají jiné číslo.

**Ověřeno lokálně** (`wrangler dev` + lokální D1, nastražený hráč se slepým místem:
trenér bránění 3, hráč 8):
- `/api/analyzy` vrátil přesně to — počty 2/3/2/1/1, nejslabší osy `leva 3` a `braneni 3`,
  jediný rozdíl nad tolerancí `+5`, chybějící hráči správně rozdělení.
- Brána: s vypnutým modelem `ok:false, duvod:'vypnuto'`; po zapnutí `aiAnalyzy` model
  odpověděl za **3,3 s** a **trefil se do čísel** („trenér dal 3 a hráč 8, rozdíl +5"),
  nic si nevymyslel a použil skutečný popisek osy „Bránění 1v1" z i18n.
- Záložka proklikaná v headless Edge přes CDP: 4 karty, 4 tabulky, 3 příklady otázek,
  štítky šablon, 5 zvýrazněných řádků, odpověď se vykreslila, **žádná výjimka v konzoli**.
- i18n kompletní: 522 klíčů česky i anglicky, nechybí ani jeden na obou stranách.

**NASAZENO** 2026-08-08 v commitu `1b067ca` (Version ID `38cf2c8b-81bd-453d-928e-4e31411a608e`).
Ověřeno živě: `/api/version` = `1b067ca`, `cisto: true`; `/api/analyzy` i `/api/ai/analyza`
vrací bez přihlášení `401`; statika nese záložku i přepínač.

**Pozor po nasazení:** `aiAnalyzy` je v ostré databázi `ne` (výchozí), takže záložka ukáže
souhrny, ale ptát se nepůjde, dokud se to nezapne v Nastavení.

---

## 2026-08-08 (18) — dokumentace srovnaná se skutečností + STATUS.html

**STATUS tvrdil „hodnocení zatím žádné", a to už neplatí.** Ověřeno souhrnným dotazem do
ostré D1 (jen počty, žádná jména ani známky — na to se zvenčí nekoukám):

| | |
|---|---|
| osob v kartotéce | 22 (18 aktivních hráčů, 3 trenéři, 1 neaktivní) |
| hodnocení od trenéra | **16** u 11 hráčů, jedno období |
| podle šablon | pole 11 (10 hráčů) · brankář 3 (2) · leader 2 (2) |
| sebehodnocení od hráčů | **0** |
| vygenerovaných odkazů | **0** |
| shod mezi trenéry | 0 |
| hráčů s pozicemi | 4 z 18 |
| účtů v `auth` | 1 (pořád společné heslo) |

**Z toho plyne nové pořadí priorit.** Trenérská strana běží, hráčská ne. Dokud se nerozešlou
odkazy na sebehodnocení, nemá list druhý polygon a rozhovor nad rozdílem pohledů — kvůli
kterému nástroj vznikl — se nemá o co opřít. V STATUS.md i .en je to teď bod č. 1.
Bod „přiřadit šablony" se z větší části vyřídil sám: brankářská i leader hodnocení už
v databázi jsou. Zbývají pozice (4 z 18), ty se tisknou na list.

**Přidán `STATUS.html`** — stav na jedné stránce v domácím stylu ostatních projektů
(tmavá, samostatná, bez závislostí). Nese čísla z databáze, tři šablony ve svých barvách,
schéma toku dat s vyznačeným místem, kde to stojí, a pořadí dalších kroků. Odkaz z README.

**Srovnáno taky:** README (kádr a stav), `docs/STATUS.md` + `.en`, obojí nově se sekcí
„kolik je v aplikaci dat".

---

## 2026-08-08 (17) — tiskne se po listech, ne po hráčích

**Ferda má tři šablony a tiskly se vždycky všechny tři.** V tabulce *Kdo se vytiskne* byl
řádek na každou šablonu (zápis 15), ale zaškrtávátko bylo jen jedno na celého hráče —
přes `rowspan` přes všechny jeho řádky. Vybrat si z Ferdových listů jen brankářský nešlo.

**Zaškrtávátko je teď na každém řádku**, tedy na každé kombinaci hráč × šablona. Sloupec se
jménem si `rowspan` nechal, takže tabulka vypadá stejně; přibyla jen volba tam, kde chyběla.

**`ids` v `/api/listy` umí položku `id:sablona`.** Samotné číslo hráče pořád znamená všechny
jeho listy — kvůli starším odkazům a příkazovému řádku, který vybírá hráče, ne listy. Obojí
jde míchat; kdo je zadaný aspoň jednou bez šablony, dostane všechno své. Neznámá šablona se
zahodí: radši nevytisknout nic než tiše vytisknout všechno.

| `ids` | výsledek |
|---|---|
| `vse` | všichni aktivní, všechny listy |
| `7` | hráč 7, všechny jeho listy |
| `7:brankar` | jen brankářský list |
| `7:brankar,7:leader` | dva listy |
| `7:brankar,7` | všechny listy hráče 7 (míchané zadání) |
| `7:nesmysl` | nic |

**Kumulovaný list se řídí výběrem** — když z Ferdových tří šablon zaškrtneš dvě, složí se
na jednu stránku ty dvě. Jedna zaškrtnutá šablona dá obyčejný list, ne kumulovaný.

**Ověřeno lokálně** (`wrangler dev` + lokální D1, zkušební hráč se třemi šablonami a
hodnocením ke každé):
- API 6 případů z tabulky výše — všechny sedí.
- Tabulka proklikaná v headless Edge přes CDP: 3 řádky, **3 zaškrtávátka, žádný řádek bez
  něj**, počty buněk `5 / 4 / 4` (jméno drží `rowspan`), hodnoty `2:brankar` / `2:pole` /
  `2:leader`. Po odškrtnutí zbytku vygenerovalo tlačítko adresu `…&ids=2%3Abrankar`.

**NASAZENO** 2026-08-08 v commitu `56a0db8` (Version ID `778a4728-ac67-4aac-973f-caf7b3ca8ab1`).
Ověřeno živě: `/api/version` = `56a0db8`, `cisto: true` na vlastní doméně i na `workers.dev`;
servírovaný `app.js` nese zaškrtávátko s hodnotou `id:sablona`, `i18n.js` nový klíč
`listy.vyber.tip`. (Znovu potvrzeno: `/api/version` na custom doméně vracel ~30 s po
nasazení ještě předchozí commit, statika už novou. Nepřenasazovat, počkat.)

---

## 2026-08-08 (16) — barva podle šablony a název šablony v hlavičce

**Na listu nebylo poznat, kterou šesticí os je hodnocený.** Šablonu prozradily až popisky
os, tedy po přečtení; v hromádce vytištěných listů se brankářský od polního nedal odlišit
pohledem. Kumulovaný list měl titulky u radarů (zápis 15), jednotlivý neměl nic.

**Každá šablona má vlastní barvu** — hráč v poli **modrá** `#2196F3` (beze změny, tak se
tisklo dosud), brankář **petrolejová** `#00838F`, leader **vínová** `#AD1457`. Odstíny jsou
schválně daleko od sebe a žádný se netluče se slovními bloky (zelená, oranžová, fialová)
ani s rámečkem cílů (žlutá). Barvu nese hlavička, pruh se jménem, radar i vzorek v legendě.

**V hlavičce navíc stojí název šablony** jako značka. Barva je jen druhý signál — na
černobílé tiskárně, při tisku bez grafiky na pozadí i barvoslepému čtenáři musí list dál
dávat smysl. Značka má proto barevný text a rámeček, ne bílý text na barevném podkladu.

**Kde všude:**
- **Tiskový list** — jednotlivý má barvu své šablony; **kumulovaný zůstává neutrálně šedý**,
  protože stránka nepatří žádné jedné šabloně, a barvy nesou jednotlivé radary (nově i linka
  nad každým). V hlavičce jsou značky všech šablon na stránce, v legendě vzorek za každou.
- **Aplikace** — popisky šablon v Lidech, Hodnotit, Odkazech a Porovnání se z prostého textu
  změnily na barevné štítky. Tmavý vzhled má vlastní, světlejší odstíny; papírové jsou na
  tmavém pozadí nečitelné.
- **Sebehodnocení `/h/<token>`** — v horní liště je značka šablony. Odkaz nese jednu šestici
  os, takže kdo chytá i hraje v poli, dostane odkazy dva a musí poznat, který má otevřený.
  Server šablonu v `GET /api/self/:token` vracel už dřív, Worker se měnit nemusel.

**Porovnávací polygon zůstal šedý** ve všech případech. Kdyby se barvil taky, splynul by
význam „tohle je druhý pohled" s významem „tohle je jiná šablona".

**Past, na kterou jsem šlápl:** záložní pravidlo `.page` má stejnou specificitu jako
`.sab-*` a bylo v souboru **za** nimi → přebilo je a brankářský i leader list se dál
vykreslovaly modré. Odchytil to až test spočtených barev, na pohled do kódu to nebylo vidět.
Je to tentýž případ jako pravidla `@media print` na konci `styl.css` — poznámka o pořadí je
teď u obojího.

**Ověřeno lokálně** (headless Edge, vyrenderované listy bez běžící aplikace a bez ostrých dat):
spočtené barvy sedí u všech tří šablon zvlášť i na kumulovaném listu (hlavička, jméno,
polygon, obrys, linka nad radarem, titulek, vzorky v legendě), porovnávací polygon je šedý,
značky nesou správné názvy. **Tisk do PDF: 5 listů = 5 stránek, MediaBox 595 × 842 pt**
(A4 na výšku) — kumulovaný se třemi radary se pořád vejde na jednu. Štítky v aplikaci mají
ve světlém i tmavém vzhledu kontrast 5,0–10,6, tedy nad hranicí čitelnosti.

**Ověřeno i naostro** (`wrangler dev` nad lokální D1 se všemi migracemi): stránka
sebehodnocení vrátila v horní liště `<span class="znacka sab-brankar">brankář</span>` a šest
os brankářské šablony, přihlašovací obrazovka se vykreslila (tedy `app.js` se načte a běží).

**NASAZENO** 2026-08-08 v commitu `3378321` (`npm run deploy`, Version ID
`d672d044-3954-4c68-9beb-67dcffda81a7`). Změna byla jen ve `web/` — žádná migrace, žádný
zásah do Workeru. Ověřeno živě: `/api/version` hlásí `3378321` a `cisto: true` na vlastní
doméně i na `workers.dev`, servírovaná statika nese `sab-znacka`, `stitekSablony`,
`.znacka.sab-brankar` i pořadí pravidel v `styl.css`.

**Pozn. k dořešení:** štítek role „hráč" a štítek šablony „hráč v poli" jsou v Lidech vedle
sebe a mají tutéž modrou. Text je odlišuje, barva ne.

---

## 2026-08-07 (15) — víc šablon u jednoho hráče a kumulovaný list

**Hráč má šablon kolik potřebuje** (migrace `013`, `players.sablony` jako JSON pole).
Ferda chytá, hraje v poli a vede mužstvo — zaškrtnou se mu všechny tři. Doteď měl
u sebe jednu „výchozí" a zbylé dvě si musel trenér u každého hodnocení vybrat ručně;
nikde přitom nebylo vidět, že mu dvě řady chybí. `players.sablona` zůstal jako zrcadlo
první šablony, aby ruční SQL nevracelo nesmysl.

**Leader zůstal samostatnou šesticí os, ne sedmou osou u všech** — sedm vrcholů mění
tvar radaru a rozbilo by porovnání se staršími hodnoceními (viz zápis 13). Nově ale
nepůsobí jako cizí těleso: přiřadí se zaškrtnutím vedle brankáře a polního hráče,
po uložení hodnocení nabídne formulář rovnou *Ohodnotit: leader* a na papíře jde mít
všechno vedle sebe (viz kumulovaný list).

**Co z toho plyne jinde:**
- **Listy** mají řádek na každou přiřazenou šablonu a je v nich vidět, která ještě
  hodnocení nemá. Přiřazená šablona bez hodnocení dá **prázdný list jako podklad** —
  jinak by chybějící brankářská řada z tisku tiše zmizela.
- **Odkazy** se generují **na každou šablonu zvlášť** (odkaz nese jednu šestici os).
  Nevyplněný odkaz na tutéž šablonu se už nezakládá podruhé a přeskočené se spočítají.
- **Export/import** má místo sloupce `sablona` sloupec `sablony` s popisky oddělenými
  čárkou; starší soubory s `sablona` dál projdou.

**Kumulovaný list** (Listy → přepínač). Jeden hráč = jedna stránka, na ní radary za
všechny jeho šablony vedle sebe, každý podepsaný. Slovní bloky a cíle se skládají ze
všech šablon a je u nich uvedeno, ze které jsou, takže se nic neztratí. Radary se ani
tady neslučují. Bez přepínače platí dosavadní stav: každá šablona vlastní stránka.

**Slovní bloky a cíle patří k šabloně, ne k člověku.** Formulář je při přepnutí šablony
dřív přenášel („mění se osy, ne text"), což u hráče s víc šablonami znamenalo, že
brankářské cíle („výkopy od brány") propadly i na leader list. Teď se vyprázdní a když
je něco rozepsané, formulář se předtím zeptá. Na kumulovaném listu se skládají
s uvedením šablony; stejná věta u dvou šablon se vypíše jednou.

**Klik na jméno v kartotéce** otevře úpravu té osoby; tlačítko na konci řádku zůstává.

**Ověřeno lokálně:** 15 kontrol API (uložení tří šablon, odmítnutí prázdného
i neznámého seznamu, stav po šablonách v přehledu, list na každou šablonu, odkaz na
každou šablonu a nezdvojení, export popisků) a 16 + 5 proklikáním v headless Edge —
včetně **tisku kumulovaného listu do PDF: 1 stránka**, bez přepínače 3 stránky,
a nepřenášení textů mezi šablonami. Sada k úpravě hodnocení (23 kontrol) prošla beze změn.

**Nasazeno.** Migrace `012` i `013` puštěné na ostré D1 (23 řádků, každý hráč má po
migraci `["pole"]`), Worker nasazený — `/api/version` = `6dd0701`, `cisto: true`.

**Zbývá:** zaškrtat šablony hráčům, kterým se má tisknout brankářský nebo leader list —
po migraci mají všichni jen `hráč v poli`.

---

## 2026-08-07 (14) — úprava hodnocení: načíst, opravit, uložit jako novou verzi

**Oprava překlepu už neznamená vyplnit formulář znovu.** Existující hodnocení se dá
načíst do formuláře, upravit a uložit — a vzniká **nová verze**. Zápis zůstává
append-only: původní řádek se nemaže ani nepřepisuje, zůstává v historii a jde ho
vytisknout. Migrace `012` přidává `evaluations.uprava_id` = ze které verze ta nová
vznikla; bez toho by v historii ležely dva záznamy vedle sebe a nešlo by poznat opravu
od druhého, samostatně pořízeného hodnocení.

**Dvě cesty k úpravě.** V *Hodnotit* se nad formulářem ukáže, že v tomhle období od tebe
hodnocení už je (**jen datum a šablona, žádná čísla**), s tlačítkem *Upravit ho*.
V *Porovnání → Historie hodnocení* je *Upravit* u konkrétní verze — takhle jde opravit
i hodnocení ze staršího období a nová verze se uloží **do období té upravované**, ne do
právě nastaveného.

**Známkování naslepo zůstává v platnosti.** Předvyplnění je výjimka na opravu, ne zrušení
principu: dokud si úpravu sám nevyžádáš, formulář žádná dřívější čísla neukáže, a nabízejí
se **jen vlastní** hodnocení. Když má session `id` (trenér s vlastním heslem), server
hledá výhradně jeho řádky a volbu v *Hodnotí* ignoruje; u přechodného společného hesla
platí `autor_id` z formuláře, stejně jako u ukládání. Cizí čísla se tudy vytáhnout nedají.
Server odmítne `uprava_id`, které neexistuje (404), patří jinému hráči nebo není od trenéra
(400) — sebehodnocení hráče se trenérským formulářem nepřepisuje ani novou verzí.

**Ověřeno lokálně** (`wrangler dev` + čerstvá D1 s migracemi 001–012): 15 kontrol API
a 23 kontrol proklikáním v headless Edge přes CDP — předvyplnění všech šesti os i slovních
bloků, nahrazení varování „naslepo" vysvětlením úpravy, vznik nové verze místo přepisu,
značka *úprava verze z …* v historii, *Upravit* jen u trenérských verzí, zrušení úpravy
vrátí prázdný formulář a varování zpět. Žádná chyba v konzoli prohlížeče.

**Nasazeno** (commit `025d70d`), migrace `012` na ostré D1 puštěná.

---

## 2026-08-07 (13) — leader, hromadné hodnocení, srovnání hráčů, příkazový řádek s AI

**Šablona `leader`** — vůdcovství jako třetí sada os (vedení na hřišti, příklad
v tréninku, reakce na chybu a tlak, fair play, podpora spoluhráčů, spolehlivost),
ne jako sedmá osa u všech: sedm vrcholů mění tvar radaru a rozbilo by porovnání
se staršími hodnoceními. Hráč tak dostane druhý list vedle herního. Osy popisují
**chování, které je vidět**, ne povahu — na papír pro rodiče nepatří posudek osobnosti.

**Hromadné hodnocení** (Hodnotit → *Hodnotit víc hráčů najednou*). Vyplní se jen
osy, na kterých se kádr shoduje, a doplní se k poslednímu hodnocení hráče v daném
období a šabloně; vzniká nový záznam, nic se nepřepisuje. Základ se bere **jen od
přihlášeného trenéra** — cizí čísla se nepřebírají, jinak by se tiše smíchaly dva
pohledy, které má rozsuzovat Shoda. Kdo v období hodnocení nemá, se nezaloží
a vypíše se jmenovitě. Ukládá se až po potvrzení, které napřed řekne, koho se to týká.

**Srovnání hráčů mezi sebou** (Porovnání, druhá karta) — tabulka osa × hráč,
vyšší známka tučně, sloupec *Rozdíl* a zvýrazněné osy s rozdílem ≥ 3. Srovnávají
se jen hodnocení od trenérů a vždy v rámci jedné šablony.

**Příkazový řádek** nad obsahem. „Robin" → nabídne Hodnotit / Porovnat / Listy;
„robin ferda" → srovnání; „listy robin", „porovnej robina a ferdu" jdou rovnou.
**Rozřazení dělá prohlížeč** nad načteným kádrem — okamžité a bez tokenů; model
se ptá teprve na větu, které místní rozřazení nerozumí.

**Jazykový model je přepínač** (Nastavení): `vypnuto` (výchozí) / Workers AI
zdarma / Claude přes oficiální `@anthropic-ai/sdk`. **Při vyčerpaném kreditu,
limitu nebo výpadku Claude spadne volání na model zdarma**, dokončí se a důvod
jde do logu i do odpovědi; chyba ve vlastním požadavku se ale zálohou nezakrývá.
Kvůli SDK je zapnutý `nodejs_compat` (bundle 513 kB / 108 kB gzip).
Vyřazený `llama-3.1-8b-instruct` (skončil 2026-05-30, chyba 5028) nahrazen
`-fp8` variantou; seznam modelů je v kódu, ne z katalogu.

**Mobil** — pod 720 px jdou záložky pod hamburger, který nese jméno otevřené
záložky; známky mají 42 px na palec, vstupy 16 px kvůli iOS, široké tabulky se
posouvají uvnitř karty.

**Tisk opraven.** Pravidla pro tisk byla nahoře v souboru, ale `.page` se šířkou
210 mm níž — při stejné specifičnosti vyhrálo pozdější, šířka se sečetla s okraji
stránky, obsah přetekl vpravo a vylezl druhý prázdný list. Tisková sekce je teď
na konci souboru. Podpis trenéra šel dolů (patička si bere zbylé místo).
Ověřeno headless tiskem do PDF: 1 stránka, MediaBox 595 × 842 pt.

**Export mluví lidsky** — místo `trener`, `pole`, `stredni_zaloznik` a 0/1 jsou
v souboru popisky a ano/ne v jazyce aplikace; import bere zpátky obojí. Přibyl
skutečný **sešit .xlsx** (telefon a chat id formátem Text, ověřeno Excelem přes
COM); CSV už telefon nezabaluje do `="…"`. **České řazení** přes `Intl.Collator`.

**Zbývá:** ověřit účet GoSMS a dobít kredit (ostrá SMS zatím neprojde, odesílatel
je `GoSMS-test`); zadat první hodnocení; pozvánky pro Julka a Masa a pak
`DELETE FROM auth`; případný klíč `ANTHROPIC_API_KEY`, pokud se má zkoušet Claude.

---

## 2026-08-07 (12) — GoSMS místo Twilia, PIN se zámkem, export/import, dokumentace v appce

**SMS přes GoSMS** (`SMS_PROVIDER: gosms`). Twilio je pro české SMS špatný nástroj: obě
jeho cesty stojí měsíční paušál (30 $ za registrované jméno, 12 $ za české číslo). Česká
brána nemá paušál, účtuje od 0,41 Kč za zprávu a posílá pod **svým registrovaným
odesílatelem**, takže problém `21612` mizí. Daň: příjemce vidí `GoSMS-info`, ne klub.

- klíče jsou secrety (`GOSMS_CLIENT_ID`, `GOSMS_CLIENT_SECRET`), ID kanálu `504031` je ve
  `wrangler.jsonc` — tajemství to není
- API je na **`app.gosms.eu`** (`.cz` jen přesměrovává a POST by se zvrhl na GET), token
  form-encoded; výpis kanálů v1 nemá (404), ID se opisuje z portálu
- **zkouška nanečisto** přes `…/messages/test` ověří klíče, kanál i tvar čísla, nic
  neodešle a nic nestojí — tlačítko *SMS nanečisto* v Lidech
- **vypínač `smsAktivni`, výchozí vypnuto**: SMS je mimořádný nástroj. Přepínač u osoby
  říká *kam*, tenhle *jestli vůbec*
- **účet GoSMS je zatím neověřený a bez kreditu** → odesílatel `GoSMS-test`, ostrá SMS
  neprojde. Poslední ostrý pokus skončil `400`; hlášení už nese text od brány, ale nikdo
  ho zatím nepustil znovu. **Tohle je otevřený konec.**
- Twilio účet zůstává (nic nestojí, kredit se při zavření vrací, je to jediná cesta
  k WhatsAppu). WhatsApp by šel bez paušálu, ale chce číslo mimo běžný WhatsApp,
  Meta Business Portfolio a schválenou šablonu — nepostaveno.

**Heslo smí být 4místný PIN** a k němu **zámek přihlášení** (migrace `011`): 5 marných
pokusů na účet nebo 15 z jedné IP v okně 15 minut → `429` s vysvětlením. Ověřeno naostro,
testovací řádky smazány. Zámek je krátký schválně, jinak by šel trenér vyřadit z aplikace.

**Přihlášení i obnova berou e-mail.** E-mail v poli „Kdo jsi" dřív tiše propadl do větve
společného hesla — člověk si tak přenastavil něco jiného, než myslel, a nechápal, proč mu
PIN nebere. Obnova navíc rozlišuje: nesmyslný tvar (400) a vyčerpanou brzdu (429) řekne
nahlas, o existenci účtu dál mlčí; stránka nového hesla píše, čí heslo nastavuje.

**Lidé: export a import.** `.xlsx` skládá Worker sám (`worker/src/xlsx.ts`, ZIP + XML),
protože CSV nenese formát buněk a Excel dělal z telefonu `4,20605E+11`. Ověřeno Excelem
přes COM: formát `@`, hodnota doslova. Import bere `.xlsx` i `.csv` (sešit se rozbaluje
v prohlížeči kvůli kódování), běží nejdřív nanečisto a hesla ani hodnocení nemění.

**České řazení** přes `Intl.Collator('cs')` — SQLite řadil podle bajtů, takže Říčka
a Šplíchal padali za Weisse.

**Verze se čte z bundlu, ne z assetu.** Na custom doméně držela cache zóny starý
`version.json` a lišta po nasazení hlásila předchozí commit.

**Nová záložka 📖 Dokumentace** (CS i EN, `web/src/dokumentace.js`) a srovnané `docs/`.

**Zbývá:** ověřit účet GoSMS a dobít kredit, pak doladit to `400`; zadat první hodnocení;
pozvánky pro Julka a Masa a pak `DELETE FROM auth`; doplnit pozice zbylým hráčům.

---

## 2026-08-06 (11) — SMS kanál, log komunikace, Twilio naráží na české Sender ID

**Hotové a nasazené:**

- **SMS kanál** (migrace `009_sms.sql`): telefon a přepínač u osoby, volání Twilio API,
  odstranění diakritiky (háčky půlí segment ze 160 na 70 znaků = dvojnásobná cena),
  denní strop jako pojistka proti smyčce.
- **Provider je přepínač**: `console` jen loguje, `twilio` odesílá. Přepnuto na `twilio`.
- **Log komunikace** — tabulka `komunikace`, posledních sto pokusů vidět v Nastavení.
  Metadata a kód chyby, ne obsah; u SMS text kvůli segmentům. **Tokeny nikdy.**
- `/api/sms/ucet` — kontrola přihlašovacích údajů bez odeslání.

**Kde to stojí:** Twilio přijme požadavek, ale odmítne odeslat s `21612`.
Podle pravidel Twilia pro ČR od 14. 7. 2025 **T-Mobile a O2 blokují neregistrované Sender ID**.
Geo Permissions pro Česko bylo zapnuté, na tom to nebylo.

**Rozhodnutí: `SKRicmanice` nepoužívat.** Registrace jména stojí 30 $/měsíc a nejde sdílet
mezi projekty; české číslo je 12 $/měsíc, funguje hned a jedno stačí pro všechny aplikace.
Značka patří do těla zprávy. Zatím se **nekupuje nic** — SMS na nikoho nečekají, Telegram jede.

**Cestou opraveno:** dvě rady, které byly špatně — že registrace je zdarma (není, 30 $/měsíc)
a že číslo není potřeba (v Česku bez registrace je).

**Pro příště:** Auth Token má 32 znaků, API Key SID 34 a začíná `SK`. Ta záměna stála dvě kola;
proto `/api/sms/ucet` vrací délku tokenu.

---

## 2026-08-06 (10) — obrazovky ke shodě a k historii verzí

- **Záložka Shoda**: tabulka osa × trenér, sloupec „shoda / rozchází se" s velikostí rozdílu,
  výběr výsledku (předvyplněný jen tam, kde se shodli), slovní bloky všech trenérů jako
  podklad a jedno finální znění na list.
- **Blind guard ověřen naostro**: povinný trenér, který ještě neodevzdal, dostane
  `{"cekaNaTebe": true}` a **žádná cizí čísla**.
- **Historie verzí** v Porovnání: všechny verze s datem a autorem, tisk kterékoli
  (`listy.html?verze=<id>`) a posun mezi dvěma vybranými se šipkami.
- Zaškrtávátko „jeho hodnocení je nutné" u trenéra; výchozí Maxla a Julek.

---

## 2026-08-06 (9) — dokumentace srovnaná, cron potvrzený, SMS do backlogu

- Celá dokumentace projita a srovnána se skutečností: README, uživatelská příručka,
  TECHNICAL, BUILD (secrety + pořadí migrací), RUNBOOK, known_good (doplněny záznamy
  o ověření pozic, notifikací a účtů).
- **Cron je uvolněný a běží** — slot dal `pojistky-watch`, deploy hlásí `schedule: 0 * * * *`.
  V TECHNICAL opraveno tvrzení „cron je vypnutý", které už nebyla pravda.
- **SMS jako třetí kanál** zapsána do backlogu (TECHNICAL §9b) — nestaví se teď.
  Poznámky: cenu neřešit (desetikoruny měsíčně), providera jako přepínač, v dev režimu
  `console` provider, Twilio trial na ověřená čísla, BulkGate/GoSMS jako české alternativy,
  tabulka v D1 + rate limit jako u obnovy hesla.

**Zbývá:**

1. Zadat hodnocení (aplikace je připravená, kádr nahraný, hodnocení zatím žádné).
2. Julek a Maso nemají heslo ani kanál — až budou mít Telegram nebo ověřený e-mail,
   poslat pozvánku z Lidí. Pak zrušit společné heslo (`DELETE FROM auth`).
3. Doplnit pozice zbylým hráčům (má je zatím jen Ferda).
4. SMS kanál — viz backlog.

---

## 2026-08-06 (8) — účty po lidech, přezdívky, favicon

**Účty po lidech** (migrace `007_ucty.sql`): každý trenér má `login` a vlastní heslo
(PBKDF2 u jeho řádku). Session nese `id` a `jmeno` → aplikace ví, kdo je přihlášený.
**Obnova hesla je pro každého zvlášť** a chodí na jeho vlastní kanál (Telegram nebo e-mail),
ne na globální seznam ze secretu. Administrace umí poslat trenérovi odkaz na nastavení hesla.

Přechod: společné heslo v `auth` zůstává funkční (prázdné přihlašovací jméno), aby nešlo
vyzamknout celý tým. Až budou mít všichni svoje, smazat `DELETE FROM auth`.

**Ověřeno naživo:** pozvánka Maxlovi dorazila na Telegram, nastavení hesla odkazem,
přihlášení `maxla` + heslo → session zná jméno, cizí účet stejné heslo nepustí (409/401),
odkaz je jednorázový (410), společné heslo pořád funguje.

**Stav hesel:** Maxla má vlastní heslo (stejný řetězec jako společné, ať si nepamatuje dvě).
Julek a Maso zatím bez hesla — pošli jim pozvánku z Lidí, až budou mít Telegram nebo
ověřený e-mail.

**Drobnosti:** přezdívky se ukazují všude, kde se vypisují jména (v kádru jsou tři Trnkové);
favicon (`web/favicon.svg`) místo globusu v záložce; klik na název klubu vede na úvod.

---

## 2026-08-06 (7) — vlastní doména hodnoceni.maxferit.cz

**Živě na https://hodnoceni.maxferit.cz.** Custom domain přímo ve `wrangler.jsonc`
(`routes` s `custom_domain: true`); zóna je na stejném účtu, takže si Cloudflare DNS
i certifikát založil sám při deployi. `hodnoceni-hracu.bass443.workers.dev` zůstává
funkční jako záloha.

Ověřeno na nové adrese: `/health`, `/api/version`, přihlášení (cookie se `Secure`),
načtení kádru (22 osob), stránky `/`, `/listy.html`, `/obnova/*`.

Do `vars` přibylo `ZAKLADNI_URL` — odkazy v notifikacích vznikají v cronu, kde není
request, ze kterého by šla adresa odvodit.

**Cestou nastal blok:** wrangler se uprostřed práce odhlásil (`whoami` → not authenticated),
credentials se navíc přesunuly z `AppData\Roaming\xdg.config\.wrangler` do
`C:\Users\trnkam\.wrangler`. Vyřešeno tím, že se uživatel znovu přihlásil (`wrangler login`).

**Zjištění k cronu:** `sk-ricmanice-taktika` **není Worker** (Cloudflare vrací
„This Worker does not exist on your account", code 10007) — je to Pages projekt a `[triggers]`
v jeho `wrangler.toml` je mrtvý zápis. Uvolněním nic nezískáme. Skutečné držitele slotů viz
níž; rozhodnutí (Workers Paid vs. piggyback na job-watch) je na zadavateli.

---

## 2026-08-06 (6) — souhrnné notifikace (Telegram ověřený, cron blokovaný limitem)

**Hotové** (migrace `005_notifikace.sql`, `006_notif_intervaly.sql`, nasazeno):

- Kanály se zapínají u konkrétního trenéra v Lidech: e-mail, Telegram chat id, dva přepínače.
  Tlačítko dotáhne chat id z Telegramu, druhé pošle zkušební zprávu.
- **Dva nezávislé intervaly** místo „jak často": `notifDnyZmeny` (když se něco děje, souhrn
  nejvýš jednou za N dní, výchozí 3) a `notifDnyTicho` (když se nic neděje, po N dnech přijde
  „nic se nezměnilo", výchozí 14). Druhý je liveness signál — z ticha jinak nejde poznat,
  jestli nikdo nic nedělá, nebo se něco rozbilo.
- Zpráva nese jen „kdo a co" + stav období. **Nikdy známky ani slovní bloky.**
- Události se označí za odeslané, jen když se aspoň někomu povedlo doručit.
- `/api/kanaly`, `/api/notifikace/stav`, `/api/notifikace/ted` (poslat teď).

**Telegram ověřený naostro:** bot `@skricmanice_bot`, chat id Maxly uložené, doručení
potvrzené uživatelem. Julek a Maso mají notifikace vypnuté (nevíme, jestli Telegram používají).

**Ověřeno:** 13 testů proti nasazené aplikaci, 0 chyb — vznik událostí při hodnocení
i sebehodnocení, odeslání souhrnu, zpráva „nic se nezměnilo", uložení intervalů.
Testovací data smazána.

**BLOKUJE: cron.** `wrangler.jsonc` má trigger zakomentovaný — Workers Free dovolí
**5 cron triggerů na celý účet** a ty jsou vyčerpané (job-watch, pojistky-watch,
sk-ricmanice-taktika…). Deploy s ním padá na `code: 10072`. Do vyřešení se souhrn posílá
jen tlačítkem „Poslat souhrn teď" v Nastavení. Řešení: Workers Paid, uvolnit cron jinde,
nebo nechat existující cron jiného Workeru pingnout tenhle.

---

## 2026-08-06 (5) — N pozic u hráče + šablona os na hodnocení

**Hotové** (migrace `004_pozice.sql`, nasazeno):

- **Pozic může být N.** `players.pozice` je JSON pole klíčů (`["brankar","levy_bek",…]`),
  vybírá se zaškrtávátky v záložce Lidé, tiskne se na list. `post` zůstal jako volný text
  pro funkci („Kapitán").
- **Šablona os se přesunula z osoby na hodnocení.** Vybírá se ve formuláři; hráč, který
  chytá i hraje v poli, může mít v jednom období obojí a dostane dva listy. `players.sablona`
  je už jen výchozí volba.
- **Token na sebehodnocení nese šablonu** (`tokens.sablona`), aby hráč vyplňoval tytéž osy,
  které známkoval trenér. Když se rozejdou, porovnání to pozná a řekne (`jinaSablona`),
  místo aby tvrdilo „hráč ještě nevyplnil".
- `/api/listy` vrací jeden list na kombinaci hráč × šablona; `/api/porovnani` i `/api/trend`
  pracují v rámci jedné šablony.

**Ověřeno naživo:** 25 testů proti nasazené aplikaci, 0 chyb — včetně dvou listů pro jednoho
hráče, odmítnutí polních os v brankářské šabloně a rozpoznání nesouhlasné šablony.
Testovací data smazána, kádr (22 osob) zůstal.

**Opraveno mimochodem:** `/api/trend` neměl `.bind(player_id)` — endpoint padal při každém
volání ze záložky Porovnání. Nebylo to vidět, protože testy trend nevolaly.

**Rozpracované:** notifikace na e-mail a Telegram. Migrace `005_notifikace.sql` je napsaná
(tabulka `udalosti`, kanály u osoby, čas souhrnu v nastavení), **zatím neaplikovaná**.
Souhrn má chodit cronem podle času v Nastavení, ne po jedné zprávě za událost.
Čeká se na token Telegram bota.

---

## 2026-08-06 (4) — kádr v databázi + obnova zapomenutého hesla

**Hotové:**

- **Kádr nahraný:** 19 hráčů (jména sedí s `ricmanice_hraci.txt`) + 3 trenéři
  (Maxla, Julek, Maso). Brankářskou šablonu mají Peša Robin a Trnka Ferdinand.
- **Heslo přestěhováno z Worker secretu do D1** jako PBKDF2 hash (migrace `003_auth.sql`).
  Bez toho nešlo heslo změnit z aplikace — Worker si secret sám přepsat nemůže.
  `ADMIN_HESLO` slouží už jen k prvnímu přihlášení; nouzové odemčení `DELETE FROM auth`.
- **Nastavení → Změna hesla** a **přihlašovací stránka → Zapomenuté heslo**
  (jednorázový odkaz mailem, platnost 15 min, po použití padají všechny ostatní odkazy).
- E-mail přes **Cloudflare Email Sending**, binding `[[send_email]] name = "EMAIL"`,
  odesílatel `hodnoceni@maxferit.cz` — stejný mechanismus jako JobWatch.

**Ověřeno naživo:** 27 testů obnovy hesla, 0 chyb (včetně jednorázovosti odkazu, brzdy na
3 žádosti za 15 minut a toho, že odpověď neprozradí povolené adresy). Cloudflare maily
přijal k odeslání — v `wrangler tail` není `E_SENDER_NOT_VERIFIED` ani `E_RECIPIENT_NOT_ALLOWED`.

**Dvě chyby nalezené a opravené při ověřování:**

1. workerd nedovolí PBKDF2 nad **100 000 iterací** („iteration counts above 100000 are not
   supported") — nastavení hesla končilo na 500. Sníženo na 100 000.
2. při přepisu přihlašování se ztratila hláška „na serveru není nastavené heslo" a server
   vracel mlčky „špatné heslo". Vráceno jako samostatný stav (500 s vysvětlením).

**Nedovysvětleno:** secret `ADMIN_HESLO` přestal odpovídat hodnotě, se kterou byl nastavený
(přihlášení hlásilo špatné heslo, ačkoli hodnota seděla). Po `wrangler secret put` se stejnou
hodnotou začalo fungovat. Příčinu se nepodařilo doložit; heslo od té doby žije v databázi,
takže na secretu už provoz nestojí.

**Zbývá:**

1. **Kumulovaná pozice** (Ferda je brankář i hráč v poli) — přesunout šablonu z osoby na
   hodnocení. Návrh je popsaný, čeká na odsouhlasení.
2. **Notifikace** na Telegram/e-mail při novém hodnocení, zapínatelné per osoba.
3. Vlastní doména pod maxferit.cz.

---

## 2026-08-06 (3) — NASAZENO do cloudu + frontpage (čas, commit, dark/light, CS/EN)

**Živě na https://hodnoceni-hracu.bass443.workers.dev**

**Hotové:**

- D1 `hodnoceni-hracu` (EEUR, id `8fe85587-7409-4b95-83f3-d23f340aa2ad`), schéma nahrané,
  secrety `ADMIN_HESLO` a `SESSION_KEY` nastavené, Worker i statické soubory nasazené.
- **Horní lišta na každé stránce:** čas, commit běžící verze (celý hash v tooltipu),
  přepínač tmavý/světlý vzhled, přepínač CS/EN. Volby se pamatují v `localStorage`.
- **Kompletní překlad CS/EN** — `web/src/i18n.js`, včetně popisů os, kotev škály, formulací
  v první osobě a celého tištěného listu. Jazyk jde vynutit adresou `?lang=en`.
- **Verze do buildu** — `scripts/gen-version.mjs` běží jako `predeploy`, zapisuje commit
  do `web/version.json`, aplikace ho čte přes `/api/version`.
- Server přestal vracet texty: posílá klíče (`prava`, `hrac`, `minule`) a překládá prohlížeč.
  Přepnutí jazyka proto nic nedotahuje z databáze.
- Bezpečnostní drobnosti pro veřejnou adresu: prodleva 700 ms u špatného hesla,
  `preview_urls: false`.

**Ověřeno naživo proti nasazené aplikaci:** 48 API testů (0 chyb), vykreslení listů z ostrých
dat česky i anglicky, headless prohlížeč na `/` i `/h/<token>` v obou jazycích. Detaily
v `known_good.md`.

**Databáze je prázdná.** Testovací data byla po ověření smazána, kádr se zadává v aplikaci
v záložce Lidé. `migrations/002_seed.sql` je proto schválně prázdný (jen zakomentovaná šablona).

**Zbývá:**

1. Zadat reálný kádr (19 hráčů) v záložce Lidé.
2. Odhodnotit, rozeslat odkazy na sebehodnocení, projít Porovnání, vytisknout.
3. Navěsit vlastní doménu pod maxferit.cz (custom domain u Workeru, DNS je na stejném účtu).

**Otevřená otázka:** mají mít k listu přístup rodiče, nebo jen hráči?

---

## 2026-08-06 (2) — aplikace: fáze 2 + 3 hotové, ověřené lokálně

**Hotové:**

- **Worker** (`worker/src/index.ts`) — API, autorizace, D1. Obsluhuje i statické soubory
  z `web/` přes `assets` binding: jeden deploy, jedna doména, žádné CORS.
- **Aplikace trenéra** (`web/index.html` + `app.js`) — záložky Lidé, Hodnotit, Listy,
  Porovnání, Odkazy, Nastavení.
- **Sebehodnocení hráče** (`/h/<token>`) — osy formulované v první osobě, nepovinná otázka
  „Na čem chceš pracovat?".
- **Tiskové listy z databáze** (`listy.html`) — volitelný druhý polygon: trenér minule /
  sebehodnocení hráče / žádný.
- **Tolerance** v Nastavení: řeší se jen osy, kde je rozdíl větší; ukládá se znaménko
  (+ slepé místo / − sebedůvěra), nad 3 rozcházející se osy aplikace doporučí vybrat 2–3 témata.
- Schéma rozšířeno: `players.role` (hráč/trenér), `evaluations.autor_id`,
  `evaluations.poznamka`, seed nastavení.

**Ověřeno naživo** proti běžícímu Workeru a lokální D1 — 45 API testů + vykreslení listů
z ostrých dat + headless prohlížeč. Detaily a čísla v `known_good.md`.

**Chyba, která se cestou našla a opravila:** Cloudflare asset server přesměrovával `/h.html`
na `/h`, čímž z adresy zmizel token sebehodnocení a hráči se stránka neotevřela. Řešení:
`html_handling: "none"` v `wrangler.jsonc` a mapování cest ve Workeru.

**Změna oproti fázi 1:** offline generátor (`frontend/tisk.html` + `data/kadr.js`) zrušen,
nahradila ho aplikace. Data by jinak žila na dvou místech. Samostatný referenční list
`docs/vzor-list.html` zůstává — otevře se dvojklikem a je pořád zdrojem pravdy pro geometrii.

**Rozpracované:** nic.

**Zbývá — nejbližší kroky:**

1. **Nasadit.** Chybí `wrangler d1 create` + zapsat `database_id` do `wrangler.jsonc`
   + `wrangler secret put ADMIN_HESLO` a `SESSION_KEY` + `npm run deploy`. Postup v `docs/BUILD.md`.
2. **Doplnit reálný kádr** (19 hráčů) — buď v aplikaci (Lidé), nebo v `migrations/002_seed.sql`.
3. Projít aplikaci klikáním a odhodnotit kádr; pak nasadit vlastní doménu pod maxferit.cz.

**Otevřená otázka:** mají mít k listu přístup rodiče, nebo jen hráči?

---

## 2026-08-06 (1) — založení projektu, fáze 1

**Hotové:**

- Repozitář založen podle `project-standard`, **private** (obsahuje osobní údaje nezletilých).
- Fáze 1 — tiskový generátor listů A4 z lokálního souboru, ověřený headless prohlížečem
  (2 listy, 2 SVG, 14 polygonů).
- Radar převzatý beze změny z `docs/vzor-list.html`.
- `migrations/001_init.sql` podle zadání, dokumentace v `docs/`.

**Rozhodnuto:**

- admin auth = jedno heslo jako Worker secret + podepsaná session cookie
- doména = nakonec vlastní pod `maxferit.cz`
- osobní data (jména i posudky) jdou do repa → repo musí zůstat private
