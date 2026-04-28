/**
 * Standalone Hono + tRPC server for production (e.g. Railway).
 * Local dev still uses Metro/Rork; TestFlight needs EXPO_PUBLIC_RORK_API_BASE_URL → this process.
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
