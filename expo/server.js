require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const YOUNIFY_MANAGEMENT_API_KEY = process.env.YOUNIFY_MANAGEMENT_API_KEY;
const YOUNIFY_MANAGEMENT_BASE_URL =
  process.env.YOUNIFY_MANAGEMENT_BASE_URL || "https://management.younify.tv";

if (!YOUNIFY_MANAGEMENT_API_KEY) {
  console.error("Missing YOUNIFY_MANAGEMENT_API_KEY in environment.");
  process.exit(1);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/create-younify-user", async (req, res) => {
  try {
    const { externalUserId } = req.body || {};
    const payload = {
      externalUserId: externalUserId || `user_${Date.now()}`,
    };

    const createUrl = `${YOUNIFY_MANAGEMENT_BASE_URL}/users`;
    console.log("Creating Younify user at:", createUrl);

    const response = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${YOUNIFY_MANAGEMENT_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Younify create user failed:", {
        status: response.status,
        body: data,
      });
      return res.status(502).json({ error: "Failed to create Younify user" });
    }

    const accessToken = data.accessToken || data.tokens?.accessToken || null;
    const refreshToken = data.refreshToken || data.tokens?.refreshToken || null;

    if (!accessToken || !refreshToken) {
      console.error("Younify response missing tokens:", data);
      return res.status(502).json({ error: "Younify response missing tokens" });
    }

    return res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    console.error("Unexpected error in /create-younify-user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
