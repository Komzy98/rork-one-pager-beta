export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'cancelled';
export type TaskCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'social' | 'other';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface TaskReminder {
  id: string;
  datetime: string;
  message?: string;
  enabled: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  uri: string;
  type: 'image' | 'document' | 'link';
  size?: number;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  completedAt: string; // ISO timestamp
  notes?: string;
  mood?: 'excellent' | 'good' | 'okay' | 'difficult';
  effort?: 1 | 2 | 3 | 4 | 5;
  duration?: number; // Time spent in minutes
  location?: string;
  companions?: string[];
  tags?: string[];
  celebrationViewed?: boolean; // Whether user saw the completion celebration
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  dueDate?: string;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  tags: string[];
  subTasks: SubTask[];
  reminders: TaskReminder[];
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completionLogs: TaskCompletion[]; // Detailed completion history
  projectId?: string;
  assignedTo?: string;
  progress: number; // 0-100
  isRecurring: boolean;
  recurringPattern?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    endDate?: string;
  };
  // Habit-specific fields
  isHabit?: boolean;
  habitFrequency?: {
    type?: 'specific_days' | 'times_per_week';
    days: number[]; // 0 = Sunday, 1 = Monday, etc.
    timesPerWeek?: number; // Used when type is 'times_per_week'
  };
  habitCompletions?: Record<string, boolean>; // date string (YYYY-MM-DD) -> completed
  habitStreak?: number;
  icon?: string;
  color?: string;
  // Streak protection & motivation features
  streakFreeze?: {
    availableFreezes: number;
    frozenDates: string[];
    lastFreezeRefill: string;
    freezesUsedThisWeek: number;
  };
  gracePeriod?: {
    enabled: boolean;
    graceHours: number;
    recoveredDates: string[];
  };
  comebackBonus?: {
    lastAbsenceEnd?: string;
    bonusXpAwarded: number;
    comebackCount: number;
    lastBonusDate?: string;
  };
  partialCredit?: {
    monthlyRates: Record<string, number>;
    weeklyRates: Record<string, number>;
    allTimeRate: number;
    totalScheduledDays: number;
    totalCompletedDays: number;
  };
  // Program-based habit tracking
  programStartDate?: string; // When the program started
  currentWeek?: number; // Current week in the program (1-indexed)
  totalWeeks?: number; // Total weeks in the program
  programData?: {
    phases?: any[];
    weeks?: any[];
    longDescription?: string;
    resources?: any[];
  };
}

export interface TaskProject {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  category?: TaskCategory[];
  tags?: string[];
  projectId?: string;
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  search?: string;
}

export interface TaskCompletionFormData {
  notes?: string;
  mood?: TaskCompletion['mood'];
  effort?: TaskCompletion['effort'];
  duration?: number;
  location?: string;
  companions?: string[];
  tags?: string[];
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  averageCompletionTime: number;
  productivityScore: number;
  completionsThisWeek: number;
  completionsThisMonth: number;
  averageMood: number; // 1-4 scale
  averageEffort: number; // 1-5 scale
  mostProductiveTime?: string; // Hour of day when most completions happen
  longestStreak: number;
  currentStreak: number;
}

export interface TaskTimeEntry {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  description?: string;
  createdAt: string;
}

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'urgent', label: 'Urgent', color: '#DC2626' },
];

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: string; color: string }[] = [
  { value: 'work', label: 'Work', icon: 'briefcase', color: '#3B82F6' },
  { value: 'personal', label: 'Personal', icon: 'user', color: '#8B5CF6' },
  { value: 'health', label: 'Health', icon: 'heart', color: '#EF4444' },
  { value: 'learning', label: 'Learning', icon: 'book-open', color: '#10B981' },
  { value: 'finance', label: 'Finance', icon: 'dollar-sign', color: '#F59E0B' },
  { value: 'social', label: 'Social', icon: 'users', color: '#EC4899' },
  { value: 'other', label: 'Other', icon: 'more-horizontal', color: '#6B7280' },
];

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: '#6B7280' },
  { value: 'in-progress', label: 'In Progress', color: '#3B82F6' },
  { value: 'completed', label: 'Completed', color: '#10B981' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
];