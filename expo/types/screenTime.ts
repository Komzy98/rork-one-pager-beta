export interface TimeBlock {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  startTime: string;
  endTime: string;
  blockedApps: string[];
  frequency: {
    type: 'daily' | 'specific_days';
    days: number[];
  };
  completions: Record<string, boolean>;
  activeSession?: {
    startedAt: string;
    pausedAt?: string;
    totalPausedSeconds: number;
  };
  createdAt: string;
  stats: {
    totalCompleted: number;
    currentStreak: number;
    longestStreak: number;
    totalMinutesSaved: number;
  };
}

export interface NewTimeBlockFormData {
  name: string;
  description?: string;
  icon: string;
  color: string;
  startTime: string;
  endTime: string;
  blockedApps: string[];
  frequency: {
    type: 'daily' | 'specific_days';
    days: number[];
  };
}

export interface ScreenTimeStats {
  todayBlocks: number;
  todayCompleted: number;
  totalMinutesSaved: number;
  currentStreak: number;
  longestStreak: number;
  weeklyCompletionRate: number;
}

export const APP_CATEGORIES: { id: string; name: string; icon: string; color: string }[] = [
  { id: 'social', name: 'Social Media', icon: 'message-circle', color: '#E91E63' },
  { id: 'entertainment', name: 'Entertainment', icon: 'tv', color: '#9C27B0' },
  { id: 'games', name: 'Games', icon: 'gamepad-2', color: '#FF5722' },
  { id: 'news', name: 'News & Reading', icon: 'newspaper', color: '#2196F3' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#FF9800' },
  { id: 'messaging', name: 'Messaging', icon: 'messages-square', color: '#4CAF50' },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', color: '#607D8B' },
  { id: 'all', name: 'All Apps', icon: 'smartphone', color: '#F44336' },
];
