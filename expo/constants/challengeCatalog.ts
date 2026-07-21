import type { Challenge } from '@/types/gamification';

function daysFromNow(days: number, from = new Date()): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

function daysAgo(days: number, from = new Date()): string {
  return daysFromNow(-days, from);
}

/** Curated challenges users can join — no mock participants or stock avatars. */
export function buildChallengeCatalog(now = new Date()): Challenge[] {
  return [
    {
      id: 'catalog_streak_sprint_7',
      name: '7-Day Streak Sprint',
      description:
        'Keep any daily habit alive for 7 days in a row. A short sprint to build momentum with your accountability circle.',
      icon: 'flame',
      type: 'personal',
      category: 'habits',
      startDate: daysAgo(2, now),
      endDate: daysFromNow(5, now),
      goal: {
        type: 'streak',
        target: 7,
        description: '7 consecutive check-in days',
      },
      participants: [],
      createdBy: 'one_pager',
      status: 'active',
      rewards: [
        { rank: 1, type: 'badge', value: 'streak_sprint_7', description: 'Streak Sprint badge' },
      ],
      color: '#FF6A3D',
      isPublic: true,
    },
    {
      id: 'catalog_consistency_21',
      name: '21-Day Consistency Club',
      description:
        'Show up for your routines for 21 days. Track progress on the leaderboard and invite a partner to join you.',
      icon: 'target',
      type: 'group',
      category: 'habits',
      startDate: daysAgo(4, now),
      endDate: daysFromNow(17, now),
      goal: {
        type: 'consistency',
        target: 85,
        description: '85% consistency over 21 days',
      },
      participants: [],
      createdBy: 'one_pager',
      status: 'active',
      rewards: [
        { rank: 1, type: 'badge', value: 'consistency_21', description: 'Consistency Club badge' },
        { rank: 2, type: 'points', value: 300, description: '300 XP bonus' },
      ],
      color: '#6366F1',
      maxParticipants: 20,
      isPublic: true,
      inviteCode: 'CONSIST21',
    },
    {
      id: 'catalog_morning_momentum',
      name: 'Morning Momentum',
      description:
        'Complete a morning routine or early habit before 10am for 14 days. Great for chronotype-aware accountability.',
      icon: 'sunrise',
      type: 'personal',
      category: 'mindfulness',
      startDate: daysAgo(1, now),
      endDate: daysFromNow(13, now),
      goal: {
        type: 'streak',
        target: 14,
        habitName: 'Morning routine',
        description: '14 early check-ins',
      },
      participants: [],
      createdBy: 'one_pager',
      status: 'active',
      rewards: [
        { rank: 1, type: 'badge', value: 'morning_momentum', description: 'Morning Momentum badge' },
      ],
      color: '#FF9500',
      isPublic: true,
    },
    {
      id: 'catalog_partner_week',
      name: 'Accountability Week',
      description:
        'Pair up with a partner and both check in every day for 7 days. Share your invite link from Accountability Partners.',
      icon: 'users',
      type: 'group',
      category: 'habits',
      startDate: daysFromNow(1, now),
      endDate: daysFromNow(8, now),
      goal: {
        type: 'streak',
        target: 7,
        description: '7 shared accountability days',
      },
      participants: [],
      createdBy: 'one_pager',
      status: 'upcoming',
      rewards: [
        { rank: 1, type: 'badge', value: 'partner_week', description: 'Accountability Week badge' },
      ],
      color: '#34C759',
      maxParticipants: 10,
      isPublic: true,
    },
    {
      id: 'catalog_weekend_reset',
      name: 'Weekend Reset',
      description:
        'Use Saturday and Sunday to recover, reflect, and log wellbeing — without breaking your weekday streak goals.',
      icon: 'sparkles',
      type: 'personal',
      category: 'mindfulness',
      startDate: daysFromNow(3, now),
      endDate: daysFromNow(10, now),
      goal: {
        type: 'total_completions',
        target: 4,
        description: '4 intentional recovery check-ins',
      },
      participants: [],
      createdBy: 'one_pager',
      status: 'upcoming',
      rewards: [
        { rank: 1, type: 'badge', value: 'weekend_reset', description: 'Weekend Reset badge' },
      ],
      color: '#9C27B0',
      isPublic: false,
    },
  ];
}

/** User-joined challenges plus catalog entries they have not joined yet. */
export function mergeCatalogWithUserChallenges(userChallenges: Challenge[]): Challenge[] {
  const joinedIds = new Set(userChallenges.map((c) => c.id));
  const catalog = buildChallengeCatalog().filter((c) => !joinedIds.has(c.id));
  return [...userChallenges, ...catalog];
}
