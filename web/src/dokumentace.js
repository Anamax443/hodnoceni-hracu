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
<p>Kartotéka kádru. <b>Kliknutím na jméno se otevře úprava</b> toho člověka; tlačítko
<i>Upravit</i> na konci řádku dělá totéž. U každého člověka se vede:</p>
<ul>
  <li><b>Jméno a přezdívka</b> — přezdívka se ukazuje všude, kde se jméno
      vypisuje. Hodí se, když jsou v kádru tři stejná příjmení.</li>
  <li><b>Role</b> — hráč, nebo trenér. Trenér se přihlašuje, hráč ne.</li>
  <li><b>Pozice</b> — může jich být víc (brankář i střední záložník).
      Tisknou se na list.</li>
  <li><b>Funkce</b> — volný text, třeba „Kapitán“.</li>
  <li><b>Šablony</b> — sady os, kterými se hráč známkuje. Zaškrtnout jich jde
      víc: Ferda chytá, hraje v poli i vede mužstvo, takže má brankáře, hráče
      v poli i leadera. <b>Každá šablona je vlastní řada, vlastní odkaz na
      sebehodnocení a vlastní list</b> — do jednoho grafu se sloučit nedají,
      protože jiných šest os má jiný tvar a nešlo by porovnávat v čase.
      Vytisknout je vedle sebe na jednu stránku ale jde (Listy → kumulovaný
      list). První zaškrtnutá je výchozí ve formuláři hodnocení.</li>
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

<p><b>Slovní bloky a cíle patří k šabloně</b>, ne k člověku. Brankářský list má „výkopy
od brány", leader list něco úplně jiného — proto se při přepnutí šablony ve formuláři
vyprázdní a píšou se ke každé řadě zvlášť (aplikace se předtím zeptá, ať se nezahodí
rozepsaný text). Na kumulovaném listu se pak složí a je u nich uvedeno, ze které
šablony jsou; když je věta u dvou šablon stejná, napíše se jednou.</p>

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
<p><b>Vybírá se po odkazech, ne po hráčích.</b> V tabulce <i>Komu vygenerovat</i>
má každá kombinace hráč + šablona vlastní zaškrtávátko, takže jde vygenerovat
jen brankářský odkaz, i když má hráč šablony tři. Ve výchozím stavu je
zaškrtnuté všechno. U kombinace, na kterou už nevyplněný odkaz visí, je to
napsané a znovu se nevygeneruje — dva platné odkazy na tutéž řadu by jen
zmátly, který z nich platí.</p>
<p><b>Aplikace odkaz neposílá</b> — zkopíruješ ho a pošleš sám. Notifikační
kanály jsou nastavené jen na trenéry a nesou pouze „kdo a co”, nikdy obsah.
Posílej ho konkrétnímu hráči, ne do týmové skupiny: kdo odkaz má, může
sebehodnocení vyplnit za něj.</p>
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
<h2>Porovnat cokoliv s čímkoliv</h2>
<p>Třetí karta v Porovnání. Vybereš <b>dva až osm záznamů</b> a postaví se vedle
sebe, osa po ose. Záznam je <b>hráč + období + kdo hodnotil</b>, takže tady jde
srovnat i to, co jinde nejde: dvě období téhož hráče, sebehodnocení proti
trenérovi, dva trenéry mezi sebou, nebo hráče z různých období. Nabízejí se jen
záznamy, které opravdu existují.</p>
<p><b>Šablona je hranice, přes kterou to nejde</b> — brankářská a polní šestice
nemají jedinou společnou osu.</p>
<p><b>Sloupce se řadí samy</b>, ne podle pořadí klikání: období chronologicky
a uvnitř období jde trenér před hráče. U dvou sloupců je <i>rozdíl</i> druhý
mínus první, takže <b>+</b> znamená u dvou období zlepšení a u trenéra proti
sebehodnocení to, že si hráč dal víc. U tří a víc sloupců se místo znaménka
ukazuje rozptyl.</p>

