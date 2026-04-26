import honoApp from "@/backend/hono";

export function GET(request: Request) {
  return honoApp.fetch(request);
}

export function POST(request: Request) {
  return honoApp.fetch(request);
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
