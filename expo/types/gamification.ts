export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'habits' | 'streaks' | 'social' | 'challenges' | 'milestones' | 'special';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  color: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  requirement: AchievementRequirement;
  reward?: AchievementReward;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
  color: string;
}

export interface AchievementRequirement {
  type: 'streak' | 'total_completions' | 'consecutive_days' | 'habit_count' | 'challenge_wins' | 'friends_count' | 'perfect_week' | 'perfect_month' | 'early_bird' | 'night_owl' | 'variety' | 'custom';
  value: number;
  habitId?: string;
  customCheck?: string;
}

export interface AchievementReward {
  type: 'badge' | 'points' | 'title' | 'theme';
  value: string | number;
}

export interface UserStats {
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  perfectWeeks: number;
  perfectMonths: number;
  totalPoints: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  habitsCreated: number;
  challengesWon: number;
  challengesJoined: number;
  friendsCount: number;
  rank?: number;
  title?: string;
}

export interface StreakData {
  habitId: string;
  habitName: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedAt?: string;
  isAtRisk: boolean;
  streakFreezeAvailable: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'personal' | 'group' | 'global';
  category: 'habits' | 'fitness' | 'mindfulness' | 'productivity' | 'custom';
  startDate: string;
  endDate: string;
  goal: ChallengeGoal;
  participants: ChallengeParticipant[];
  createdBy: string;
  status: 'upcoming' | 'active' | 'completed';
  rewards: ChallengeReward[];
  color: string;
  maxParticipants?: number;
  isPublic: boolean;
  inviteCode?: string;
}

export interface ChallengeGoal {
  type: 'streak' | 'total_completions' | 'consistency' | 'custom';
  target: number;
  habitId?: string;
  habitName?: string;
  description?: string;
}

export interface ChallengeParticipant {
  userId: string;
  userName: string;
  avatar?: string;
  progress: number;
  rank: number;
  joinedAt: string;
  isCreator: boolean;
}

export interface ChallengeReward {
  rank: number;
  type: 'badge' | 'points' | 'title';
  value: string | number;
  description: string;
}

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  currentStreak: number;
  totalCompletions: number;
  level: number;
  status: 'online' | 'offline' | 'away';
  lastActiveAt: string;
  sharedChallenges: string[];
  mutualFriends: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  sentAt: string;
  respondedAt?: string;
}

export interface Leaderboard {
  id: string;
  name: string;
  type: 'global' | 'friends' | 'challenge';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
  updatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  score: number;
  change: number;
  isCurrentUser: boolean;
}

export interface ShareableProgress {
  type: 'streak' | 'achievement' | 'challenge_win' | 'milestone';
  title: string;
  description: string;
  value?: number;
  imageUrl?: string;
  shareText: string;
  hashtags: string[];
}

export interface SmartNotificationSchedule {
  id: string;
  habitId: string;
  habitName: string;
  optimalTime: string;
  confidence: number;
  reasoning: string;
  enabled: boolean;
  lastTriggered?: string;
  successRate: number;
}

export interface NotificationPreference {
  type: 'habit_reminder' | 'streak_risk' | 'achievement' | 'challenge' | 'social' | 'motivation';
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  frequency: 'always' | 'smart' | 'minimal';
}

