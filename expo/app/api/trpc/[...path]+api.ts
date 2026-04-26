import honoApp from "@/backend/hono";

/** tRPC batch link calls `GET/POST {base}/football.getMatches` etc. — forward to Hono. */
export function GET(request: Request) {
  return honoApp.fetch(request);
}

export function POST(request: Request) {
  return honoApp.fetch(request);
}

export function PATCH(request: Request) {
  return honoApp.fetch(request);
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
