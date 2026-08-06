/* =====================================================================
   PŘEKLADY — čeština a angličtina

   Všechny texty, které uvidí člověk, jsou tady. V kódu se používá
   `t('klic')`, případně `t('klic', hodnota1, …)` pro doplnění {0}, {1}.

   Klíče os (prava, leva, …) se nepřekládají — jsou to klíče v databázi.
   Překládají se jen jejich popisy.
   ===================================================================== */

import { SABLONY } from './sablony.js';

const ULOZISTE = 'hodnoceni.lang';

const SLOVNIK = {
    cs: {
        'jazyk.zkratka': 'CS',
        'jazyk.dalsi': 'English',

        /* --- obal aplikace --- */
        'shell.app': 'Hodnocení hráčů',
        'shell.obdobi': 'období',
        'shell.odhlasit': 'Odhlásit',
        'shell.odhlasit.tip': 'Ukončí přihlášení trenéra',
        'shell.vzhled.tmavy': '🌙 Tmavé',
        'shell.vzhled.svetly': '☀️ Světlé',
        'shell.vzhled.tip': 'Přepnout vzhled (tmavý/světlý)',
        'shell.jazyk.tip': 'Switch to English',
        'shell.verze': 'verze',
        'shell.verze.tip': 'Commit, ze kterého je běžící aplikace sestavená',
        'shell.sestaveno': 'sestaveno',
        'shell.nacitam': 'Načítám…',
        'shell.hodiny.tip': 'Aktuální čas',

        /* --- přihlášení --- */
        'login.popis': 'Přístup pro trenéra.',
        'login.heslo': 'Heslo',
        'login.prihlasit': 'Přihlásit',
        'login.prihlasit.tip': 'Přihlásí trenéra na 12 hodin',
        'login.zapomenute': 'Zapomenuté heslo',
        'login.zapomenute.tip': 'Pošle odkaz na nastavení nového hesla',
        'login.obnova.popis': 'Napiš adresu, na kterou má odkaz přijít. Musí to být adresa povolená pro obnovu — kdo ji nezná, obnovu nespustí.',
        'login.obnova.email': 'E-mail',
        'login.obnova.poslat': 'Poslat odkaz',
        'login.obnova.poslat.tip': 'Odešle jednorázový odkaz na nastavení nového hesla',
        'login.obnova.odeslano': 'Pokud je ta adresa pro obnovu povolená, odkaz je na cestě. Platí 15 minut a jen jednou. Kdyby nedorazil, mrkni i do spamu.',
        'login.obnova.zpet': 'Zpět na přihlášení',

        /* --- změna a obnova hesla --- */
        'heslo.nadpis': 'Změna hesla',
        'heslo.popis': 'Heslo je společné pro všechny trenéry. Změna platí hned pro další přihlášení; kdo je přihlášený teď, dojede svých 12 hodin.',
        'heslo.stare': 'Stávající heslo',
        'heslo.nove': 'Nové heslo (aspoň 10 znaků)',
        'heslo.nove2': 'Nové heslo ještě jednou',
        'heslo.ulozit': 'Změnit heslo',
        'heslo.ulozit.tip': 'Uloží nové heslo do databáze',
        'heslo.nesouhlasi': 'Nová hesla se neshodují.',
        'heslo.zmeneno': 'Heslo změněno. Rozeslané odkazy na obnovu tím přestaly platit.',
        'heslo.obnovaKam': 'Odkaz na obnovu hesla chodí na: {0}',
        'heslo.obnovaNikam': 'Obnova hesla e-mailem není nastavená — chybí povolené adresy (secret OBNOVA_EMAILY).',
        'heslo.mailNefunguje': 'E-mailový kanál není zapojený (binding EMAIL), odkaz by se neodeslal.',
        'obnova.nadpis': 'Nové heslo',
        'obnova.popis': 'Nastav si nové heslo. Odkaz funguje jen jednou.',
        'obnova.neplatny': 'Odkaz už neplatí — buď mu vypršela platnost, nebo byl použitý. Požádej o nový na přihlašovací stránce.',
        'obnova.nastavit': 'Nastavit heslo',
        'obnova.nastavit.tip': 'Uloží nové heslo a odkaz zneplatní',
        'obnova.hotovo': 'Heslo je nastavené. Teď se jím přihlas.',
        'obnova.naPrihlaseni': 'Na přihlášení',

        /* --- záložky --- */
        'nav.lide': 'Lidé',
        'nav.lide.tip': 'Kdo je v týmu — hráči a trenéři',
        'nav.hodnotit': 'Hodnotit',
        'nav.hodnotit.tip': 'Zadání hodnocení hráče trenérem',
        'nav.listy': 'Listy',
        'nav.listy.tip': 'Tiskové listy A4 sestavené z databáze',
        'nav.porovnani': 'Porovnání',
        'nav.porovnani.tip': 'Kde se rozchází pohled trenéra a hráče',
        'nav.odkazy': 'Odkazy',
        'nav.odkazy.tip': 'Odkazy na sebehodnocení pro hráče',
        'nav.nastaveni': 'Nastavení',
        'nav.nastaveni.tip': 'Tolerance, období, hlavička listu',

        /* --- Lidé --- */
        'lide.nadpis': 'Lidé v týmu',
        'lide.popis': 'Hráči se hodnotí a tisknou se jim listy. Trenéři se nehodnotí — jsou tu proto, aby šlo zaznamenat, kdo hodnocení pořídil.',
        'lide.jmeno': 'Jméno',
        'lide.post': 'Post',
        'lide.role': 'Role',
        'lide.sablona': 'Šablona',
        'lide.hrac': 'hráč',
        'lide.trener': 'trenér',
        'lide.neaktivni': 'neaktivní',
        'lide.prazdno': 'Zatím tu nikdo není.',
        'lide.upravit': 'Upravit',
        'lide.upravit.tip': 'Upravit údaje této osoby',
        'lide.nova': 'Nová osoba',
        'lide.uprava': 'Úprava: {0}',
        'lide.jmeno.label': 'Jméno a příjmení',
        'lide.prezdivka': 'Přezdívka',
        'lide.post.label': 'Post / funkce',
        'lide.role.label': 'Role',
        'lide.sablona.label': 'Šablona os',
        'lide.aktivni': 'aktivní',
        'lide.ulozit': 'Uložit',
        'lide.ulozit.tip': 'Uloží osobu do databáze',
        'lide.novy': 'Nová',
        'lide.novy.tip': 'Vyprázdní formulář',
        'lide.ulozeno': 'Údaje uloženy.',
        'lide.pridano': 'Osoba přidána.',
        'sablona.pole': 'hráč v poli',
        'sablona.brankar': 'brankář',
        'lide.pozice': 'Pozice',
        'lide.pozice.label': 'Pozice (klidně několik)',
        'lide.pozice.napoveda': 'Kde hráč může nastoupit. Se šablonou os to nesouvisí — tu vybíráš až u hodnocení.',
        'lide.post.napoveda': 'Volný text pro funkci nebo poznámku, třeba „Kapitán". Tiskne se na list za pozice.',
        'lide.sablona.napoveda': 'Výchozí šestice os ve formuláři. U hodnocení jde přepnout — brankář, který hraje i v poli, může mít obojí.',
        'lide.bezPozic': '—',
        'lide.notifikace': 'Notifikace',
        'lide.notifikace.popis': 'Souhrn toho, co se změnilo. Chodí trenérům, ne hráčům. Obsah hodnocení se do zprávy nikdy nedává — jen kdo a co.',
        'lide.email': 'E-mail',
        'lide.email.napoveda': 'Musí být adresa ověřená v Cloudflare, jinak odeslání selže.',
        'lide.chatid': 'Telegram chat id',
        'lide.chatid.napoveda': 'Číslo, ne jméno. Dotáhne ho tlačítko níž — trenér musí botovi napsat.',
        'lide.notifEmail': 'posílat e-mailem',
        'lide.notifTelegram': 'posílat na Telegram',
        'lide.dotahnout': 'Dotáhnout chat id z Telegramu',
        'lide.dotahnout.tip': 'Načte, kdo botovi v posledních 24 h napsal',
        'lide.zkusebni': 'Zkušební zpráva',
        'lide.zkusebni.tip': 'Pošle testovací zprávu na vyplněné chat id',
        'lide.zadneChaty': 'Botovi zatím nikdo nenapsal. Ať trenér otevře bota a dá Start — Telegram nedovolí, aby bot psal první.',

        /* --- pozice --- */
        'pozice.brankar': 'Brankář',
        'pozice.pravy_bek': 'Pravý bek',
        'pozice.stoper': 'Stoper',
        'pozice.levy_bek': 'Levý bek',
        'pozice.defenzivni_zaloznik': 'Defenzivní záložník',
        'pozice.stredni_zaloznik': 'Střední záložník',
        'pozice.ofenzivni_zaloznik': 'Ofenzivní záložník',
        'pozice.prave_kridlo': 'Pravé křídlo',
        'pozice.leve_kridlo': 'Levé křídlo',
        'pozice.hrotovy_utocnik': 'Hrotový útočník',

        /* --- Hodnotit --- */
        'hodnotit.nadpis': 'Hodnocení hráče',
        'hodnotit.popis': 'Období: {0}. Uloží se jako nový záznam — starší hodnocení se nikdy nepřepisuje.',
        'hodnotit.hrac': 'Hráč',
        'hodnotit.vyber': '— vyber hráče —',
        'hodnotit.hodnoti': 'Hodnotí',
        'hodnotit.neuvedeno': '— neuvedeno —',
        'hodnotit.naslepo': 'Známkuje se naslepo. Předchozí hodnoty se schválně nezobrazují — viditelné loňské číslo přitáhne nové k sobě a datová řada přestane cokoliv říkat. Porovnání uvidíš až po uložení.',
        'hodnotit.sablonaPopis': 'šablona: {0}',
        'hodnotit.sablona': 'Šestice os',
        'hodnotit.sablona.napoveda': 'Vybírá se u každého hodnocení zvlášť. Kdo chytá i hraje v poli, může mít v jednom období obojí — každá řada pak žije samostatně a v grafu se nemíchá.',
        'porovnani.sablona': 'šablona: {0}',
        'porovnani.jinaSablona': 'Hráč vyplnil sebehodnocení jinou šesticí os, než jakou jsi ho známkoval. Porovnat to nejde — vygeneruj mu nový odkaz se stejnou šablonou.',
        'odkazy.sablona': 'Šablona',
        'hodnotit.bloky': 'Slovní bloky',
        'hodnotit.bloky.popis': 'Tyhle tři rohy modelu se nikdy neznámkují číslem. Kondice a rychlost patří do „Fyzicky".',
        'hodnotit.cile.popis': 'Dva až tři, konkrétní a ověřitelné. Hráč musí poznat, jestli je splnil.',
        'hodnotit.cil': '{0}. cíl',
        'hodnotit.ulozit': 'Uložit hodnocení',
        'hodnotit.ulozit.tip': 'Uloží hodnocení jako nový záznam',
        'hodnotit.chybi': 'Chybí známka: {0}.',
        'hodnotit.ulozeno': 'Hodnocení uloženo: {0}, období {1}.',
        'hodnotit.naList': 'Otevřít tiskový list',
        'hodnotit.naList.tip': 'Otevře tiskový list tohoto hráče',
        'hodnotit.dalsi': 'Další hráč',
        'hodnotit.dalsi.tip': 'Vyhodnotit dalšího hráče',

        /* --- slovní bloky (i na listu) --- */
        'blok.fyzicky': 'Fyzicky',
        'blok.hlavou': 'Hlavou',
        'blok.parta': 'V partě',

        /* --- Listy --- */
        'listy.nadpis': 'Tiskové listy',
        'listy.popis': 'Jeden hráč = jedna A4. Listy se sestaví z databáze, otevřou se v nové záložce a odtud jdou na tiskárnu.',
        'listy.obdobi': 'Období',
        'listy.polygon': 'Druhý polygon v grafu',
        'listy.polygon.minule': 'trenér minule (vývoj)',
        'listy.polygon.hrac': 'sebehodnocení hráče (k rozhovoru)',
        'listy.polygon.zadne': 'žádný — jen aktuální',
        'listy.dva': 'Na listu jsou maximálně dva polygony. Tři jsou nečitelné.',
        'listy.kdo': 'Kdo se vytiskne',
        'listy.vsichni.tip': 'Označit všechny',
        'listy.otevrit': 'Otevřít listy k tisku',
        'listy.otevrit.tip': 'Otevře tiskové listy vybraných hráčů',
        'listy.nikdo': 'Nikdo není vybraný.',

        /* --- Porovnání --- */
        'porovnani.nadpis': 'Trenér vs. hráč',
        'porovnani.popis': 'Řeší se jen osy, kde je rozdíl větší než tolerance (teď {0}, změna v Nastavení).',
        'porovnani.rozdily': 'Rozdíly za období {0}',
        'porovnani.osa': 'Osa',
        'porovnani.rozdil': 'rozdíl',
        'porovnani.kRozhovoru': 'k rozhovoru',
        'porovnani.vToleranci': 'v toleranci',
        'porovnani.slepeMisto': 'slepé místo — chybí zpětná vazba',
        'porovnani.sebeduvera': 'sebedůvěra — může jít o něco mimo fotbal',
        'porovnani.upozorneni': 'Toleranci překračuje {0} os. Na jeden rozhovor je to moc — vyber 2 až 3 témata.',
        'porovnani.legenda': '<b>+</b> hráč si dal víc než trenér = slepé místo, chybí zpětná vazba.<br><b>−</b> hráč si dal míň než trenér = sebedůvěra, může jít o něco mimo fotbal.',
        'porovnani.napsal': 'Hráč k tomu napsal:',
        'porovnani.chybi': 'Za období {0} zatím chybí: {1}. Porovnání se ukáže, až budou obě strany.',
        'porovnani.chybi.trener': 'hodnocení trenéra',
        'porovnani.chybi.hrac': 'sebehodnocení hráče',
        'porovnani.a': ' a ',

        /* --- Trend --- */
        'trend.nadpis': 'Vývoj v čase',
        'trend.jenTrener': '— jen pro trenéra, na list hráče to nepatří',
        'trend.malo': 'Na trend je potřeba aspoň druhé období.',
        'trend.souhrn': '{0} → {1}: {2} os nahoru, {3} dolů, {4} beze změny.',
        'trend.pasmo': 'Za změnu se považuje až rozdíl 2 body; posun o 1 bod u subjektivního hodnocení není signál.',

        /* --- Odkazy --- */
        'odkazy.nadpis': 'Odkazy na sebehodnocení',
        'odkazy.popis': 'Odkaz je jednorázový. Posílej ho konkrétnímu hráči, ne do týmové skupiny — kdo odkaz má, může sebehodnocení vyplnit za něj.',
        'odkazy.platnost': 'Platnost (dní)',
        'odkazy.generovat': 'Vygenerovat pro všechny hráče',
        'odkazy.generovat.tip': 'Vygeneruje odkaz pro každého aktivního hráče',
        'odkazy.obdobi': 'Období {0}',
        'odkazy.stav': 'Stav',
        'odkazy.platiDo': 'Platí do',
        'odkazy.odkaz': 'Odkaz',
        'odkazy.ceka': 'čeká',
        'odkazy.vyplneno': 'vyplněno',
        'odkazy.prazdno': 'Pro tohle období zatím žádné odkazy.',
        'odkazy.kopirovat': 'Kopírovat',
        'odkazy.kopirovat.tip': 'Zkopíruje celý odkaz do schránky',
        'odkazy.zkopirovano': 'Zkopírováno',
        'odkazy.rucne': 'Zkopíruj odkaz ručně:',
        'odkazy.zneplatnit': 'Zneplatnit',
        'odkazy.zneplatnit.tip': 'Odkaz přestane platit',
        'odkazy.potvrdit': 'Zneplatnit tenhle odkaz? Hráč pak potřebuje nový.',
        'odkazy.vytvoreno': 'Vygenerováno odkazů: {0}.',

        /* --- Nastavení --- */
        'nastaveni.nadpis': 'Nastavení',
        'nastaveni.popis': 'Tolerance a období řídí porovnání a párování hodnocení. Zbytek jde do hlavičky listu.',
        'nastaveni.tolerance': 'Tolerance rozdílu (0–9)',
        'nastaveni.tolerance.napoveda': 'O kolik se smí lišit známka trenéra a hráče, aniž by se osa řešila. Větší rozdíl = téma k rozhovoru.',
        'nastaveni.obdobi': 'Období',
        'nastaveni.obdobi.napoveda': 'Například „2025/2026 zima". Podle něj se páruje hodnocení trenéra a hráče.',
        'nastaveni.sezona': 'Sezóna',
        'nastaveni.sezona.napoveda': 'Tiskne se do hlavičky listu.',
        'nastaveni.klub': 'Klub',
        'nastaveni.kategorie': 'Kategorie',
        'nastaveni.latka': 'Proti čemu se hodnotí',
        'nastaveni.latka.napoveda': 'Text v patičce listu: „co má umět starší žák".',
        'nastaveni.cileNadpis': 'Nadpis nad cíli',
        'nastaveni.cileNadpis.napoveda': 'Například „Na čem makáme do zimy".',
        'nastaveni.ulozit': 'Uložit',
        'nastaveni.ulozit.tip': 'Uloží nastavení',
        'nastaveni.ulozeno': 'Nastavení uloženo.',
        'notif.nadpis': 'Souhrnné notifikace',
        'notif.popis': 'Souhrn se posílá najednou, ne zpráva za každou událost. Kanály se zapínají u konkrétního trenéra v záložce Lidé.',
        'notif.zapnuto': 'Posílat souhrny',
        'notif.cas': 'V kolik (místní čas)',
        'notif.cas.napoveda': 'Souhrn odejde v tuhle hodinu, když je co poslat.',
        'notif.dnyZmeny': 'Když se něco děje: nejvýš jednou za (dní)',
        'notif.dnyZmeny.napoveda': 'Změny se nasčítají a přijdou v jedné zprávě. Ne zpráva za každé hodnocení.',
        'notif.dnyTicho': 'Když se nic neděje: ozvat se po (dnech)',
        'notif.dnyTicho.napoveda': 'Přijde zpráva „nic se nezměnilo". Bez ní nejde poznat, jestli nikdo nic nedělá, nebo se něco rozbilo.',
        'notif.ceka': 'Čeká na odeslání: {0}',
        'notif.hodiny': 'Teď je {0}:00, souhrn se rozesílá v {1}:00 (místní čas).',
        'notif.posledni': 'Naposledy odesláno: {0}',
        'notif.nikdy': 'zatím nikdy',
        'notif.prijemci': 'Příjemci: {0}',
        'notif.bezPrijemcu': 'Nikdo nemá zapnutou notifikaci — souhrn nemá komu chodit.',
        'notif.poslatTed': 'Poslat souhrn teď',
        'notif.poslatTed.tip': 'Odešle souhrn okamžitě, bez ohledu na nastavený čas',
        'notif.kanaly': 'Stav kanálů',

        /* --- sebehodnocení hráče --- */
        'self.nadpis': 'Sebehodnocení',
        'self.ahoj': 'Ahoj {0}',
        'self.popis': 'Tohle není zkoušení a nikdo kromě trenéra to neuvidí. Odpovídej, jak to cítíš — čím upřímněji, tím užitečnější to bude. Vyplňuje se jednou, podruhé už to nepůjde.',
        'self.otazka': 'Na čem chceš pracovat? (nepovinné)',
        'self.placeholder': 'Klidně jednou větou.',
        'self.odeslat': 'Odeslat',
        'self.odeslat.tip': 'Odešle sebehodnocení trenérovi',
        'self.chybi': 'Ještě chybí: {0}.',
        'self.hotovo': '<b>Díky, hotovo.</b><br>Trenér to má. Až budete mít oba vyplněno, projdete si spolu, kde se vaše pohledy liší — to je na tom to nejzajímavější.',
        'self.jizOdeslano': 'Sebehodnocení už jsi odeslal. Díky — trenér ho má.',

        /* --- tiskový list --- */
        'list.nadpis': 'Hodnocení hráče',
        'list.sezona': 'sezóna',
        'list.vystaveno': 'Vystaveno',
        'list.nevyplneno': '⚠ Hodnocení za tohle období zatím není vyplněné.',
        'list.ted': 'teď',
        'list.minule': 'minule',
        'list.trener': 'trenér',
        'list.hracSeVidi': 'jak se vidí hráč',
        'list.jakCist': 'Jak číst čísla:',
        'list.paticka': 'Graf tě porovnává s tím, co má umět {0}. Ne se spoluhráči.<br>Tvary mezi sebou neporovnávejte, leváci a praváci mají zub na opačné straně.',
        'list.podpis': 'trenér',
        'list.neznamaSablona': 'Hráč „{0}" má neznámou šablonu: {1}',

        /* --- stránka tisku --- */
        'tisk.vytisknout': '🖨️ Vytisknout',
        'tisk.tip': 'Otevře dialog tisku. Jeden hráč = jedna stránka A4. Zapni „Grafika na pozadí".',
        'tisk.stav': '{0} — listů: {1}',
        'tisk.bez': ' (z toho {0} bez hodnocení)',
        'tisk.chyba': 'Listy se nevykreslily.',
        'tisk.neprihlasen': 'Nejsi přihlášený. Otevři aplikaci a přihlas se.',
        'tisk.stavChyba': 'Chyba',

        /* --- chyby --- */
        'chyba.odhlasen': 'Odhlášeno — přihlas se znovu.',
        'chyba.server': 'Server odpověděl {0}.',
        'chyba.odkaz': 'Odkaz neplatí.',

        /* --- osy --- */
        'osa.prava': 'Technika pravá noha',
        'osa.leva': 'Technika levá noha',
        'osa.hlavicky': 'Hlavičkování',
        'osa.prihravka': 'Přihrávka a první dotek',
        'osa.braneni': 'Bránění 1v1',
        'osa.skenovani': 'Skenování a poziční hra',
        'osa.chytani': 'Chytání a zákroky',
        'osa.misto': 'Výběr místa a postavení',
        'osa.nohama': 'Hra nohama (rozehrávka)',
        'osa.vykopy': 'Výkopy a dlouhá rozehrávka',
        'osa.mimo': 'Hra mimo bránu a centry',
        'osa.organizace': 'Organizace a komunikace',

        /* --- osy v první osobě (formulář hráče) --- */
        'ja.prava': 'Pravou nohou trefím, co chci — i pod tlakem.',
        'ja.leva': 'Levou nohou přihraju na deset metrů tak, jak chci.',
        'ja.hlavicky': 'Ve vzduchu si věřím, hlavičku trefím čistě.',
        'ja.prihravka': 'První dotek mi sedne a přihrávka dojde tam, kam mířím.',
        'ja.braneni': 'V souboji jeden na jednoho míč uhájím nebo ho seberu.',
        'ja.skenovani': 'Než ke mně míč dorazí, vím, kdo je kolem mě.',
        'ja.chytani': 'Střelu chytím a míč si udržím.',
        'ja.misto': 'Stojím tam, kde mám — střelec na mě nemá úhel.',
        'ja.nohama': 'Rozehrávka po zemi mi jde i pod tlakem.',
        'ja.vykopy': 'Výkop doletí tam, kam chci, a k našemu hráči.',
        'ja.mimo': 'Vyjdu si pro centr a míč seberu.',
        'ja.organizace': 'Řídím obranu hlasem a je mi rozumět.',

        /* --- kotvy škály --- */
        'kotva.1.rozsah': '1–3', 'kotva.1.text': 'začínám, jen v klidu bez tlaku',
        'kotva.2.rozsah': '4–5', 'kotva.2.text': 'umím na tréninku, v zápase kolísá',
        'kotva.3.rozsah': '6–7', 'kotva.3.text': 'spolehlivé i v zápase',
        'kotva.4.rozsah': '8–9', 'kotva.4.text': 'silná stránka, opora týmu',
        'kotva.5.rozsah': '10',  'kotva.5.text': 'nadstandard pro kategorii'
    },

    en: {
        'jazyk.zkratka': 'EN',
        'jazyk.dalsi': 'Čeština',

        'shell.app': 'Player evaluation',
        'shell.obdobi': 'period',
        'shell.odhlasit': 'Sign out',
        'shell.odhlasit.tip': 'Ends the coach session',
        'shell.vzhled.tmavy': '🌙 Dark',
        'shell.vzhled.svetly': '☀️ Light',
        'shell.vzhled.tip': 'Switch appearance (dark/light)',
        'shell.jazyk.tip': 'Přepnout do češtiny',
        'shell.verze': 'version',
        'shell.verze.tip': 'Commit the running application was built from',
        'shell.sestaveno': 'built',
        'shell.nacitam': 'Loading…',
        'shell.hodiny.tip': 'Current time',

        'login.popis': 'Coach access.',
        'login.heslo': 'Password',
        'login.prihlasit': 'Sign in',
        'login.prihlasit.tip': 'Signs the coach in for 12 hours',
        'login.zapomenute': 'Forgot password',
        'login.zapomenute.tip': 'Sends a link for setting a new password',
        'login.obnova.popis': 'Enter the address the link should go to. It has to be an address allowed for recovery — whoever does not know it cannot trigger a reset.',
        'login.obnova.email': 'E-mail',
        'login.obnova.poslat': 'Send link',
        'login.obnova.poslat.tip': 'Sends a single-use link for setting a new password',
        'login.obnova.odeslano': 'If that address is allowed for recovery, the link is on its way. It is valid for 15 minutes and works once. Check the spam folder too.',
        'login.obnova.zpet': 'Back to sign in',

        'heslo.nadpis': 'Change password',
        'heslo.popis': 'The password is shared by all coaches. The change applies to the next sign-in; anyone signed in now keeps their 12 hours.',
        'heslo.stare': 'Current password',
        'heslo.nove': 'New password (at least 10 characters)',
        'heslo.nove2': 'New password again',
        'heslo.ulozit': 'Change password',
        'heslo.ulozit.tip': 'Stores the new password in the database',
        'heslo.nesouhlasi': 'The new passwords do not match.',
        'heslo.zmeneno': 'Password changed. Any recovery links already sent stopped working.',
        'heslo.obnovaKam': 'Password recovery links go to: {0}',
        'heslo.obnovaNikam': 'E-mail recovery is not configured — no allowed addresses (secret OBNOVA_EMAILY).',
        'heslo.mailNefunguje': 'The e-mail channel is not wired up (binding EMAIL), the link would not be sent.',
        'obnova.nadpis': 'New password',
        'obnova.popis': 'Set your new password. The link works only once.',
        'obnova.neplatny': 'The link is no longer valid — it either expired or was already used. Ask for a new one on the sign-in page.',
        'obnova.nastavit': 'Set password',
        'obnova.nastavit.tip': 'Stores the new password and invalidates the link',
        'obnova.hotovo': 'The password is set. Sign in with it now.',
        'obnova.naPrihlaseni': 'To sign-in',

        'nav.lide': 'People',
        'nav.lide.tip': 'Who is in the team — players and coaches',
        'nav.hodnotit': 'Evaluate',
        'nav.hodnotit.tip': 'Coach enters a player evaluation',
        'nav.listy': 'Sheets',
        'nav.listy.tip': 'Printable A4 sheets built from the database',
        'nav.porovnani': 'Comparison',
        'nav.porovnani.tip': 'Where the coach and the player disagree',
        'nav.odkazy': 'Links',
        'nav.odkazy.tip': 'Self-evaluation links for players',
        'nav.nastaveni': 'Settings',
        'nav.nastaveni.tip': 'Tolerance, period, sheet header',

        'lide.nadpis': 'People in the team',
        'lide.popis': 'Players get evaluated and printed sheets. Coaches are not evaluated — they are listed so it is recorded who made the evaluation.',
        'lide.jmeno': 'Name',
        'lide.post': 'Position',
        'lide.role': 'Role',
        'lide.sablona': 'Template',
        'lide.hrac': 'player',
        'lide.trener': 'coach',
        'lide.neaktivni': 'inactive',
        'lide.prazdno': 'Nobody here yet.',
        'lide.upravit': 'Edit',
        'lide.upravit.tip': 'Edit this person',
        'lide.nova': 'New person',
        'lide.uprava': 'Editing: {0}',
        'lide.jmeno.label': 'Full name',
        'lide.prezdivka': 'Nickname',
        'lide.post.label': 'Position / function',
        'lide.role.label': 'Role',
        'lide.sablona.label': 'Axis template',
        'lide.aktivni': 'active',
        'lide.ulozit': 'Save',
        'lide.ulozit.tip': 'Saves the person to the database',
        'lide.novy': 'New',
        'lide.novy.tip': 'Clears the form',
        'lide.ulozeno': 'Saved.',
        'lide.pridano': 'Person added.',
        'sablona.pole': 'outfield player',
        'sablona.brankar': 'goalkeeper',
        'lide.pozice': 'Positions',
        'lide.pozice.label': 'Positions (several are fine)',
        'lide.pozice.napoveda': 'Where the player can line up. Unrelated to the axis template — that is picked when evaluating.',
        'lide.post.napoveda': 'Free text for a function or note, e.g. „Captain". Printed on the sheet after the positions.',
        'lide.sablona.napoveda': 'Default set of six axes in the form. It can be switched when evaluating — a goalkeeper who also plays outfield can have both.',
        'lide.bezPozic': '—',
        'lide.notifikace': 'Notifications',
        'lide.notifikace.popis': 'A digest of what changed. Goes to coaches, not players. The message never carries evaluation content — only who and what.',
        'lide.email': 'E-mail',
        'lide.email.napoveda': 'Must be an address verified in Cloudflare, otherwise sending fails.',
        'lide.chatid': 'Telegram chat id',
        'lide.chatid.napoveda': 'A number, not a name. The button below fetches it — the coach has to message the bot first.',
        'lide.notifEmail': 'send by e-mail',
        'lide.notifTelegram': 'send to Telegram',
        'lide.dotahnout': 'Fetch chat id from Telegram',
        'lide.dotahnout.tip': 'Loads who messaged the bot in the last 24 h',
        'lide.zkusebni': 'Test message',
        'lide.zkusebni.tip': 'Sends a test message to the chat id above',
        'lide.zadneChaty': 'Nobody has messaged the bot yet. Have the coach open it and press Start — Telegram does not let a bot message first.',

        'pozice.brankar': 'Goalkeeper',
        'pozice.pravy_bek': 'Right back',
        'pozice.stoper': 'Centre back',
        'pozice.levy_bek': 'Left back',
        'pozice.defenzivni_zaloznik': 'Defensive midfielder',
        'pozice.stredni_zaloznik': 'Centre midfielder',
        'pozice.ofenzivni_zaloznik': 'Attacking midfielder',
        'pozice.prave_kridlo': 'Right winger',
        'pozice.leve_kridlo': 'Left winger',
        'pozice.hrotovy_utocnik': 'Striker',

        'hodnotit.nadpis': 'Player evaluation',
        'hodnotit.popis': 'Period: {0}. Saved as a new record — older evaluations are never overwritten.',
        'hodnotit.hrac': 'Player',
        'hodnotit.vyber': '— choose a player —',
        'hodnotit.hodnoti': 'Evaluated by',
        'hodnotit.neuvedeno': '— not specified —',
        'hodnotit.naslepo': 'Score blind. Previous values are deliberately hidden — a visible last-season number pulls the new one towards itself and the data series stops meaning anything. The comparison appears after you save.',
        'hodnotit.sablonaPopis': 'template: {0}',
        'hodnotit.sablona': 'Set of axes',
        'hodnotit.sablona.napoveda': 'Chosen per evaluation. Someone who keeps goal and also plays outfield can have both in one period — each series lives on its own and they are never mixed in one chart.',
        'porovnani.sablona': 'template: {0}',
        'porovnani.jinaSablona': 'The player filled in a different set of axes than the one you scored. They cannot be compared — generate a new link with the same template.',
        'odkazy.sablona': 'Template',
        'hodnotit.bloky': 'Written notes',
        'hodnotit.bloky.popis': 'These three corners of the model are never scored with a number. Fitness and speed belong under „Physical".',
        'hodnotit.cile.popis': 'Two or three, concrete and verifiable. The player must be able to tell whether they met them.',
        'hodnotit.cil': 'Goal {0}',
        'hodnotit.ulozit': 'Save evaluation',
        'hodnotit.ulozit.tip': 'Saves the evaluation as a new record',
        'hodnotit.chybi': 'Missing score: {0}.',
        'hodnotit.ulozeno': 'Evaluation saved: {0}, period {1}.',
        'hodnotit.naList': 'Open printable sheet',
        'hodnotit.naList.tip': 'Opens this player’s printable sheet',
        'hodnotit.dalsi': 'Next player',
        'hodnotit.dalsi.tip': 'Evaluate another player',

        'blok.fyzicky': 'Physical',
        'blok.hlavou': 'Mental',
        'blok.parta': 'Social',

        'listy.nadpis': 'Printable sheets',
        'listy.popis': 'One player = one A4. Sheets are built from the database, open in a new tab and print from there.',
        'listy.obdobi': 'Period',
        'listy.polygon': 'Second polygon in the chart',
        'listy.polygon.minule': 'coach, previous period (progress)',
        'listy.polygon.hrac': 'player’s self-evaluation (for the talk)',
        'listy.polygon.zadne': 'none — current only',
        'listy.dva': 'A sheet holds at most two polygons. Three are unreadable.',
        'listy.kdo': 'Who gets printed',
        'listy.vsichni.tip': 'Select all',
        'listy.otevrit': 'Open sheets for printing',
        'listy.otevrit.tip': 'Opens printable sheets of the selected players',
        'listy.nikdo': 'Nobody is selected.',

        'porovnani.nadpis': 'Coach vs. player',
        'porovnani.popis': 'Only axes where the difference exceeds the tolerance are discussed (currently {0}, change it in Settings).',
        'porovnani.rozdily': 'Differences for period {0}',
        'porovnani.osa': 'Axis',
        'porovnani.rozdil': 'difference',
        'porovnani.kRozhovoru': 'to discuss',
        'porovnani.vToleranci': 'within tolerance',
        'porovnani.slepeMisto': 'blind spot — feedback is missing',
        'porovnani.sebeduvera': 'confidence — may be about something outside football',
        'porovnani.upozorneni': '{0} axes exceed the tolerance. That is too much for one talk — pick 2 or 3 topics.',
        'porovnani.legenda': '<b>+</b> the player scored higher than the coach = blind spot, feedback is missing.<br><b>−</b> the player scored lower than the coach = confidence, may be about something outside football.',
        'porovnani.napsal': 'The player wrote:',
        'porovnani.chybi': 'For period {0} we are still missing: {1}. The comparison appears once both sides are in.',
        'porovnani.chybi.trener': 'the coach evaluation',
        'porovnani.chybi.hrac': 'the player self-evaluation',
        'porovnani.a': ' and ',

        'trend.nadpis': 'Progress over time',
        'trend.jenTrener': '— for the coach only, this does not belong on the player’s sheet',
        'trend.malo': 'A trend needs at least a second period.',
        'trend.souhrn': '{0} → {1}: {2} axes up, {3} down, {4} unchanged.',
        'trend.pasmo': 'Only a difference of 2 points counts as a change; a 1-point shift in a subjective score is not a signal.',

        'odkazy.nadpis': 'Self-evaluation links',
        'odkazy.popis': 'Each link works once. Send it to the individual player, not to the team group — whoever has the link can fill the self-evaluation in for them.',
        'odkazy.platnost': 'Valid for (days)',
        'odkazy.generovat': 'Generate for all players',
        'odkazy.generovat.tip': 'Generates a link for every active player',
        'odkazy.obdobi': 'Period {0}',
        'odkazy.stav': 'State',
        'odkazy.platiDo': 'Valid until',
        'odkazy.odkaz': 'Link',
        'odkazy.ceka': 'waiting',
        'odkazy.vyplneno': 'submitted',
        'odkazy.prazdno': 'No links for this period yet.',
        'odkazy.kopirovat': 'Copy',
        'odkazy.kopirovat.tip': 'Copies the whole link to the clipboard',
        'odkazy.zkopirovano': 'Copied',
        'odkazy.rucne': 'Copy the link manually:',
        'odkazy.zneplatnit': 'Revoke',
        'odkazy.zneplatnit.tip': 'The link stops working',
        'odkazy.potvrdit': 'Revoke this link? The player will need a new one.',
        'odkazy.vytvoreno': 'Links generated: {0}.',

        'nastaveni.nadpis': 'Settings',
        'nastaveni.popis': 'Tolerance and period drive the comparison and the pairing of evaluations. The rest goes into the sheet header.',
        'nastaveni.tolerance': 'Difference tolerance (0–9)',
        'nastaveni.tolerance.napoveda': 'How far the coach and player scores may differ before the axis is worth discussing.',
        'nastaveni.obdobi': 'Period',
        'nastaveni.obdobi.napoveda': 'For example „2025/2026 winter". Coach and player evaluations are paired by it.',
        'nastaveni.sezona': 'Season',
        'nastaveni.sezona.napoveda': 'Printed in the sheet header.',
        'nastaveni.klub': 'Club',
        'nastaveni.kategorie': 'Age group',
        'nastaveni.latka': 'Measured against',
        'nastaveni.latka.napoveda': 'Text in the sheet footer: „what an under-15 should be able to do".',
        'nastaveni.cileNadpis': 'Heading above the goals',
        'nastaveni.cileNadpis.napoveda': 'For example „What we work on until winter".',
        'nastaveni.ulozit': 'Save',
        'nastaveni.ulozit.tip': 'Saves the settings',
        'nastaveni.ulozeno': 'Settings saved.',
        'notif.nadpis': 'Digest notifications',
        'notif.popis': 'The digest is sent as one message, not one per event. Channels are switched on for a specific coach under People.',
        'notif.zapnuto': 'Send digests',
        'notif.cas': 'At (local time)',
        'notif.cas.napoveda': 'The digest goes out at this hour, when there is something to send.',
        'notif.dnyZmeny': 'When something happens: at most once every (days)',
        'notif.dnyZmeny.napoveda': 'Changes add up and arrive in one message. Not one message per evaluation.',
        'notif.dnyTicho': 'When nothing happens: check in after (days)',
        'notif.dnyTicho.napoveda': 'A „nothing changed" message. Without it you cannot tell whether nobody is doing anything or something broke.',
        'notif.ceka': 'Waiting to be sent: {0}',
        'notif.hodiny': 'It is {0}:00 now, the digest goes out at {1}:00 (local time).',
        'notif.posledni': 'Last sent: {0}',
        'notif.nikdy': 'never yet',
        'notif.prijemci': 'Recipients: {0}',
        'notif.bezPrijemcu': 'Nobody has notifications switched on — the digest has nowhere to go.',
        'notif.poslatTed': 'Send digest now',
        'notif.poslatTed.tip': 'Sends the digest immediately, regardless of the configured time',
        'notif.kanaly': 'Channel status',

        'self.nadpis': 'Self-evaluation',
        'self.ahoj': 'Hi {0}',
        'self.popis': 'This is not a test and nobody except the coach will see it. Answer how you feel it — the more honest, the more useful. You fill it in once, there is no second try.',
        'self.otazka': 'What do you want to work on? (optional)',
        'self.placeholder': 'One sentence is enough.',
        'self.odeslat': 'Send',
        'self.odeslat.tip': 'Sends the self-evaluation to the coach',
        'self.chybi': 'Still missing: {0}.',
        'self.hotovo': '<b>Thanks, done.</b><br>The coach has it. Once you both have it filled in, you will go through where your views differ — that is the interesting part.',
        'self.jizOdeslano': 'You have already sent your self-evaluation. Thanks — the coach has it.',

        'list.nadpis': 'Player evaluation',
        'list.sezona': 'season',
        'list.vystaveno': 'Issued',
        'list.nevyplneno': '⚠ No evaluation for this period yet.',
        'list.ted': 'now',
        'list.minule': 'previous',
        'list.trener': 'coach',
        'list.hracSeVidi': 'the player’s own view',
        'list.jakCist': 'How to read the numbers:',
        'list.paticka': 'The chart compares you with what {0} should be able to do. Not with your team-mates.<br>Do not compare the shapes with each other — left-footed and right-footed players have the notch on opposite sides.',
        'list.podpis': 'coach',
        'list.neznamaSablona': 'Player „{0}" has an unknown template: {1}',

        'tisk.vytisknout': '🖨️ Print',
        'tisk.tip': 'Opens the print dialog. One player = one A4 page. Turn on „Background graphics".',
        'tisk.stav': '{0} — sheets: {1}',
        'tisk.bez': ' ({0} of them without an evaluation)',
        'tisk.chyba': 'The sheets could not be rendered.',
        'tisk.neprihlasen': 'You are not signed in. Open the application and sign in.',
        'tisk.stavChyba': 'Error',

        'chyba.odhlasen': 'Signed out — please sign in again.',
        'chyba.server': 'The server responded {0}.',
        'chyba.odkaz': 'The link is not valid.',

        'osa.prava': 'Right foot technique',
        'osa.leva': 'Left foot technique',
        'osa.hlavicky': 'Heading',
        'osa.prihravka': 'Passing and first touch',
        'osa.braneni': 'Defending 1v1',
        'osa.skenovani': 'Scanning and positioning',
        'osa.chytani': 'Shot stopping',
        'osa.misto': 'Positioning and angles',
        'osa.nohama': 'Playing out with feet',
        'osa.vykopy': 'Goal kicks and long distribution',
        'osa.mimo': 'Off the line and crosses',
        'osa.organizace': 'Organising and communication',

        'ja.prava': 'With my right foot I hit what I aim for — even under pressure.',
        'ja.leva': 'With my left foot I pass ten metres exactly where I want.',
        'ja.hlavicky': 'In the air I back myself and head the ball cleanly.',
        'ja.prihravka': 'My first touch sets me up and my pass arrives where I aim.',
        'ja.braneni': 'One on one I keep the ball or win it back.',
        'ja.skenovani': 'Before the ball reaches me I know who is around me.',
        'ja.chytani': 'I stop the shot and hold on to the ball.',
        'ja.misto': 'I stand where I should — the striker has no angle on me.',
        'ja.nohama': 'I can play out along the ground even under pressure.',
        'ja.vykopy': 'My kick reaches where I want it, to our player.',
        'ja.mimo': 'I come for the cross and claim the ball.',
        'ja.organizace': 'I direct the defence with my voice and they understand me.',

        'kotva.1.rozsah': '1–3', 'kotva.1.text': 'starting out, only calm and unpressured',
        'kotva.2.rozsah': '4–5', 'kotva.2.text': 'fine in training, patchy in a match',
        'kotva.3.rozsah': '6–7', 'kotva.3.text': 'reliable in a match too',
        'kotva.4.rozsah': '8–9', 'kotva.4.text': 'a strength, one the team leans on',
        'kotva.5.rozsah': '10',  'kotva.5.text': 'above the level of this age group'
    }
};

