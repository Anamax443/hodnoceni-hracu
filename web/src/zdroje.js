/* Metodické prameny, ze kterých hodnocení vychází.
 *
 * Drží se na jednom místě, protože na ně odkazuje formulář hodnocení
 * i dokumentace v aplikaci — a odkaz, který se rozejde, je horší než žádný.
 * Ověřeno 10. 8. 2026: obě stránky žijí a obsahují to, co u nich stojí.
 *
 * Anglická škola dělí hráče na čtyři rohy, španělská na osm struktur.
 * Aplikace je bere jako doplňující se pohledy na jednu věc: hráč není
 * jen to, co jde změřit, a to neměřitelné se popisuje slovy, ne známkou.
 */

/** FA Four Corner Model — technicko-taktický, fyzický, psychologický, sociální roh. */
export const ZDROJ_FA =
    'https://learn.englandfootball.com/articles-and-resources/coaching/resources/2022/the-fa-4-corner-model';

/** Paco Seirul·lo (FC Barcelona), strukturovaný trénink — španělsky. */
export const ZDROJ_ES =
    'https://barcainnovationhub.fcbarcelona.com/es/blog/la-propuesta-de-paco-seirul%C2%B7lo-para-el-entrenamiento-en-deportes-de-equipo-el-entrenamiento-estructurado-los-espacios-de-juego-y-las-situaciones-simuladoras-preferenciales/';

/** Tentýž článek anglicky — pro toho, kdo španělsky nečte. */
export const ZDROJ_ES_EN =
    'https://barcainnovationhub.fcbarcelona.com/blog/paco-seirul%C2%B7los-proposal-for-team-sports-training-structured-training-game-spaces-and-preferential-simulation-situations/';

/** Stránka FA (The Boot Room), kde je model vyložený i ve videu. */
export const ZDROJ_FA_VIDEO =
    'https://www.thefa.com/bootroom/resources/coaching/the-fas-4-corner-model';

/* Video k španělské škole je cizí kanál na YouTube, ne stránka federace —
   může zmizet, aniž o tom budeme vědět. Články výš jsou to trvalejší;
   tohle je navíc pro toho, kdo radši poslouchá, než čte. */
export const ZDROJ_ES_VIDEO = 'https://www.youtube.com/watch?v=YQLnAQF_H2U';
