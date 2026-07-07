/**
 * Standalone Hono + tRPC server for production (e.g. Railway).
 *
 * Deploy story (see docs/FOOTBALL_DEPLOY.md):
 * - Simulator (no EXPO_PUBLIC_RORK_API_BASE_URL) → Metro :8081 embeds tRPC from this repo.
 * - TestFlight / EAS → EXPO_PUBLIC_RORK_API_BASE_URL must point at this process on Railway.
 *
 * Health: GET /health, GET /health/football (WC bundle smoke, teamIds []).
 */
import { config } from "dotenv";
import { serve } from "@hono/node-server";
import app from "./hono";

config();

const port = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  },
  (info) => {
    console.log(
      `Hono tRPC API at http://${info.address}:${info.port} (public path /api/trpc)`,
    );
  },
);
