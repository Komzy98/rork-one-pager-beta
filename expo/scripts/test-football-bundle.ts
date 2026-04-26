/**
 * Verify football.getMatchesBundle + API key (run from repo root: npx tsx scripts/test-football-bundle.ts)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

import { appRouter } from "../backend/trpc/app-router";
import { createContext } from "../backend/trpc/create-context";

async function main() {
  const ctx = await createContext({ req: new Request("http://test") } as Parameters<
    typeof createContext
  >[0]);
  const caller = appRouter.createCaller(ctx);
  const includeResults = process.argv.includes("--with-results");
  const out = await caller.football.getMatchesBundle({
    includeResults,
    days: 14,
    teamIds: [33, 40],
  });
  const block = (b: (typeof out)["live"] | null) => ({
    count: b?.response?.length ?? 0,
    config: (b?.errors as Record<string, unknown> | undefined)?.config,
  });
  console.log(
    JSON.stringify(
      {
        live: block(out.live),
        upcoming: block(out.upcoming),
        results: out.results === null ? "skipped" : block(out.results),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