/* ===================== API ===================== */

let aktualni = nactiJazyk();

function nactiJazyk() {
    // 1) ?lang=en v adrese — aby šel poslat odkaz rovnou v daném jazyce
    try {
        const zAdresy = new URLSearchParams(location.search).get('lang');
        if (zAdresy && SLOVNIK[zAdresy]) return zAdresy;
    } catch { /* mimo prohlížeč */ }
    // 2) dřívější volba
    try {
        const ulozeny = localStorage.getItem(ULOZISTE);
        if (ulozeny && SLOVNIK[ulozeny]) return ulozeny;
    } catch { /* localStorage může být zakázané */ }
    // 3) jazyk prohlížeče, jinak čeština
    const prohlizec = (typeof navigator !== 'undefined' && navigator.language) || 'cs';
    return prohlizec.toLowerCase().startsWith('cs') ? 'cs' : 'en';
}

/** Aktuální jazyk: 'cs' | 'en' */
export function jazyk() {
    return aktualni;
}

/** Přepne jazyk a uloží volbu. Stránka se pak překreslí. */
export function nastavJazyk(novy) {
    aktualni = SLOVNIK[novy] ? novy : 'cs';
    try { localStorage.setItem(ULOZISTE, aktualni); } catch { /* nevadí */ }
    if (typeof document !== 'undefined') document.documentElement.lang = aktualni;
    return aktualni;
}

