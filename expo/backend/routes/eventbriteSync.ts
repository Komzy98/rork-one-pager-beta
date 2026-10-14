import type { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { fetchEventbriteBookings, getEventbriteAccount, getEventbriteToken } from '@/backend/utils/eventbrite';

/** Private single-account sync. Future multi-user support requires per-user Eventbrite OAuth. */
export function registerEventbriteSyncRoutes(app: Hono) {
  app.get('/api/eventbrite/my-bookings', async (c) => {
    const authorization = c.req.header('authorization') || '';
    const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!authorization.startsWith('Bearer ')) return c.json({ error: 'SIGN_IN_REQUIRED' }, 401);
    if (!supabaseUrl || !serviceKey || !getEventbriteToken()) {
      return c.json({ error: 'SYNC_NOT_CONFIGURED' }, 503);
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.getUser(authorization.slice(7).trim());
    if (error || !data.user?.email || !data.user.email_confirmed_at) {
      return c.json({ error: 'SIGN_IN_REQUIRED' }, 401);
    }
    try {
      const account = await getEventbriteAccount();
      const verifiedEmails = (account.emails ?? [])
        .filter(email => email.verified === true)
        .map(email => email.email?.toLowerCase().trim());
      // Fail closed: never expose a shared server token's bookings to arbitrary app users.
      if (!verifiedEmails.includes(data.user.email.toLowerCase().trim())) {
        return c.json({ error: 'EVENTBRITE_ACCOUNT_NOT_LINKED' }, 403);
      }
      const bookings = await fetchEventbriteBookings();
      return c.json({ bookings, syncedAt: new Date().toISOString() });
    } catch {
      return c.json({ error: 'EVENTBRITE_SYNC_UNAVAILABLE' }, 502);
    }
  });
}