export const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt' | 'progress'>[] = [
  // Streak Badges
  { id: 'streak_3', name: 'Getting Started', description: '3-day streak', icon: 'flame', rarity: 'common', category: 'streaks', color: '#FF6B35' },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day streak', icon: 'flame', rarity: 'common', category: 'streaks', color: '#FF6B35' },
  { id: 'streak_14', name: 'Fortnight Fighter', description: '14-day streak', icon: 'flame', rarity: 'rare', category: 'streaks', color: '#FF4500' },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day streak', icon: 'flame', rarity: 'rare', category: 'streaks', color: '#FF4500' },
  { id: 'streak_60', name: 'Habit Hero', description: '60-day streak', icon: 'flame', rarity: 'epic', category: 'streaks', color: '#9B59B6' },
  { id: 'streak_100', name: 'Century Club', description: '100-day streak', icon: 'crown', rarity: 'epic', category: 'streaks', color: '#9B59B6' },
  { id: 'streak_365', name: 'Year of Dedication', description: '365-day streak', icon: 'trophy', rarity: 'legendary', category: 'streaks', color: '#FFD700' },

  // Completion Badges
  { id: 'complete_10', name: 'First Steps', description: 'Complete 10 habits', icon: 'check-circle', rarity: 'common', category: 'habits', color: '#4CAF50' },
  { id: 'complete_50', name: 'Half Century', description: 'Complete 50 habits', icon: 'check-circle', rarity: 'common', category: 'habits', color: '#4CAF50' },
  { id: 'complete_100', name: 'Centurion', description: 'Complete 100 habits', icon: 'award', rarity: 'rare', category: 'habits', color: '#2196F3' },
  { id: 'complete_500', name: 'Habit Machine', description: 'Complete 500 habits', icon: 'award', rarity: 'epic', category: 'habits', color: '#9B59B6' },
  { id: 'complete_1000', name: 'Legendary', description: 'Complete 1000 habits', icon: 'star', rarity: 'legendary', category: 'habits', color: '#FFD700' },

  // Perfect Week/Month
  { id: 'perfect_week', name: 'Perfect Week', description: 'Complete all habits for 7 days', icon: 'calendar-check', rarity: 'rare', category: 'milestones', color: '#00BCD4' },
  { id: 'perfect_month', name: 'Perfect Month', description: 'Complete all habits for 30 days', icon: 'calendar-check', rarity: 'epic', category: 'milestones', color: '#00BCD4' },

  // Time-based
  { id: 'early_bird', name: 'Early Bird', description: 'Complete habits before 7 AM 10 times', icon: 'sunrise', rarity: 'rare', category: 'special', color: '#FFC107' },
  { id: 'night_owl', name: 'Night Owl', description: 'Complete habits after 10 PM 10 times', icon: 'moon', rarity: 'rare', category: 'special', color: '#3F51B5' },

  // Social Badges
  { id: 'first_friend', name: 'Social Butterfly', description: 'Add your first friend', icon: 'users', rarity: 'common', category: 'social', color: '#E91E63' },
  { id: 'friends_5', name: 'Squad Goals', description: 'Have 5 friends', icon: 'users', rarity: 'rare', category: 'social', color: '#E91E63' },
  { id: 'friends_10', name: 'Popular', description: 'Have 10 friends', icon: 'heart', rarity: 'epic', category: 'social', color: '#E91E63' },

  // Challenge Badges
  { id: 'first_challenge', name: 'Challenger', description: 'Join your first challenge', icon: 'target', rarity: 'common', category: 'challenges', color: '#FF5722' },
  { id: 'challenge_win', name: 'Victor', description: 'Win a challenge', icon: 'trophy', rarity: 'rare', category: 'challenges', color: '#FF5722' },
  { id: 'challenge_master', name: 'Challenge Master', description: 'Win 10 challenges', icon: 'crown', rarity: 'legendary', category: 'challenges', color: '#FFD700' },

  // Variety
  { id: 'diverse_5', name: 'Well Rounded', description: 'Track 5 different habits', icon: 'grid', rarity: 'common', category: 'habits', color: '#607D8B' },
  { id: 'diverse_10', name: 'Renaissance', description: 'Track 10 different habits', icon: 'grid', rarity: 'rare', category: 'habits', color: '#607D8B' },
];

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlockedAt' | 'progress' | 'isUnlocked'>[] = [
  {
    id: 'first_habit',
    name: 'Fresh Start',
    description: 'Create your first habit',
    icon: 'plus-circle',
    category: 'habits',
    rarity: 'common',
    requirement: { type: 'habit_count', value: 1 },
    maxProgress: 1,
    color: '#4CAF50',
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a 30-day streak',
    icon: 'flame',
    category: 'streaks',
    rarity: 'epic',
    requirement: { type: 'streak', value: 30 },
    maxProgress: 30,
    color: '#FF4500',
  },
  {
    id: 'consistency_king',
    name: 'Consistency King',
    description: 'Complete 100 total habit completions',
    icon: 'crown',
    category: 'milestones',
    rarity: 'rare',
    requirement: { type: 'total_completions', value: 100 },
    maxProgress: 100,
    color: '#FFD700',
  },
  {
    id: 'perfect_week_achievement',
    name: 'Flawless Week',
    description: 'Complete a perfect week with all habits',
    icon: 'check-circle',
    category: 'milestones',
    rarity: 'rare',
    requirement: { type: 'perfect_week', value: 1 },
    maxProgress: 1,
    color: '#00BCD4',
  },
  {
    id: 'social_starter',
    name: 'Better Together',
    description: 'Add 3 friends to your network',
    icon: 'users',
    category: 'social',
    rarity: 'common',
    requirement: { type: 'friends_count', value: 3 },
    maxProgress: 3,
    color: '#E91E63',
  },
  {
    id: 'challenge_champion',
    name: 'Challenge Champion',
    description: 'Win 5 challenges',
    icon: 'trophy',
    category: 'challenges',
    rarity: 'epic',
    requirement: { type: 'challenge_wins', value: 5 },
    maxProgress: 5,
    color: '#FF5722',
  },
];

export const XP_PER_LEVEL = 1000;
export const XP_REWARDS = {
  habitComplete: 10,
  streakDay: 5,
  achievementUnlock: 50,
  badgeUnlock: 25,
  challengeWin: 100,
  perfectWeek: 75,
  perfectMonth: 200,
  friendAdd: 15,
};

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  5: 'Apprentice',
  10: 'Journeyman',
  15: 'Expert',
  20: 'Master',
  25: 'Grandmaster',
  30: 'Legend',
  40: 'Mythic',
  50: 'Transcendent',
};

export const getRarityColor = (rarity: BadgeRarity): string => {
  switch (rarity) {
    case 'common': return '#9E9E9E';
    case 'rare': return '#2196F3';
    case 'epic': return '#9B59B6';
    case 'legendary': return '#FFD700';
    default: return '#9E9E9E';
  }
};

export const getLevelTitle = (level: number): string => {
  const levels = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const l of levels) {
    if (level >= l) return LEVEL_TITLES[l];
  }
  return 'Beginner';
};
