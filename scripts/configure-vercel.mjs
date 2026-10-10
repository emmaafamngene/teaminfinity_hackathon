import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
// Only public Supabase configuration is copied; no auth/SMTP tokens are read.
const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
  const line = lines.find((l) => l.startsWith(name + "="));
  if (!line) throw new Error(`Missing ${name}`);
  const value = line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
  const command = `npx.cmd --yes vercel@63.1.2 env add ${name} production,preview --yes`;
  const result = spawnSync("cmd.exe", ["/d", "/s", "/c", command], { input: value + "\n", encoding: "utf8", timeout: 120000 });
  if (result.status !== 0) throw new Error(`Vercel could not add ${name}: ${result.error?.message || "check project permissions"}`);
  console.log(`Configured ${name} for Production and Preview.`);
}