<h2>Srovnání hráčů mezi sebou</h2>
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
<p><b>Hráč s víc šablonami dostane list na každou z nich</b> — brankářský,
polní i leader zvlášť. V tabulce <i>Kdo se vytiskne</i> je proto řádek na
každou šablonu a je v něm vidět, která ještě hodnocení nemá; prázdná se
vytiskne jako podklad, aby nezmizela z dohledu.</p>
<p><b>Zaškrtává se po listech, ne po hráčích.</b> Ferda má tři šablony, takže
má tři řádky a každý vlastní zaškrtávátko — když chceš jen jeho brankářský
list, zbylé dva odškrtneš. Zaškrtávátko v záhlaví označí a odznačí všechno.</p>
<p>Přepínač <b>Kumulovaný list</b> to složí na <b>jednu stránku</b>: radary
vedle sebe, každý podepsaný svou šablonou, slovní bloky a cíle poskládané ze
všech šablon (a je u nich napsáno, ze které jsou). Radary zůstávají oddělené
i tady — sloučit dvanáct os do jednoho obrazce by nedávalo smysl.</p>
<p><b>Každá šablona má svou barvu</b>, ať se na hromádce vytištěných listů
pozná na první pohled, co je co: <b>hráč v poli modrá</b>, <b>brankář
petrolejová</b>, <b>leader vínová</b>. Barvu nese hlavička, jméno hráče, radar
i vzorek v legendě; v hlavičce navíc stojí <b>název šablony</b>. Stejné barvy
jsou i v aplikaci u štítků v tabulkách a na stránce sebehodnocení, kterou
vyplňuje hráč. Na barvu samotnou se nespoléhej — název je vedle ní vždycky,
takže list dává smysl i vytištěný černobíle. Kumulovaný list patří všem třem
šablonám najednou, proto má hlavičku šedou a barvy nesou jednotlivé radary.</p>

