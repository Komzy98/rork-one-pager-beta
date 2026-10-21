import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIntelligenceContext, type IntelligenceContextOptions } from '../intelligenceContext';
import { buildDailyDecision, parseDecisionClock } from '../dailyDecisionEngine';
import type { DailySummaryInput } from '../dailySummary';

const now = new Date(2026, 9, 21, 15, 0);
const date = '2026-10-21';

function context(input: Partial<DailySummaryInput> = {}, options: IntelligenceContextOptions = {}) {
  return buildIntelligenceContext({ date, ...input }, { now, ...options });
}

describe('Phase 2A daily decision engine', () => {
  it('prioritises an imminent real calendar commitment over an urgent task', () => {
    const result = buildDailyDecision(context({
      todayCalendar: [{ title:'Dentist appointment', timeLabel:'3:30 PM', isAllDay:false }],
      priorityTasks: [{ title:'Finish report', priority:'urgent', completed:false }],
      sportsBeats:[{ kind:'match_today', headline:'Nigeria vs Ghana' }],
    }), { now });
    assert.equal(result?.source, 'calendar');
    assert.equal(result?.urgency, 'now');
    assert.match(result?.title ?? '', /Dentist appointment/);
    assert.match(result?.alongside ?? '', /Finish report/);
    assert.equal(result?.destination, undefined);
  });

  it('chooses an incomplete urgent task ahead of a distant calendar item and leisure', () => {
    const result = buildDailyDecision(context({
      todayCalendar: [{ title:'Evening appointment', timeLabel:'20:00', isAllDay:false }],
      priorityTasks: [{ title:'Fix critical issue', priority:'urgent', completed:false }],
      habits:[{name:'Read',done:false}],
      continueWatching:[{title:'Severance'}],
    }), {now});
    assert.equal(result?.source, 'tasks');
    assert.equal(result?.title, 'Fix critical issue');
    assert.equal(result?.destination, 'tasks');
    assert.match(result?.reason ?? '', /urgent/);
    assert.equal(result?.alongside, undefined);
  });

  it('uses calendar context without inventing urgency for a later appointment', () => {
    const result = buildDailyDecision(context({
      todayCalendar: [{ title:'Call', timeLabel:'17:00', isAllDay:false }],
      tasks:[{name:'Draft notes',completed:false,priority:'medium'}],
    }), {now});
    assert.equal(result?.source,'tasks');
    assert.match(result?.alongside ?? '', /Call.*17:00/);
    assert.doesNotMatch(result?.alongside ?? '', /minutes/);
  });

  it('never promotes a meeting whose known start time has already passed', () => {
    const result = buildDailyDecision(context({
      todayCalendar: [{ title:'Past meeting', timeLabel:'14:00', isAllDay:false }],
      habits:[{name:'Stretch',done:false}],
    }), {now});
    assert.equal(result?.source,'habits');
    assert.equal((result?.title ?? '').includes('Past meeting'),false);
  });

  it('ignores completed tasks and habits and does not invent progress', () => {
    const result = buildDailyDecision(context({
      tasks:[{name:'Already finished',completed:true,priority:'urgent'}],
      habits:[{name:'Done habit',done:true},{name:'Not due',done:false,scheduledToday:false}],
      continueWatching:[{title:'Slow Horses'}],
    }), {now});
    assert.equal(result?.source,'shows');
    assert.equal(result?.title,'Slow Horses');
    assert.doesNotMatch(JSON.stringify(result),/Already finished|Not due|Done habit/);
  });

  it('returns null with no reliable actionable or saved context', () => {
    assert.equal(buildDailyDecision(context(), {now}), null);
    assert.equal(buildDailyDecision(context({
      sportsBeats: [{kind:'recent_win',headline:'Nigeria won'}],
    }), {now}), null);
  });

  it('does not treat saved events as booked attendance', () => {
    const result = buildDailyDecision(context({
      savedDiscoveryEvents:[{
        title:'Comedy night',dateLabel:'2026-10-21', timeLabel:'19:30',
        venue:'Manchester Hall',daysUntil:0,timing:'today',intent:'saved',
      }],
    }), {now});
    assert.equal(result?.source,'events');
    assert.match(result?.reason ?? '',/Saved event/);
    assert.doesNotMatch(JSON.stringify(result),/attended|booked|going to|ticket purchased/i);
  });

  it('honours missing permissions and stale sports and weather observations', () => {
    const staleAt = new Date(now.getTime() - 60 * 60_000).toISOString();
    const result = buildDailyDecision(context({
      todayCalendar: [{title:'Private meeting',timeLabel:'15:30',isAllDay:false}],
      habits:[{name:'Go for a walk',done:false}],
      sportsBeats:[{kind:'live_now',headline:'Nigeria live now'}],
      weather:{condition:'Storm',temp:9,description:'Storm',city:'Manchester'},
    }, {
      availability:{calendar:false},
      updatedAt:{sports:staleAt,weather:new Date(now.getTime()-3*60*60_000).toISOString()},
    }), {now});
    assert.equal(result?.source,'habits');
    assert.equal(result?.alongside,undefined);
    assert.doesNotMatch(JSON.stringify(result),/Private meeting|Storm|Nigeria/);
  });

  it('uses verified weather only as secondary context, never a mood assumption', () => {
    const result = buildDailyDecision(context({
      habits:[{name:'Morning walk',done:false}],
      weather:{condition:'Rain showers',temp:11,description:'Light rain showers',city:'Manchester'},
    }), {now});
    assert.equal(result?.source,'habits');
    assert.match(result?.alongside ?? '',/Weather: Rain showers/);
    assert.doesNotMatch(JSON.stringify(result),/depressed|sad|happy|need to stay inside/);
  });

  it('does not present a previous date decision as a current priority', () => {
    const yesterday = context({ tasks:[{name:'Old task',completed:false,priority:'urgent'}] });
    assert.equal(buildDailyDecision(yesterday,{now:new Date(2026,9,22,8,0)}),null);
  });

  it('supports 24h and 12h clock labels, rejects ambiguous times', () => {
    assert.equal(parseDecisionClock('15:30'),930);
    assert.equal(parseDecisionClock('3:30 PM - 4:30 PM'),930);
    assert.equal(parseDecisionClock('at 12:00 am'),0);
    assert.equal(parseDecisionClock('12:00 PM'),720);
    assert.equal(parseDecisionClock('25:30'),null);
    assert.equal(parseDecisionClock('All day'),null);
    assert.equal(parseDecisionClock('this afternoon'),null);
    assert.equal(parseDecisionClock('3pm'),null);
  });

  it('selects the same recommendation deterministically without duplicate sources', () => {
    const data=context({
      priorityTasks:[{title:'Submit proposal',priority:'high',completed:false}],
      tasks:[{name:'Submit proposal',completed:false,priority:'high'},
        {name:'Write notes',completed:false,priority:'low'}],
      habits:[{name:'Meditate',done:false}],
    });
    const first=buildDailyDecision(data,{now});
    const second=buildDailyDecision(data,{now});
    assert.deepEqual(first,second);
    assert.equal(first?.title,'Submit proposal');
  });

  it('gracefully handles all-day calendar items without pretending they start soon', () => {
    const result=buildDailyDecision(context({
      todayCalendar:[{title:'Annual leave',timeLabel:'',isAllDay:true}],
    }),{now});
    assert.equal(result?.source,'calendar');
    assert.equal(result?.urgency,'next');
    assert.match(result?.reason??'',/all-day/);
  });
});
