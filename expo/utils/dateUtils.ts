/**
 * Format a date to YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date formatted as YYYY-MM-DD
 */
export const getTodayFormatted = (): string => {
  return formatDate(new Date());
};

/**
 * Get the day of the week (0-6, where 0 is Sunday)
 */
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};

/**
 * Check if a habit should be performed today based on frequency
 */
export const shouldDoHabitToday = (frequency: { type?: string; days: number[]; timesPerWeek?: number }): boolean => {
  if (frequency.type === 'times_per_week') {
    return true;
  }
  const today = new Date();
  const dayOfWeek = getDayOfWeek(today);
  return frequency.days.includes(dayOfWeek);
};

/**
 * Check if a date is a scheduled day for a habit
 */
export const isScheduledDay = (date: Date, frequency: { type?: string; days: number[]; timesPerWeek?: number }): boolean => {
  if (frequency.type === 'times_per_week') {
    return true;
  }
  return frequency.days.includes(getDayOfWeek(date));
};

/**
 * Get the start of the week (Sunday) for a given date
 */
export const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Count completions in a given week for a habit
 */
export const getWeekCompletionCount = (
  completions: Record<string, boolean>,
  weekStart: Date
): number => {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    if (completions[dateStr]) count++;
  }
  return count;
};

/**
 * Check if a habit met its weekly target for a given week
 */
export const metWeeklyTarget = (
  completions: Record<string, boolean>,
  weekStart: Date,
  timesPerWeek: number
): boolean => {
  return getWeekCompletionCount(completions, weekStart) >= timesPerWeek;
};

/**
 * Check if today is within grace period (can recover yesterday's miss)
 */
export const isWithinGracePeriod = (graceHours: number = 24): boolean => {
  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  const hoursSinceMidnight = (now.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60);
  return hoursSinceMidnight <= graceHours;
};

export interface StreakCalculationOptions {
  frozenDates?: string[];
  recoveredDates?: string[];
  frequency?: { type?: string; days: number[]; timesPerWeek?: number };
  gracePeriodEnabled?: boolean;
  graceHours?: number;
}

/**
 * Calculate the streak for a habit, respecting frozen days, grace period, and flexible scheduling
 */
export const calculateStreak = (
  completions: Record<string, boolean>,
  frozenDatesOrOptions?: string[] | StreakCalculationOptions
): number => {
  let frozenDates: string[] = [];
  let recoveredDates: string[] = [];
  let frequency: { type?: string; days: number[]; timesPerWeek?: number } | undefined;

  if (Array.isArray(frozenDatesOrOptions)) {
    frozenDates = frozenDatesOrOptions;
  } else if (frozenDatesOrOptions) {
    frozenDates = frozenDatesOrOptions.frozenDates || [];
    recoveredDates = frozenDatesOrOptions.recoveredDates || [];
    frequency = frozenDatesOrOptions.frequency;
  }

  const frozenSet = new Set(frozenDates);
  const recoveredSet = new Set(recoveredDates);

  if (frequency?.type === 'times_per_week' && frequency.timesPerWeek) {
    return calculateWeeklyStreak(completions, frozenSet, frequency.timesPerWeek);
  }

  const today = new Date();
  let currentDate = new Date(today);
  let streak = 0;

  const todayFormatted = formatDate(today);
  const isTodayCompleted = completions[todayFormatted];
  const isTodayFrozen = frozenSet.has(todayFormatted);
  const isTodayRecovered = recoveredSet.has(todayFormatted);

  if (!isTodayCompleted && !isTodayFrozen && !isTodayRecovered) {
    if (frequency && !isScheduledDay(today, frequency)) {
      // skip
    } else {
      currentDate.setDate(currentDate.getDate() - 1);
    }
  }

  let maxIterations = 365;
  let iterations = 0;

  while (iterations < maxIterations) {
    const dateStr = formatDate(currentDate);
    const checkDate = new Date(currentDate);

    if (frequency && !isScheduledDay(checkDate, frequency)) {
      currentDate.setDate(currentDate.getDate() - 1);
      iterations++;
      continue;
    }

    if (completions[dateStr] || frozenSet.has(dateStr) || recoveredSet.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }

    iterations++;
  }

  return streak;
};

