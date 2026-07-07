import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

function readSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export const signInWithPasswordRoute = publicProcedure
  .input(
    z.object({
      email: z.string().email().max(320),
      password: z.string().min(1).max(256),
    }),
  )
  .mutation(async ({ input }) => {
    const config = readSupabaseConfig();
    if (!config) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Supabase is not configured on the API server.",
      });
    }

    const res = await fetch(
      `${config.url}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        }),
      },
    );

    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      user?: Record<string, unknown>;
      msg?: string;
      error_description?: string;
    };

    if (!res.ok) {
      const msg = json.msg || json.error_description || `HTTP ${res.status}`;
      throw new TRPCError({
        code: res.status === 400 ? "UNAUTHORIZED" : "BAD_REQUEST",
        message: msg,
      });
    }

    if (!json.access_token || !json.refresh_token || !json.user) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invalid auth response from Supabase",
      });
    }

    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_in: json.expires_in ?? 3600,
      token_type: json.token_type ?? "bearer",
      user: json.user,
    };
  });
