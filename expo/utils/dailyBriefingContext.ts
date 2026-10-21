import type {
  DailySummary,
  DailySummaryCalendarEvent,
  DailySummaryContinueWatching,
  DailySummarySportsBeat,
} from './dailySummary';

export type BriefingHighlight = {
  kind: 'calendar' | 'weather' | 'sports' | 'shows' | 'events';
  label: string;
  text: string;
};

type BriefingEvent = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  timing: 'past' | 'today' | 'upcoming';
  intent: 'scheduled' | 'saved';
  isAllDay?: boolean;
};

type SavedEvent = {
  title: string;
  dateLabel: string;
  timeLabel?: string;
  venue: string;
  daysUntil: number | null;
  timing: 'past' | 'today' | 'upcoming';
};

export type BriefingContext = {
  date: string;
  todayCalendar?: DailySummaryCalendarEvent[];
  upcomingEvents?: BriefingEvent[];
  savedDiscoveryEvents?: SavedEvent[];
  weather?: { condition: string; temp: number; description?: string; city?: string };
  sportsBeats?: DailySummarySportsBeat[];
  upcomingMatches?: { homeTeam: string; awayTeam: string; date: string; time: string; competition: string }[];
  continueWatching?: DailySummaryContinueWatching[];
  shows?: { title: string; episode?: string }[];
};

const clean = (value: string | undefined | null): string => (value ?? '').replace(/\s+/g, ' ').trim();
const formattedName = (value: string): string => clean(value).slice(0, 120);
const cleanTime = (value?: string | null): string => clean(value).slice(0, 50);
const knownDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

function dateLabel(value: string, today: string): string {
  if (value === today) return 'Today';
  if (knownDate(value) && knownDate(today)) {
    const days = Math.round((Date.parse(value + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000);
    if (days === 1) return 'Tomorrow';
  }
  return clean(value);
}

/**
 * Give the user's real interests and commitments a place in their daily briefing.
 * Each card is grounded in the exact data already gathered by Overview.
 * Absence of data is not evidence that nothing is scheduled.
 */
export function buildBriefingHighlights(input: BriefingContext): BriefingHighlight[] {
  const result: BriefingHighlight[] = [];
  const add = (kind: BriefingHighlight['kind'], label: string, text: string) => {
    if (text.trim()) result.push({ kind, label, text });
  };

  const today = (input.todayCalendar ?? []).filter(e => clean(e.title));
  if (today.length) {
    const selected = today.slice(0, 2).map(e => {
      const time = e.isAllDay ? 'all day' : cleanTime(e.timeLabel);
      return [formattedName(e.title), time].filter(Boolean).join(' · ');
    });
    add('calendar', 'Calendar · Today', selected.join('  •  '));
  } else {
    const future = (input.upcomingEvents ?? []).find(e =>
      clean(e.title) && e.timing === 'upcoming' && e.intent === 'scheduled' && knownDate(e.dateLabel) && e.dateLabel >= input.date
    );
    if (future) {
      add('calendar', 'Coming up', [
        formattedName(future.title),
        dateLabel(future.dateLabel, input.date),
        future.isAllDay ? 'all day' : cleanTime(future.timeLabel),
      ].filter(Boolean).join(' · '));
    }
  }

  if (input.weather && Number.isFinite(input.weather.temp) && clean(input.weather.condition || input.weather.description)) {
    const w = input.weather;
    add('weather', 'Weather', [
      `${Math.round(w.temp)}°C`,
      clean(w.condition || w.description),
      clean(w.city) ? `in ${clean(w.city)}` : '',
    ].filter(Boolean).join(' · '));
  }

  const liveBeat = (input.sportsBeats ?? []).find(b => b.kind === 'live_now' && clean(b.headline));
  const matchToday = (input.sportsBeats ?? []).find(b => b.kind === 'match_today' && clean(b.headline));
  const beat = liveBeat ?? matchToday ?? (input.sportsBeats ?? []).find(b => clean(b.headline));
  if (beat) {
    const when = cleanTime(beat.whenLabel);
    add('sports', 'Sports', [formattedName(beat.headline), when && !beat.headline.toLowerCase().includes(when.toLowerCase()) ? when : ''].filter(Boolean).join(' · '));
  } else {
    const fixture = (input.upcomingMatches ?? [])
      .filter(m => knownDate(m.date) && m.date >= input.date && clean(m.homeTeam) && clean(m.awayTeam))
      .sort((a,b) => a.date.localeCompare(b.date))[0];
    if (fixture) {
      add('sports', 'Sports', [
        `${formattedName(fixture.homeTeam)} vs ${formattedName(fixture.awayTeam)}`,
        dateLabel(fixture.date, input.date),
        cleanTime(fixture.time),
      ].filter(Boolean).join(' · '));
    }
  }

  const watching = (input.continueWatching ?? []).find(s => clean(s.title));
  const savedShow = (input.shows ?? []).find(s => clean(s.title));
  if (watching || savedShow) {
    add('shows', 'Continue watching', [
      formattedName((watching ?? savedShow)!.title),
      clean(watching?.episode ?? savedShow?.episode),
    ].filter(Boolean).join(' · '));
  }

  const upcomingSaved = (input.savedDiscoveryEvents ?? []).find(e =>
    e.timing !== 'past' && (e.daysUntil == null || e.daysUntil >= 0) && clean(e.title)
  );
  if (upcomingSaved) {
    const alreadyListed = result.some(r => r.kind === 'calendar' && r.text.toLowerCase().includes(formattedName(upcomingSaved.title).toLowerCase()));
    if (!alreadyListed) add('events', 'Saved event', [
      formattedName(upcomingSaved.title),
      dateLabel(upcomingSaved.dateLabel, input.date),
      cleanTime(upcomingSaved.timeLabel),
    ].filter(Boolean).join(' · '));
  }

  return result;
}

/** Full narration and sharing should include the same grounded context as the card. */
export function buildDailyBriefingNarration(summary: Pick<DailySummary, 'summary' | 'contextHighlights' | 'recommendations' | 'aiInsight'>): string {
  const parts = [clean(summary.summary)];
  if (summary.contextHighlights?.length) {
    parts.push('Here is what else is on your radar.');
    for (const highlight of summary.contextHighlights) {
      parts.push(`${highlight.label}: ${highlight.text}.`);
    }
  }
  if (summary.aiInsight) parts.push('A personalised suggestion: ' + clean(summary.aiInsight));
  const recommendation = summary.recommendations?.find(Boolean);
  if (recommendation && !summary.aiInsight) parts.push(`One thing to consider: ${clean(recommendation)}`);
  return parts.filter(Boolean).join(' ').slice(0, 3700);
}
