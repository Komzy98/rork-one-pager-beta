import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
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
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  const key =
    process.env.FOOTBALL_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_FOOTBALL_API_KEY?.trim();
  if (!key) {
    console.log("NO_API_KEY");
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const future = new Date();
  future.setDate(future.getDate() + 14);
  const to = future.toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  const url = `${process.env.FOOTBALL_API_BASE_URL || "https://v3.football.api-sports.io"}/fixtures?league=1&season=2026&from=${today}&to=${to}`;
  const res = await fetch(url, { headers: { "x-apisports-key": key } });
  const data = await res.json();
  const frSn = (data.response ?? []).find((f: any) => {
    const h = f.teams?.home?.name ?? "";
    const a = f.teams?.away?.name ?? "";
    return (
      (h.includes("France") && a.includes("Senegal")) ||
      (h.includes("Senegal") && a.includes("France"))
    );
  });

  console.log("window", today, "->", to);
  console.log("wc_count", data.response?.length ?? 0);
  if (frSn) {
    console.log("fr_sn", {
      date: frSn.fixture?.date,
      status: frSn.fixture?.status?.short,
      leagueId: frSn.league?.id,
      leagueName: frSn.league?.name,
      home: frSn.teams?.home?.name,
      away: frSn.teams?.away?.name,
    });
  } else {
    console.log("fr_sn MISSING");
  }

  const { appRouter } = await import("../backend/trpc/app-router");
  const { createContext } = await import("../backend/trpc/create-context");
  const ctx = await createContext({ req: new Request("http://test") } as Parameters<
    typeof createContext
  >[0]);
  const caller = appRouter.createCaller(ctx);

  for (const label of ["worldwide", "for-you"] as const) {
    const input =
      label === "worldwide"
        ? { days: 14, includeResults: false as const }
        : {
            days: 14,
            includeResults: false as const,
            leagueIds: [39, 140, 78, 135, 61, 2, 3],
          };
    const out = await caller.football.getMatchesBundle(input);
    const fixtures = out.upcoming?.response ?? [];
    const hit = fixtures.find((f: any) => {
      const h = f.teams?.home?.name ?? "";
      const a = f.teams?.away?.name ?? "";
      return (
        (h.includes("France") && a.includes("Senegal")) ||
        (h.includes("Senegal") && a.includes("France"))
      );
    });
    console.log(
      label,
      "bundle_upcoming",
      fixtures.length,
      hit ? `HAS ${hit.fixture?.date} league=${hit.league?.id}` : "MISSING",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
