# Uživatelská příručka — pro trenéra

Jak aplikaci používat. Programátorská část je v [TECHNICAL.md](TECHNICAL.md).

---

## 1. K čemu to je

Hráč dostane jednu stránku A4: graf šesti dovedností, tři slovní bloky (Fyzicky / Hlavou /
V partě) a dva až tři cíle na další půlrok. Nic víc se na papír nevejde a nic víc tam ani
nepatří.

Navíc si hráč sám vyplní tytéž osy přes soukromý odkaz. Tam, kde se váš pohled rozchází
víc, než je nastavená tolerance, aplikace osu označí — a to jsou témata k rozhovoru. Tohle je
na celém nástroji to nejcennější.

Hodnotí se proti **absolutní laťce kategorie** — „co má umět starší žák" — ne proti kádru.
Dva hráči vedle sebe můžou mít oba sedmičku a být jinak dobří. To je v pořádku.

---

## 2. Tři pravidla, na kterých to stojí

1. **Známkuje se naslepo.** Aplikace schválně neukazuje loňské hodnoty ani hodnocení hráče,
   dokud neuložíš svoje. Viditelné loňské číslo přitáhne nové k sobě a datová řada přestane
   cokoliv říkat.
2. **Fyzická kondice se od 16. 8. 2026 známkuje** — je to sedmá osa u všech šablon.
   Pozor u ní o to víc: u téhle věkové kategorie měří i biologický věk, ne jen odvedenou
   práci. Kdo přes léto povyrostl, může mít lepší číslo než ten, co dřel. **Napiš proto
   ke kondici slovy, co za tím číslem stojí** — slovní blok *Fyzicky* zůstává a je u ní
   důležitější než jinde. Rychlost mezi osami dál není, ze stejného důvodu.
3. **Povaha se neznámkuje nikdy.** Spolehlivost, snaha, parta — jen slovy.

### Škála 1–10

| Rozsah | Význam |
|--------|--------|
| 1–3 | začínám, jen v klidu bez tlaku |
| 4–5 | umím na tréninku, v zápase kolísá |
| 6–7 | spolehlivé i v zápase |
| 8–9 | silná stránka, opora týmu |
| 10 | nadstandard pro kategorii |

Kotvy jsou pevné schválně. Bez nich hodnocení mezi sezónami ujede a čísla se nedají porovnat.

---

## 3. Přihlášení

Aplikace běží na **https://hodnoceni.maxferit.cz**. Přihlášení platí 12 hodin.

**Každý trenér má svůj účet.** Do pole „Kdo jsi" napíšeš **přihlašovací jméno
(`maxla`, `julek`, `maso`) nebo svůj e-mail** — funguje obojí. V záhlaví je pak vidět,
kdo je přihlášený.

**Heslo může být krátké, klidně čtyřmístný PIN.** Ťuká se to do mobilu na hřišti.
Aby to nebylo na hlouposti: po **pěti špatných pokusech** se přihlášení na patnáct minut
zamkne a aplikace to napíše. Když se trefíš, počitadlo se vynuluje.

**Změna hesla:** Nastavení → Změna hesla (stávající + nové dvakrát, aspoň 4 znaky).
Měníš si vždycky jen svoje.

**Zapomenuté heslo:** na přihlašovací stránce tlačítko *Zapomenuté heslo*. Napíšeš svoje
přihlašovací jméno **nebo e-mail** a odkaz na nastavení nového hesla ti přijde **na tvůj
Telegram nebo e-mail** — podle toho, co máš u sebe vyplněné. Odkaz platí 15 minut a funguje
jen jednou. Heslo se zprávou nikdy neposílá; kdyby ti zpráva někam unikla, zůstalo by v ní
navždy.

Jestli takový účet existuje, aplikace neřekne — schválně, ať se nedá zkoušet, kdo v aplikaci
účet má. Co ale řekne nahlas: že je vstup nesmysl, a že se za posledních 15 minut žádalo
moc často. Na stránce s novým heslem je vždycky napsané, **čí heslo zrovna nastavuješ** —
jestli svůj účet, nebo staré společné heslo.

**Nový trenér:** v Lidech mu vyplň přihlašovací jméno a Telegram nebo e-mail, ulož a klikni
na *Poslat odkaz na nastavení hesla*. Heslo si nastaví sám, nemusíš mu ho diktovat.

**Jméno psát nemusíš.** Pole „Kdo jsi" nech prázdné a napiš jen svůj PIN — aplikace pozná,
kdo jsi, a hodnocení podepíše tvým jménem. Kdyby dva lidé měli stejný PIN, aplikace nehádá
a vyžádá si jméno; vybrat jednoho z nich by znamenalo podepsat hodnocení cizím jménem.