/** Ten druhý jazyk — pro přepínač. */
export function druhyJazyk() {
    return aktualni === 'cs' ? 'en' : 'cs';
}

/**
 * Přeloží klíč. Doplní {0}, {1}, … z dalších argumentů.
 * Chybějící klíč vrátí sám sebe, ať je hned vidět, co chybí.
 */
export function t(klic, ...hodnoty) {
    const text = SLOVNIK[aktualni][klic] ?? SLOVNIK.cs[klic] ?? klic;
    return hodnoty.length
        ? text.replace(/\{(\d+)\}/g, (_, i) => String(hodnoty[Number(i)] ?? ''))
        : text;
}

/** Osy šablony i s přeloženými popisy — přesně to, co chce radar(). */
export function osy(sablona) {
    return (SABLONY[sablona] ?? []).map(klic => ({ klic, popis: t('osa.' + klic) }));
}

/** Kotvy škály jako dvojice [rozsah, význam]. */
export function kotvy() {
    return [1, 2, 3, 4, 5].map(i => [t(`kotva.${i}.rozsah`), t(`kotva.${i}.text`)]);
}

/** Věta v první osobě pro osu — do formuláře hráče. */
export function ja(klic) {
    return t('ja.' + klic);
}

/** Formát data a času podle jazyka. */
export function locale() {
    return aktualni === 'cs' ? 'cs-CZ' : 'en-GB';
}
