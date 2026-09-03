import type { ChronotypeInfo } from '@/types/habit';

export type HabitCommitmentType =
  | 'fixed_window'
  | 'flexible_session'
  | 'duration_activity'
  | 'cumulative_goal'
  | 'ongoing_rule'
  | 'multi_window'
  | 'context_anchored'
  | 'event_driven'
  | 'user_timed';

export type HabitTimingPolicy =
  | 'schedule'
  | 'track_progress'
  | 'all_day'
  | 'multi_window'
  | 'contextual'
  | 'user_defined';

export type HabitDaypart = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export interface HabitSemanticWindow {
  startHour: number;
  endHour: number;
  preferredHour: number;
  label: HabitDaypart;
  hard: boolean;
}

export interface HabitSemanticInput {
  id?: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  estimatedDuration?: number | string;
  programData?: { weeks?: unknown[] } | null;
}

export interface HabitSemantics {
  type: HabitCommitmentType;
  policy: HabitTimingPolicy;
  windows: HabitSemanticWindow[];
  durationMinutes: number;
  confidence: number;
  reason: string;
  guidanceLabel: string;
  guidanceDetail: string;
  avoidBeforeSleepMinutes?: number;
  anchor?: string;
}

const DAYPARTS: Record<HabitDaypart, HabitSemanticWindow> = {
  morning: { startHour: 6, endHour: 12, preferredHour: 8, label: 'morning', hard: true },
  midday: { startHour: 11, endHour: 15, preferredHour: 13, label: 'midday', hard: true },
  afternoon: { startHour: 12, endHour: 18, preferredHour: 15, label: 'afternoon', hard: true },
  evening: { startHour: 17, endHour: 22, preferredHour: 19, label: 'evening', hard: true },
  night: { startHour: 20, endHour: 24, preferredHour: 21, label: 'night', hard: true },
};

const MEDICAL_TIMING = /\b(medication|medicine|meds|prescription|insulin|antibiotic|dose|dosage|pill|pills|tablet|tablets|supplement|supplements|vitamin|vitamins)\b/i;
const MULTI_WINDOW = /\b(am\s*[\/+&-]\s*pm|morning\s*(?:and|&|\+)\s*(?:evening|night)|twice\s+(?:a\s+day|daily|per\s+day)|2\s*x\s*(?:daily|a\s+day)|brush(?:ing)?\s+(?:my\s+)?teeth)\b/i;
const WORKOUT = /\b(workout|work out|gym|strength|strength training|weight training|resistance training|bodybuilding|muscle building|hiit|cardio|run(?:ning)?|jog(?:ging)?|walk(?:ing)?|cycle|cycling|bike ride|swim(?:ming)?|pilates|yoga|rowing|football training|sports training)\b/i;
const CUMULATIVE = /\b(steps?|step goal|10k\s*steps?|walk\s+\d+[,.]?\d*\s*steps?|glasses?\s+of\s+water|litres?\s+of\s+water|liters?\s+of\s+water|hydration goal|water intake|movement goal|stand goal)\b/i;
const DIET_OR_LIFESTYLE = /\b(diet|eating|lifestyle|whole foods?|plant[- ]based|low[- ]carb|keto|high[- ]protein|no[- ]spend|no spend|no social media|digital detox|fasting|fast for|intermittent fast|no sugar|sugar[- ]free|no alcohol|alcohol[- ]free|sobriety|avoid spending|avoid social media)\b/i;
const CONTEXT_ANCHOR = /\b(after|before|with)\s+(breakfast|lunch|dinner|a meal|meals|coffee|shower|bath|commute|work|workout|gym|church|school|class)\b/i;
const BEDTIME_RELATIVE = /\b(before bed|before bedtime|screen[- ]free.*bed|wind[- ]down|wind down|sleep routine)\b/i;
const EVENT_DRIVEN = /\b(box breathing|breathwork|breathing exercise|when stressed|when anxious|when overwhelmed|active listening|random act of kindness|kindness daily|when I need|as needed)\b/i;
const MORNING = /\b(morning|every morning|wake[ -]?up|waking|make (?:your|my|the) bed|breakfast|sunrise|start (?:my|the|your) day|begin (?:my|the|your|each) day|first thing)\b/i;
const MIDDAY = /\b(lunch|lunchtime|midday|noon)\b/i;
const AFTERNOON = /\b(afternoon|after lunch)\b/i;
const EVENING = /\b(evening|after work|after dinner)\b/i;
const NIGHT = /\b(night routine|every night|at night|bedtime|before bed|before sleep)\b/i;
const FLEXIBLE_SKILL = /\b(read|reading|study|studying|learn|learning|language|duolingo|practice|guitar|piano|music|write|writing|sketch|draw|drawing|journal|journaling|devotional|bible|prayer|pray|meditat|therapy|self[- ]check|declutter|meal prep|meal planning|network|reach out|call a friend|call family|inbox zero|finance review|budget|saving|savings challenge)\b/i;
// A custom contact habit can contain an arbitrary person's name ("Call Mum", "Ring Josh").
// Exclude common non-contact phrasings so we do not turn "call it a day" into a phone reminder.
const SOCIAL_CONTACT = /\b(?:phone|ring|facetime|video call)\b|\bcall\s+(?!(?:it|this|that|the|in|out|off)\b)/i;