> Prázdné jméno funguje i pro staré společné heslo. Zůstalo tam, aby se nedal vyzamknout celý
> tým, než budou mít všichni svoje. Až to nastane, dá se zrušit — hodnocení uložené pod ním
> totiž neví, kdo ho psal.

> **Za pohodlí se platí.** Čtyři číslice bez jména se hádají snáz než jméno s heslem a aplikace
> je veřejně na internetu. Drží to zámek na marné pokusy (5 na účet, 15 z jedné adresy, na 15
> minut) a prodleva u každého nezdaru. **PIN nikomu neříkej a neposílej ho zprávou**, kterou
> může číst někdo další.

### Horní lišta

Vpravo nahoře je na každé stránce:

- **čas** — aktuální datum a čas
- **verze** — commit, ze kterého je běžící aplikace sestavená; po najetí myší celý hash
  a čas nasazení. Když nahlásíš, že něco nefunguje, tohle číslo řekni s sebou.
- **🌙 Tmavé / ☀️ Světlé** — přepínač vzhledu, volba se pamatuje
- **English / Čeština** — přepínač jazyka; přeloží se celá aplikace včetně tištěného
  listu. Jde vynutit i odkazem: `…/?lang=en`

Tištěný list je vždy světlý, i když máš aplikaci tmavou — je to papír.

---

## 4. Záložky

### Úvod

První obrazovka po přihlášení. Není to uvítací plakát: půl roku se s aplikací nic neděje
a pak přijde kolo hodnocení — tehdy má být na jedno otevření vidět, kde kádr stojí.

- **znak klubu a období**, ať je jasné, do čeho se zapisuje;
- **kde to stojí** — počítá se **po listech**, ne po hráčích: kdo má tři šablony, má tři
  řady i tři papíry. Čísla jsou z týchž dat jako Listy, žádná druhá pravda;
- **co udělat dál** — konkrétní kroky s tlačítkem tam, kde se to dělá. Ukazují se **jen
  když opravdu něco zbývá**; seznam samých odškrtnutých úkolů nikdo nečte;
- **jazykový model** — jestli odpovídá, a co je nastavené. Stav je z posledního
  skutečného použití, ne ze zkušebního dotazu (ten by ujídal denní limit).

**Znak klubu** je soubor `web/logo.png` v repozitáři. Když tam není, obrázek se schová
a zůstane samotný název — rozbitá ikona vypadá jako chyba aplikace, a přitom je to jen
nenahraný soubor.

### Lidé

Kdo je v týmu. U každého jméno, přezdívka, pozice, role a šablony os, kterými se známkuje.
**Kliknutím na jméno se otevře jeho úprava** (tlačítko na konci řádku zůstává).

**Formulář se otevře až na vyžádání** — tlačítkem *+ Přidat osobu* nebo klikem na jméno.
Zavírá se tlačítkem *Zavřít* a po uložení sám.

**Smazat jde jen člověk, po kterém nic nezůstalo** — překlep v kádru, dvojitý import,
omylem založený trenér. Kdo má hodnocení (svoje nebo pořízená) nebo odkaz na
sebehodnocení, se smazat nedá a aplikace řekne proč: **jeho čísla jsou historie**.
Kdo v týmu skončil, se vyřazuje odškrtnutím *aktivní* — zůstane i s historií a se
svým číslem, které se už nikomu nepřidělí.

**Pozic může být několik.** Hráč použitelný na levém beku, pravém křídle i v bráně má
zaškrtnuté všechny tři. Je to popis toho, kde nastupuje — se známkováním to nesouvisí.

**Funkce / poznámka** je volný text vedle pozic, třeba „Kapitán". Tiskne se na list.

**Zaškrtnuté šablony rozhodují, čím se hráč vůbec dá oznámkovat.** Ve formuláři hodnocení
i v hromadném hodnocení se nabízí jen ty, které tu má zaškrtnuté — hráči v poli aplikace
brankářskou šesticí os nedovolí známkovat. První zaškrtnutá je ve formuláři předvolená.

- **role hráč** — hodnotí se, tiskne se mu list
- **role trenér** — nehodnotí se; je v seznamu proto, aby šlo u hodnocení vybrat, kdo ho pořídil
- **šablony** — zaškrtni všechny, kterými se hráč známkuje: `pole` (hráč v poli),
  `brankar` (brankář), `leader` (vůdcovství). Ferda může mít klidně všechny tři.
  Každá je vlastní řada, vlastní odkaz na sebehodnocení a vlastní list; do jednoho
  grafu se sloučit nedají, ale na jednu stránku vytisknout ano (Listy → kumulovaný list)
- **aktivní** — vypni místo mazání, když hráč odejde. Historie hodnocení má zůstat.
  Číslo, které hráč dostal, si drží napořád a nikomu jinému se už nepřidělí.

