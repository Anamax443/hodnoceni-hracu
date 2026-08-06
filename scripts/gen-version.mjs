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
console.log(`version.json: ${version.commit} (${version.branch})${version.cisto ? "" : " +necommitnuté změny"} @ ${version.builtAt}`);
