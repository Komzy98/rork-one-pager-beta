require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const YOUNIFY_MANAGEMENT_API_KEY = process.env.YOUNIFY_MANAGEMENT_API_KEY;
const YOUNIFY_MANAGEMENT_BASE_URL =
  process.env.YOUNIFY_MANAGEMENT_BASE_URL || "https://api.younify.tv/v1";

if (!YOUNIFY_MANAGEMENT_API_KEY) {
  console.error("Missing YOUNIFY_MANAGEMENT_API_KEY in environment.");
  process.exit(1);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/create-younify-user", async (req, res) => {
  try {
    const { externalUserId, email, name } = req.body || {};
    const resolvedExternalId = externalUserId || "one-pager-dev-user";
    const payload = {
      external_id: resolvedExternalId,
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      properties: {
        source: "one-pager",
      },
    };

    const response = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    let userId = data.data?.id;
    let accessToken = data.data?.access_token;
    let refreshToken = data.data?.refresh_token;

    if (!response.ok && response.status === 422) {
      // Common case for local dev: external_id already exists.
      const usersResponse = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
        headers: {
          "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY,
        },
      });
      const usersData = await usersResponse.json().catch(() => ({}));
      const existingUser = Array.isArray(usersData.data)
        ? usersData.data.find((user) => user.external_id === resolvedExternalId)
        : null;

      if (existingUser?.id) {
        userId = existingUser.id;
      }
    } else if (!response.ok) {
      console.error("Younify create user failed:", {
        status: response.status,
        body: data,
      });

      return res.status(response.status).json({
        error: "Failed to create Younify user",
        details: data,
      });
    }

    if (userId && (!accessToken || !refreshToken)) {
      const tokenResponse = await fetch(
        `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${userId}/tokens`,
        {
          method: "POST",
          headers: {
            "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY,
          },
        },
      );
      const tokenData = await tokenResponse.json().catch(() => ({}));

      if (!tokenResponse.ok) {
        return res.status(tokenResponse.status).json({
          error: "Failed to generate Younify user tokens",
          details: tokenData,
        });
      }

      accessToken = tokenData.data?.access_token;
      refreshToken = tokenData.data?.refresh_token;
    }

    if (!userId || !accessToken || !refreshToken) {
      console.error("Younify response missing fields:", data);
      return res.status(502).json({
        error: "Younify response missing user tokens",
        details: data,
      });
    }

    return res.json({
      userId,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Unexpected error in /create-younify-user:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/refresh-younify-user-tokens", async (req, res) => {
  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const response = await fetch(
      `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${userId}/tokens`,
      {
        method: "POST",
        headers: {
          "x-mmt-api-secret": YOUNIFY_MANAGEMENT_API_KEY,
        },
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Younify token generation failed:", {
        status: response.status,
        body: data,
      });

      return res.status(response.status).json({
        error: "Failed to refresh Younify tokens",
        details: data,
      });
    }

    const accessToken = data.data?.access_token;
    const refreshToken = data.data?.refresh_token;

    if (!accessToken || !refreshToken) {
      return res.status(502).json({
        error: "Younify token response missing tokens",
        details: data,
      });
    }

    return res.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Unexpected error in /refresh-younify-user-tokens:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  