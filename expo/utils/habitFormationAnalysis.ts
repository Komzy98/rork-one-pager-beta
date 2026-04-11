import { Task } from '@/types/task';

export interface HabitStackSuggestion {
  id: string;
  anchorHabit: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  stackedHabit: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  trigger: 'after' | 'before';
  reason: string;
  successRate: number;
  coOccurrenceRate?: number;
  suggestedTime?: string;
}

export interface OptimalTimeSlot {
  habitId: string;
  habitName: string;
  optimalHour: number;
  optimalTimeLabel: string;
  successRate: number;
  reasoning: string;
  icon?: string;
  color?: string;
  consistencyScore: number;
  peakProductivityMatch: boolean;
  suggestedReminder?: string;
}

export interface MinimalHabit {
  id: string;
  name: string;
  fullDuration: number;
  minimalDuration: number;
  minimalVersion: string;
  icon?: string;
  color?: string;
  category: string;
  scientificReason?: string;
  motivationalTip?: string;
  hasQuickVersion: boolean;
}

export interface HabitInsight {
  type: 'streak_risk' | 'best_day' | 'co_occurrence' | 'time_optimization' | 'momentum';
  habitId: string;
  habitName: string;
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

export interface DailySchedule {
  timeSlot: string;
  habits: {
    id: string;
    name: string;
    minimalVersion?: string;
    isMinimal: boolean;
    color?: string;
  }[];
}

const MINIMAL_HABIT_TEMPLATES: Record<string, { minDuration: number; template: string; reason: string; tip: string }> = {
  'exercise': { minDuration: 2, template: '10 jumping jacks + 10 squats', reason: 'Maintains exercise habit neural pathway', tip: 'Something is infinitely better than nothing' },
  'workout': { minDuration: 2, template: '1-minute plank + 10 push-ups', reason: 'Keeps muscle activation pattern', tip: 'Your body remembers movement' },
  'meditation': { minDuration: 2, template: '2-minute breathing exercise', reason: 'Activates parasympathetic response', tip: 'Even brief stillness rewires your brain' },
  'meditate': { minDuration: 2, template: 'Box breathing: 4 breaths', reason: 'Reduces cortisol in 60 seconds', tip: '4 breaths can shift your entire day' },
  'read': { minDuration: 2, template: 'Read 1 page or 1 paragraph', reason: 'Maintains reading habit identity', tip: 'One page compounds to 365 pages/year' },
  'reading': { minDuration: 2, template: 'Read 1 page or summary', reason: 'Keeps learning momentum', tip: 'Readers are leaders' },
  'journal': { minDuration: 2, template: 'Write 3 gratitude items', reason: 'Shifts brain to positive focus', tip: 'Gratitude is the antidote to anxiety' },
  'journaling': { minDuration: 2, template: 'Write 1 sentence about today', reason: 'Maintains self-reflection practice', tip: 'One sentence captures the essence' },
  'water': { minDuration: 1, template: 'Drink 1 full glass of water', reason: 'Hydration boosts energy instantly', tip: 'Your brain is 75% water' },
  'hydrate': { minDuration: 1, template: 'Drink 1 glass of water', reason: 'Prevents dehydration cascade', tip: 'Water is your body\'s fuel' },
  'stretch': { minDuration: 2, template: '5 neck rolls + touch toes', reason: 'Releases muscle tension quickly', tip: 'Flexibility is youth' },
  'stretching': { minDuration: 2, template: '3 simple stretches', reason: 'Maintains mobility range', tip: 'Move it or lose it' },
  'walk': { minDuration: 2, template: 'Walk around the block once', reason: 'Triggers creative thinking', tip: 'Walking is thinking in motion' },
  'walking': { minDuration: 2, template: '100 steps / walk to window', reason: 'Breaks sedentary pattern', tip: 'Every step counts literally' },
  'yoga': { minDuration: 2, template: '3 sun salutations', reason: 'Full body activation in minutes', tip: 'Sun salutations are a complete workout' },
  'learn': { minDuration: 2, template: 'Learn 1 new word/fact', reason: 'Maintains neuroplasticity', tip: 'Daily learning compounds exponentially' },
  'study': { minDuration: 2, template: 'Review 3 flashcards', reason: 'Triggers spaced repetition benefit', tip: 'Small reviews beat cramming' },
  'clean': { minDuration: 2, template: 'Clear 1 surface or put away 5 items', reason: 'Reduces decision fatigue', tip: 'Tidy space, tidy mind' },
  'organize': { minDuration: 2, template: 'Organise 1 drawer/shelf', reason: 'Creates order, reduces stress', tip: 'Order creates calm' },
  'pray': { minDuration: 2, template: 'Say a short prayer or blessing', reason: 'Connects to purpose and peace', tip: 'Brief prayers can be profound' },
  'prayer': { minDuration: 2, template: 'Recite favourite verse/prayer', reason: 'Anchors spiritual practice', tip: 'Consistency over duration' },
  'skincare': { minDuration: 2, template: 'Wash face + moisturiser', reason: 'Maintains skin health basics', tip: 'Your future self thanks you' },
  'floss': { minDuration: 1, template: 'Floss front teeth', reason: 'Prevents 80% of dental issues', tip: 'Front teeth are most visible' },
  'teeth': { minDuration: 2, template: 'Quick brush (30 sec each quadrant)', reason: 'Prevents decay progression', tip: 'Two minutes saves thousands in dental bills' },
  'vitamins': { minDuration: 1, template: 'Take 1 essential vitamin', reason: 'Maintains nutritional baseline', tip: 'One vitamin > zero vitamins' },
  'supplements': { minDuration: 1, template: 'Take main supplement', reason: 'Prioritizes most important nutrient', tip: 'Focus on the essential one' },
  'cold shower': { minDuration: 1, template: '30-second cold rinse at end', reason: 'Triggers dopamine spike', tip: '30 seconds of cold = hours of alertness' },
  'gratitude': { minDuration: 2, template: 'Think of 3 things you\'re grateful for', reason: 'Rewires brain for positivity', tip: 'Gratitude changes everything' },
  'affirmations': { minDuration: 1, template: 'Say 3 positive affirmations', reason: 'Shapes subconscious beliefs', tip: 'You become what you tell yourself' },
  'breathwork': { minDuration: 2, template: '10 deep breaths', reason: 'Oxygenates brain instantly', tip: 'Breath is the bridge to calm' },
  'pushups': { minDuration: 1, template: '10 push-ups', reason: 'Activates upper body muscles', tip: '10 pushups = 70 calories' },
  'squats': { minDuration: 1, template: '15 squats', reason: 'Activates largest muscle group', tip: 'Strong legs = strong foundation' },
  'plank': { minDuration: 1, template: '30-second plank', reason: 'Engages entire core', tip: 'Core strength protects your back' },
  'run': { minDuration: 2, template: 'Jog in place for 2 minutes', reason: 'Elevates heart rate quickly', tip: 'Any cardio is good cardio' },
  'running': { minDuration: 2, template: '2-minute run around house', reason: 'Maintains runner\'s identity', tip: 'Show up, even if briefly' },
};

const HABIT_STACK_PAIRS: {
  anchors: string[];
  stacks: string[];
  trigger: 'after' | 'before';
  reason: string;
}[] = [
  {
    anchors: ['brush teeth', 'teeth', 'morning routine'],
    stacks: ['meditate', 'meditation', 'affirmations', 'gratitude'],
    trigger: 'after',
    reason: 'Mental clarity after morning hygiene sets a positive tone'
  },
  {
    anchors: ['coffee', 'breakfast', 'morning coffee'],
    stacks: ['read', 'reading', 'journal', 'journaling', 'learn'],
    trigger: 'after',
    reason: 'Caffeine boost enhances focus for learning activities'
  },
  {
    anchors: ['wake up', 'alarm', 'morning'],
    stacks: ['water', 'hydrate', 'stretch', 'stretching'],
    trigger: 'after',
    reason: 'Rehydrating and moving immediately boosts energy'
  },
  {
    anchors: ['lunch', 'eat', 'meal'],
    stacks: ['walk', 'walking', 'stretch'],
    trigger: 'after',
    reason: 'Post-meal movement aids digestion and energy'
  },
  {
    anchors: ['shower', 'bath'],
    stacks: ['skincare', 'cold shower'],
    trigger: 'after',
    reason: 'Skin is prepared and pores are open after cleansing'
  },
  {
    anchors: ['exercise', 'workout', 'gym'],
    stacks: ['stretch', 'stretching', 'protein', 'water'],
    trigger: 'after',
    reason: 'Recovery habits maximise workout benefits'
  },
  {
    anchors: ['work', 'focus', 'deep work'],
    stacks: ['break', 'stretch', 'walk', 'water'],
    trigger: 'after',
    reason: 'Movement breaks prevent burnout and boost creativity'
  },
  {
    anchors: ['dinner', 'evening meal'],
    stacks: ['walk', 'family time', 'no phone'],
    trigger: 'after',
    reason: 'Evening wind-down improves sleep quality'
  },
  {
    anchors: ['bed', 'sleep', 'evening routine'],
    stacks: ['read', 'journal', 'gratitude', 'stretch', 'meditate'],
    trigger: 'before',
    reason: 'Calming activities before bed improve sleep quality'
  },
];

export function analyzeHabitCompletionTimes(habits: Task[]): OptimalTimeSlot[] {
  const timeSlots: OptimalTimeSlot[] = [];
  
  const globalPeakHours = findGlobalPeakProductivityHours(habits);
  
  habits.forEach(habit => {
    if (!habit.isHabit) return;
    
    const completionLogs = habit.completionLogs || [];
    
    if (completionLogs.length < 3) {
      const defaultHour = guessOptimalTime(habit.title);
      const isPeakMatch = globalPeakHours.includes(defaultHour);
      timeSlots.push({
        habitId: habit.id,
        habitName: habit.title,
        optimalHour: defaultHour,
        optimalTimeLabel: formatTimeLabel(defaultHour),
        successRate: 0,
        reasoning: getTimeReasoning(habit.title, defaultHour),
        icon: habit.icon,
        color: habit.color,
        consistencyScore: 0,
        peakProductivityMatch: isPeakMatch,
        suggestedReminder: getSuggestedReminder(defaultHour),
      });
      return;
    }
    
    const hourCounts: Record<number, number> = {};
    const hourSuccessRates: Record<number, { completed: number; total: number }> = {};
    
    completionLogs.forEach(log => {
      const hour = new Date(log.completedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      
      if (!hourSuccessRates[hour]) {
        hourSuccessRates[hour] = { completed: 0, total: 0 };
      }
      hourSuccessRates[hour].completed++;
      hourSuccessRates[hour].total++;
    });
    
    let bestHour = 9;
    let maxCount = 0;
    let bestConsistency = 0;
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      const hourNum = parseInt(hour);
      const consistency = hourSuccessRates[hourNum] 
        ? (hourSuccessRates[hourNum].completed / hourSuccessRates[hourNum].total) * 100 
        : 0;
      
      if (count > maxCount || (count === maxCount && consistency > bestConsistency)) {
        maxCount = count;
        bestHour = hourNum;
        bestConsistency = consistency;
      }
    });
    
    const totalCompletions = completionLogs.length;
    const successRate = totalCompletions > 0 ? Math.round((maxCount / totalCompletions) * 100) : 0;
    const isPeakMatch = globalPeakHours.includes(bestHour);
    
    timeSlots.push({
      habitId: habit.id,
      habitName: habit.title,
      optimalHour: bestHour,
      optimalTimeLabel: formatTimeLabel(bestHour),
      successRate,
      reasoning: getTimeReasoning(habit.title, bestHour, true, successRate),
      icon: habit.icon,
      color: habit.color,
      consistencyScore: Math.round(bestConsistency),
      peakProductivityMatch: isPeakMatch,
      suggestedReminder: getSuggestedReminder(bestHour),
    });
  });
  
