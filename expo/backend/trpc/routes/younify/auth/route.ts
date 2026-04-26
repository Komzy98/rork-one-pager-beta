import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "@/backend/trpc/create-context";

const YOUNIFY_MANAGEMENT_BASE_URL =
  process.env.YOUNIFY_MANAGEMENT_BASE_URL || "https://api.younify.tv/v1";

const getYounifyApiKey = () =>
  process.env.YOUNIFY_MANAGEMENT_API_KEY || process.env.YOUNIFY_API_KEY;

export const createYounifyUserRoute = publicProcedure
  .input(
    z.object({
      externalUserId: z.string().trim().min(1).max(200).default("one-pager-dev-user"),
      email: z.string().email().optional(),
      name: z.string().trim().max(200).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const apiKey = getYounifyApiKey();
    if (!apiKey) {
      console.error("[younify] YOUNIFY_API_KEY not configured");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "YOUNIFY_API_KEY not configured on server",
      });
    }

    const payload: Record<string, unknown> = {
      external_id: input.externalUserId,
      properties: { source: "one-pager" },
    };
    if (input.email) payload.email = input.email;
    if (input.name) payload.name = input.name;

    console.log("[younify] creating user", input.externalUserId);

    try {
      const response = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mmt-api-secret": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data: any = await response.json().catch(() => ({}));
      let userId: string | undefined = data?.data?.id;
      let accessToken: string | undefined = data?.data?.access_token;
      let refreshToken: string | undefined = data?.data?.refresh_token;

      if (!response.ok && response.status === 422) {
        const usersResponse = await fetch(`${YOUNIFY_MANAGEMENT_BASE_URL}/users`, {
          headers: { "x-mmt-api-secret": apiKey },
        });
        const usersData: any = await usersResponse.json().catch(() => ({}));
        const existingUser = Array.isArray(usersData?.data)
          ? usersData.data.find((u: any) => u.external_id === input.externalUserId)
          : null;
        if (existingUser?.id) userId = existingUser.id;
      } else if (!response.ok) {
        console.error("[younify] create user failed", { status: response.status, data });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create Younify user (status ${response.status})`,
        });
      }

      if (userId && (!accessToken || !refreshToken)) {
        const tokenResponse = await fetch(
          `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${userId}/tokens`,
          { method: "POST", headers: { "x-mmt-api-secret": apiKey } },
        );
        const tokenData: any = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok) {
          console.error("[younify] generate tokens failed", { status: tokenResponse.status, tokenData });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate Younify tokens (status ${tokenResponse.status})`,
          });
        }
        accessToken = tokenData?.data?.access_token;
        refreshToken = tokenData?.data?.refresh_token;
      }

      if (!userId || !accessToken || !refreshToken) {
        console.error("[younify] missing tokens in response", data);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Younify response missing user tokens",
        });
      }

      return { userId, accessToken, refreshToken };
    } catch (error: any) {
      if (error instanceof TRPCError) throw error;
      console.error("[younify] unexpected error", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Internal server error",
      });
    }
  });

export const refreshYounifyTokensRoute = publicProcedure
  .input(z.object({ userId: z.string().trim().min(1) }))
  .mutation(async ({ input }) => {
    const apiKey = getYounifyApiKey();
    if (!apiKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "YOUNIFY_API_KEY not configured on server",
      });
    }

    try {
      const response = await fetch(
        `${YOUNIFY_MANAGEMENT_BASE_URL}/users/${input.userId}/tokens`,
        { method: "POST", headers: { "x-mmt-api-secret": apiKey } },
      );
      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("[younify] refresh failed", { status: response.status, data });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to refresh Younify tokens (status ${response.status})`,
        });
      }

      const accessToken = data?.data?.access_token;
      const refreshToken = data?.data?.refresh_token;
      if (!accessToken || !refreshToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Younify token response missing tokens",
        });
      }

      return { accessToken, refreshToken };
    } catch (error: any) {
      if (error instanceof TRPCError) throw error;
      console.error("[younify] unexpected refresh error", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Internal server error",
      });
    }
  });
