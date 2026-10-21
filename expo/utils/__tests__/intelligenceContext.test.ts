import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIntelligenceContext, toBriefingModelContext } from '../intelligenceContext';
import { summarizeDailyProgress } from '../dailySummary';

const today = '2026-10-21';
const now = new Date('2026-10-21T08:00:00Z');

describe('Phase 1 unified intelligence context', () => {
  it('distinguishes unavailable sources from connected-but-empty sources', () => {
    const context = buildIntelligenceContext({
      date: today, habits: [], tasks: [], todayCalendar: [],
    }, { now, availability: { calendar: false } });

    assert.equal(context.sources.calendar.status, 'unavailable');
    assert.equal(context.sources.habits.status, 'empty');
    assert.equal(context.sources.tasks.status, 'empty');
    assert.equal(context.sources.sports.status, 'unavailable');
    assert.equal(context.sources.weather.status, 'unavailable');
    assert.deepEqual(context.todayCalendar, []);
  });

  it('normalises, deduplicates, orders and bounds user data', () => {
    const input = {
      date: today,
      habits: [
        { name: '  Walk   outside ', done: true, streak: 3 },
        { name: 'Walk outside', done: false },
        { name: 'Read', done: false, scheduledToday: false },
      ],
      upcomingMatches: [
        { homeTeam:'Nigeria', awayTeam:'Ghana', date:'2026-10-22', time:'19:00', competition:'Friendly' },
        { homeTeam:'Chelsea', awayTeam:'Arsenal', date:'2026-10-20', time:'17:00', competition:'Premier League' },
        { homeTeam:'Nigeria', awayTeam:'Ghana', date:'2026-10-22', time:'19:00', competition:'Friendly' },
      ],
      todayCalendar: [
        { title:'  Team    sync', timeLabel:'09:00', isAllDay:false },
        { title:'Team sync', timeLabel:'09:00', isAllDay:false },
      ],
    };
    const result = buildIntelligenceContext(input, { now });
    assert.deepEqual(result.habits.map(h => h.name), ['Walk outside']);
    assert.equal(result.habits[0].done, true);
    assert.deepEqual(result.upcomingMatches.map(m => m.homeTeam), ['Nigeria']);
    assert.equal(result.todayCalendar.length, 1);
    assert.equal(result.sources.calendar.count, 1);
    assert.equal(result.sources.sports.count, 1);
    const model = toBriefingModelContext(result);
    assert.deepEqual(model.upcomingMatches, result.upcomingMatches);
    assert.equal(JSON.stringify(model).includes('collectedAt'), false);
  });

  it('does not promote stale weather or sports to a current briefing', async () => {
    const weather = { condition:'Sunny', temp:20, description:'Clear', city:'Manchester' };
    const context = buildIntelligenceContext({
      date: today, weather,
      sportsBeats: [{ kind:'live_now', headline:'Nigeria 1-0 Ghana', whenLabel:'Live' }],
    }, {
      now, updatedAt: { weather:'2026-10-21T04:00:00Z', sports:'2026-10-21T07:30:00Z' }
    });
    assert.equal(context.sources.weather.status, 'stale');
    assert.equal(context.sources.sports.status, 'stale');
    assert.equal(context.weather, undefined);
    assert.deepEqual(context.sportsBeats, []);
    const summary = await summarizeDailyProgress({
      date: today, weather,
      sportsBeats: [{kind:'live_now', headline:'Nigeria 1-0 Ghana'}],
      sourceUpdatedAt: {weather:'2026-10-20T00:00:00Z',sports:'2026-10-20T00:00:00Z'},
    });
    assert.deepEqual(summary.contextHighlights, []);
    assert.equal(summary.contextMeta?.sources.weather.status, 'stale');
  });

  it('does not mistake a missing temperature for zero degrees', async () => {
    const result = await summarizeDailyProgress({
      date: today,
      weather: { condition:'Cloudy', temp:Number.NaN, description:'Grey', city:'Manchester' },
    });
    assert.equal(result.contextHighlights?.some(x => x.kind === 'weather'), false);
  });

  it('gives identical signatures for identical context regardless of collection time', () => {
    const input = { date:today, tasks:[{name:'Draft proposal',completed:false}] };
    const first = buildIntelligenceContext(input, {now});
    const second = buildIntelligenceContext(input, {now: new Date('2026-10-21T09:00:00Z')});
    assert.equal(first.signature, second.signature);
    assert.notEqual(first.collectedAt, second.collectedAt);
    const changed = buildIntelligenceContext({
      ...input, tasks:[{name:'Draft proposal',completed:true}],
    }, {now});
    assert.notEqual(first.signature, changed.signature);
  });
});