const calculateWeeklyStreak = (
  completions: Record<string, boolean>,
  frozenSet: Set<string>,
  timesPerWeek: number
): number => {
  const today = new Date();
  const currentWeekStart = getWeekStartDate(today);
  let weekStart = new Date(currentWeekStart);
  let streak = 0;

  const currentWeekCount = getWeekCompletionCount(completions, weekStart);
  if (currentWeekCount >= timesPerWeek) {
    streak++;
  }

  weekStart.setDate(weekStart.getDate() - 7);
  let maxWeeks = 52;

  while (maxWeeks > 0) {
    const weekCount = getWeekCompletionCount(completions, weekStart);
    let frozenThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      if (frozenSet.has(formatDate(d))) frozenThisWeek++;
    }

    if (weekCount >= timesPerWeek || frozenThisWeek > 0) {
      streak++;
    } else {
      break;
    }

    weekStart.setDate(weekStart.getDate() - 7);
    maxWeeks--;
  }

  return streak;
};

/**
 * Get the last 7 days as formatted strings (YYYY-MM-DD)
 */
export const getLast7Days = (): string[] => {
  const result: string[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    result.push(formatDate(date));
  }
  
  return result;
};

/**
 * Get day name from date string (YYYY-MM-DD)
 */
export const getDayName = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { weekday: 'short' });
};

/**
 * Get completion rate for a habit
 */
export const getCompletionRate = (completions: Record<string, boolean>): number => {
  const completionDates = Object.keys(completions);
  if (completionDates.length === 0) return 0;
  
  const completedCount = Object.values(completions).filter(Boolean).length;
  return (completedCount / completionDates.length) * 100;
};

export const calculatePartialCredit = (
  completions: Record<string, boolean>,
  createdAt: string,
  frequency: { type?: string; days: number[]; timesPerWeek?: number }
): { monthlyRates: Record<string, number>; weeklyRates: Record<string, number>; allTimeRate: number; totalScheduledDays: number; totalCompletedDays: number } => {
  const monthlyRates: Record<string, number> = {};
  const weeklyRates: Record<string, number> = {};
  
  const startDate = new Date(createdAt);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let totalScheduledDays = 0;
  let totalCompletedDays = 0;
  
  const monthScheduled: Record<string, number> = {};
  const monthCompleted: Record<string, number> = {};
  const weekScheduled: Record<string, number> = {};
  const weekCompleted: Record<string, number> = {};
  
  const current = new Date(startDate);
  while (current <= today) {
    const dateStr = formatDate(current);
    const scheduled = isScheduledDay(current, frequency);
    
    if (scheduled) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const weekStart = getWeekStartDate(current);
      const weekKey = formatDate(weekStart);
      
      totalScheduledDays++;
      monthScheduled[monthKey] = (monthScheduled[monthKey] || 0) + 1;
      weekScheduled[weekKey] = (weekScheduled[weekKey] || 0) + 1;
      
      if (completions[dateStr]) {
        totalCompletedDays++;
        monthCompleted[monthKey] = (monthCompleted[monthKey] || 0) + 1;
        weekCompleted[weekKey] = (weekCompleted[weekKey] || 0) + 1;
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  for (const key of Object.keys(monthScheduled)) {
    const scheduled = monthScheduled[key];
    const completed = monthCompleted[key] || 0;
    monthlyRates[key] = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
  }
  
  for (const key of Object.keys(weekScheduled)) {
    const scheduled = weekScheduled[key];
    const completed = weekCompleted[key] || 0;
    weeklyRates[key] = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
  }
  
  const allTimeRate = totalScheduledDays > 0 ? Math.round((totalCompletedDays / totalScheduledDays) * 100) : 0;
  
  return { monthlyRates, weeklyRates, allTimeRate, totalScheduledDays, totalCompletedDays };
};

export const detectComebackOpportunity = (
  completions: Record<string, boolean>,
  frequency: { type?: string; days: number[]; timesPerWeek?: number },
  lastBonusDate?: string
): { isComeback: boolean; missedDays: number } => {
  const today = new Date();
  const todayStr = formatDate(today);
  
  if (!completions[todayStr]) {
    return { isComeback: false, missedDays: 0 };
  }
  
  if (lastBonusDate === todayStr) {
    return { isComeback: false, missedDays: 0 };
  }
  
  let missedDays = 0;
  let checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() - 1);
  
  let maxCheck = 30;
  while (maxCheck > 0) {
    const dateStr = formatDate(checkDate);
    const scheduled = isScheduledDay(checkDate, frequency);
    
    if (scheduled) {
      if (completions[dateStr]) {
        break;
      }
      missedDays++;
    }
    
    checkDate.setDate(checkDate.getDate() - 1);
    maxCheck--;
  }
  
  return { isComeback: missedDays >= 2, missedDays };
};

export const getComebackBonusXP = (missedDays: number): number => {
  if (missedDays < 2) return 0;
  if (missedDays <= 3) return 25;
  if (missedDays <= 7) return 40;
  if (missedDays <= 14) return 60;
  return 80;
};