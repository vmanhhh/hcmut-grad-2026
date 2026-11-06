// `pnpm db:migrate [-- --env .env.test]` -> supabase db push --db-url $SUPABASE_DB_URL --include-seed
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const envIdx = process.argv.indexOf("--env");
const envFile = envIdx > -1 ? process.argv[envIdx + 1] : ".env.local";
if (!existsSync(envFile)) {
  console.error(`Missing ${envFile}. Copy .env.example and fill SUPABASE_DB_URL.`);
  process.exit(1);
}
process.loadEnvFile(envFile);
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is empty.");
  process.exit(1);
}
const r = spawnSync("pnpm", ["exec", "supabase", "db", "push", "--db-url", url, "--include-seed"], {
  stdio: "inherit",
  shell: true,
});
process.exit(r.status ?? 1);
