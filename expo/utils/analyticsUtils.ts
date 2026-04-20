import { Habit } from '@/types/habit';
import { Task } from '@/types/task';
import { formatDate } from '@/utils/dateUtils';

export interface DayData {
  date: string;
  label: string;
  completions: number;
  total: number;
  rate: number;
}

export interface WeekData {
  weekLabel: string;
  startDate: string;
  endDate: string;
  completions: number;
  total: number;
  rate: number;
}

export interface MonthData {
  monthLabel: string;
  year: number;
  month: number;
  completions: number;
  total: number;
  rate: number;
}

export interface StreakHistory {
  habitId: string;
  habitName: string;
  color: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  completed: number;
  color: string;
}

export interface MoodDistribution {
  mood: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ProductivityHour {
  hour: number;
  label: string;
  count: number;
}

export type TimeRange = '7d' | '30d' | '90d';

const MOOD_COLORS: Record<string, string> = {
  excellent: '#10B981',
  good: '#3B82F6',
  okay: '#F59E0B',
  difficult: '#EF4444',
};

const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B82F6',
  personal: '#8B5CF6',
  health: '#EF4444',
  learning: '#10B981',
  finance: '#F59E0B',
  social: '#EC4899',
  other: '#6B7280',
};

function getDaysInRange(range: TimeRange): number {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
  }
}

function getDateRange(range: TimeRange): string[] {
  const days = getDaysInRange(range);
  const dates: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }

  return dates;
}

export function getHabitCompletionTimeline(
  habits: Habit[],
  taskHabits: Task[],
  range: TimeRange
): DayData[] {
  const dates = getDateRange(range);

  return dates.map(date => {
    const d = new Date(date + 'T12:00:00');
    const dayOfWeek = d.getDay();

    let total = 0;
    let completions = 0;

    habits.forEach(habit => {
      if (habit.frequency.days.includes(dayOfWeek)) {
        total++;
        if (habit.completions[date]) {
          completions++;
        }
      }
    });

    taskHabits.forEach(task => {
      if (task.habitFrequency?.days.includes(dayOfWeek)) {
        total++;
        if (task.habitCompletions?.[date]) {
          completions++;
        }
      }
    });

    const label = range === '7d'
      ? d.toLocaleDateString('en-GB', { weekday: 'short' })
      : range === '30d'
        ? d.getDate().toString()
        : d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

    return {
      date,
      label,
      completions,
      total,
      rate: total > 0 ? Math.round((completions / total) * 100) : 0,
    };
  });
}

export function getWeeklyAggregation(dailyData: DayData[]): WeekData[] {
  const weeks: WeekData[] = [];
  let currentWeek: DayData[] = [];

  dailyData.forEach((day, i) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || i === dailyData.length - 1) {
      const completions = currentWeek.reduce((s, d) => s + d.completions, 0);
      const total = currentWeek.reduce((s, d) => s + d.total, 0);
      const startD = new Date(currentWeek[0].date + 'T12:00:00');

      weeks.push({
        weekLabel: `${startD.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`,
        startDate: currentWeek[0].date,
        endDate: currentWeek[currentWeek.length - 1].date,
        completions,
        total,
        rate: total > 0 ? Math.round((completions / total) * 100) : 0,
      });
      currentWeek = [];
    }
  });

  return weeks;
}

export function getStreakHistory(
  habits: Habit[],
  taskHabits: Task[]
): StreakHistory[] {
  const streaks: StreakHistory[] = [];

  habits.forEach(habit => {
    const totalCompletions = Object.values(habit.completions).filter(Boolean).length;
    const currentStreak = calculateStreakFromCompletions(habit.completions);
    const longestStreak = calculateLongestStreak(habit.completions);

    streaks.push({
      habitId: habit.id,
      habitName: habit.name,
      color: habit.color,
      currentStreak,
      longestStreak,
      totalCompletions,
    });
  });

  taskHabits.forEach(task => {
    if (task.habitCompletions) {
      const totalCompletions = Object.values(task.habitCompletions).filter(Boolean).length;
      const currentStreak = calculateStreakFromCompletions(task.habitCompletions);
      const longestStreak = calculateLongestStreak(task.habitCompletions);

      streaks.push({
        habitId: task.id,
        habitName: task.title,
        color: task.color || '#3B82F6',
        currentStreak,
        longestStreak,
        totalCompletions,
      });
    }
  });

  return streaks.sort((a, b) => b.currentStreak - a.currentStreak);
}