function combinedText(input: HabitSemanticInput): string {
  return [input.title, input.description ?? '', ...(input.tags ?? []), input.category ?? '']
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDurationText(value: string): number | null {
  const hour = value.match(/\b(\d+(?:\.\d+)?)\s*[-–—]?\s*(?:hours?|hrs?|hr)\b/i);
  if (hour) return Math.max(1, Math.round(Number(hour[1]) * 60));
  const minutes = value.match(/\b(\d+)\s*[-–—]?\s*(?:minutes?|mins?|min)\b/i);
  if (minutes) return Math.max(1, Number(minutes[1]));
  return null;
}

export function inferHabitDurationMinutes(input: HabitSemanticInput): number {
  if (typeof input.estimatedDuration === 'number' && Number.isFinite(input.estimatedDuration) && input.estimatedDuration > 0) {
    return Math.min(180, Math.max(1, Math.round(input.estimatedDuration)));
  }
  if (typeof input.estimatedDuration === 'string') {
    const parsed = parseDurationText(input.estimatedDuration);
    if (parsed != null) return Math.min(180, parsed);
  }

  const text = combinedText(input);
  const parsed = parseDurationText(text);
  if (parsed != null) return Math.min(180, parsed);

  if (/\b(meal prep|batch cook)\b/i.test(text)) return 90;
  if (WORKOUT.test(text)) return 60;
  if (/\b(therapy|self[- ]check|network|reach out|creative writing|practice guitar|piano)\b/i.test(text) || SOCIAL_CONTACT.test(text)) return 30;
  if (/\b(read|reading|study|learn|duolingo|language|bible|devotional|journal|meditat|sketch|draw)\b/i.test(text)) return 20;
  if (/\b(declutter|inbox zero|time blocking|plan (?:my|the) day|daily planning)\b/i.test(text)) return 15;
  return 20;
}

function fixedWindow(daypart: HabitDaypart, reason: string, guidanceLabel?: string, preferredHour?: number): HabitSemantics {
  const base = DAYPARTS[daypart];
  const window = preferredHour == null ? base : { ...base, preferredHour };
  return {
    type: 'fixed_window',
    policy: 'schedule',
    windows: [window],
    durationMinutes: 20,
    confidence: 0.94,
    reason,
    guidanceLabel: guidanceLabel ?? `${daypart[0].toUpperCase()}${daypart.slice(1)} routine`,
    guidanceDetail: `Keep this inside its ${daypart} window.`,
  };
}

function ongoingGuidance(text: string): Pick<HabitSemantics, 'guidanceLabel' | 'guidanceDetail'> {
  if (/\b(no social media|digital detox).*\b(noon|12)\b/i.test(text)) {
    return { guidanceLabel: 'Until noon', guidanceDetail: 'This is a restriction window, not an appointment.' };
  }
  if (/\b(no[- ]spend|no spend)\b/i.test(text)) {
    return { guidanceLabel: 'All-day rule', guidanceDetail: 'Track whether you kept the rule today; do not schedule it for one hour.' };
  }
  if (/\b(fasting|fast for|intermittent fast)\b/i.test(text)) {
    return { guidanceLabel: 'Follow your fasting window', guidanceDetail: 'Treat the eating/fasting window as the behaviour instead of inventing one best time.' };
  }
  if (/\b(diet|eating|lifestyle|whole foods?|plant[- ]based|low[- ]carb|keto|high[- ]protein)\b/i.test(text)) {
    return { guidanceLabel: 'Applies throughout the day', guidanceDetail: 'This is an ongoing eating pattern, not a single timed session.' };
  }
  return { guidanceLabel: 'Applies throughout the day', guidanceDetail: 'This is an ongoing rule rather than a one-off session.' };
}

function contextualGuidance(text: string): { label: string; detail: string; anchor?: string } {
  if (/\b(cold shower|cold rinse)\b/i.test(text)) {
    return { label: 'With your next shower', detail: 'Keep it attached to the shower instead of assigning an arbitrary clock time.', anchor: 'shower' };
  }
  if (BEDTIME_RELATIVE.test(text)) {
    const minutes = text.match(/\b(\d+)\s*[-–—]?\s*(?:minutes?|mins?|min)\s+before\s+(?:bed|bedtime|sleep)\b/i)?.[1];
    const hour = /\b(?:an|one|1)\s+hour\s+before\s+(?:bed|bedtime|sleep)\b/i.test(text);
    const amount = minutes ? `${minutes} min` : hour ? '1 hour' : '';
    return {
      label: amount ? `${amount} before bed` : 'Before bed',
      detail: 'This is anchored to bedtime, so chronotype should not move it to a productivity peak.',
      anchor: 'bedtime',
    };
  }
  if (/\b(active listening)\b/i.test(text)) {
    return { label: 'During conversations', detail: 'Practice this when the real situation occurs.', anchor: 'conversation' };
  }
  if (/\b(random act of kindness|kindness daily)\b/i.test(text)) {
    return { label: 'Look for a natural moment', detail: 'This is opportunistic; a fake appointment would make it less useful.', anchor: 'opportunity' };
  }
  if (/\b(box breathing|breathwork|breathing exercise|when stressed|when anxious|when overwhelmed)\b/i.test(text)) {
    return { label: 'Use when you need it', detail: 'Treat this as a contextual tool rather than forcing it into one clock slot.', anchor: 'need' };
  }
  const anchorMatch = text.match(CONTEXT_ANCHOR);
  if (anchorMatch) {
    const phrase = `${anchorMatch[1]} ${anchorMatch[2]}`;
    return { label: `${phrase[0].toUpperCase()}${phrase.slice(1)}`, detail: 'Keep this attached to the real-world cue.', anchor: anchorMatch[2] };
  }
  return { label: 'Use when it fits the moment', detail: 'This habit depends on context more than clock time.' };
}

export function classifyHabitSemantics(input: HabitSemanticInput): HabitSemantics {
  const text = combinedText(input);
  const durationMinutes = inferHabitDurationMinutes(input);

  // Safety first: do not manufacture medication/supplement timing from a calendar,
  // chronotype or title. Respect user-set reminders / professional instructions.
  if (MEDICAL_TIMING.test(text)) {
    return {
      type: 'user_timed',
      policy: 'user_defined',
      windows: [],
      durationMinutes,
      confidence: 0.99,
      reason: 'Health-related dosing timing should come from the user’s existing instructions, not One Pager inference.',
      guidanceLabel: 'Use your set reminder',
      guidanceDetail: 'One Pager will not invent a medication or supplement schedule.',
    };
  }

  if (MULTI_WINDOW.test(text)) {
    return {
      type: 'multi_window',
      policy: 'multi_window',
      windows: [DAYPARTS.morning, DAYPARTS.evening],
      durationMinutes: Math.min(durationMinutes, 20),
      confidence: 0.98,
      reason: 'The habit explicitly calls for more than one daily window.',
      guidanceLabel: 'Morning + evening',
      guidanceDetail: 'Treat the two parts separately rather than collapsing them into one “best time”.',
    };
  }

  if (CUMULATIVE.test(text)) {
    return {
      type: 'cumulative_goal',
      policy: 'track_progress',
      windows: [],
      durationMinutes: 0,
      confidence: 0.96,
      reason: 'The habit is accumulated across the day rather than completed in one session.',
      guidanceLabel: 'Track through the day',
      guidanceDetail: 'Progress matters more than a single appointment. Suggest a catch-up block only when progress data exists.',
    };
  }

  if (DIET_OR_LIFESTYLE.test(text)) {
    const guidance = ongoingGuidance(text);
    return {
      type: 'ongoing_rule',
      policy: 'all_day',
      windows: [],
      durationMinutes: 0,
      confidence: 0.94,
      reason: 'The habit describes a rule, eating pattern or time-window protocol rather than a discrete session.',
      guidanceLabel: guidance.guidanceLabel,
      guidanceDetail: guidance.guidanceDetail,
    };
  }

  if (BEDTIME_RELATIVE.test(text) || EVENT_DRIVEN.test(text) || CONTEXT_ANCHOR.test(text) || /\b(cold shower|cold rinse)\b/i.test(text)) {
    const guidance = contextualGuidance(text);
    return {
      type: EVENT_DRIVEN.test(text) ? 'event_driven' : 'context_anchored',
      policy: 'contextual',
      windows: [],
      durationMinutes,
      confidence: 0.94,
      reason: 'The habit is anchored to a real-world cue or situation, not an arbitrary hour.',
      guidanceLabel: guidance.label,
      guidanceDetail: guidance.detail,
      anchor: guidance.anchor,
    };
  }

  // Some planning / work-maintenance habits have a meaningful workday window even
  // when the title does not literally say “afternoon”. These are narrow, high-value
  // conventions rather than blanket category assumptions.
  if (/\b(time blocking|plan (?:my|the) day|daily planning|plan tomorrow)\b/i.test(text)) {
    const semantic = fixedWindow('morning', 'Planning works before the day fills up.', 'Plan before the day gets busy', 8);
    return { ...semantic, durationMinutes };
  }
  if (/\b(inbox zero|process (?:my|the) inbox|email cleanup)\b/i.test(text)) {
    const semantic = fixedWindow('afternoon', 'Inbox processing is most useful near the latter part of the workday.', 'Later in the workday', 16);
    return { ...semantic, windows: [{ ...semantic.windows[0], startHour: 14, endHour: 19, preferredHour: 16 }], durationMinutes, confidence: 0.82 };
  }

  if (MORNING.test(text)) {
    const semantic = fixedWindow('morning', 'Explicit morning language is a hard constraint, not a chronotype preference.');
    return { ...semantic, durationMinutes };
  }
  if (MIDDAY.test(text)) {
    const semantic = fixedWindow('midday', 'The habit is explicitly tied to midday/lunch.');
    return { ...semantic, durationMinutes };
  }
  if (AFTERNOON.test(text)) {
    const semantic = fixedWindow('afternoon', 'The habit is explicitly tied to the afternoon.');
    return { ...semantic, durationMinutes };
  }
  if (NIGHT.test(text)) {
    const semantic = fixedWindow('night', 'Explicit night language is a hard constraint, not a productivity preference.');
    return { ...semantic, durationMinutes };
  }
  if (EVENING.test(text)) {
    const semantic = fixedWindow('evening', 'The habit is explicitly tied to the evening.');
    return { ...semantic, durationMinutes };
  }

  if (WORKOUT.test(text) || (input.programData?.weeks?.length ?? 0) > 0) {
    return {
      type: 'duration_activity',
      policy: 'schedule',
      windows: [],
      durationMinutes: Math.max(30, durationMinutes),
      confidence: 0.9,
      reason: 'This is a substantial physical session that needs a genuinely large free block.',
      guidanceLabel: 'Find a real workout window',
      guidanceDetail: 'Use calendar space and learned behaviour, and avoid squeezing an intense session too close to sleep.',
      avoidBeforeSleepMinutes: 90,
    };
  }

  // Social calls and professional outreach are flexible, but “2am because you are a
  // night owl” is not a sensible default. Arbitrary names are expected in custom habits.
  if (/\b(call a friend|call family|phone call|network|reach out|professional contact)\b/i.test(text) || SOCIAL_CONTACT.test(text)) {
    return {
      type: 'flexible_session',
      policy: 'schedule',
      windows: [{ startHour: 9, endHour: 20, preferredHour: 18, label: 'evening', hard: true }],
      durationMinutes,
      confidence: 0.86,
      reason: 'This is a flexible social/professional session, but it should stay inside reasonable contact hours.',
      guidanceLabel: 'Find a sensible contact window',
      guidanceDetail: 'Use a free block during normal waking/contact hours.',
    };
  }

  if (FLEXIBLE_SKILL.test(text)) {
    return {
      type: 'flexible_session',
      policy: 'schedule',
      windows: [],
      durationMinutes,
      confidence: 0.82,
      reason: 'This is a discrete session whose timing can legitimately adapt to calendar space and learned behaviour.',
      guidanceLabel: 'Find a useful free window',
      guidanceDetail: 'Use completion history first, then chronotype as a tie-breaker.',
    };
  }

  // Conservative fallback for arbitrary user-created habits. The app may optimise a
  // generic session, but confidence stays deliberately low so future explicit user
  // metadata can override it cleanly.
  return {
    type: 'flexible_session',
    policy: 'schedule',
    windows: [],
    durationMinutes,
    confidence: 0.55,
    reason: 'No strong semantic constraint was detected, so treat this as a flexible session.',
    guidanceLabel: 'Find a useful free window',
    guidanceDetail: 'One Pager is keeping this flexible because it is not confident enough to invent a stricter rule.',
  };
}

export function bedtimeBoundaryForDay(now: Date, chronoInfo?: ChronotypeInfo): Date | null {
  if (!chronoInfo) return null;
  const boundary = new Date(now);
  boundary.setHours(chronoInfo.sleepHour, 0, 0, 0);
  // Wolf-style sleep hours (e.g. 1am) belong to the night after the current day.
  if (chronoInfo.sleepHour < 6) boundary.setDate(boundary.getDate() + 1);
  if (boundary.getTime() <= now.getTime()) boundary.setDate(boundary.getDate() + 1);
  return boundary;
}

export function isClockTimeLabel(value: string): boolean {
  return /^\d{1,2}:\d{2}\s*(?:am|pm)$/i.test(value.trim());
}
