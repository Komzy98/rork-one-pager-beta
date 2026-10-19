import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBriefingHighlights, buildDailyBriefingNarration } from '../dailyBriefingContext';
import { DAILY_SUMMARY_VERSION, summarizeDailyProgress } from '../dailySummary';

const date = '2026-10-20';

describe('contextual daily briefing', () => {
  it('uses verified calendar, weather, sports, shows and saved events without a network call', async () => {
    const fetchBefore = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('normal daily briefing must be instant'); }) as typeof fetch;
    try {
      const result = await summarizeDailyProgress({
        date,
        habits: [{ name: '10K Steps Daily', done: false, scheduledToday: true }],
        habitRollup: { scheduledCount: 1, completedCount: 0, incompleteCount: 1, incompleteNames: ['10K Steps Daily'], ratioLabel: '0/1' },
        todayCalendar: [{ title: 'Project review', timeLabel: '09:30', isAllDay: false, location: 'Manchester' }],
        weather: { condition: 'Overcast', temp: 11, description: 'Cloudy', city: 'Manchester' },
        sportsBeats: [{ kind: 'match_today', headline: 'Nigeria vs Ghana today', whenLabel: '20:00' }],
        continueWatching: [{ title: 'Severance', episode: 'S2E3', platform: 'Apple TV' }],
        savedDiscoveryEvents: [{ title: 'Comedy on Friday', dateLabel: '2026-10-23', venue: 'Example Theatre', timeLabel: '19:30', daysUntil: 3, timing: 'upcoming', intent: 'saved' }],
      });
      assert.equal(result.briefingVersion, DAILY_SUMMARY_VERSION);
      assert.match(result.summary, /none marked complete yet/i);
      assert.equal(result.contextHighlights?.length, 5);
      assert.deepEqual(result.contextHighlights?.map(h => h.kind), ['calendar','weather','sports','shows','events']);
      assert.match(result.contextHighlights?.[0].text || '', /Project review · 09:30/);
      assert.match(result.contextHighlights?.[1].text || '', /11°C/);
      assert.match(result.contextHighlights?.[2].text || '', /Nigeria vs Ghana/);
      assert.match(result.contextHighlights?.[3].text || '', /Severance/);
      assert.match(result.contextHighlights?.[4].text || '', /Comedy on Friday/);
      const speech = buildDailyBriefingNarration(result);
      for (const phrase of ['Project review','Nigeria vs Ghana','Severance','11°C','Comedy on Friday']) {
        assert.ok(speech.includes(phrase), `narration missing ${phrase}`);
      }
      assert.deepEqual(result.wins, []);
      assert.equal(result.score, 0);
    } finally {
      globalThis.fetch = fetchBefore;
    }
  });

  it('leaves unconnected sources out rather than inventing matches or appointments', async () => {
    const result = await summarizeDailyProgress({ date, habits: [], openItems: [] });
    assert.deepEqual(result.contextHighlights, []);
    assert.equal(result.summary.includes('football'), false);
    assert.equal(result.summary.includes('calendar'), false);
    assert.equal(result.summary.includes('rain'), false);
  });

  it('uses the next verified fixture and includes accurate relative dates', () => {
    const sections = buildBriefingHighlights({
      date,
      upcomingMatches: [
        { homeTeam: 'Chelsea', awayTeam: 'Arsenal', date: '2026-10-19', time:'19:00', competition:'Premier League' },
        { homeTeam: 'Nigeria', awayTeam: 'South Africa', date: '2026-10-21', time:'18:00', competition:'Friendly' },
      ],
      upcomingEvents: [
        { title: 'Breakfast', dateLabel: '2026-10-20', timeLabel: '08:00', timing: 'today', intent: 'scheduled' },
        { title: 'Industry networking', dateLabel: '2026-10-21', timeLabel: '18:30', timing: 'upcoming', intent: 'scheduled' },
      ],
    });
    assert.equal(sections.find(x => x.kind === 'calendar')?.text, 'Industry networking · Tomorrow · 18:30');
    assert.equal(sections.find(x => x.kind === 'sports')?.text, 'Nigeria vs South Africa · Tomorrow · 18:00');
  });

  it('does not count a bookmarked event, a show or a football result as an achieved task', async () => {
    const result = await summarizeDailyProgress({
      date,
      habits: [{ name:'Read',done:true,streak:3 }],
      priorityTasks: [{ title: 'Submit report', completed:false,priority:'high' }],
      sportsBeats: [{ kind:'recent_win',headline:'Nigeria beat Ghana 2-0'}],
      shows: [{ title:'Silo'}],
      savedDiscoveryEvents:[{ title:'Concert',dateLabel:'2026-10-21',daysUntil:1,venue:'Venue',timing:'upcoming',intent:'saved' }],
    });
    assert.deepEqual(result.wins,['Read']);
    assert.deepEqual(result.challenges,[]);
    assert.ok(result.recommendations[0].includes('Submit report'));
  });

  it('does not repeat a calendar event as a saved discovery event', () => {
    const list = buildBriefingHighlights({
      date,
      todayCalendar: [{ title:'Concert',timeLabel:'19:00',isAllDay:false }],
      savedDiscoveryEvents: [{ title:'Concert',dateLabel:date,daysUntil:0,venue:'Venue',timing:'today' }],
    });
    assert.deepEqual(list.map(x=>x.kind), ['calendar']);
  });
});
