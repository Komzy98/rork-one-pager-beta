export type YounifyTokenResponse = {
  userId: string;
  accessToken: string;
  refreshToken: string;
};

export function getYounifyManagementConfig() {
  const apiKey = (process.env.YOUNIFY_MANAGEMENT_API_KEY || "").trim();
  const baseUrl =
    (process.env.YOUNIFY_MANAGEMENT_BASE_URL || "https://api.younify.tv/v1").replace(/\/$/, "");
  return { apiKey, baseUrl, configured: apiKey.length > 0 };
}

export async function createYounifyUserTokens(input: {
  externalUserId?: string;
  email?: string;
  name?: string;
}): Promise<YounifyTokenResponse> {
  const { apiKey, baseUrl, configured } = getYounifyManagementConfig();
  if (!configured) {
    throw new Error("YOUNIFY_MANAGEMENT_API_KEY is not configured on the server");
  }

  const resolvedExternalId = input.externalUserId?.trim() || "one-pager-dev-user";
  const payload = {
    external_id: resolvedExternalId,
    ...(input.email ? { email: input.email } : {}),
    ...(input.name ? { name: input.name } : {}),
    properties: { source: "one-pager" },
  };

  const response = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mmt-api-secret": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    data?: { id?: string; access_token?: string; refresh_token?: string };
  };

  let userId = data.data?.id;
  let accessToken = data.data?.access_token;
  let refreshToken = data.data?.refresh_token;

  if (!response.ok && response.status === 422) {
    const usersResponse = await fetch(`${baseUrl}/users`, {
      headers: { "x-mmt-api-secret": apiKey },
    });
    if (!usersResponse.ok) {
      throw new Error(
        `Failed to list Younify users while recovering duplicate external_id (HTTP ${usersResponse.status})`,
      );
    }
    const usersData = (await usersResponse.json().catch(() => ({}))) as {
      data?: Array<{ id?: string; external_id?: string }>;
    };
    const existingUser = Array.isArray(usersData.data)
      ? usersData.data.find((user) => user.external_id === resolvedExternalId)
      : null;
    if (existingUser?.id) {
      userId = existingUser.id;
    } else {
      throw new Error(
        `Younify rejected user creation (HTTP 422) but no existing user found for external_id "${resolvedExternalId}"`,
      );
    }
  } else if (!response.ok) {
    throw new Error(
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : `Failed to create Younify user (HTTP ${response.status})`,
    );
  }

  if (userId && (!accessToken || !refreshToken)) {
    const tokenResponse = await fetch(`${baseUrl}/users/${userId}/tokens`, {
      method: "POST",
      headers: { "x-mmt-api-secret": apiKey },
    });
    const tokenData = (await tokenResponse.json().catch(() => ({}))) as {
      data?: { access_token?: string; refresh_token?: string };
    };
    if (!tokenResponse.ok) {
      throw new Error(`Failed to generate Younify user tokens (HTTP ${tokenResponse.status})`);
    }
    accessToken = tokenData.data?.access_token;
    refreshToken = tokenData.data?.refresh_token;
  }

  if (!userId || !accessToken || !refreshToken) {
    throw new Error("Younify response missing user tokens");
  }

  return { userId, accessToken, refreshToken };
}

export async function refreshYounifyUserTokens(input: {
  userId: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const { apiKey, baseUrl, configured } = getYounifyManagementConfig();
  if (!configured) {
    throw new Error("YOUNIFY_MANAGEMENT_API_KEY is not configured on the server");
  }

  const userId = input.userId?.trim();
  if (!userId) {
    throw new Error("Missing userId");
  }

  const response = await fetch(`${baseUrl}/users/${userId}/tokens`, {
    method: "POST",
    headers: { "x-mmt-api-secret": apiKey },
  });

  const data = (await response.json().catch(() => ({}))) as {
    data?: { access_token?: string; refresh_token?: string };
  };

  if (!response.ok) {
    throw new Error(`Failed to refresh Younify tokens (HTTP ${response.status})`);
  }

  const accessToken = data.data?.access_token;
  const refreshToken = data.data?.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new Error("Younify token response missing tokens");
  }

  return { accessToken, refreshToken };
}
