import type { Hono } from "hono";
import {
  createYounifyUserTokens,
  getYounifyManagementConfig,
  refreshYounifyUserTokens,
} from "./core";

export function registerYounifyAuthRoutes(app: Hono) {
  app.get("/health/younify", (c) => {
    const { configured } = getYounifyManagementConfig();
    return c.json({
      ok: configured,
      service: "younify-auth",
      managementKeyConfigured: configured,
      timestamp: new Date().toISOString(),
    }, configured ? 200 : 503);
  });

  app.post("/create-younify-user", async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const tokens = await createYounifyUserTokens({
        externalUserId: typeof body.externalUserId === "string" ? body.externalUserId : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        name: typeof body.name === "string" ? body.name : undefined,
      });
      return c.json(tokens);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("not configured") ? 503 : 500;
      console.error("[Younify] create-younify-user:", message);
      return c.json({ error: message }, status);
    }
  });

  app.post("/refresh-younify-user-tokens", async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const userId = typeof body.userId === "string" ? body.userId : "";
      const tokens = await refreshYounifyUserTokens({ userId });
      return c.json(tokens);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const status =
        message === "Missing userId" ? 400 : message.includes("not configured") ? 503 : 500;
      console.error("[Younify] refresh-younify-user-tokens:", message);
      return c.json({ error: message }, status);
    }
  });
}
