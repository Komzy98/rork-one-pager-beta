import type { IntelligenceContext, IntelligenceSource } from './intelligenceContext';
import type { AIBriefingPreferences } from './aiBriefingPreferences';

export const AI_BRIEFING_VERSION = 1;
export type BriefingApproach = 'start_small' | 'prepare_ahead' | 'make_time' | 'keep_it_simple';
export type BriefingFocusItem = {
  id: string;
  source: IntelligenceSource;
  title: string;
  detail: string;
};
export type BriefingAIRequest = { date: string; items: BriefingFocusItem[] };

const MAX_ITEMS = 16;
function label(value: string | undefined, limit = 110): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

/**
 * Privacy boundary: never share wellness notes, mood, activity descriptions,
 * account identifiers, habit streaks or completion counts.
 * Only opted-in categories and verified, non-stale source data are projected.
 */
export function buildPrivateBriefingRequest(
  context: IntelligenceContext,
  preferences: AIBriefingPreferences,
): BriefingAIRequest {
  if (!preferences.enabled) return { date: context.date, items: [] };
  const items: BriefingFocusItem[] = [];
  const add = (source: IntelligenceSource, title: string, detail = '') => {
    if (items.length >= MAX_ITEMS || !preferences.sources[source] ||
        context.sources[source].status !== 'ready') return;
    const safeTitle = label(title);
    if (!safeTitle) return;
    if (items.some(x => x.source === source && x.title.toLowerCase() === safeTitle.toLowerCase())) return;
    items.push({ id: source + ':' + items.length, source, title: safeTitle, detail: label(detail, 90) });
  };

  context.priorityTasks.filter(t => !t.completed).slice(0, 4)
    .forEach(t => add('tasks', t.title, 'Priority: ' + (t.priority || 'not specified')));
  context.tasks.filter(t => !t.completed).slice(0, 4)
    .forEach(t => add('tasks', t.name, 'Not completed yet'));
  context.habits.filter(h => !h.done).slice(0, 4)
    .forEach(h => add('habits', h.name, 'Scheduled habit not completed yet'));
  context.todayCalendar.slice(0, 3)
    .forEach(e => add('calendar', e.title, e.isAllDay ? 'Today, all day' : 'Today · ' + e.timeLabel));
  context.upcomingEvents.filter(e => e.intent === 'scheduled').slice(0, 2)
    .forEach(e => add('calendar', e.title, e.dateLabel + ' · ' + e.timeLabel));
  context.sportsBeats.slice(0, 2)
    .forEach(b => add('sports', b.headline, b.whenLabel));
  context.upcomingMatches.slice(0, 2)
    .forEach(m => add('sports', m.homeTeam + ' vs ' + m.awayTeam, m.date + ' · ' + m.time));
  context.savedDiscoveryEvents.slice(0, 2)
    .forEach(e => add('events', e.title, e.dateLabel + ' · ' + e.timeLabel));
  context.continueWatching.slice(0, 2)
    .forEach(s => add('shows', s.title, s.episode));
  if (context.weather) {
    add('weather', Math.round(context.weather.temp) + '°C · ' +
      (context.weather.condition || context.weather.description), 'Current weather');
  }
  return { date: context.date, items };
}

/** The app controls factual copy; the model only ranks verified items and style. */
export function renderVerifiedBriefingInsight(
  selected: BriefingFocusItem,
  approach: BriefingApproach,
): string {
  switch (selected.source) {
    case 'habits':
      return approach === 'make_time'
        ? 'Make a little room for ' + selected.title + ' today. A short session still counts.'
        : 'One small step to consider: ' + selected.title + '. Start with a manageable version.';
    case 'tasks':
      return approach === 'prepare_ahead'
        ? 'Worth planning ahead for: ' + selected.title + '. Decide when to tackle the first step.'
        : 'A useful next focus could be ' + selected.title + '. Start with one concrete step.';
    case 'calendar':
      return 'On your schedule: ' + selected.title + (selected.detail ? ' · ' + selected.detail : '') + '. Leave room for it in your plans.';
    case 'sports':
      return 'On your sports radar: ' + selected.title + (selected.detail ? ' · ' + selected.detail : '') + '.';
    case 'events':
      return 'You saved ' + selected.title + (selected.detail ? ' · ' + selected.detail : '') + '. Worth keeping in mind when planning.';
    case 'shows':
      return selected.title + ' is in your Continue Watching list if you want something to put on.';
    case 'weather':
      return 'Weather to consider: ' + selected.title + '. Check conditions before making outdoor plans.';
  }
}