  return timeSlots.sort((a, b) => a.optimalHour - b.optimalHour);
}

function findGlobalPeakProductivityHours(habits: Task[]): number[] {
  const allHourCounts: Record<number, number> = {};
  
  habits.forEach(habit => {
    if (!habit.isHabit || !habit.completionLogs?.length) return;
    
    habit.completionLogs.forEach(log => {
      const hour = new Date(log.completedAt).getHours();
      allHourCounts[hour] = (allHourCounts[hour] || 0) + 1;
    });
  });
  
  const sortedHours = Object.entries(allHourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
  
  return sortedHours.length > 0 ? sortedHours : [7, 9, 20];
}

function getSuggestedReminder(hour: number): string {
  const reminderHour = hour > 0 ? hour - 1 : 23;
  return formatTimeLabel(reminderHour);
}

function guessOptimalTime(habitName: string): number {
  const name = habitName.toLowerCase();
  
  if (name.includes('morning') || name.includes('wake') || name.includes('breakfast')) return 7;
  if (name.includes('meditation') || name.includes('meditate') || name.includes('gratitude')) return 6;
  if (name.includes('exercise') || name.includes('workout') || name.includes('gym')) return 7;
  if (name.includes('water') || name.includes('hydrate')) return 8;
  if (name.includes('read') || name.includes('learn') || name.includes('study')) return 20;
  if (name.includes('journal') || name.includes('reflect')) return 21;
  if (name.includes('stretch') || name.includes('yoga')) return 7;
  if (name.includes('walk') || name.includes('run')) return 18;
  if (name.includes('evening') || name.includes('night') || name.includes('bed')) return 21;
  if (name.includes('lunch')) return 12;
  if (name.includes('prayer') || name.includes('pray')) return 6;
  
  return 9;
}

function formatTimeLabel(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

function getTimeReasoning(habitName: string, hour: number, hasData: boolean = false, successRate: number = 0): string {
  const name = habitName.toLowerCase();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  
  if (hasData && successRate > 0) {
    if (successRate >= 80) {
      return `${successRate}% success rate in the ${timeOfDay} - this is your sweet spot!`;
    } else if (successRate >= 50) {
      return `You complete this ${successRate}% of the time in the ${timeOfDay}`;
    }
    return `Pattern detected: ${timeOfDay} works best for you`;
  }
  
  if (name.includes('exercise') || name.includes('workout')) {
    return 'Morning workouts boost metabolism & energy all day';
  }
  if (name.includes('meditate') || name.includes('meditation')) {
    return 'Morning meditation sets a calm tone for the day';
  }
  if (name.includes('read')) {
    return 'Evening reading reduces screen time & improves sleep';
  }
  if (name.includes('journal')) {
    return 'Evening reflection consolidates learning & gratitude';
  }
  if (name.includes('water')) {
    return 'Morning hydration kickstarts your metabolism';
  }
  if (name.includes('stretch') || name.includes('yoga')) {
    return 'Morning flexibility prevents injury & boosts energy';
  }
  if (name.includes('walk')) {
    return 'Post-meal walks aid digestion & creativity';
  }
  
  return 'Consistent timing strengthens habit neural pathways';
}

export function generateHabitStackSuggestions(habits: Task[]): HabitStackSuggestion[] {
  const suggestions: HabitStackSuggestion[] = [];
  const usedPairs = new Set<string>();
  
  habits.forEach(habit => {
    if (!habit.isHabit) return;
    
    const habitNameLower = habit.title.toLowerCase();
    
    HABIT_STACK_PAIRS.forEach(pair => {
      const isAnchor = pair.anchors.some(anchor => 
        habitNameLower.includes(anchor) || anchor.includes(habitNameLower.split(' ')[0])
      );
      
      if (!isAnchor) return;
      
      habits.forEach(potentialStack => {
        if (potentialStack.id === habit.id || !potentialStack.isHabit) return;
        
        const stackNameLower = potentialStack.title.toLowerCase();
        const isMatch = pair.stacks.some(stack => 
          stackNameLower.includes(stack) || stack.includes(stackNameLower.split(' ')[0])
        );
        
        if (!isMatch) return;
        
        const pairKey = `${habit.id}-${potentialStack.id}`;
        const reversePairKey = `${potentialStack.id}-${habit.id}`;
        
        if (usedPairs.has(pairKey) || usedPairs.has(reversePairKey)) return;
        usedPairs.add(pairKey);
        
        const anchorCompletions = Object.keys(habit.habitCompletions || {}).length;
        const stackCompletions = Object.keys(potentialStack.habitCompletions || {}).length;
        const successRate = anchorCompletions > 0 && stackCompletions > 0
          ? Math.round(Math.min(anchorCompletions, stackCompletions) / Math.max(anchorCompletions, stackCompletions) * 100)
          : 75;
        
        suggestions.push({
          id: `stack-${habit.id}-${potentialStack.id}`,
          anchorHabit: {
            id: habit.id,
            name: habit.title,
            icon: habit.icon,
            color: habit.color,
          },
          stackedHabit: {
            id: potentialStack.id,
            name: potentialStack.title,
            icon: potentialStack.icon,
            color: potentialStack.color,
          },
          trigger: pair.trigger,
          reason: pair.reason,
          successRate,
        });
      });
    });
  });
  
  return suggestions.slice(0, 5);
}

export function generateMinimalHabits(habits: Task[]): MinimalHabit[] {
  const minimalHabits: MinimalHabit[] = [];
  
  habits.forEach(habit => {
    if (!habit.isHabit) return;
    
    const habitNameLower = habit.title.toLowerCase();
    let matchedTemplate: { minDuration: number; template: string; reason: string; tip: string } | null = null;
    
    for (const [key, template] of Object.entries(MINIMAL_HABIT_TEMPLATES)) {
      if (habitNameLower.includes(key) || key.includes(habitNameLower.split(' ')[0])) {
        matchedTemplate = template;
        break;
      }
    }
    
    const hasQuickVersion = matchedTemplate !== null;

    if (!matchedTemplate) {
      matchedTemplate = {
        minDuration: habit.estimatedDuration || 15,
        template: habit.title,
        reason: 'Consistency builds the habit loop',
        tip: 'Show up even on hard days'
      };
    }
    
    minimalHabits.push({
      id: habit.id,
      name: habit.title,
      fullDuration: habit.estimatedDuration || 15,
      minimalDuration: matchedTemplate.minDuration,
      minimalVersion: matchedTemplate.template,
      icon: habit.icon,
      color: habit.color,
      category: habit.category || 'personal',
      scientificReason: matchedTemplate.reason,
      motivationalTip: matchedTemplate.tip,
      hasQuickVersion,
    });
  });
  
  return minimalHabits;
}

export function getHabitFormationTip(): { title: string; tip: string; icon: string } {
  const tips = [
    {
      title: 'Start Tiny',
      tip: 'Make habits so small you can\'t say no. 1 push-up beats 0.',
      icon: '🌱'
    },
    {
      title: 'Stack Your Habits',
      tip: 'Attach new habits to existing ones: "After I [current habit], I will [new habit]"',
      icon: '📚'
    },
    {
      title: 'Never Miss Twice',
      tip: 'Missing once is an accident. Missing twice is the start of a new habit.',
      icon: '🎯'
    },
    {
      title: 'Environment Design',
      tip: 'Make good habits obvious and bad habits invisible.',
      icon: '🏠'
    },
    {
      title: 'Identity-Based',
      tip: 'Don\'t say "I want to read more." Say "I am a reader."',
      icon: '🪞'
    },
    {
      title: '2-Minute Rule',
      tip: 'When you start a new habit, it should take less than 2 minutes.',
      icon: '⏱️'
    },
    {
      title: 'Reward Yourself',
      tip: 'The brain remembers the ending. Make it satisfying.',
      icon: '🎁'
    },
    {
      title: 'Track Progress',
      tip: 'What gets measured gets managed. Don\'t break the chain.',
      icon: '📈'
    },
    {
      title: 'Busy? Go Minimal',
      tip: 'A 2-minute version keeps the streak alive and habit strong.',
      icon: '⚡'
    },
    {
      title: 'Morning Momentum',
      tip: 'Complete one habit early to build unstoppable momentum.',
      icon: '🚀'
    },
    {
      title: 'Habit Pairing',
      tip: 'Link a new habit to one you already do automatically.',
      icon: '🔗'
    },
    {
      title: 'Progress > Perfection',
      tip: 'Done imperfectly beats perfect never done.',
      icon: '✨'
    },
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
}

export function generateHabitInsights(habits: Task[]): HabitInsight[] {
  const insights: HabitInsight[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const dayOfWeek = today.getDay();
  
  const momentumByStreak: Record<number, string[]> = {};

  habits.forEach(habit => {
    if (!habit.isHabit) return;
    
    const completions = habit.habitCompletions || {};
    const streak = habit.habitStreak || 0;
    const completionDates = Object.keys(completions).sort();
    
    const currentHour = today.getHours();
    if (streak >= 5 && streak < 10 && !completions[todayStr] && currentHour >= 18) {
      insights.push({
        type: 'streak_risk',
        habitId: habit.id,
        habitName: habit.title,
        title: `${streak}-day streak at risk!`,
        description: `Complete ${habit.title} today to keep your momentum going.`,
        actionable: true,
        priority: 'high',
        icon: '🔥',
      });
    }
    
    if (streak >= 7) {
      if (!momentumByStreak[streak]) {
        momentumByStreak[streak] = [];
      }
      momentumByStreak[streak].push(habit.title);
    }
    
    if (completionDates.length >= 14) {
      const dayCompletions: Record<number, number> = {};
      completionDates.slice(-30).forEach(date => {
        const d = new Date(date).getDay();
        dayCompletions[d] = (dayCompletions[d] || 0) + 1;
      });
      
      const bestDay = Object.entries(dayCompletions)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (bestDay && parseInt(bestDay[0]) === dayOfWeek) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        insights.push({
          type: 'best_day',
          habitId: habit.id,
          habitName: habit.title,
          title: `${dayNames[dayOfWeek]} is your best day!`,
          description: `You complete ${habit.title} most often on ${dayNames[dayOfWeek]}s.`,
          actionable: true,
          priority: 'medium',
          icon: '📅',
        });
      }
    }
  });

  Object.entries(momentumByStreak).forEach(([streakStr, habitNames]) => {
    const streak = parseInt(streakStr);
    if (habitNames.length === 1) {
      insights.push({
        type: 'momentum',
        habitId: habitNames[0],
        habitName: habitNames[0],
        title: `Amazing ${streak}-day streak!`,
        description: `You're building a real habit with "${habitNames[0]}". Keep it up!`,
        actionable: false,
        priority: 'low',
        icon: '⭐',
      });
    } else {
      const lastHabit = habitNames[habitNames.length - 1];
      const otherHabits = habitNames.slice(0, -1);
      const namesList = otherHabits.map(n => `"${n}"`).join(', ') + ` and "${lastHabit}"`;
      insights.push({
        type: 'momentum',
        habitId: 'combined-momentum',
        habitName: habitNames.join(', '),
        title: `Amazing ${streak}-day streak!`,
        description: `You're building real habits with ${namesList}. Keep it up!`,
        actionable: false,
        priority: 'low',
        icon: '⭐',
      });
    }
  });
  
  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function generateOptimizedSchedule(habits: Task[], isBusyMode: boolean): DailySchedule[] {
  const timeSlots = analyzeHabitCompletionTimes(habits);
  const minimalHabits = generateMinimalHabits(habits);
  
  const scheduleMap: Record<string, DailySchedule> = {};
  
  timeSlots.forEach(slot => {
    const timeLabel = slot.optimalTimeLabel;
    const minimal = minimalHabits.find(m => m.id === slot.habitId);
    
    if (!scheduleMap[timeLabel]) {
      scheduleMap[timeLabel] = {
        timeSlot: timeLabel,
        habits: [],
      };
    }
    
    scheduleMap[timeLabel].habits.push({
      id: slot.habitId,
      name: slot.habitName,
      minimalVersion: minimal?.minimalVersion,
      isMinimal: isBusyMode,
      color: slot.color,
    });
  });
  
  return Object.values(scheduleMap).sort((a, b) => {
    const getHour = (label: string) => {
      const match = label.match(/(\d+):/);
      if (!match) return 0;
      let hour = parseInt(match[1]);
      if (label.includes('PM') && hour !== 12) hour += 12;
      if (label.includes('AM') && hour === 12) hour = 0;
      return hour;
    };
    return getHour(a.timeSlot) - getHour(b.timeSlot);
  });
}
