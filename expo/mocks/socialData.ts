import { Friend } from '@/types/gamification';

/** Legacy mock friends — not used in production UI. Kept for local dev references only. */
export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'friend_1',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    currentStreak: 45,
    totalCompletions: 320,
    level: 15,
    status: 'online',
    lastActiveAt: new Date().toISOString(),
    sharedChallenges: [],
    mutualFriends: 3,
  },
  {
    id: 'friend_2',
    name: 'Marcus Johnson',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    currentStreak: 28,
    totalCompletions: 185,
    level: 12,
    status: 'away',
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    sharedChallenges: [],
    mutualFriends: 5,
  },
];
