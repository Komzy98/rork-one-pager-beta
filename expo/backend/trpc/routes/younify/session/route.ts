import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

const YOUNIFY_API_KEY = process.env.YOUNIFY_API_KEY || '';
const YOUNIFY_BASE_URL = 'https://api.younify.tv/v1';

export const createYounifySessionRoute = publicProcedure
  .input(z.object({
    userId: z.string().min(1).max(200),
  }))
  .mutation(async ({ input }) => {
    console.log('🎬 [Younify] Creating session for user:', input.userId);

    if (!YOUNIFY_API_KEY) {
      console.error('❌ [Younify] YOUNIFY_API_KEY not configured');
      throw new Error('Younify API key not configured on server');
    }

    try {
      const response = await fetch(`${YOUNIFY_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${YOUNIFY_API_KEY}`,
        },
        body: JSON.stringify({
          user_id: input.userId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Younify] Token creation failed:', response.status, errorText);
        throw new Error(`Younify token creation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [Younify] Session created successfully for user:', input.userId);

      return {
        accessToken: data.access_token as string,
        refreshToken: data.refresh_token as string,
        expiresIn: (data.expires_in as number) || 3600,
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('❌ [Younify] Session creation error:', error.message);
      throw new Error(`Failed to create Younify session: ${error.message}`);
    }
  });
