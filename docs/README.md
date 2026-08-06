# Uživatelská příručka — pro trenéra

Jak oznámkovat kádr a vytisknout listy. Programátorská část je v [TECHNICAL.md](TECHNICAL.md).

---

## 1. K čemu list slouží

Hráč dostane jednu stránku A4: graf šesti dovedností, tři slovní bloky (Fyzicky / Hlavou /
V partě) a dva až tři cíle na další půlrok. Nic víc se na papír nevejde a nic víc tam ani
nepatří.

Hodnotí se proti **absolutní laťce kategorie** — „co má umět starší žák" — ne proti kádru.
Dva hráči vedle sebe můžou mít oba sedmičku a být jinak dobří. To je v pořádku.

---

## 2. Než začneš známkovat

Tři pravidla, na kterých celý nástroj stojí:

1. **Nekoukej na loňské hodnoty.** Ani na svoje, ani na hráčova. Viditelné loňské číslo
   přitáhne nové k sobě a datová řada přestane cokoliv říkat. Nejdřív oznámkuj naslepo,
   teprve pak dopisuj `predchozi`.
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

## 3. Vyplnění dat

Všechno se píše do jediného souboru: `frontend/data/kadr.js`. Otevři ho v poznámkovém bloku
nebo v editoru kódu.

Nahoře je blok `NASTAVENI` — klub, kategorie, sezóna, název období a nadpis nad cíli
(„Na čem makáme do zimy"). Ten se mění dvakrát ročně.

Pod ním je seznam hráčů. Jeden hráč = jeden blok ve složených závorkách:

```js
{
    jmeno: 'Novák Jan',
    prezdivka: 'Nováček',
    post: 'Střední záložník',
    sablona: 'pole',                    // 'pole' nebo 'brankar'
    hodnoceni: { prava: 7, leva: 4, hlavicky: 5, prihravka: 7, braneni: 5, skenovani: 4 },
    predchozi: { prava: 6, leva: 3, hlavicky: 4, prihravka: 5, braneni: 5, skenovani: 3 },
    fyzicky: 'Vytrvalost dobrá, ve druhém poločase neodpadá…',
    hlavou: 'Po chybě se rychle vrátí do hry…',
    parta: 'V kabině tahoun…',
    cile: [
        'Rozhlédnout se DŘÍV, než ke mně míč dorazí.',
        'Levá noha: každý trénink 5 minut navíc.'
    ]
}
```

Na co si dát pozor:

- **Čárky mezi bloky hráčů.** Chybějící čárka je nejčastější chyba. Stránka to pozná a napíše
  nahoře červenou hlášku.
- **Apostrof v textu.** Text je v jednoduchých uvozovkách, takže `'Nedaří se mu'` je v pořádku,
  ale `'Hráčův styl'` taky — problém dělá jen apostrof uvnitř, např. `'don't'`. V češtině
  nevzniká.
- **Názvy os musí sedět.** Pro hráče v poli: `prava`, `leva`, `hlavicky`, `prihravka`,
  `braneni`, `skenovani`. Pro brankáře: `chytani`, `misto`, `nohama`, `vykopy`, `mimo`,
  `organizace`. Překlep = osa se vykreslí na nule.
- `hodnoceni: null` — list se vytiskne prázdný s červenou poznámkou. Hodí se jako podklad,
  když chceš známkovat tužkou u hřiště.
- `predchozi: null` — šedý obrys se nevykreslí. Tak to bude u prvního období.
- `aktivni: false` — hráč se vůbec nevytiskne (odešel, dlouhodobé zranění).

### Cíle

Dva až tři, ne víc. Konkrétní a ověřitelné. Ne „zlepšit levou nohu", ale „levá noha: každý
trénink 5 minut navíc, přihrávka do 10 metrů". Hráč musí poznat, jestli to splnil.

---

## 4. Tisk

1. Otevři `frontend/tisk.html` (dvojklik).
2. Nahoře je vidět, kolik listů se vytiskne a kolik z nich je nevyplněných.
3. Tlačítko **Vytisknout všechny listy**.

**V dialogu tisku zapni „Grafika na pozadí" / „Background graphics".** Bez toho se vytiskne
bílý list bez modrého pruhu se jménem a bez barevných bloků. Okraje nech na „Výchozí" —
stránka si je nastavuje sama (A4, 12 mm).

Jeden hráč = jedna stránka. Když chceš vytisknout jen některé, dej ostatním dočasně
`aktivni: false`.

Kontrola před tiskem: v náhledu musí být počet stránek stejný jako počet hráčů. Když je vyšší,
někomu se text přelil na druhou stránku — zkrať slovní blok.

---

## 5. Rozhovor s hráčem

List se nepředává v šatně mezi ostatními. Papír s posudkem je hráčova věc.

Na papíře schválně **nejsou šipky trendu ani věty typu „zhoršil ses"**. Vývoj v čase je pohled
pro trenéra, ne pro čtrnáctiletého, který si list nese domů. Když šlo něco dolů, řekni to ústně
a s důvodem.

Graf se **neporovnává mezi hráči**. Levák a pravák mají zub na opačné straně, tvary si nejsou
podobné a nic to neznamená. Je to napsané i v patičce listu.

---

## 6. Co bude dál

Zatím je hotová fáze 1 — tisk z lokálního souboru. Až bude jednou celý kádr odhodnocený ručně,
přijde na řadu aplikace: zadávání ve webovém formuláři, sebehodnocení hráče přes odkaz
a porovnání „jak se vidím já vs. jak tě vidí trenér". Rozdíl mezi tím dvojím je vlastně to
nejzajímavější, co tenhle nástroj umí ukázat.
