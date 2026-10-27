import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getTimeOpportunities, planTimelyReminders, summarizeTimeOutcomes,
} from '../timeWellSpent';
import type { PersonalSignal } from '../interestSignalEngine';
import type { DailyDecision } from '../dailyDecisionEngine';

const now = new Date(2026, 9, 27, 17, 0);
function fixtureMatch(id: string, hoursUntil: number, kind: 'football_upcoming' | 'football_live' = 'football_upcoming') {
  const at = new Date(now.getTime() + hoursUntil * 60 * 60_000);
  return {
    id: 'football-upcoming:' + id, kind,
    title: 'Manchester United play tonight',
    subtitle: 'Tonight · 20:00 · Premier League', reason: 'Because you follow Manchester United',
    priority: 90, occurredAt: at.toISOString(),
    match: { id, homeTeam: 'Manchester United', awayTeam: 'Arsenal', date: at.toISOString(),
      league: 'Premier League' },
  } as unknown as PersonalSignal;
}
const episode = (days: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const airDate = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')].join('-');
  return { tmdbId: 123, showTitle: 'Fictional series',
    nextEpisode: { airDate, seasonNumber: 1, episodeNumber: 5 } };
};
describe('worth your time: verified, useful recommendations', () => {
  it('prioritises a relevant match and includes a real unfinished habit', () => {
    const decisions = getTimeOpportunities({
      now, signals: [fixtureMatch('123', 3)],
      incompleteHabits: ['Practise guitar'],
      dailyDecision: { id:'tasks:report', source:'tasks', urgency:'next',
        title:'Finish report', guidance:'Take a step', reason:'Still open', destination:'tasks' } as DailyDecision,
    });
    assert.equal(decisions.length, 3);
    assert.equal(decisions[0].kind, 'football');
    assert.equal(decisions[1].kind, 'habit');
    assert.equal(decisions[2].kind, 'priority');
  });
  it('never recommends an already missed fixture or stale episode', () => {
    const result = getTimeOpportunities({
      now, signals: [fixtureMatch('old', -36)], episodes: [{
        tmdbId:123, showTitle:'Old', latestEpisode:{
          airDate:'2026-09-01', seasonNumber:1, episodeNumber:1 },
      }],
    });
    assert.equal(result.length, 0);
  });
  it('does not promise streaming availability just because of an air date', () => {
    const items = getTimeOpportunities({ now, episodes: [episode(1)] });
    assert.equal(items[0]?.kind, 'episode');
    assert.match(items[0]?.detail ?? '', /may vary/i);
  });
  it('suppresses recommendations in recovery mode', () => {
    assert.deepEqual(getTimeOpportunities({
      now, recoveryActive:true, signals:[fixtureMatch('match',1)],
      incompleteHabits:['Exercise'],
    }),[]);
  });
  it('schedules only opted-in-eligible quiet-hours-safe one-shot plans, max two daily', () => {
    const matches = [fixtureMatch('a',2),fixtureMatch('b',3),fixtureMatch('c',4),
      fixtureMatch('quiet',6)]; // 23:00 kickoff: 22:15 reminder should be quiet
    const plans = planTimelyReminders({signals:matches},now);
    assert.equal(plans.length,2);
    assert.ok(plans.every(p=>p.at.getHours()>=8 && p.at.getHours()<22));
    assert.ok(plans.every(p=>p.at>now));
  });
  it('rejects past and invalid matches, and does not send episode alerts when not upcoming', () => {
    const plans = planTimelyReminders({
      signals:[fixtureMatch('yesterday',-4)],episodes:[episode(-2),episode(15)],
    },now);
    assert.equal(plans.length,0);
  });
  it('provides privacy-safe aggregate counters, not claimed attendance', () => {
    const result=summarizeTimeOutcomes([
      {day:'2026-10-26',kind:'habit',outcome:'acted',count:1},
      {day:'2026-10-26',kind:'football',outcome:'opened',count:2},
      {day:'2026-09-02',kind:'football',outcome:'opened',count:99},
      {day:'2026-10-25',kind:'episode',outcome:'not_useful',count:1},
    ],now);
    assert.deepEqual(result,{opened:2,acted:1,notUseful:1});
  });
});