function calculateStreakFromCompletions(completions: Record<string, boolean>): number {
  const today = new Date();
  let currentDate = new Date(today);
  let streak = 0;

  const todayStr = formatDate(today);
  if (!completions[todayStr]) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(currentDate);
    if (completions[dateStr]) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function calculateLongestStreak(completions: Record<string, boolean>): number {
  const dates = Object.keys(completions)
    .filter(d => completions[d])
    .sort();

  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T12:00:00');
    const curr = new Date(dates[i] + 'T12:00:00');
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function getTaskCategoryBreakdown(tasks: Task[]): CategoryBreakdown[] {
  const categories: Record<string, { count: number; completed: number }> = {};

  tasks.forEach(task => {
    if (!task.isHabit) {
      const cat = task.category || 'other';
      if (!categories[cat]) {
        categories[cat] = { count: 0, completed: 0 };
      }
      categories[cat].count++;
      if (task.status === 'completed') {
        categories[cat].completed++;
      }
    }
  });

  return Object.entries(categories)
    .map(([category, data]) => ({
      category,
      count: data.count,
      completed: data.completed,
      color: CATEGORY_COLORS[category] || '#6B7280',
    }))
    .sort((a, b) => b.count - a.count);
}

export function getMoodDistribution(
  habits: Habit[],
  tasks: Task[]
): MoodDistribution[] {
  const moodCounts: Record<string, number> = {
    excellent: 0,
    good: 0,
    okay: 0,
    difficult: 0,
  };

  habits.forEach(habit => {
    const logs = habit.completionLogs || [];
    logs.forEach(log => {
      if (log.mood && moodCounts[log.mood] !== undefined) {
        moodCounts[log.mood]++;
      }
    });
  });

  tasks.forEach(task => {
    const logs = task.completionLogs || [];
    logs.forEach(log => {
      if (log.mood && moodCounts[log.mood] !== undefined) {
        moodCounts[log.mood]++;
      }
    });
  });

  const total = Object.values(moodCounts).reduce((s, c) => s + c, 0);

  return Object.entries(moodCounts)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: MOOD_COLORS[mood] || '#6B7280',
    }))
    .filter(m => m.count > 0);
}

export function getMoodTotalLogs(
  habits: Habit[],
  tasks: Task[]
): number {
  let total = 0;
  habits.forEach(habit => {
    total += (habit.completionLogs || []).length;
  });
  tasks.forEach(task => {
    total += (task.completionLogs || []).length;
  });
  return total;
}

export function getCompletionTimeDistribution(
  habits: Habit[],
  tasks: Task[]
): { morning: number; afternoon: number; evening: number; night: number } {
  const dist = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  const processLog = (timestamp: string) => {
    const hour = new Date(timestamp).getHours();
    if (hour >= 5 && hour < 12) dist.morning++;
    else if (hour >= 12 && hour < 17) dist.afternoon++;
    else if (hour >= 17 && hour < 21) dist.evening++;
    else dist.night++;
  };

  habits.forEach(habit => {
    (habit.completionLogs || []).forEach(log => processLog(log.timestamp));
  });
  tasks.forEach(task => {
    (task.completionLogs || []).forEach(log => processLog(log.completedAt));
  });

  return dist;
}

export function getProductivityByHour(
  habits: Habit[],
  tasks: Task[]
): ProductivityHour[] {
  const hourCounts: Record<number, number> = {};

  habits.forEach(habit => {
    const logs = habit.completionLogs || [];
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
  });

  tasks.forEach(task => {
    const logs = task.completionLogs || [];
    logs.forEach(log => {
      const hour = new Date(log.completedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
  });

  const hours: ProductivityHour[] = [];
  for (let h = 5; h <= 23; h++) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    hours.push({
      hour: h,
      label: `${displayHour}${ampm}`,
      count: hourCounts[h] || 0,
    });
  }

  return hours;
}

export function getPeakHourLabel(hours: ProductivityHour[]): string | null {
  const peak = hours.reduce((best, h) => (h.count > best.count ? h : best), hours[0]);
  if (!peak || peak.count === 0) return null;
  return peak.label;
}

export function getOverallStats(
  habits: Habit[],
  taskHabits: Task[],
  allTasks: Task[],
  range: TimeRange
) {
  const dates = getDateRange(range);
  let totalScheduled = 0;
  let totalCompleted = 0;

  dates.forEach(date => {
    const d = new Date(date + 'T12:00:00');
    const dayOfWeek = d.getDay();

    habits.forEach(habit => {
      if (habit.frequency.days.includes(dayOfWeek)) {
        totalScheduled++;
        if (habit.completions[date]) totalCompleted++;
      }
    });

    taskHabits.forEach(task => {
      if (task.habitFrequency?.days.includes(dayOfWeek)) {
        totalScheduled++;
        if (task.habitCompletions?.[date]) totalCompleted++;
      }
    });
  });

  const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const regularTasks = allTasks.filter(t => !t.isHabit);
  const completedTasks = regularTasks.filter(t => t.status === 'completed').length;
  const totalTasks = regularTasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const allStreaks = [
    ...habits.map(h => calculateStreakFromCompletions(h.completions)),
    ...taskHabits
      .filter(t => t.habitCompletions)
      .map(t => calculateStreakFromCompletions(t.habitCompletions!)),
  ];
  const bestStreak = allStreaks.length > 0 ? Math.max(...allStreaks) : 0;

  const perfectDays = dates.filter(date => {
    const d = new Date(date + 'T12:00:00');
    const dayOfWeek = d.getDay();
    let dayTotal = 0;
    let dayCompleted = 0;

    habits.forEach(habit => {
      if (habit.frequency.days.includes(dayOfWeek)) {
        dayTotal++;
        if (habit.completions[date]) dayCompleted++;
      }
    });

    taskHabits.forEach(task => {
      if (task.habitFrequency?.days.includes(dayOfWeek)) {
        dayTotal++;
        if (task.habitCompletions?.[date]) dayCompleted++;
      }
    });

    return dayTotal > 0 && dayCompleted === dayTotal;
  }).length;

  return {
    habitCompletionRate: completionRate,
    totalHabitCompletions: totalCompleted,
    totalScheduled,
    taskCompletionRate,
    completedTasks,
    totalTasks,
    bestStreak,
    perfectDays,
    totalDays: dates.length,
  };
}
