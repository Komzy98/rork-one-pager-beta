import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure } from '@/backend/trpc/create-context';
import { estimateEventRoute } from '@/backend/services/eventRouteService';

const point = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const estimateEventRouteProcedure = publicProcedure
  .input(z.object({
    origin: point,
    destination: point,
    mode: z.enum(['walking', 'driving']),
  }))
  .mutation(async ({ ctx, input }) => {
    // No storage of exact coordinates. Session-level throttling only.
    const forwarded = ctx.req.headers.get('cf-connecting-ip') ??
      ctx.req.headers.get('x-real-ip') ??
      ctx.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    try {
      return await estimateEventRoute(input.origin, input.destination, input.mode, forwarded);
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Routing unavailable.',
      });
    }
  });
