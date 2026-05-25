import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const ASSETS_DIR = resolve("dist", "assets");
const MAIN_LIMIT_KB = Number(process.env.ASSUR_MAIN_BUNDLE_LIMIT_KB || 450);
const CHUNK_LIMIT_KB = Number(process.env.ASSUR_CHUNK_LIMIT_KB || 650);

function kb(bytes) {
  return Math.round(bytes / 1024 * 10) / 10;
}

const files = await readdir(ASSETS_DIR);
const jsFiles = [];
for (const file of files.filter((name) => name.endsWith(".js"))) {
  const info = await stat(resolve(ASSETS_DIR, file));
  jsFiles.push({ file, kb: kb(info.size) });
}

const main = jsFiles.find((item) => /^index-.*\.js$/.test(item.file));
const oversized = jsFiles.filter((item) => item.kb > CHUNK_LIMIT_KB);
const errors = [];

if (!main) errors.push("No se encontró bundle principal index-*.js.");
if (main && main.kb > MAIN_LIMIT_KB) {
  errors.push(`Bundle principal demasiado grande: ${main.kb} KB > ${MAIN_LIMIT_KB} KB.`);
}
for (const chunk of oversized) {
  errors.push(`Chunk demasiado grande: ${chunk.file} ${chunk.kb} KB > ${CHUNK_LIMIT_KB} KB.`);
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  limits: { mainKb: MAIN_LIMIT_KB, chunkKb: CHUNK_LIMIT_KB },
  main,
  largest: jsFiles.sort((a, b) => b.kb - a.kb).slice(0, 8),
  errors,
}, null, 2));

if (errors.length) process.exitCode = 1;
