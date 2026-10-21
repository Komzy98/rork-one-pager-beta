import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIntelligenceContext } from '../intelligenceContext';
import { buildPrivateBriefingRequest, renderVerifiedBriefingInsight } from '../aiBriefingFocus';
import type { AIBriefingPreferences } from '../aiBriefingPreferences';
const DEFAULT_AI_BRIEFING_PREFERENCES: AIBriefingPreferences = {
  enabled: false,
  sources: { habits:true, tasks:true, calendar:false, sports:false, shows:false, events:false, weather:false },
};
import { enrichVerifiedBriefing } from '../../backend/services/briefingAiService';
import { enrichBriefingRoute } from '../../backend/trpc/routes/ai/briefing/route';
import { createTRPCRouter } from '../../backend/trpc/create-context';
const appRouter = createTRPCRouter({ ai: createTRPCRouter({ enrichBriefing: enrichBriefingRoute }) });

const today = '2026-10-21';
const context = buildIntelligenceContext({
  date: today,
  habits: [{ name: 'Read chapter', done: false }],
  tasks: [{ name: 'Submit design brief', completed: false, priority: 'high' }],
  todayCalendar: [{ title: 'Private appointment', timeLabel:'16:30', isAllDay:false }],
  sportsBeats: [{ kind: 'match_today', headline: 'Nigeria vs Ghana', whenLabel: '19:00' }],
  continueWatching: [{ title:'Severance' }],
  weather: { condition:'Cloudy', temp:11, description:'Grey', city:'Manchester' },
});

const enabledPrefs = {
  ...DEFAULT_AI_BRIEFING_PREFERENCES,
  enabled: true,
  sources: { ...DEFAULT_AI_BRIEFING_PREFERENCES.sources },
};

describe('opt-in AI briefing', () => {
  it('shares nothing when disabled, and only opted-in categories when enabled', () => {
    const disabled = buildPrivateBriefingRequest(context, DEFAULT_AI_BRIEFING_PREFERENCES);
    assert.equal(disabled.items.length, 0);

    const enabled = buildPrivateBriefingRequest(context, enabledPrefs);
    assert.deepEqual(new Set(enabled.items.map(item => item.source)), new Set(['habits', 'tasks']));
    const serialized = JSON.stringify(enabled);
    for (const excluded of ['Private appointment','Nigeria vs Ghana','Severance','Manchester']) {
      assert.equal(serialized.includes(excluded), false, excluded + ' unexpectedly sent');
    }
    assert.equal(serialized.includes('Read chapter'), true);
    assert.equal(serialized.includes('Submit design brief'), true);
  });

  it('removes stale sources and allows individual opted-in categories', () => {
    const stale = buildIntelligenceContext({
      date: today,
      sportsBeats: [{ kind:'live_now', headline: 'Nigeria 1-0 Ghana' }],
    }, {
      now: new Date('2026-10-21T12:00:00Z'),
      updatedAt: { sports: '2026-10-21T11:00:00Z' },
    });
    assert.deepEqual(buildPrivateBriefingRequest(stale, {
      ...enabledPrefs, sources: { ...enabledPrefs.sources, sports:true },
    }).items, []);

    const calendarOnly = buildPrivateBriefingRequest(context, {
      ...enabledPrefs,
      sources: { ...Object.fromEntries(Object.keys(enabledPrefs.sources).map(k => [k,false])) as typeof enabledPrefs.sources, calendar:true },
    });
    assert.deepEqual(calendarOnly.items.map(i=>i.source),['calendar']);
  });

  it('selects only pre-verified IDs and never model-authored claims', async () => {
    const request = buildPrivateBriefingRequest(context, enabledPrefs);
    let calls = 0;
    const mockFetch: typeof fetch = async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.text.format.type, 'json_schema');
      assert.equal(body.model, 'gpt-4.1-mini');
      return new Response(JSON.stringify({
        status: 'completed',
        output: [{ content:[{
          type: 'output_text',
          text: JSON.stringify({focusId:'tasks:0', approach:'start_small'})
        }] }],
      }), {status:200});
    };
    const first = await enrichVerifiedBriefing('ai-test-account-1', request, {
      apiKey:'mock-server-key', enabled:true, fetcher:mockFetch,
    });
    assert.equal(first.mode,'ai');
    assert.equal(first.insight,renderVerifiedBriefingInsight(request.items.find(x=>x.id==='tasks:0')!, 'start_small'));
    assert.equal(calls,1);
    const second = await enrichVerifiedBriefing('ai-test-account-1', request, {
      apiKey:'mock-server-key', enabled:true, fetcher:mockFetch,
    });
    assert.equal(second.cached,true);
    assert.equal(calls,1);
    const third = await enrichVerifiedBriefing('ai-test-account-2', request, {
      apiKey:'mock-server-key', enabled:true, fetcher:mockFetch,
    });
    assert.equal(third.cached,false);
    assert.equal(calls,2);
  });

  it('rejects invalid model IDs without injecting a made-up item', async () => {
    const request = buildPrivateBriefingRequest(context, enabledPrefs);
    const mockFetch: typeof fetch = async () => new Response(JSON.stringify({
      status:'completed', output:[{content:[{
        type:'output_text',
        text: JSON.stringify({focusId:'tasks:999', approach:'start_small'}),
      }]}],
    }), { status:200 });
    const result = await enrichVerifiedBriefing('ai-test-account-3', request, {
      enabled:true, apiKey:'mock-key', fetcher:mockFetch,
    });
    assert.equal(result.mode,'fallback');
    assert.equal(result.insight,null);
    const disabled = await enrichVerifiedBriefing('ai-test-account-4', request, {
      enabled:false, apiKey:'mock-key', fetcher:mockFetch,
    });
    assert.equal(disabled.mode,'disabled');
  });

  it('requires a bearer token before any AI operation', async () => {
    const caller = appRouter.createCaller({ req: new Request('http://localhost/api/trpc') });
    const request = buildPrivateBriefingRequest(context, enabledPrefs);
    await assert.rejects(
      caller.ai.enrichBriefing(request),
      (error: any) => error.code === 'UNAUTHORIZED',
    );
  });
});
