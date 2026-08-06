// Zapíše živý commit hash + čas buildu do web/version.json.
// Spouští se automaticky před `npm run deploy` (predeploy). Stránka to čte do patičky,
// aby bylo na nasazené aplikaci vidět, která verze zrovna běží.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const version = {
  commit: git("rev-parse --short HEAD"),
  commitFull: git("rev-parse HEAD"),
  branch: git("rev-parse --abbrev-ref HEAD"),
  cisto: git("status --porcelain") === "",
  builtAt: new Date().toISOString(),
};

writeFileSync(new URL("../web/version.json", import.meta.url), JSON.stringify(version, null, 2));

// Totéž zapečené do Workeru. Číst verzi z assetu se neosvědčilo: na custom doméně
// ji držela cache zóny a po nasazení lišta ukazovala předchozí commit, i když
// odpověď měla no-store. Co je v bundlu, to cache obejít nemůže.
writeFileSync(
  new URL("../worker/src/version.ts", import.meta.url),
  `// Generovaný soubor (scripts/gen-version.mjs), v .gitignore. Needituj ručně.\n`
    + `export const VERZE = ${JSON.stringify(version, null, 4)} as const;\n`
);

console.log(`version.json: ${version.commit} (${version.branch})${version.cisto ? "" : " +necommitnuté změny"} @ ${version.builtAt}`);
