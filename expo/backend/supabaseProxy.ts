import type { Hono } from "hono";

function readSupabaseServerConfig(): { url: string; anonKey: string } | null {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

const SAFE_RESPONSE_HEADERS = new Set([
  "content-type",
  "cache-control",
  "x-supabase-api-version",
]);

/** Forwarder for simulator dev — mounted under /api/trpc so Metro's Expo API route reaches Hono. */
export function registerSupabaseDevProxy(app: Hono) {
  app.all("/api/trpc/supabase-proxy/*", async (c) => {
    const config = readSupabaseServerConfig();
    if (!config) {
      return c.json({ error: "Supabase is not configured on the API server." }, 500);
    }

    const reqUrl = new URL(c.req.url);
    const suffix = reqUrl.pathname.replace(/^\/api\/trpc\/supabase-proxy/, "") + reqUrl.search;
    const targetUrl = `${config.url}${suffix || "/"}`;

    const forwardHeaders: Record<string, string> = {};
    const auth = c.req.header("authorization");
    const apikey = c.req.header("apikey");
    const contentType = c.req.header("content-type");
    const prefer = c.req.header("prefer");

    forwardHeaders.apikey = apikey || config.anonKey;
    forwardHeaders.Authorization = auth || `Bearer ${config.anonKey}`;
    if (contentType) forwardHeaders["Content-Type"] = contentType;
    if (prefer) forwardHeaders.Prefer = prefer;

    const method = c.req.method.toUpperCase();
    const body =
      method === "GET" || method === "HEAD" ? undefined : await c.req.arrayBuffer();

    const upstream = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: body && body.byteLength > 0 ? body : undefined,
    });

    const responseBody = await upstream.arrayBuffer();
    const contentTypeHeader =
      upstream.headers.get("content-type") || "application/json; charset=utf-8";

    const responseHeaders = new Headers({
      "Content-Type": contentTypeHeader,
      "Content-Length": String(responseBody.byteLength),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (SAFE_RESPONSE_HEADERS.has(lower) && lower !== "content-type") {
        responseHeaders.set(key, value);
      }
    });

    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  });
}
