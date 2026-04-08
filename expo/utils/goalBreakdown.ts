import { DailyTask, Habit, Milestone } from '@/types/habit';

interface TaskTemplate {
  title: string;
  description?: string;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

const GOAL_TEMPLATES: Record<string, TaskTemplate[]> = {
  fitness: [
    { title: '5-minute warm-up', description: 'Light stretching and movement', estimatedMinutes: 5, difficulty: 'easy', category: 'warmup' },
    { title: '10 push-ups', description: 'Standard or modified push-ups', estimatedMinutes: 3, difficulty: 'easy', category: 'strength' },
    { title: '15-minute walk', description: 'Brisk walk around the neighborhood', estimatedMinutes: 15, difficulty: 'easy', category: 'cardio' },
    { title: '20 squats', description: 'Bodyweight squats with proper form', estimatedMinutes: 5, difficulty: 'medium', category: 'strength' },
    { title: '30-second plank', description: 'Hold plank position', estimatedMinutes: 2, difficulty: 'medium', category: 'core' },
    { title: '20-minute jog', description: 'Light jogging pace', estimatedMinutes: 20, difficulty: 'medium', category: 'cardio' },
    { title: '3 sets of 10 burpees', description: 'Full body exercise', estimatedMinutes: 10, difficulty: 'hard', category: 'hiit' },
    { title: '45-minute workout', description: 'Complete workout routine', estimatedMinutes: 45, difficulty: 'hard', category: 'full' },
  ],
  learning: [
    { title: 'Read 5 pages', description: 'Focus on understanding key concepts', estimatedMinutes: 10, difficulty: 'easy', category: 'reading' },
    { title: 'Watch tutorial video', description: '10-15 minute educational video', estimatedMinutes: 15, difficulty: 'easy', category: 'video' },
    { title: 'Take notes', description: 'Summarize what you learned', estimatedMinutes: 10, difficulty: 'easy', category: 'review' },
    { title: 'Practice exercise', description: 'Apply what you learned', estimatedMinutes: 20, difficulty: 'medium', category: 'practice' },
    { title: 'Complete quiz', description: 'Test your knowledge', estimatedMinutes: 15, difficulty: 'medium', category: 'assessment' },
    { title: 'Build mini project', description: 'Create something using new skills', estimatedMinutes: 30, difficulty: 'hard', category: 'project' },
  ],
  mindfulness: [
    { title: '3-minute breathing', description: 'Deep breathing exercise', estimatedMinutes: 3, difficulty: 'easy', category: 'breathing' },
    { title: '5-minute meditation', description: 'Guided or silent meditation', estimatedMinutes: 5, difficulty: 'easy', category: 'meditation' },
    { title: 'Gratitude journal', description: 'Write 3 things you\'re grateful for', estimatedMinutes: 5, difficulty: 'easy', category: 'journaling' },
    { title: '10-minute yoga', description: 'Simple yoga flow', estimatedMinutes: 10, difficulty: 'medium', category: 'yoga' },
    { title: 'Body scan', description: 'Progressive muscle relaxation', estimatedMinutes: 15, difficulty: 'medium', category: 'relaxation' },
    { title: '20-minute meditation', description: 'Extended meditation session', estimatedMinutes: 20, difficulty: 'hard', category: 'meditation' },
  ],
  productivity: [
    { title: 'Clear desk', description: 'Organise workspace', estimatedMinutes: 5, difficulty: 'easy', category: 'organization' },
    { title: 'Review goals', description: 'Check daily priorities', estimatedMinutes: 5, difficulty: 'easy', category: 'planning' },
    { title: 'Time block schedule', description: 'Plan your day', estimatedMinutes: 10, difficulty: 'medium', category: 'planning' },
    { title: 'Deep work session', description: '25-minute focused work', estimatedMinutes: 25, difficulty: 'medium', category: 'work' },
    { title: 'Email zero', description: 'Clear and organise inbox', estimatedMinutes: 20, difficulty: 'hard', category: 'communication' },
  ],
  health: [
    { title: 'Drink water', description: 'One full glass of water', estimatedMinutes: 1, difficulty: 'easy', category: 'hydration' },
    { title: 'Healthy snack', description: 'Prepare and eat nutritious snack', estimatedMinutes: 5, difficulty: 'easy', category: 'nutrition' },
    { title: 'Track meals', description: 'Log what you ate today', estimatedMinutes: 5, difficulty: 'easy', category: 'tracking' },
    { title: 'Meal prep', description: 'Prepare healthy meal', estimatedMinutes: 30, difficulty: 'medium', category: 'nutrition' },
    { title: 'Sleep routine', description: 'Follow bedtime routine', estimatedMinutes: 20, difficulty: 'medium', category: 'sleep' },
  ],
};

export function detectGoalCategory(goalText: string): string {
  const lowerGoal = goalText.toLowerCase();
  
  if (lowerGoal.includes('fit') || lowerGoal.includes('exercise') || lowerGoal.includes('run') || 
      lowerGoal.includes('weight') || lowerGoal.includes('muscle') || lowerGoal.includes('gym')) {
    return 'fitness';
  }
  if (lowerGoal.includes('learn') || lowerGoal.includes('study') || lowerGoal.includes('skill') || 
      lowerGoal.includes('course') || lowerGoal.includes('read')) {
    return 'learning';
  }
  if (lowerGoal.includes('meditat') || lowerGoal.includes('mindful') || lowerGoal.includes('calm') || 
      lowerGoal.includes('stress') || lowerGoal.includes('relax')) {
    return 'mindfulness';
  }
  if (lowerGoal.includes('product') || lowerGoal.includes('work') || lowerGoal.includes('focus') || 
      lowerGoal.includes('organize') || lowerGoal.includes('organise')) {
    return 'productivity';
  }
  if (lowerGoal.includes('health') || lowerGoal.includes('diet') || lowerGoal.includes('sleep') || 
      lowerGoal.includes('water')) {
    return 'health';
  }
  
  return 'general';
}

export function generateDailyTasks(
  habit: Habit,
  date: string,
  performanceHistory?: { completionRate: number; averageEffort: number }
): DailyTask[] {
  if (!habit.goalType || habit.goalType === 'simple') {
    return [];
  }

  const category = detectGoalCategory(habit.mainGoal || habit.name);
  const templates = GOAL_TEMPLATES[category] || GOAL_TEMPLATES.fitness;
  
  const currentLevel = habit.currentLevel || 1;
  const minTasks = habit.minimumDailyTasks || 2;
  const maxTasks = habit.maximumDailyTasks || 5;
  
  // Adjust difficulty based on performance
  let difficultyBias = 'medium';
  if (habit.adaptiveDifficulty && performanceHistory) {
    if (performanceHistory.completionRate < 0.5) {
      difficultyBias = 'easy';
    } else if (performanceHistory.completionRate > 0.8 && performanceHistory.averageEffort < 3) {
      difficultyBias = 'hard';
    }
  }
  
  // Filter templates based on current level and difficulty
  let availableTemplates = templates.filter(t => {
    if (currentLevel <= 3 && t.difficulty === 'hard') return false;
    if (currentLevel <= 1 && t.difficulty === 'medium') return false;
    if (currentLevel >= 5 && t.difficulty === 'easy') return false;
    return true;
  });
  
  // Bias towards certain difficulty
  if (difficultyBias === 'easy') {
    availableTemplates = availableTemplates.filter(t => t.difficulty !== 'hard');
  } else if (difficultyBias === 'hard') {
    availableTemplates = availableTemplates.filter(t => t.difficulty !== 'easy');
  }
  
  // Randomly select tasks
  const taskCount = Math.min(
    Math.max(minTasks, Math.floor(currentLevel / 2) + 1),
    maxTasks
  );
  
  const selectedTasks: DailyTask[] = [];
  const usedTemplates = new Set<string>();
  
  for (let i = 0; i < taskCount && availableTemplates.length > 0; i++) {
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    
    // Avoid duplicates
    if (usedTemplates.has(template.title)) {
      i--;
      continue;
    }
    
    usedTemplates.add(template.title);
    
    selectedTasks.push({
      id: `${date}-${i}-${Date.now()}`,
      title: template.title,
      description: template.description,
      estimatedMinutes: template.estimatedMinutes,
      difficulty: template.difficulty,
      completed: false,
      order: i,
    });
  }
  
  return selectedTasks.sort((a, b) => {
    // Sort by difficulty: easy -> medium -> hard
    const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });
}

export function calculateMilestoneProgress(
  habit: Habit,
  milestoneId: string
): { percentage: number; daysRemaining: number | null } {
  const milestone = habit.milestones?.find(m => m.id === milestoneId);
  if (!milestone) return { percentage: 0, daysRemaining: null };
  
  const percentage = (milestone.currentCompletions / milestone.requiredCompletions) * 100;
  
  let daysRemaining = null;
  if (milestone.targetDate) {
    const today = new Date();
    const target = new Date(milestone.targetDate);
    daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  return { percentage: Math.min(100, percentage), daysRemaining };
}

export function getNextMilestone(habit: Habit): Milestone | null {
  if (!habit.milestones || habit.milestones.length === 0) return null;
  
  return habit.milestones.find(m => !m.completed) || null;
}

export function shouldLevelUp(habit: Habit): boolean {
  if (!habit.goalType || habit.goalType === 'simple') return false;
  
  const currentLevel = habit.currentLevel || 1;
  const completedTasks = Object.values(habit.dailyTasks || {})
    .flat()
    .filter(task => task.completed).length;
  
  // Level up every 10 completed tasks
  const requiredForNextLevel = currentLevel * 10;
  
  return completedTasks >= requiredForNextLevel;
}

export function generateMilestones(
  mainGoal: string,
  deadline: string
): Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'currentCompletions'>[] {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const totalDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (totalDays <= 0) return [];
  
  const milestones: Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'currentCompletions'>[] = [];
  
  // Create milestones at 25%, 50%, 75%, and 100% intervals
  const intervals = [0.25, 0.5, 0.75, 1.0];
  const labels = ['Getting Started', 'Making Progress', 'Almost There', 'Goal Achieved'];
  
  intervals.forEach((interval, index) => {
    const daysFromNow = Math.floor(totalDays * interval);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    
    milestones.push({
      title: labels[index],
      description: `Complete ${Math.floor(interval * 100)}% of your goal: ${mainGoal}`,
      targetDate: targetDate.toISOString(),
      requiredCompletions: Math.floor(interval * totalDays * 3), // Assume 3 tasks per day average
    });
  });
  
  return milestones;
}

export function getMotivationalMessage(habit: Habit): string {
  const completionRate = Object.values(habit.completions || {}).filter(Boolean).length;
  const totalDays = Object.keys(habit.completions || {}).length;
  const rate = totalDays > 0 ? completionRate / totalDays : 0;
  
  if (rate >= 0.9) {
    return "🌟 Outstanding consistency! You're crushing it!";
  } else if (rate >= 0.7) {
    return "💪 Great progress! Keep up the momentum!";
  } else if (rate >= 0.5) {
    return "📈 You're building a solid habit! Stay focused!";
  } else if (rate >= 0.3) {
    return "🌱 Every step counts! You're on the right track!";
  } else {
    return "🚀 Today is a fresh start! You've got this!";
  }
}

export function suggestTaskAdjustments(
  habit: Habit,
  recentCompletions: { date: string; tasksCompleted: number; totalTasks: number }[]
): { suggestion: string; adjustment: 'increase' | 'decrease' | 'maintain' } {
  if (recentCompletions.length < 3) {
    return { suggestion: 'Keep going! We need more data to optimise your tasks.', adjustment: 'maintain' };
  }
  
  const avgCompletionRate = recentCompletions.reduce((sum, day) => 
    sum + (day.tasksCompleted / day.totalTasks), 0) / recentCompletions.length;
  
  if (avgCompletionRate < 0.5) {
    return {
      suggestion: 'Consider reducing the number of daily tasks or choosing easier ones to build momentum.',
      adjustment: 'decrease'
    };
  } else if (avgCompletionRate > 0.9) {
    return {
      suggestion: 'You\'re doing great! Ready to challenge yourself with more or harder tasks?',
      adjustment: 'increase'
    };
  }
  
  return {
    suggestion: 'Your current task load seems perfect! Keep it up!',
    adjustment: 'maintain'
  };
}