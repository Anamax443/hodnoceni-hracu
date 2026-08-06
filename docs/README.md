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

Otevřeš adresu aplikace a zadáš heslo trenéra. Přihlášení platí 12 hodin. Heslo je jedno
společné — kdo ho má, vidí všechno.

---

## 4. Záložky

### Lidé

Kdo je v týmu. U každého jméno, přezdívka, post, role a šablona os.

- **role hráč** — hodnotí se, tiskne se mu list
- **role trenér** — nehodnotí se; je v seznamu proto, aby šlo u hodnocení vybrat, kdo ho pořídil
- **šablona** — `pole` pro hráče v poli, `brankar` pro brankáře (jiných šest os)
- **aktivní** — vypni místo mazání, když hráč odejde. Historie hodnocení má zůstat.

### Hodnotit

Vybereš hráče, dole se objeví formulář: šest os po deseti známkách, tři slovní bloky a cíle.

Nic není předvyplněné a předchozí hodnoty se nezobrazují — to je záměr, ne opomenutí.

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
