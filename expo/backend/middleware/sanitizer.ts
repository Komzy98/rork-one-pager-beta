import type { Context, Next } from "hono";

const MAX_JSON_BODY_SIZE = 100 * 1024; // 100 KB
const MAX_URL_LENGTH = 2048;


const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /url\s*\(\s*['"]?\s*data:/i,
  /vbscript:/i,
  /data:\s*text\/html/i,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|WHERE|SET|DATABASE)\b)/i,
  /(['";])\s*(OR|AND)\s+\d+\s*=\s*\d+/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//,
  /;\s*(DROP|DELETE|UPDATE|INSERT)\b/i,
];

export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  let sanitized = input.trim();
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = new RegExp('[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]', 'g');
  sanitized = sanitized.replace(controlCharRegex, "");
  return sanitized;
}

export function containsDangerousContent(input: string): boolean {
  if (typeof input !== "string") return false;
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  return false;
}

function deepScanObject(obj: unknown, depth: number = 0): { safe: boolean; reason?: string } {
  if (depth > 10) {
    return { safe: false, reason: "Payload nesting too deep (max 10 levels)" };
  }

  if (typeof obj === "string") {
    if (obj.length > 50000) {
      return { safe: false, reason: "String value exceeds maximum length (50000 chars)" };
    }
    if (containsDangerousContent(obj)) {
      return { safe: false, reason: "Potentially malicious content detected" };
    }
    return { safe: true };
  }

  if (Array.isArray(obj)) {
    if (obj.length > 1000) {
      return { safe: false, reason: "Array exceeds maximum length (1000 items)" };
    }
    for (const item of obj) {
      const result = deepScanObject(item, depth + 1);
      if (!result.safe) return result;
    }
    return { safe: true };
  }

  if (obj !== null && typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length > 200) {
      return { safe: false, reason: "Object exceeds maximum number of keys (200)" };
    }
    for (const key of keys) {
      if (containsDangerousContent(key)) {
        return { safe: false, reason: "Potentially malicious content in object key" };
      }
      const result = deepScanObject((obj as Record<string, unknown>)[key], depth + 1);
      if (!result.safe) return result;
    }
    return { safe: true };
  }

  return { safe: true };
}

export function payloadSizeLimiter(maxBytes: number = MAX_JSON_BODY_SIZE) {
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      console.log(`🚫 Payload too large: ${contentLength} bytes (max ${maxBytes})`);
      return c.json(
        { error: { message: `Payload too large. Maximum size is ${Math.round(maxBytes / 1024)}KB.` } },
        413
      );
    }

    const url = c.req.url;
    if (url.length > MAX_URL_LENGTH) {
      console.log(`🚫 URL too long: ${url.length} chars (max ${MAX_URL_LENGTH})`);
      return c.json(
        { error: { message: "URL exceeds maximum length." } },
        414
      );
    }

    await next();
  };
}

export function inputSanitizer() {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    const pathname = new URL(c.req.url).pathname;
    const isTrpcRoute =
      pathname === "/api/trpc" ||
      pathname.startsWith("/api/trpc/") ||
      pathname === "/trpc" ||
      pathname.startsWith("/trpc/");

    if (["POST", "PUT", "PATCH"].includes(method) && !isTrpcRoute) {
      const contentType = c.req.header("content-type") || "";

      if (contentType.includes("application/json")) {
        try {
          const rawBody = await c.req.text();

          if (rawBody.length > MAX_JSON_BODY_SIZE) {
            console.log(`🚫 JSON body too large: ${rawBody.length} bytes`);
            return c.json(
              { error: { message: `Request body too large. Maximum size is ${Math.round(MAX_JSON_BODY_SIZE / 1024)}KB.` } },
              413
            );
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            console.log("🚫 Malformed JSON rejected");
            return c.json(
              { error: { message: "Malformed JSON in request body." } },
              400
            );
          }

          const scanResult = deepScanObject(parsed);
          if (!scanResult.safe) {
            console.log(`🚫 Dangerous payload rejected: ${scanResult.reason}`);
            return c.json(
              { error: { message: scanResult.reason || "Invalid request payload." } },
              400
            );
          }
        } catch (err: any) {
          if (err instanceof Response) throw err;
          console.log(`🚫 Error reading request body: ${err.message}`);
          return c.json(
            { error: { message: "Unable to process request body." } },
            400
          );
        }
      }
    }

    const queryParams = new URL(c.req.url).searchParams;
    for (const [key, value] of queryParams.entries()) {
      if (containsDangerousContent(key) || containsDangerousContent(value)) {
        console.log(`🚫 Dangerous query parameter rejected: ${key}`);
        return c.json(
          { error: { message: "Invalid query parameters." } },
          400
        );
      }
      if (value.length > 2000) {
        console.log(`🚫 Query parameter too long: ${key} (${value.length} chars)`);
        return c.json(
          { error: { message: "Query parameter value too long." } },
          400
        );
      }
    }

    await next();
  };
}
