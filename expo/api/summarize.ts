export const config = { runtime: "edge" };

const MAX_BODY_SIZE = 50 * 1024; // 50 KB
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getFallback(date?: string) {
  return {
    date: date && DATE_REGEX.test(date) ? date : new Date().toISOString().split('T')[0],
    summary: "Keep building momentum with your daily activities and habits!",
    wins: ["Stayed consistent with tracking"],
    challenges: ["Continue building routines"],
    streaks: [],
    recommendations: ["Focus on one habit at a time", "Set specific daily goals", "Celebrate small wins"],
    sentiment: "positive",
    score: 75,
  };
}

function jsonResponse(data: unknown, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: { message: "Method not allowed" } }, 405);
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      console.log(`🚫 Summarize payload too large: ${contentLength} bytes`);
      return jsonResponse({ error: { message: "Payload too large" } }, 413);
    }

    const rawBody = await req.text();

    if (rawBody.length > MAX_BODY_SIZE) {
      console.log(`🚫 Summarize body too large: ${rawBody.length} chars`);
      return jsonResponse({ error: { message: "Payload too large" } }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.log("🚫 Summarize: malformed JSON rejected");
      return jsonResponse({ error: { message: "Malformed JSON" } }, 400);
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      console.log("🚫 Summarize: invalid payload shape");
      return jsonResponse({ error: { message: "Expected a JSON object" } }, 400);
    }

    const parsed = body as Record<string, unknown>;
    const date = typeof parsed.date === "string" && DATE_REGEX.test(parsed.date)
      ? parsed.date
      : undefined;

    return jsonResponse(getFallback(date));
  } catch (err: any) {
    console.error("API Error:", err);
    return jsonResponse(getFallback());
  }
}