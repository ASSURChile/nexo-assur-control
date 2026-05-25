import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const appPath = join(root, "src/App.jsx");
const navPath = join(root, "src/config/navigation.js");
const app = readFileSync(appPath, "utf8");
const navigation = readFileSync(navPath, "utf8");

const errors = [];
const warnings = [];

function extractTabGroups(source) {
  const marker = "const TAB_GROUPS=[";
  const start = source.indexOf(marker);
  if (start < 0) return null;

  let i = start + "const TAB_GROUPS=".length;
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

const tabGroupBlock = extractTabGroups(navigation);
if (!tabGroupBlock) {
  errors.push("No se pudo encontrar TAB_GROUPS en src/config/navigation.js.");
}

const visibleTabs = new Set();
if (tabGroupBlock) {
  const tabArrays = tabGroupBlock.matchAll(/tabs:\[([\s\S]*?)\]/g);
  for (const [, block] of tabArrays) {
    for (const [, id] of block.matchAll(/\{id:"([^"]+)"/g)) visibleTabs.add(id);
  }
}

const renderedTabs = new Set([...app.matchAll(/tab==="([^"]+)"/g)].map((match) => match[1]));
for (const id of [...visibleTabs].sort()) {
  if (!renderedTabs.has(id)) errors.push(`El tab visible "${id}" no tiene render asociado.`);
}

const orphanRenderedTabs = [...renderedTabs].filter((id) => !visibleTabs.has(id)).sort();
if (orphanRenderedTabs.length) {
  warnings.push(`Tabs renderizados pero no visibles en menú principal: ${orphanRenderedTabs.join(", ")}.`);
}

const importedSources = [...app.matchAll(/^import\s+[\s\S]*?\s+from\s+["']([^"']+)["'];$/gm)].map((match) => match[1]);
const duplicatedImports = importedSources.filter((source, index) => importedSources.indexOf(source) !== index);
if (duplicatedImports.length) {
  errors.push(`Imports duplicados en App.jsx: ${[...new Set(duplicatedImports)].join(", ")}.`);
}

function listFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) files.push(...listFiles(full));
    else files.push(full);
  }
  return files;
}

const frontendFiles = listFiles(join(root, "src")).filter((file) => /\.(js|jsx|ts|tsx)$/.test(file));
const sharedFormatterNames = ["fmtCLP", "fmtPct", "fmtN", "fmtMil", "fmtMes", "todayISO"];
for (const file of frontendFiles) {
  const body = readFileSync(file, "utf8");
  if (body.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    errors.push(`Clave service-role referenciada en frontend: ${file.replace(root + "/", "")}.`);
  }
  if (file.endsWith(join("src", "utils", "formatters.js"))) continue;
  for (const name of sharedFormatterNames) {
    const usesFormatter = new RegExp(`\\b${name}\\s*\\(`).test(body);
    if (!usesFormatter) continue;
    const importedFormatter = new RegExp(`import\\s+\\{[^}]*\\b${name}\\b[^}]*\\}\\s+from\\s+["'][^"']*utils/formatters["']`).test(body);
    const localDeclaration = new RegExp(`\\b(?:const|let|var|function)\\s+${name}\\b`).test(body) ||
      new RegExp(`[,{]\\s*${name}\\s*[,}]`).test(body);
    if (!importedFormatter && !localDeclaration) {
      errors.push(`Uso de ${name} sin import/declaración local en ${file.replace(root + "/", "")}.`);
    }
  }
}

try {
  const modulosBlock = navigation.match(/export const MODULOS = \[([\s\S]*?)\];/)?.[1] || "";
  const legacyIds = new Set([...modulosBlock.matchAll(/\{id:"([^"]+)"/g)].map((match) => match[1]));
  const missingInConfig = [...visibleTabs].filter((id) => !legacyIds.has(id)).sort();
  if (missingInConfig.length) {
    warnings.push(`src/config/navigation.js no refleja todos los tabs activos: ${missingInConfig.join(", ")}.`);
  }
} catch {
  warnings.push("No se pudo leer src/config/navigation.js; se omite comparación legacy.");
}

const result = {
  ok: errors.length === 0,
  visibleTabs: [...visibleTabs].sort(),
  renderedTabs: [...renderedTabs].sort(),
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
