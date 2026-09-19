import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function listAssets(directory, prefix) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? listAssets(join(directory, entry.name), `${prefix}/${entry.name}`)
        : [`${prefix}/${entry.name}`],
    ),
  );
  return files.flat().filter((path) => /\.(js|css|woff2?)$/.test(path));
}

const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const assets = await listAssets(".next/static", "/_next/static");
const template = await readFile("scripts/service-worker.js", "utf8");
const worker = template
  .replace(
    "const CACHE = __CHORDIGO_CACHE__;",
    `const CACHE = ${JSON.stringify(`chordigo-${buildId}`)};`,
  )
  .replace("const ASSETS = __CHORDIGO_ASSETS__;", `const ASSETS = ${JSON.stringify(assets)};`);
await writeFile("public/sw.js", worker);
console.log(`Offline practice ready: ${assets.length} app assets, four practice rooms.`);