**Export a import.** Pod tabulkou jsou tlačítka:

- **⬇ Export do Excelu** — stáhne sešit `.xlsx`. Telefon a chat id v něm mají formát Text,
  takže z `+420604577765` nevznikne `4,20605E+11`. Když ještě nikdo zadaný není, stáhne se
  samotná hlavička — je to prázdná tabulka k vyplnění.
- **⬇ Export CSV** — totéž pro programy mimo Excel.
- **⬆ Import z Excelu / CSV** — nahraje kádr ze souboru. Nejdřív ukáže, co by se stalo
  („řádků 22, přibylo by 19, upravilo by se 3"), a **zapisuje až po potvrzení**. Vadné řádky
  přeskočí a vypíše je i s číslem řádku, jak ho vidíš v Excelu.

Import mění jen kartotéku lidí. **Hesla ani hodnocení nikdy nepřepisuje.** Když někoho
opravuješ, nech v souboru sloupec `id` — podle něj se řádek spáruje se správným člověkem.

V souboru jsou **normální slova**, ne vnitřní zkratky: `trenér`, `hráč v poli`,
`střední záložník`, `ano` / `ne`. Píšou se v jazyce, který máš zrovna zapnutý, a při
importu se berou zpátky i s velkými písmeny nebo bez háčků.

### Na telefonu

Aplikace se přizpůsobí úzké obrazovce: záložky se schovají pod tlačítko **☰**, které
zároveň ukazuje, kde zrovna jsi. Známky mají větší tlačítka na palec a široké tabulky
se posouvají do stran uvnitř karty, takže stránka nikam neuteče.

### Příkazový řádek

Nad záložkami je pruh, do kterého se píše jméno hráče nebo povel:

- `Robin` → najde hráče a nabídne **Hodnotit / Porovnat / Listy**
- `robin ferda` → nabídne srovnání obou
- `listy robin`, `porovnej robina a ferdu`, `hodnotit ferda` → provede rovnou

Hledání dělá **sama aplikace** nad kádrem, který už má načtený — je okamžité
a nic nestojí. Jazykový model se ptá teprve na větu, které aplikace nerozumí,
a jen když je zapnutý (Nastavení → Jazykový model).

### Pozice

**Opačný pohled než Lidé.** Tam vybíráš hráče a zaškrtáváš mu pozice; tady vybereš
**pozici** a zaškrtáš, kdo na ni patří. Když skládáš sestavu, přemýšlíš „kdo mi může hrát
pravého beka", ne „co všechno umí Vilém" — a proklikat kvůli tomu osmnáct karet je otrava.

V nabídce je u každé pozice vidět, **kolik lidí ji zatím má**, a otevře se rovnou ta
nejprázdnější. U každého hráče je vpravo seznam jeho **dalších pozic**, ať je poznat, koho
odjinud přetahuješ.

**Ukládá se jen ta jedna vybraná pozice.** Ostatní, které má hráč nastavené, zůstávají —
tenhle formulář o nich nic neví a nesmí je smazat. Když zaškrtnutí odpovídá tomu, co už
je uložené, aplikace to řekne a nic nezapíše.

Je to totéž pole jako v Lidech, jen z druhé strany: co zaškrtneš tady, uvidíš tam u hráče.
Pozice se tisknou na list.

### Hodnotit

Vybereš hráče, dole se objeví formulář: sedm os po deseti známkách, tři slovní bloky a cíle.

Nic není předvyplněné a předchozí hodnoty se nezobrazují — to je záměr, ne opomenutí.

**Kdo hodnotí, musí být vyplněné.** Bez podpisu se hodnocení neuloží (aplikace to řekne
a server to odmítne i při volání napřímo) — platí to i pro hromadné hodnocení a pro
uzavření shody. Kdo je přihlášený svým jménem, má sebe předvyplněného a nabídka je zamčená:
podepisuje se přihlášený účet. U společného hesla aplikace nepozná, kdo sedí u počítače,
a trenér se musí vybrat. Sebehodnocení hráče je jiná věc — to podepisuje hráč sám tím,
že přišel svým odkazem.

**U každého čísla stojí jméno úrovně** — na obrazovce i na listu: *4/10 buduje se*,
*7/10 spolehlivé*, *10/10 nadstandard*. Samotná sedmička nikomu nic neříká, dokud si
nedohledá pásmo v legendě, a rodič, který list vidí jednou za půl roku, ho nedohledá.
Pásma zůstávají v legendě pod grafem, jméno je jen zkratka k nim.

**Šestice os** se vybírá nahoře ve formuláři, ale **jen z těch, které má hráč v Lidech
zaškrtnuté** — cizí šablona v nabídce vůbec není a při jediné přiřazené je výběr zamčený.
Předvolená je první zaškrtnutá a pod výběrem je vypsané, co všechno má přiřazeno. Kdo chytá, hraje v poli
i vede mužstvo, se vyplňuje tolikrát, kolik má šablon — po uložení nabídne aplikace rovnou
*Ohodnotit: brankář* a další. Dostane pak list na každou z nich a každá řada v čase žije
samostatně; do jednoho grafu se sloučit nedají, protože jiná sada os má jiný tvar.

**Tři slovní bloky** jsou zbylé tři rohy modelu a číslo v nich schválně není. Co do kterého
patří, je napsané i pod každým políčkem ve formuláři — bez toho si je tři trenéři vyloží
po svém a na listech pak stojí tři různé věci:

- **Fyzicky** — kondice, rychlost, síla, růst, zdraví. („Vydrží celý zápas, v soubojích ho
  zatím přetlačí.") Číslo tu není proto, že by u téhle kategorie měřilo biologický věk.
- **Hlavou** — soustředění, reakce na chybu a na tlak, sebedůvěra, snaha na tréninku.
  („Po vlastní chybě se dlouho hledá, na konci zápasu už zase hraje.")
- **V partě** — spoluhráči, trenér, rozhodčí; jestli ostatní táhne, nebo se veze.
  („Mladší si k němu chodí pro radu.")

**Odkud to je.** Rozdělení na graf a tři slovní bloky stojí na dvou školách a odkaz na obě
je i v aplikaci pod bloky:

- **anglická** — [FA Four Corner Model](https://learn.englandfootball.com/articles-and-resources/coaching/resources/2022/the-fa-4-corner-model)
  anglické fotbalové asociace: čtyři rovnocenné rohy (technicko-taktický, fyzický,
  psychologický, sociální), žádný nefunguje sám o sobě. Technicko-taktický roh je tady
  radar s čísly, zbylé tři jsou ty slovní bloky.
- **španělská** — strukturovaný trénink [Paca Seirul·la](https://barcainnovationhub.fcbarcelona.com/es/blog/la-propuesta-de-paco-seirul%C2%B7lo-para-el-entrenamiento-en-deportes-de-equipo-el-entrenamiento-estructurado-los-espacios-de-juego-y-las-situaciones-simuladoras-preferenciales/)
  z FC Barcelona ([anglicky](https://barcainnovationhub.fcbarcelona.com/blog/paco-seirul%C2%B7los-proposal-for-team-sports-training-structured-training-game-spaces-and-preferential-simulation-situations/)):
  hráč jako osm propojených struktur — kondiční, koordinační, kognitivní, socio-afektivní,
  emotivně-volní, kreativně-expresivní, mentální a bioenergetická.

Kdo radši poslouchá: anglický model má video na stránce
[The Boot Room](https://www.thefa.com/bootroom/resources/coaching/the-fas-4-corner-model) (FA),
španělský ve videu [Paco Seirulo — El padre del Microciclo Estructurado](https://www.youtube.com/watch?v=YQLnAQF_H2U).
Videa jsou na cizích stránkách a můžou zmizet; články výš jsou to trvalejší.

Pro naše tři bloky to vychází zhruba takhle: *Fyzicky* = kondiční a bioenergetická,
*Hlavou* = kognitivní a emotivně-volní, *V partě* = socio-afektivní a kreativně-expresivní.
Obě školy říkají totéž: hráč není jen to, co jde změřit, a co změřit nejde, se popisuje
větou, ne známkou.

**Slovní bloky a cíle patří k té šabloně**, ne k člověku — „výkopy od brány" na leader list
nepatří. Přepnutím šablony se proto vyprázdní; když v nich něco máš, aplikace se napřed
zeptá, ať o rozepsaný text nepřijdeš.

Pozor při rozesílání odkazů: **odkaz na sebehodnocení nese tu šablonu**, kterou jsi hráče
známkoval. Když ho oznámkuješ jinou šesticí až po odeslání odkazu, vygeneruj mu nový —
jinak vyplní jiné osy a porovnat to nepůjde (aplikace to pozná a řekne).

**Šablona `leader`** je třetí sada os — vůdcovství: vedení na hřišti, příklad v tréninku,
reakce na chybu a tlak, fair play, podpora spoluhráčů, spolehlivost. Je to **druhý list
vedle herního**, stejně jako u brankáře; sedmá osa u všech by změnila tvar radaru a nešlo
by porovnat se staršími hodnoceními. Osy popisují chování, které je vidět, ne povahu.

**Cíle:** dva až tři, konkrétní a ověřitelné. Ne „zlepšit levou nohu", ale „levá noha: každý
trénink 5 minut navíc, přihrávka do 10 metrů". Hráč musí poznat, jestli to splnil.

Uložením vzniká nový záznam. Starší hodnocení se nikdy nepřepisuje.

**Když se překlepneš**, nemusíš vyplňovat všechno znovu. Hodnocení se dá načíst, opravit
a uložit — vznikne **nová verze**, ta původní zůstane v historii. Vede tam dvojí cesta:

- v **Hodnotit** se nad formulářem ukáže, že v tomhle období od tebe hodnocení už je
  (jen datum a šablona, **žádná čísla**), s tlačítkem *Upravit ho*;
- v **Porovnání → Historie hodnocení** je *Upravit* u konkrétní verze — takhle jde opravit
  i hodnocení ze staršího období.

Nabízejí se jen **tvoje** hodnocení; sebehodnocení hráče takhle upravit nejde. Známkuje se
dál naslepo — dokud si úpravu sám nevyžádáš, formulář žádná dřívější čísla neukáže.

#### Hodnotit víc hráčů najednou

Když má víc hráčů stejnou úroveň v jedné disciplíně, nemusíš proklikat každého zvlášť.
Dole v Hodnotit je **Hodnotit víc hráčů najednou**: vyplníš jen osy, na kterých se shodují,
zaškrtneš hráče a aplikace napřed spočítá, koho se to týká — **zapisuje až po potvrzení**.

Vyplněné osy se **doplní k poslednímu hodnocení** hráče v tomhle období a šabloně, ostatní
osy zůstanou a vznikne nový záznam. Kdo od tebe v období hodnocení ještě nemá, se nezaloží
(nebylo by co doplnit) a vypíše se jmenovitě. Základ se bere jen z **tvých** hodnocení, aby
se tiše nesmíchaly dva pohledy — od toho je Shoda.

### Listy

Tiskové listy A4. Vybereš období, co má být druhý polygon v grafu, a koho tisknout.

**Období je nabídka z uložených hodnocení, ne volné pole.** Je v ní každé období, ve kterém
nějaké hodnocení leží, plus to z Nastavení (do toho se právě hodnotí, i když v něm zatím
nic není) — u každého stojí, kolik listů z něj vyjde. Volným polem se dalo napsat období,
které v databázi není, a tisk se nedal poznat od chyby: prošel a vyjely samé prázdné papíry.

Poslední volba je **„všechna období — celá historie"**: hráč dostane papír za každé období,
ve kterém hodnocení má. Tabulka *Kdo se vytiskne* pak platí napříč obdobími, takže ✓ v ní
znamená „aspoň v jednom", ne „letos". Vývoj v grafu se u každého listu dívá jen dozadu —
u podzimu se srovnává s tím, co bylo před ním, ne s následujícím jarem.

Druhý polygon:

- **trenér minule** — vývoj proti předchozímu období
- **sebehodnocení hráče** — pro rozhovor; tohle je ta zajímavá varianta
- **žádný** — jen aktuální hodnocení

Hráč, který má víc šablon, dostane **list na každou z nich**. V tabulce *Kdo se vytiskne*
je proto řádek na každou šablonu a je vidět, která ještě hodnocení nemá — prázdná se
vytiskne jako podklad, ať nezmizí z dohledu.

**Zaškrtává se po listech, ne po hráčích.** Ferda má tři šablony a má tedy tři řádky, každý
s vlastním zaškrtávátkem: když chceš jen jeho brankářský list, zbylé dva odškrtneš. Zaškrtávátko
v záhlaví označí a odznačí všechno.

**Kumulovaný list** (zaškrtávátko nahoře) to složí na **jednu stránku**: radary za všechny
šablony vedle sebe, každý podepsaný, slovní bloky a cíle poskládané ze všech (u každého
kusu je napsáno, ze které šablony je). Bez zaškrtnutí má každá šablona vlastní stránku.

**Sebehodnocení hráče v čase** (nabídka *Co tisknout*) je jiný papír: řada vyplnění od hráče,
jak šla po sobě. V grafu je **první a poslední** vyplnění, pod ním tabulka osa × datum se
všemi a pod ní poznámky, co si hráč u kterého vyplnění napsal. Známky trenéra na něm nejsou —
ukazuje jeden pohled v čase, ne dva proti sobě. Šipky ani věty o zlepšení tam schválně nejsou;
čísla s datem mluví sama a papír nad hráčem nemá vynášet soud. Řadu přes víc sezón dostaneš
volbou *Období* → „všechna".

**Vysvětlivky os** (druhé zaškrtávátko) přidají na konec **jednu stránku navíc**: co která
osa měří a jak vypadá zvládnutá — větou z pohledu hráče, tou samou, kterou vidí ve svém
sebehodnocení. Na list hráče se to nevejde a nemá: *jeden hráč = jedna A4* je pravidlo.
Stránka je společná pro celou hromádku, takže se tiskne jednou, ne ke každému.

#### Barva podle šablony

Každá šablona má svou barvu, aby se v hromádce vytištěných listů poznalo na první pohled,
co je co:

| Šablona | Barva | |
|---|---|---|
| hráč v poli | modrá | `#2196F3` |
| brankář | petrolejová | `#00838F` |
| leader | vínová | `#AD1457` |

Barvu nese hlavička, pruh se jménem hráče, radar i vzorek v legendě. **V hlavičce navíc
stojí název šablony** — barva je jen druhý signál. Na černobílé tiskárně, při tisku bez
grafiky na pozadí i barvoslepému čtenáři musí list dál dávat smysl, proto je název vždycky
vidět. Kumulovaný list patří všem šablonám najednou, takže má hlavičku šedou a barvy nesou
jednotlivé radary; v hlavičce jsou značky všech šablon, které jsou na stránce.

Stejné barvy jsou i v aplikaci (štítky v Lidech, Hodnotit, Odkazech a Porovnání) a na
stránce sebehodnocení, kterou vyplňuje hráč. Tmavý vzhled aplikace má vlastní, světlejší
odstíny — na tmavém pozadí by papírové nebyly čitelné. Papír zůstává papírem.

Listy se otevřou v nové záložce, odtud jdou na tiskárnu. **V dialogu tisku zapni „Grafika na
pozadí" / „Background graphics"** — jinak se vytiskne bílý list bez modrého pruhu se jménem
a bez barevných bloků. Okraje nech na „Výchozí", stránka si je řídí sama (A4, 12 mm).

Kontrola před tiskem: počet stránek v náhledu musí odpovídat počtu hráčů. Když je vyšší,
někomu se text přelil — zkrať slovní blok.

### Porovnání

Vybereš hráče a uvidíš tabulku: tvoje známka, jeho známka, rozdíl a jestli se osa má řešit.

- **+** hráč si dal víc než ty = slepé místo, chybí mu zpětná vazba
- **−** hráč si dal míň než ty = sebedůvěra, může jít o něco mimo fotbal

Řeší se jen osy, kde je rozdíl **větší než tolerance** (výchozí 2, mění se v Nastavení).
Když se rozejde víc než tři osy, aplikace to napíše a doporučí vybrat 2–3 témata. Víc se
do jednoho rozhovoru stejně nevejde.

Pod tabulkou je vývoj v čase se šipkami. **Tenhle pohled je jen pro tebe** — na papír, který
si hráč nese domů, se nedostane.

#### Porovnat hráče mezi sebou

Druhá karta v Porovnání. Vybereš šablonu, zaškrtneš dva a víc hráčů (dva brankáře, dva
stopery) a dostaneš tabulku **osa × hráč**: vyšší známka tučně, sloupec *Rozdíl* říká, o kolik
se nejlepší a nejhorší liší, a osy s rozdílem 3 a víc se zvýrazní — tam se ti hráči opravdu
liší, jinde jsou na tom stejně. Poslední řádek je průměr, orientační souhrn, ne známka na
vysvědčení.

Srovnávají se **jen hodnocení od trenérů** a vždy v rámci jedné šablony; sebehodnocení hráče
je jiná optika. Kdo tou šablonou v období hodnocení nemá, vypíše se pod tabulkou.

### Porovnat cokoliv s čímkoliv

Třetí karta v Porovnání. Vybereš **dva až osm záznamů** a postaví se vedle sebe, osa po ose.
Záznam je **hráč + období + kdo hodnotil**, takže tady jde srovnat i to, co jinde nejde:

- dvě období téhož hráče (podzim proti jaru)
- sebehodnocení proti hodnocení trenéra
- dva trenéry mezi sebou
- hráče z různých období, nebo klidně všechno dohromady

Nabízejí se **jen záznamy, které opravdu existují** — vybírat jde z toho, co je v databázi,
ne z prázdných kolonek.

**Šablona je hranice, přes kterou to nejde.** Brankářská a polní šestice nemají jedinou
společnou osu, takže „Chytání 8" proti „Levá noha 3" by nebylo porovnání. Šablona se vybírá
nahoře a nabídka se jí řídí.

**Sloupce se řadí samy**, ne podle toho, v jakém pořadí jsi klikal: období chronologicky
a uvnitř období jde trenér před hráče. U dvou sloupců je pak sloupec *rozdíl* druhý mínus
první, takže **+ znamená u dvou období zlepšení** a u trenéra proti sebehodnocení to, že si
hráč dal víc než trenér — stejné čtení jako v horní kartě. U tří a víc sloupců se znaménko
neukazuje (nebylo by proti čemu) a místo něj je rozptyl.

### Odkazy

Odkazy na sebehodnocení na dané období. U každého tlačítko *Kopírovat* a *Zneplatnit*, plus
stav (čeká / vyplněno).

**Odkaz nese jednu šestici os**, takže hráč s víc šablonami dostane odkaz na každou z nich —
brankářský i polní i leader. Ve sloupci *Šablona* je vidět, který je který. Nevyplněný odkaz
na tutéž šablonu se podruhé nezakládá; kolik jich aplikace přeskočila, řekne po generování.

**Komu vygenerovat** je tabulka nad tlačítkem a **zaškrtává se po odkazech, ne po hráčích**:
kdo má tři šablony, má tři řádky a můžeš mu nechat vygenerovat jen jeden. Ve výchozím stavu
je zaškrtnuté všechno, zaškrtávátko v záhlaví označí a odznačí celý sloupec. U kombinace,
na kterou už nevyplněný odkaz visí, je to napsané — vygenerovat se znovu nedá, jen by
zmátlo, který z nich platí.

**Aplikace odkaz neposílá.** Zkopíruješ ho a rozešleš sám, jak jsi zvyklý. Notifikační
kanály má nastavené jen na trenéry a nesou pouze „kdo a co", nikdy obsah. Posílej odkaz
konkrétnímu hráči, ne do týmové skupiny: kdo odkaz má, může sebehodnocení vyplnit za něj.

**Odkaz se dá vyplnit opakovaně.** Každé odeslání se uloží zvlášť a nic staršího nepřepíše —
teprve z několika vyplnění je vidět, jak se to za pár měsíců pohnulo. Ve výpisu je u každého
odkazu vidět, kolikrát byl vyplněný a kdy naposledy. Hráč přitom svá dřívější čísla nevidí
ani při druhém vyplňování; ví jen, kolikáté to bude.

Posílej odkaz **konkrétnímu hráči**, ne do týmové skupiny: kdo odkaz má, může sebehodnocení
vyplnit za něj. Když má někdo přestat vyplňovat, odkaz *Zneplatni* nebo nech vypršet platnost.

Když hráč odkaz ztratí, starý zneplatni a vygeneruj nový.

### Nastavení

- **Tolerance** — o kolik se smí lišit tvoje známka a hráčova, aniž by se osa řešila
- **Období** — například „2025/2026 zima". Podle něj se páruje tvoje hodnocení
  se sebehodnocením hráče. Před novým kolem ho přepiš. Pole zůstává volné (nové kolo
  žádná nabídka dopředu nezná), ale **napovídá období, která už v datech jsou** — vyber
  z nabídky, když píšeš to stávající. „Zima" místo „zima" totiž není překlep, který by
  aplikace poznala: je to nové, prázdné období, do kterého se nespáruje ani jedno
  starší hodnocení.
- **Sezóna, klub, kategorie, laťka, nadpis nad cíli** — text do hlavičky a patičky listu
- **Preferované sestavy** — rozestavení, která tým hraje, oddělená čárkou („1-4-4-2,
  1-4-3-3"). Známkování to nemění, osy jsou pro každou sestavu stejné. Je to společná
  paměť trenérů a **kontext pro analýzy**: „pravý bek v 1-4-4-2" znamená něco jiného
  než v 1-3-5-2, a bez toho si to model domýšlí
- **Změna hesla** — svého vlastního
- **Souhrnné notifikace** — viz níž
- **Povolit odesílání SMS** — mimořádný kanál, výchozí vypnuto (viz níž)
- **Jazykový model** — kdo obsluhuje příkazový řádek, viz níž

### Jazykový model

Příkazový řádek si s běžnými povely poradí sám a **nic nestojí**. Model se ptá teprve na
větu, které aplikace nerozumí. V Nastavení se vybírá kdo:

- **Vypnuto** (výchozí) — model se nevolá vůbec
- **Cloudflare Workers AI** — zdarma, denní limit
- **Claude** — placený, potřebuje klíč v secretu `ANTHROPIC_API_KEY`

Tlačítko *Vyzkoušet spojení* pošle jednu holou větu **bez jediného údaje o hráčích** a
řekne, jestli model odpověděl a jak dlouho to trvalo.

Modelu jde jen napsaná věta a jména kádru — **ne známky a ne slovní posudky** — a sám nic
neprovede: vrátí návrh akce, kterou spustí aplikace. Každé volání je v logu komunikace.

**Když u Claude dojde kredit** nebo se vyčerpá limit, povel dokončí model zdarma a důvod se
napíše. Aplikace kvůli fakturaci nepřestane fungovat.

### 📖 Dokumentace

Poslední záložka. Je v ní tenhle popis v kostce přímo v aplikaci — jak se hodnotí, co znamená
tolerance a znaménko, jak funguje sebehodnocení, kanály, hesla i export a import. Přepíná se
s jazykem aplikace, takže je i anglicky.

### Notifikace

Aplikace umí poslat souhrn na **Telegram** nebo **e-mail**. Zapíná se u konkrétního trenéra
v Lidech, ne globálně — kdo nic nezapne, nedostane nic.

Nastavují se dva **nezávislé** intervaly:

- **Když se něco děje** — souhrn nejvýš jednou za N dní (výchozí 3). Změny se nasčítají do
  jedné zprávy. Ne zpráva za každé odeslané sebehodnocení; při 19 hráčích by to byl spam.
- **Když se nic neděje** — po N dnech (výchozí 14) přijde zpráva *„nic se nezměnilo"*.
  Vypadá to zbytečně, ale není: bez ní nepoznáš rozdíl mezi „nikdo nic nedělá" a „aplikace
  je rozbitá". Zpráva to říká výslovně.

Do zprávy **nikdy nejde obsah hodnocení** — jen kdo a co, plus stav období. Známky ani slovní
bloky do Telegramu a e-mailu nepatří. Detail se otevře v aplikaci.

Tlačítko *Poslat souhrn teď* odešle souhrn okamžitě, bez ohledu na nastavený čas.

**Telegram:** trenér musí botovi (`@skricmanice_bot`) jednou napsat — Telegram nedovolí, aby
bot oslovil člověka první. Pak v Lidech klikneš na *Dotáhnout chat id z Telegramu* a vybereš ho.

**E-mail:** adresa musí být předem ověřená v Cloudflare, jinak odeslání selže. Řekni si.

**SMS je mimořádný nástroj.** Stojí peníze a ruší, proto je v Nastavení přepínač
*Povolit odesílání SMS* a **ve výchozím stavu je vypnutý**. Dokud ho nezapneš, neodejde
žádná SMS ani člověku, který ji má zapnutou u sebe — pokus se zapíše do logu jako
přeskočený, i s důvodem. Příjemce uvidí jako odesílatele jméno brány (GoSMS), ne klub,
takže značka klubu patří do textu zprávy.

Tlačítko *SMS nanečisto* v Lidech ověří spojení s bránou, kanál i tvar čísla, ale **nic
neodešle a nic nestojí**. Funguje i při vypnutém kanálu.

**Hlavička SMS.** Protože odesílatele určuje brána, je hlavička jediné místo, podle
kterého příjemce pozná, kdo mu píše. Nastavuje se v Nastavení a přilepí se stejně na
všechny zprávy; prázdné pole znamená název klubu. Náhled pod polem ukáže zprávu tak, jak
dojde, a spočítá segmenty. **Pozor na dlouhou pomlčku, české uvozovky a výpustku** —
odstranění diakritiky je nechytí, ale v abecedě SMS nejsou, takže zdvojnásobí cenu
zprávy. Náhled na to upozorní.

**Zkouška na libovolné číslo** je v Nastavení a nemusí být v kartotéce — ověřuje se
brána, ne hráč. Vedle sebe jsou zkouška nanečisto (zdarma) a ostrá SMS, která se ptá,
protože strhne kredit.

### Odeslaná komunikace

V Nastavení je posledních sto pokusů o odeslání: kdy, kanál, **platforma** (GoSMS,
Telegram, Cloudflare), komu, typ a výsledek. U neúspěchu je vidět i důvod, který vrátil
poskytovatel — proto se „nic mi nepřišlo" dá dohledat. Ukládají se údaje o odeslání, ne
obsah zpráv; odkazy s tokeny se nelogují nikdy.

Karta je **sbalená** a rozbalí se kliknutím, aby stránka Nastavení nerostla podle toho,
kolik toho aplikace rozeslala — na telefonu by se pod ni jinak nedalo dorolovat.
**Hledání** filtruje průběžně (najde i „chyba" nebo „přeskočeno") a **Export do CSV**
stáhne celý log z databáze, ne jen zobrazenou stovku.

---

## 5. Půlroční rutina

1. V Nastavení přepiš **období** a nadpis nad cíli.
2. V Odkazech vygeneruj odkazy a rozešli je hráčům.
3. Odhodnoť kádr v záložce Hodnotit — naslepo.
4. Až budou obě strany, projdi Porovnání a vyber si u každého 2–3 témata.
5. V Listech vytiskni (druhý polygon = sebehodnocení hráče).
6. Rozdej listy jednotlivě a projděte si je.

---

## 6. Rozhovor s hráčem

List se nepředává v šatně mezi ostatními. Papír s posudkem je hráčova věc.

Na papíře schválně **nejsou šipky trendu ani věty typu „zhoršil ses"**. Vývoj v čase je pohled
pro trenéra, ne pro čtrnáctiletého, který si list nese domů. Když šlo něco dolů, řekni to ústně
a s důvodem.

Graf se **neporovnává mezi hráči**. Levák a pravák mají zub na opačné straně, tvary si nejsou
podobné a nic to neznamená. Je to napsané i v patičce listu.
