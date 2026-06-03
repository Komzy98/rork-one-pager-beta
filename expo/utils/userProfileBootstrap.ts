import { UserProfile } from '@/types/habit';
import { unifiedStorage } from '@/utils/unifiedStorage';

export function createDefaultUserProfile(userId: string, email: string, name: string): UserProfile {
  const now = new Date().toISOString();
  return {
    id: userId,
    email,
    name: name?.trim() || 'there',
    favoriteTeams: [],
    favoriteCountries: [],
    favoriteLeagues: [],
    sportsFeedPrefs: {
      strictFollowing: false,
      includeFollowedLeagues: true,
      discoveryLevel: 'med',
      prioritizeDomesticLeagues: true,
    },
    favoriteBooks: [],
    interests: [],
    notificationSettings: {
      liveMatches: true,
      matchReminders: true,
      goalAlerts: true,
      habitReminders: true,
      habitRiskAlerts: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:30',
      quietHoursEnd: '07:00',
      eventReminderLeadMinutes: 30,
    },
    displayPreferences: {
      showOnlyFavorites: false,
      timeFormat: '12h',
      theme: 'auto',
    },
    subscriptionTier: 'free',
    onboardingCompleted: false,
    createdAt: now,
    lastLoginAt: now,
  };
}

/** Persist a fresh profile locally so onboarding can render immediately after signup. */
export async function seedDefaultUserProfile(
  userId: string,
  email: string,
  name: string,
): Promise<UserProfile> {
  const profile = createDefaultUserProfile(userId, email, name);
  const storageKey = `@user_profile_${userId}`;
  await unifiedStorage.setItem(storageKey, JSON.stringify(profile));
  return profile;
}
