import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

const YOUNIFY_API_KEY = process.env.YOUNIFY_API_KEY || '';
const YOUNIFY_BASE_URL = 'https://api.younify.tv/v1';

export const renewYounifySessionRoute = publicProcedure
  .input(z.object({
    userId: z.string().min(1).max(200),
    refreshToken: z.string().min(1),
  }))
  .mutation(async ({ input }) => {
    console.log('🔄 [Younify] Renewing session for user:', input.userId);

    if (!YOUNIFY_API_KEY) {
      console.error('❌ [Younify] YOUNIFY_API_KEY not configured');
      throw new Error('Younify API key not configured on server');
    }

    try {
      const response = await fetch(`${YOUNIFY_BASE_URL}/auth/token/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${YOUNIFY_API_KEY}`,
        },
        body: JSON.stringify({
          user_id: input.userId,
          refresh_token: input.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Younify] Token renewal failed:', response.status, errorText);
        throw new Error(`Younify token renewal failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [Younify] Session renewed successfully for user:', input.userId);

      return {
        accessToken: data.access_token as string,
        refreshToken: data.refresh_token as string,
        expiresIn: (data.expires_in as number) || 3600,
        renewedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('❌ [Younify] Session renewal error:', error.message);
      throw new Error(`Failed to renew Younify session: ${error.message}`);
    }
  });
