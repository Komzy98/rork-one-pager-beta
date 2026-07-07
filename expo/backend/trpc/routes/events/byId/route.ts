import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure } from '@/backend/trpc/create-context';
import { fetchEventById, parseCompoundEventId } from '@/utils/fetchEventById';

export const getEventByIdRoute = publicProcedure
  .input(z.object({ id: z.string().min(1) }))
  .query(async ({ input }) => {
    if (!parseCompoundEventId(input.id)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unsupported event id format.' });
    }

    const result = await fetchEventById(input.id);
    if (!result) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found or no longer available.' });
    }

    return result;
  });
