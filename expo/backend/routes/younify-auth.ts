import { Hono } from "hono";

const YOUNIFY_MANAGEMENT_API_KEY =
  process.env.YOUNIFY_API_KEY ||
  process.env.YOUNIFY_MANAGEMENT_API_KEY ||
  "";
const YOUNIFY_MANAGEMENT_BASE_URL =
  process.env.YOUNIFY_MANAGEMENT_BASE_URL || "https://api.younify.tv/v1";

type YounifyManagementResponse = {
  data?: {
    id?: string;
    external_id?: string;
    access_token?: string;
    refresh_token?: string;
  };
  [k: string]: unknown;
};

type YounifyUsersListResponse = {
  data?: { id?: string; external_id?: string }[];
};

const younifyAuth = new Hono();

younifyAuth.get("/health", (c) =>
  c.json({
    ok: true,
    configured: Boolean(YOUNIFY_MANAGEMENT_API_KEY),
    base: YOUNIFY_MANAGEMENT_BASE_URL,
  }),
);

younifyAuth.post("/create-younify-user", async (c) => {
  if (!YOUNIFY_MANAGEMENT_API_KEY) {
    console.error("[younify-auth] Missing YOUNIFY_API_KEY env var");
    return c.json(
      {
        error:
          "Younify management API key not configured (set YOUNIFY_API_KEY in env)",
      },
      500,
    );
  }

  let body: { externalUserId?: string; email?: string; name?: string } = {};
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    body = {};
  }

  const resolvedExternalId = body.externalUserId || "one-pager-dev-user";
  const payload: Record<string, unknown> = {
    external_id: resolvedExternalId,
    properties: { source: "one-pager" },
  };
  if (body.email) payload.email = body.email;
  if (body.name) payload.name = body.name;

  console.log("[younify-auth] create user:", resolvedExternalId);

  const createRes = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const createData = (await createRes
    .json()
    .catch(() => ({}))) as YounifyManagementResponse;

  let userId = createData.data?.id;
  let accessToken = createData.data?.access_token;
  let refreshToken = createData.data?.refresh_token;

  if (!createRes.ok && createRes.status === 422) {
    const usersRes = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
      headers: { "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY },
    });
    const usersData = (await usersRes
      .json()
      .catch(() => ({}))) as YounifyUsersListResponse;
    const existing = Array.isArray(usersData.data)
      ? usersData.data.find((u) => u.external_id === resolvedExternalId)
      : null;
    if (existing?.id) {
      userId = existing.id;
    }
  } else if (!createRes.ok) {
    console.error("[younify-auth] create user failed:", createRes.status, createData);
    return c.json(
      { error: "Failed to create Younify user", details: createData },
      createRes.status as 400,
    );
  }

  if (userId && (!accessToken || !refreshToken)) {
    const tokenRes = await fetch(
      `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${userId}/tokens`,
      {
        method: "POST",
        headers: { "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY },
      },
    );
    const tokenData = (await tokenRes
      .json()
      .catch(() => ({}))) as YounifyManagementResponse;
    if (!tokenRes.ok) {
      console.error("[younify-auth] token mint failed:", tokenRes.status, tokenData);
      return c.json(
        { error: "Failed to generate Younify user tokens", details: tokenData },
        tokenRes.status as 400,
      );
    }
    accessToken = tokenData.data?.access_token;
    refreshToken = tokenData.data?.refresh_token;
  }

  if (!userId || !accessToken || !refreshToken) {
    console.error("[younify-auth] response missing fields:", createData);
    return c.json(
      { error: "Younify response missing user tokens", details: createData },
      502,
    );
  }

  return c.json({ userId, accessToken, refreshToken });
});

younifyAuth.post("/refresh-younify-user-tokens", async (c) => {
  if (!YOUNIFY_MANAGEMENT_API_KEY) {
    return c.json({ error: "Younify management API key not configured" }, 500);
  }

  let body: { userId?: string } = {};
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

  const res = await fetch(
    `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${body.userId}/tokens`,
    {
      method: "POST",
      headers: { "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY },
    },
  );

  const data = (await res.json().catch(() => ({}))) as YounifyManagementResponse;

  if (!res.ok) {
    console.error("[younify-auth] refresh failed:", res.status, data);
    return c.json(
      { error: "Failed to refresh Younify tokens", details: data },
      res.status as 400,
    );
  }

  const accessToken = data.data?.access_token;
  const refreshToken = data.data?.refresh_token;

  if (!accessToken || !refreshToken) {
    return c.json(
      { error: "Younify token response missing tokens", details: data },
      502,
    );
  }

  return c.json({ accessToken, refreshToken });
});

export default younifyAuth;
