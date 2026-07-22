import { FrequencyType, PartialCredit } from '@/types/habit';

export function getLocalDateStr(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calendar day (Y-M-D) for an event start in the **device local timezone**.
 * Do not use ISO string prefix checks — UTC midnight shifts the date for all-day EventKit rows.
 */
export function getLocalYmdFromCalendarStart(startIso: string, isAllDay?: boolean): string | null {
  const s = startIso?.trim();
  if (!s) return null;
  if (isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  return getLocalDateStr(new Date(ms));
}

export function calendarEventOnLocalDay(
  startIso: string,
  dayYmd: string,
  isAllDay?: boolean,
): boolean {
  const local = getLocalYmdFromCalendarStart(startIso, isAllDay);
  return local === dayYmd;
}

export function getLocalDateStrCompact(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function getTodayFormatted(): string {
  return getLocalDateStr(new Date());
}

export function formatDate(date: Date): string {
  return getLocalDateStr(date);
}

export function shouldDoHabitToday(frequency: { type?: FrequencyType; days: number[]; timesPerWeek?: number }): boolean {
  if (frequency.type === 'times_per_week') {
    return true;
  }
  const today = new Date().getDay();
  return frequency.days.includes(today);
}

export function calculateStreak(
  completions: Record<string, boolean>,
  frozenDatesOrOptions?: string[] | { frozenDates?: string[]; recoveredDates?: string[]; frequency?: { type?: FrequencyType; days: number[]; timesPerWeek?: number } }
): number {
  let frozenDates: string[] = [];
  let recoveredDates: string[] = [];
  let frequency: { type?: FrequencyType; days: number[]; timesPerWeek?: number } | undefined;

  if (Array.isArray(frozenDatesOrOptions)) {
    frozenDates = frozenDatesOrOptions;
  } else if (frozenDatesOrOptions) {
    frozenDates = frozenDatesOrOptions.frozenDates || [];
    recoveredDates = frozenDatesOrOptions.recoveredDates || [];
    frequency = frozenDatesOrOptions.frequency;
  }

  let streak = 0;
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = getLocalDateStr(current);

    if (i === 0) {
      if (completions[dateStr] || frozenDates.includes(dateStr) || recoveredDates.includes(dateStr)) {
        streak++;
      } else {
        const yesterday = new Date(current);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);
        if (!completions[yesterdayStr] && !frozenDates.includes(yesterdayStr) && !recoveredDates.includes(yesterdayStr)) {
          break;
        }
      }
      current.setDate(current.getDate() - 1);
      continue;
    }

    if (frequency && frequency.type === 'specific_days') {
      const dayOfWeek = current.getDay();
      if (!frequency.days.includes(dayOfWeek)) {
        current.setDate(current.getDate() - 1);
        continue;
      }
    }

    if (completions[dateStr] || frozenDates.includes(dateStr) || recoveredDates.includes(dateStr)) {
      streak++;
    } else {
      break;
    }

    current.setDate(current.getDate() - 1);
  }

  return streak;
}

export function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(getLocalDateStr(d));
  }
  return days;
}

export function getDayName(dateStr: string): string {
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return DAY_SHORT[d.getDay()];
}

export function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  d.setDate(d.getDate() - dayOfWeek);
  return getLocalDateStr(d);
}

export function getWeekCompletionCount(completions: Record<string, boolean>, weekStartStr: string): number {
  const parts = weekStartStr.split('-');
  const weekStart = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateStr(d);
    if (completions[dateStr]) count++;
  }
  return count;
}

export function getCompletionRate(completions: Record<string, boolean>): number {
  const dates = Object.keys(completions);
  if (dates.length === 0) return 0;
  const completed = Object.values(completions).filter(Boolean).length;
  const total = dates.length;
  return Math.round((completed / total) * 100);
}

export function calculatePartialCredit(
  completions: Record<string, boolean>,
  createdAt: string,
  frequency: { type?: FrequencyType; days: number[]; timesPerWeek?: number }
): PartialCredit {
  const startDate = new Date(createdAt);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalScheduledDays = 0;
  let totalCompletedDays = 0;
  const monthlyRates: Record<string, number> = {};
  const weeklyRates: Record<string, number> = {};
  const monthBuckets: Record<string, { scheduled: number; completed: number }> = {};
  const weekBuckets: Record<string, { scheduled: number; completed: number }> = {};

  const current = new Date(startDate);
  while (current <= today) {
    const dateStr = getLocalDateStr(current);
    const dayOfWeek = current.getDay();
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

    const weekNum = getISOWeekNumber(current);
    const weekKey = `${current.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    let isScheduled = false;
    if (frequency.type === 'times_per_week') {
      isScheduled = true;
    } else {
      isScheduled = frequency.days.includes(dayOfWeek);
    }

    if (isScheduled) {
      totalScheduledDays++;
      if (!monthBuckets[monthKey]) monthBuckets[monthKey] = { scheduled: 0, completed: 0 };
      if (!weekBuckets[weekKey]) weekBuckets[weekKey] = { scheduled: 0, completed: 0 };
      monthBuckets[monthKey].scheduled++;
      weekBuckets[weekKey].scheduled++;

      if (completions[dateStr]) {
        totalCompletedDays++;
        monthBuckets[monthKey].completed++;
        weekBuckets[weekKey].completed++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  for (const [key, bucket] of Object.entries(monthBuckets)) {
    monthlyRates[key] = bucket.scheduled > 0 ? Math.round((bucket.completed / bucket.scheduled) * 100) : 0;
  }
  for (const [key, bucket] of Object.entries(weekBuckets)) {
    weeklyRates[key] = bucket.scheduled > 0 ? Math.round((bucket.completed / bucket.scheduled) * 100) : 0;
  }

  const allTimeRate = totalScheduledDays > 0 ? Math.round((totalCompletedDays / totalScheduledDays) * 100) : 0;

  return { monthlyRates, weeklyRates, allTimeRate, totalScheduledDays, totalCompletedDays };
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function detectComebackOpportunity(
  completions: Record<string, boolean>,
  frequency: { type?: FrequencyType; days: number[]; timesPerWeek?: number },
  lastBonusDate?: string
): { isComeback: boolean; missedDays: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getLocalDateStr(today);

  if (lastBonusDate === todayStr) {
    return { isComeback: false, missedDays: 0 };
  }

  let missedDays = 0;
  const check = new Date(today);
  check.setDate(check.getDate() - 1);

  for (let i = 0; i < 30; i++) {
    const dateStr = getLocalDateStr(check);
    const dayOfWeek = check.getDay();

    let isScheduled = false;
    if (frequency.type === 'times_per_week') {
      isScheduled = true;
    } else {
      isScheduled = frequency.days.includes(dayOfWeek);
    }

    if (isScheduled) {
      if (completions[dateStr]) {
        break;
      }
      missedDays++;
    }

    check.setDate(check.getDate() - 1);
  }

  return { isComeback: missedDays >= 2, missedDays };
}

export function getComebackBonusXP(missedDays: number): number {
  if (missedDays < 2) return 0;
  if (missedDays <= 3) return 10;
  if (missedDays <= 7) return 25;
  if (missedDays <= 14) return 50;
  return 100;
}
