import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
import { publicProcedure } from '@/backend/trpc/create-context';
import { enrichVerifiedBriefing } from '@/backend/services/briefingAiService';

const item = z.object({
  id: z.string().min(3).max(32).regex(/^(habits|tasks|calendar|sports|shows|events|weather):\d{1,2}$/),
  source: z.enum(['habits','tasks','calendar','sports','shows','events','weather']),
  title: z.string().trim().min(1).max(110),
  detail: z.string().max(90),
}).strict();

const inputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(item).max(16),
}).strict().refine(value =>
  new Set(value.items.map(i => i.id)).size === value.items.length &&
  value.items.every(i => i.id.startsWith(i.source + ':')), 'Invalid focus items');

export const enrichBriefingRoute = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input, ctx }) => {
    const header = ctx.req.headers.get('authorization') ?? '';
    if (!header.startsWith('Bearer ') || !header.slice(7).trim()) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const url = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_ANON_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url || !key) throw new TRPCError({ code: 'SERVICE_UNAVAILABLE' });

    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.getUser(header.slice(7).trim());
    if (error || !data.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });

    return enrichVerifiedBriefing(data.user.id, input);
  });