<h2>Analýzy</h2>
<p>Souhrny za celý kádr: <b>kde je mužstvo nejslabší</b> (průměr osy přes všechny hodnocené,
od nejnižší) a <b>kde se nejvíc rozchází pohled trenéra a hráče</b>. Počítá to aplikace,
takže je to přesné, okamžité a nic to nikam neposílá. Průměr osy se počítá vždy v rámci
jedné šablony — brankářské a polní osy se míchat nedají.</p>
<p><b>Ptát se jde odkudkoli — jedním polem, příkazovým řádkem nahoře.</b> Je nad každou
záložkou, takže se nemusíš nikam přepínat: napiš otázku běžnou větou („kolik máme hráčů",
„u koho je největší rozpor") a odpověď přijde rovnou tam. Tlačítko <i>Ukázat čísla</i>
pod odpovědí otevře tabulky, ze kterých vznikla.</p>
<p>Týž řádek dál plní povely — „Robin", „porovnej Robina a Ferdu", „listy". Otázku od
povelu pozná podle tázacího slova nebo otazníku. Model dostane tatáž spočítaná čísla
a jeho prací je formulace, ne výpočet — v pokynu má zákaz cokoli dopočítávat. Přesto platí:
<b>ověř si čísla v tabulkách</b>. Model umí být sebejistý i když se mýlí.</p>
<p><b>Otázky modelu jsou ve výchozím stavu vypnuté</b> a zapínají se v Nastavení zvlášť od
příkazového řádku. Důvod: příkazovému řádku stačí jména kádru, ale analýze ne — modelu
odejdou známky, slovní posudky i cíle konkrétních hráčů. Je to jediné místo v aplikaci,
odkud údaje o hráčích odcházejí ven. Souhrny se počítají dál i s vypnutým modelem.</p>

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

<h3>Hlavička SMS</h3>
<p>Protože odesílatele určuje brána, je <b>hlavička jediné místo, podle kterého
příjemce pozná, kdo mu píše</b>. Nastavuje se v Nastavení a přilepí se stejně
na všechny zprávy — souhrn, obnovu hesla i zkoušku. Prázdné pole znamená název
klubu, takže přejmenování klubu nenechá v SMS starý text.</p>
<p>Pod polem běží <b>živý náhled</b>: ukáže zprávu tak, jak dojde, spočítá znaky
a segmenty. Diakritika se ubírá automaticky (<i>ŘÍČMANICE</i> dojde jako
<i>RICMANICE</i>), protože háčky zkrátí segment ze 160 znaků na 70.</p>
<p><b>Pozor na hezké znaky.</b> Dlouhá pomlčka, české uvozovky nebo výpustka
odstranění diakritiky přežijí, ale v abecedě SMS nejsou — přepnou celou zprávu
do režimu, kde se do segmentu vejde jen 70 znaků, takže <b>stojí dvojnásobek</b>.
Náhled takový znak pojmenuje a poradí, čím ho nahradit.</p>

<h3>Zkouška odeslání</h3>
<p>V Nastavení je pole na <b>libovolné číslo</b> — nemusí být v kartotéce, takže
se kvůli ověření brány nezakládá falešná osoba. Vedle sebe jsou dvě tlačítka:
zkouška <b>nanečisto</b> (zdarma, nic neodejde) a <b>ostrá SMS</b>, která se
před odesláním zeptá, protože strhne kredit. Pokud je vypínač zaškrtnutý, ale
ještě neuložený, aplikace to řekne dřív, než se pokus zahodí jako vypnutý.</p>

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
<p>Log je <b>sbalený</b> a rozbalí se kliknutím. Zavřený zabírá jeden řádek,
takže délka stránky Nastavení nezávisí na tom, kolik toho aplikace rozeslala —
na telefonu by se jinak pod něj nedalo dorolovat. Otevřený se posouvá sám
v sobě.</p>
<p><b>Hledání</b> filtruje průběžně a prohledává i to, co je vidět v tabulce:
najde tedy „chyba“ i „přeskočeno“, ne jen jméno nebo číslo. <b>Export do CSV</b>
stáhne <b>celý log z databáze</b>, ne jen těch sto řádků — starší odeslání se
jinak dohledat nedá. Soubor otevře Excel rovnou správně, čas je v UTC.</p>
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

<h2>Stav projektu — 9. 8. 2026</h2>
<p>Snímek k datu. Přesná čísla jsou vždycky v aplikaci, tohle je orientace
v tom, co je hotové a co ne.</p>

<h3>Co běží</h3>
<p>Hotová je celá <b>trenérská strana</b>: kartotéka a víc šablon u jednoho
hráče, hodnocení včetně hromadného a oprav do nových verzí, porovnání trenér ×
hráč i hráčů mezi sebou, shoda mezi trenéry, tiskové listy A4 i kumulovaný list,
účty s PINem a zámkem, příkazový řádek a analýzy.</p>
<p>Ze <b>tří kanálů</b> je Telegram ověřený doručením, e-mail jede přes
Cloudflare a <b>SMS je od 9. 8. 2026 ověřená naostro</b> — zkouška nanečisto
i skutečně doručená zpráva. Do té doby účet u brány neprošel a zprávy končily
chybou.</p>

<h3>Co chybí — a je to to hlavní</h3>
<p><b>Hráčům zatím neodešel ani jeden odkaz na sebehodnocení</b>, takže žádné
sebehodnocení není vyplněné. Druhý polygon na listu zůstává prázdný a rozhovor
nad rozdílem dvou pohledů — kvůli kterému nástroj vznikl — se nemá o co opřít.
Trenérská hodnocení přitom v databázi jsou.</p>
<p>Dál zbývá dohodnotit část kádru, doplnit hráčům pozice, které se tisknou na
list, a rozdat trenérům vlastní hesla místo společného.</p>

<h3>Na co si dát pozor</h3>
<p>Vypínač <b>Analýzy jazykovým modelem</b> je zapnutý, takže při dotazu na kádr
odcházejí modelu známky i slovní posudky nezletilých. Je to vědomé rozhodnutí,
ale <b>záznam o činnosti zpracování a informace pro rodiče zatím chybí</b> —
viz Ochrana údajů.</p>
`;

const EN = `
<h2>What this app does</h2>
<p>It keeps evaluations of youth footballers: the coach scores each player
1–10 on six axes, the player fills in the same axes independently, and the app
overlays both. The scores are not the point — the <b>differences</b> are.
Where the coach and the player disagree, there is something to talk about.</p>
<p>The output is a printable A4 sheet with a radar chart.</p>

<h2>People</h2>
<p>The squad register. <b>Clicking a name opens that person for editing</b>; the
<i>Edit</i> button at the end of the row does the same. For each person the app keeps:</p>
<ul>
  <li><b>Name and nickname</b> — the nickname appears wherever names are shown,
      which helps when three players share a surname.</li>
  <li><b>Role</b> — player or coach. Coaches sign in, players do not.</li>
  <li><b>Positions</b> — there can be several (goalkeeper and midfielder).</li>
  <li><b>Function</b> — free text, e.g. “Captain”.</li>
  <li><b>Templates</b> — the sets of axes the player is scored with. Several can be
      ticked: Ferda keeps goal, plays outfield and leads the team, so he has all
      three. <b>Each template is its own series, its own self-evaluation link and
      its own sheet</b> — they cannot be merged into one chart, because a different
      set of six axes has a different shape and could no longer be compared over
      time. Printing them side by side on one page is possible though (Sheets →
      combined sheet). The first ticked one is the default in the form.</li>
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

<p><b>The written notes and the goals belong to the template</b>, not to the person. A
goalkeeper sheet says “goal kicks”, a leader sheet says something entirely different — so
switching the template in the form clears them and they are written per series (the app
asks first, so nothing typed is thrown away silently). On a combined sheet they are merged
and say which template they came from; a sentence shared by two templates is printed once.</p>

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
<p><b>You pick links, not players.</b> In the <i>Generate for whom</i> table every
player + template combination has its own tick box, so you can generate just the
goalkeeper link even for a player with three templates. Everything is ticked by
default. A combination that already has an unfilled link says so and is not
generated again — two valid links for the same series would only blur which one
counts.</p>
<p><b>The app does not send the link</b> — you copy it and send it yourself.
Notification channels are set up for coaches only and carry just who did what,
never content. Send it to the individual player, not to a team group: whoever
has the link can fill the self-evaluation in for them.</p>
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

<h2>Compare anything with anything</h2>
<p>The third card under Comparison. Pick <b>two to eight records</b> and they are put
side by side, axis by axis. A record is <b>player + period + who evaluated</b>, so this
compares what nothing else can: two periods of the same player, a self-evaluation against
the coach, two coaches against each other, or players from different periods. Only records
that actually exist are offered.</p>
<p><b>The template is the one boundary this cannot cross</b> — the goalkeeper and outfield
sets do not share a single axis.</p>
<p><b>Columns sort themselves</b>, not by the order you ticked: periods chronologically,
and within a period the coach comes before the player. With two columns the
<i>difference</i> is the second minus the first, so <b>+</b> means improvement across
periods and “the player scored themselves higher” for coach vs. self-evaluation. With
three or more columns a gap replaces the sign.</p>

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
<p><b>A player with several templates gets a sheet for each of them</b> —
goalkeeper, outfield and leader separately. The <i>Who gets printed</i> table
therefore has a row per template and shows which one still has no evaluation;
an empty one is printed as a blank form so it does not drop out of sight.</p>
<p><b>Tick boxes work per sheet, not per player.</b> Ferda has three templates,
so he has three rows, each with its own tick box — to print only his goalkeeper
sheet, untick the other two. The tick box in the header toggles everything.</p>
<p>The <b>Combined sheet</b> switch puts them on <b>one page</b>: the radars side
by side, each captioned with its template, and the written notes and goals merged
from all templates (saying which one each part came from). The radars stay
separate here too — merging twelve axes into one shape would mean nothing.</p>
<p><b>Every template has its own colour</b>, so that a stack of printed sheets
can be told apart at a glance: <b>outfield blue</b>, <b>goalkeeper teal</b>,
<b>leader crimson</b>. The colour is carried by the header, the player's name,
the radar and the legend swatch; the header also spells out the <b>template
name</b>. The same colours appear in the app on the labels in tables and on the
self-evaluation page the player fills in. Do not rely on colour alone — the name
is always next to it, so the sheet still works printed in black and white. The
combined sheet belongs to all templates at once, so its header stays grey and
the colours are carried by the individual radars.</p>

<h2>Analyses</h2>
<p>Squad-wide summaries: <b>where the team is weakest</b> (average of an axis across all
evaluated players, lowest first) and <b>where the coach's and the player's views differ
most</b>. The app computes this, so it is exact, instant and sends nothing anywhere. Axis
averages are always computed within one template — goalkeeper and outfield axes cannot be mixed.</p>
<p><b>You can ask from anywhere — one field, the command bar at the top.</b> It sits above
every tab, so you never have to switch: type an ordinary sentence (“how many players do we
have”, “who has the biggest gap”) and the answer appears right there. The <i>Show the
numbers</i> button under the answer opens the tables it came from.</p>
<p>The same bar still runs commands — “Robin”, “compare Robin and Ferda”, “sheets”. It tells
a question from a command by an interrogative word or a question mark. The model gets the
same computed numbers and its job is the wording, not the arithmetic — its instructions
forbid computing anything. Even so: <b>check the numbers in the tables</b>. A model can be
confident and wrong at the same time.</p>
<p><b>Questions to the model are off by default</b> and are enabled in Settings separately
from the command bar. The reason: the command bar only needs the squad names, an analysis
does not — scores, written assessments and goals of individual players are sent to the
model. It is the only place in the app where player data leaves. The summaries keep working
with the model switched off.</p>

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

<h3>SMS header</h3>
<p>Because the sender ID belongs to the gateway, the header is <b>the only thing
telling the recipient who is writing</b>. It is set in Settings and prefixes every
message alike — digest, password reset and test. An empty field means the club
name, so renaming the club leaves no stale text behind.</p>
<p>A <b>live preview</b> below the field shows the message as it will arrive and
counts characters and segments. Diacritics are stripped automatically
(<i>ŘÍČMANICE</i> arrives as <i>RICMANICE</i>), because accents cut a segment
from 160 characters down to 70.</p>
<p><b>Beware of pretty characters.</b> An en dash, typographic quotes or an
ellipsis survive the stripping but are not in the SMS alphabet — they switch the
whole message into a mode where a segment holds only 70 characters, so it
<b>costs twice as much</b>. The preview names the offending character and says
what to replace it with.</p>

<h3>Send test</h3>
<p>Settings has a field for <b>any number</b> — it does not have to be in the
roster, so no fake person is needed just to check the gateway. Two buttons sit
side by side: the free <b>dry run</b> and a <b>real SMS</b>, which asks first
because it spends credit. If the switch is ticked but not saved yet, the app
says so before the attempt is dropped as disabled.</p>

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
<p>The log is <b>collapsed</b> and opens on click. Closed it takes a single line,
so the length of the Settings page does not depend on how much the app has sent —
on a phone there would otherwise be no way to scroll past it. Open, it scrolls
within itself.</p>
<p><b>Search</b> filters as you type and covers what the table shows, so it finds
“error” and “skipped”, not just a name or a number. <b>Export to CSV</b> downloads
the <b>whole log from the database</b>, not just those hundred rows — older sends
cannot be traced otherwise. The file opens correctly in Excel; times are in UTC.</p>
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

<h2>Project status — 9 August 2026</h2>
<p>A snapshot. The exact numbers always live in the app; this is orientation on
what is finished and what is not.</p>

<h3>What runs</h3>
<p>The whole <b>coach side</b> is done: the register with several templates per
player, evaluation including bulk entry and corrections as new versions, coach ×
player and player × player comparisons, agreement between coaches, A4 print
sheets and the cumulative sheet, accounts with a PIN and lockout, the command
bar and analyses.</p>
<p>Of the <b>three channels</b>, Telegram is confirmed by delivery, e-mail goes
through Cloudflare, and <b>SMS was confirmed for real on 9 August 2026</b> — a
dry run followed by a genuinely delivered message. Until then the gateway
account had not cleared and messages failed.</p>

<h3>What is missing — and it is the main thing</h3>
<p><b>Not a single self-evaluation link has gone out to the players</b>, so no
self-evaluation is filled in. The second polygon on the sheet stays empty and
the conversation about the difference between the two views — the reason this
tool exists — has nothing to stand on. The coach evaluations are in the
database.</p>
<p>Beyond that: part of the squad still needs evaluating, players need the
positions that get printed on the sheet, and coaches need their own passwords
instead of a shared one.</p>

<h3>What to watch</h3>
<p>The <b>analyses by language model</b> switch is on, so a question about the
squad sends the model scores and written assessments of minors. That was a
deliberate decision, but <b>the record of processing activities and the notice
for parents are still missing</b> — see Data protection.</p>
`;

/** HTML dokumentace pro zvolený jazyk. */
export function dokumentaceHtml(jazyk) {
    return jazyk === 'en' ? EN : CS;
}
