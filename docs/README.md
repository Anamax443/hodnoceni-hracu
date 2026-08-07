# Uživatelská příručka — pro trenéra

Jak aplikaci používat. Programátorská část je v [TECHNICAL.md](TECHNICAL.md).

---

## 1. K čemu to je

Hráč dostane jednu stránku A4: graf šesti dovedností, tři slovní bloky (Fyzicky / Hlavou /
V partě) a dva až tři cíle na další půlrok. Nic víc se na papír nevejde a nic víc tam ani
nepatří.

Navíc si hráč sám vyplní stejných šest os přes soukromý odkaz. Tam, kde se váš pohled rozchází
víc, než je nastavená tolerance, aplikace osu označí — a to jsou témata k rozhovoru. Tohle je
na celém nástroji to nejcennější.

Hodnotí se proti **absolutní laťce kategorie** — „co má umět starší žák" — ne proti kádru.
Dva hráči vedle sebe můžou mít oba sedmičku a být jinak dobří. To je v pořádku.

---

## 2. Tři pravidla, na kterých to stojí

1. **Známkuje se naslepo.** Aplikace schválně neukazuje loňské hodnoty ani hodnocení hráče,
   dokud neuložíš svoje. Viditelné loňské číslo přitáhne nové k sobě a datová řada přestane
   cokoliv říkat.
2. **Kondice a rychlost se neznámkují.** U téhle věkové kategorie měří biologický věk, ne
   odvedenou práci. Patří do slovního bloku *Fyzicky*.
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

> Přechodně funguje i staré společné heslo — přihlašovací jméno necháš prázdné. Zůstalo tam,
> aby se nedal vyzamknout celý tým, než budou mít všichni svoje. Až to nastane, dá se zrušit.

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

### Lidé

Kdo je v týmu. U každého jméno, přezdívka, pozice, role a výchozí šablona os.

**Pozic může být několik.** Hráč použitelný na levém beku, pravém křídle i v bráně má
zaškrtnuté všechny tři. Je to popis toho, kde nastupuje — se známkováním to nesouvisí.

**Funkce / poznámka** je volný text vedle pozic, třeba „Kapitán". Tiskne se na list.

**Šablona os** je jen výchozí volba do formuláře. Kterou šesticí os hráče oznámkuješ,
vybíráš až u konkrétního hodnocení.

- **role hráč** — hodnotí se, tiskne se mu list
- **role trenér** — nehodnotí se; je v seznamu proto, aby šlo u hodnocení vybrat, kdo ho pořídil
- **šablona** — `pole` pro hráče v poli, `brankar` pro brankáře (jiných šest os)
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

### Hodnotit

Vybereš hráče, dole se objeví formulář: šest os po deseti známkách, tři slovní bloky a cíle.

Nic není předvyplněné a předchozí hodnoty se nezobrazují — to je záměr, ne opomenutí.

**Šestice os** se vybírá nahoře ve formuláři. Kdo chytá i hraje v poli, může mít v jednom
období obojí — vyplníš ho dvakrát, jednou brankářskou a jednou polní šablonou. Dostane pak
dva listy a každá řada v čase žije samostatně; brankářské a polní osy se do jednoho grafu
míchat nedají. Přepnutí šablony ti nesmaže slovní bloky ani cíle, jen vymění osy.

Pozor při rozesílání odkazů: **odkaz na sebehodnocení nese tu šablonu**, kterou jsi hráče
známkoval. Když ho oznámkuješ jinou šesticí až po odeslání odkazu, vygeneruj mu nový —
jinak vyplní jiné osy a porovnat to nepůjde (aplikace to pozná a řekne).

**Cíle:** dva až tři, konkrétní a ověřitelné. Ne „zlepšit levou nohu", ale „levá noha: každý
trénink 5 minut navíc, přihrávka do 10 metrů". Hráč musí poznat, jestli to splnil.

Uložením vzniká nový záznam. Starší hodnocení se nikdy nepřepisuje, takže když se překlepneš,
prostě ulož znovu — platí to poslední.

### Listy

Tiskové listy A4. Vybereš období, co má být druhý polygon v grafu, a koho tisknout.

Druhý polygon:

- **trenér minule** — vývoj proti předchozímu období
- **sebehodnocení hráče** — pro rozhovor; tohle je ta zajímavá varianta
- **žádný** — jen aktuální hodnocení

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

### Odkazy

Vygenerují se odkazy na sebehodnocení pro všechny aktivní hráče na dané období. U každého
tlačítko *Kopírovat* a *Zneplatnit*, plus stav (čeká / vyplněno).

Odkaz je jednorázový — po odeslání už podruhé nejde. Posílej ho **konkrétnímu hráči**, ne do
týmové skupiny: kdo odkaz má, může sebehodnocení vyplnit za něj.

Když hráč odkaz ztratí, starý zneplatni a vygeneruj nový.

### Nastavení

- **Tolerance** — o kolik se smí lišit tvoje známka a hráčova, aniž by se osa řešila
- **Období** — například „2025/2026 zima". Podle něj se páruje tvoje hodnocení
  se sebehodnocením hráče. Před novým kolem ho přepiš.
- **Sezóna, klub, kategorie, laťka, nadpis nad cíli** — text do hlavičky a patičky listu
- **Změna hesla** — svého vlastního
- **Souhrnné notifikace** — viz níž
- **Povolit odesílání SMS** — mimořádný kanál, výchozí vypnuto (viz níž)

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

### Odeslaná komunikace

V Nastavení je posledních sto pokusů o odeslání: kdy, kanál, **platforma** (GoSMS,
Telegram, Cloudflare), komu, typ a výsledek. U neúspěchu je vidět i důvod, který vrátil
poskytovatel — proto se „nic mi nepřišlo" dá dohledat. Ukládají se údaje o odeslání, ne
obsah zpráv; odkazy s tokeny se nelogují nikdy.

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
