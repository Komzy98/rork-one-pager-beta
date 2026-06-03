import { Platform, Share } from 'react-native';
import type { RefObject } from 'react';
import type { ProgressCardData } from '@/components/ShareableProgressCard';

const APP_TAGLINE = 'Track everything that matters in one page.';
const DEFAULT_HASHTAGS = ['OnePager', 'BuildStreak'];

export interface SharePayload {
  card: ProgressCardData;
  shareText: string;
  hashtags: string[];
}

// --- Payload builders -------------------------------------------------------

export function buildStreakPayload(streakDays: number, username?: string): SharePayload {
  const card: ProgressCardData = {
    type: 'streak',
    value: streakDays,
    valueLabel: streakDays === 1 ? 'day' : 'days',
    title: 'On a roll',
    subtitle: `${streakDays} day${streakDays === 1 ? '' : 's'} of staying consistent. Not breaking the chain.`,
    username,
  };
  return {
    card,
    shareText: `🔥 ${streakDays}-day streak on One Pager and counting. ${APP_TAGLINE}`,
    hashtags: ['OnePager', 'Streak'],
  };
}

export function buildAchievementPayload(
  title: string,
  description?: string,
  username?: string,
): SharePayload {
  const card: ProgressCardData = {
    type: 'achievement',
    title,
    subtitle: description,
    username,
  };
  return {
    card,
    shareText: `🏆 Just unlocked "${title}" on One Pager. ${APP_TAGLINE}`,
    hashtags: ['OnePager', 'Achievement'],
  };
}

export function buildSummaryPayload(
  score: number,
  headline: string,
  username?: string,
): SharePayload {
  const card: ProgressCardData = {
    type: 'summary',
    value: score,
    valueLabel: '/ 100',
    title: 'Today’s score',
    subtitle: headline,
    username,
  };
  return {
    card,
    shareText: `📈 Scored ${score}/100 on my day with One Pager. ${headline}`,
    hashtags: ['OnePager', 'DailyWin'],
  };
}

export function buildChallengePayload(
  challengeTitle: string,
  link: string,
  username?: string,
): SharePayload {
  const card: ProgressCardData = {
    type: 'challenge_win',
    title: challengeTitle,
    subtitle: 'Join me in this challenge on One Pager.',
    username,
  };
  return {
    card,
    shareText: `🎯 I'm doing the "${challengeTitle}" challenge on One Pager. Join me: ${link}`,
    hashtags: ['OnePager', 'Challenge'],
  };
}

// --- Sharing ----------------------------------------------------------------

type ViewShotModule = {
  captureRef: (ref: unknown, opts?: Record<string, unknown>) => Promise<string>;
};
type SharingModule = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (url: string, opts?: Record<string, unknown>) => Promise<void>;
};

function loadViewShot(): ViewShotModule | null {
  try {
    return require('react-native-view-shot') as ViewShotModule;
  } catch {
    return null;
  }
}

function loadSharing(): SharingModule | null {
  try {
    return require('expo-sharing') as SharingModule;
  } catch {
    return null;
  }
}

function withHashtags(text: string, hashtags: string[]): string {
  const tags = (hashtags.length ? hashtags : DEFAULT_HASHTAGS)
    .map((t) => `#${t.replace(/^#/, '')}`)
    .join(' ');
  return `${text}\n\n${tags}`;
}

export type ShareResult = 'image' | 'text' | 'dismissed' | 'unavailable';

/**
 * Capture the referenced card view as a PNG and open the native share sheet.
 * Falls back to text sharing if image capture / sharing isn't available
 * (e.g. on web, or before a dev-client rebuild that includes the native modules).
 */
export async function shareProgressCard(
  cardRef: RefObject<unknown>,
  payload: SharePayload,
): Promise<ShareResult> {
  const message = withHashtags(payload.shareText, payload.hashtags);

  if (Platform.OS === 'web') {
    try {
      await Share.share({ message });
      return 'text';
    } catch {
      return 'unavailable';
    }
  }

  const ViewShot = loadViewShot();
  const Sharing = loadSharing();

  if (ViewShot && cardRef.current) {
    try {
      const uri = await ViewShot.captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your progress',
          UTI: 'public.png',
        });
        return 'image';
      }
      // No expo-sharing: try RN Share with the file URI.
      await Share.share(Platform.OS === 'ios' ? { url: uri, message } : { message });
      return 'image';
    } catch (err) {
      if (__DEV__) console.warn('shareProgressCard: image capture failed, falling back to text', err);
    }
  }

  try {
    await Share.share({ message });
    return 'text';
  } catch {
    return 'unavailable';
  }
}

export { withHashtags };
