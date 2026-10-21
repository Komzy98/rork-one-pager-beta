import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createTRPCRouter } from '../../backend/trpc/create-context';
import { enrichBriefingRoute } from '../../backend/trpc/routes/ai/briefing/route';

const router = createTRPCRouter({
  ai: createTRPCRouter({ enrichBriefing: enrichBriefingRoute }),
});

const request = {
  date: '2026-10-21',
  items: [{
    id: 'tasks:0', source: 'tasks' as const,
    title: 'Submit project draft', detail: 'Not completed yet',
  }],
};

describe('Phase 1C authenticated briefing route — mocked network integration', () => {
  it('validates account tokens before reaching the paid model', async () => {
    const previous = {
      fetch: globalThis.fetch,
      url: process.env.SUPABASE_URL,
      anon: process.env.SUPABASE_ANON_KEY,
      feature: process.env.AI_BRIEFING_ENABLED,
      openai: process.env.OPENAI_API_KEY,
    };
    let authRequests = 0;
    let modelRequests = 0;
    try {
      process.env.SUPABASE_URL = 'https://mock-briefing-auth.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'public-test-anon-key';
      process.env.AI_BRIEFING_ENABLED = 'true';
      process.env.OPENAI_API_KEY = 'server-test-api-key';

      globalThis.fetch = async (url, init) => {
        const target = typeof url === 'string' ? url : url.toString();
        if (target.includes('/auth/v1/user')) {
          authRequests++;
          const headers = new Headers(init?.headers);
          const token = headers.get('authorization') ?? '';
          if (token === 'Bearer invalid-user') {
            return new Response(JSON.stringify({
              code: 'bad_jwt', msg: 'Invalid token',
            }), { status: 401, headers: { 'content-type': 'application/json' } });
          }
          if (token !== 'Bearer valid-user') {
            return new Response(JSON.stringify({ msg: 'Unauthorized' }), {
              status: 401, headers: { 'content-type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({
            id: 'verified-account-from-auth', aud: 'authenticated',
            app_metadata: {}, user_metadata: {},
            created_at: '2026-01-01T00:00:00Z',
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        if (target === 'https://api.openai.com/v1/responses') {
          modelRequests++;
          const body = JSON.parse(String(init?.body));
          assert.equal(body.store, false);
          assert.equal(body.input.includes('Submit project draft'), true);
          return new Response(JSON.stringify({
            status: 'completed',
            output: [{
              content: [{ type: 'output_text', text: JSON.stringify({
                focusId: 'tasks:0', approach: 'start_small',
              }) }],
            }],
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        throw new Error('Unexpected network request: ' + target);
      };

      const unauthorised = router.createCaller({
        req: new Request('http://localhost/api/trpc', {
          headers: { authorization: 'Bearer invalid-user' },
        }),
      });
      await assert.rejects(unauthorised.ai.enrichBriefing(request),
        (error: any) => error.code === 'UNAUTHORIZED');
      assert.equal(modelRequests, 0);

      const authorised = router.createCaller({
        req: new Request('http://localhost/api/trpc', {
          headers: { authorization: 'Bearer valid-user' },
        }),
      });
      const result = await authorised.ai.enrichBriefing(request);
      assert.equal(result.mode, 'ai');
      assert.match(result.insight ?? '', /Submit project draft/);
      assert.equal(modelRequests, 1);
      assert.ok(authRequests >= 2);
    } finally {
      globalThis.fetch = previous.fetch;
      for (const [key, value] of [
        ['SUPABASE_URL', previous.url],
        ['SUPABASE_ANON_KEY', previous.anon],
        ['AI_BRIEFING_ENABLED', previous.feature],
        ['OPENAI_API_KEY', previous.openai],
      ] as [string, string | undefined][]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
