import { spawnSync } from "node:child_process";

const checks = [
  ["provider:check", ["run", "provider:check"]],
  ["prod:check", ["run", "prod:check"]],
  ["supabase:schema:check", ["run", "supabase:schema:check"]],
  ["supabase:check", ["run", "supabase:check"]],
  ["supabase:mount:check", ["run", "supabase:mount:check"]],
  ["supabase:push:dry", ["run", "supabase:push:dry"]],
  ["smoke", ["run", "smoke"]],
  ["audit:functional", ["run", "audit:functional"]],
  ["audit:ui", ["run", "audit:ui"]],
  ["audit:data", ["run", "audit:data"]],
  ["build", ["run", "build"]],
  ["perf:check", ["run", "perf:check"]],
];

const results = [];

for (const [name, args] of checks) {
  const result = spawnSync("npm", args, { stdio: "pipe", encoding: "utf8" });
  results.push({
    name,
    ok: result.status === 0,
    status: result.status,
    tail: `${result.stdout || ""}${result.stderr || ""}`.trim().split("\n").slice(-8),
  });
  if (result.status !== 0) break;
}

console.log(JSON.stringify({ ok: results.every((item) => item.ok), results }, null, 2));

if (!results.every((item) => item.ok)) process.exitCode = 1;
