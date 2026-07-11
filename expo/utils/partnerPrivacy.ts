import { Alert } from 'react-native';
import { unifiedStorage } from '@/utils/unifiedStorage';
import type { ActivityVisibility } from '@/utils/friendsService';

export const PARTNER_PRIVACY_ACK_KEY = 'partner_privacy_ack';

export function partnerPrivacyAckStorageKey(userId: string): string {
  return `${PARTNER_PRIVACY_ACK_KEY}_${userId}`;
}

export const VISIBILITY_OPTIONS: {
  key: ActivityVisibility;
  label: string;
  summary: string;
}[] = [
  {
    key: 'friends',
    label: 'Partners',
    summary:
      'Partners see your streak, saved events, RSVPs, and activity summaries (habits, shows, sports).',
  },
  {
    key: 'private',
    label: 'Private',
    summary:
      'Partners still see your name, avatar, and streak — but not your activity, saves, or RSVPs.',
  },
  {
    key: 'public',
    label: 'Public',
    summary:
      'Any signed-in One Pager user can see the same activity as partners. Use only if you want maximum visibility.',
  },
];

export const DEFAULT_ACTIVITY_VISIBILITY: ActivityVisibility = 'friends';

export const FIRST_PARTNER_CONFIRM_MESSAGE =
  'Partners can see your streak, saved events, RSVPs, and activity summaries (like habits and shows you log).\n\nYou can switch to Private anytime to hide activity details. Your name, avatar, and streak stay visible to partners.';

export const UNFRIEND_REVOKE_MESSAGE =
  'They will immediately lose access to your activity feed, saved events, and RSVPs. Unfriending revokes that view — they can only see what your visibility setting allows if they find your profile again.';

/** Privacy policy copy — what accountability partners can see. */
export const WHAT_PARTNERS_SEE_SECTION = {
  title: 'What Accountability Partners See',
  content:
    'When you connect with an accountability partner, they may see information based on your visibility and partner controls:\n\n' +
    '• Always visible to partners: your display name, username, avatar, and current streak (unless you go fully private for activity — name, avatar, and streak still show on the leaderboard).\n\n' +
    '• Partners visibility (default): generic or specific activity summaries (habit check-ins, saved events, RSVPs, sports pins, watchlist adds), saved event snapshots, shared plan RSVPs, and lightweight presence (“active today”) unless you hide last active.\n\n' +
    '• Private mode: partners keep name, avatar, and streak only — no activity feed, saves, RSVPs, or event plans.\n\n' +
    '• Partner controls you can toggle anytime: share streak only, events only, generic habit labels, hide last active, and block incoming nudges.\n\n' +
    '• We never share health or recovery habits in the activity feed. Emails, phone numbers, and precise locations are stripped from published activity.\n\n' +
    '• Blocking a partner immediately removes their read access to your profile and activity. Reporting sends a record to our team for review.\n\n' +
    '• You can export your social data or delete your activity history from Profile → Your data. Deleting your account removes partner access permanently (see Data Retention).',
};

/** One-time acknowledgement before the first partner connection. */
export async function confirmBeforeFirstPartner(userId: string): Promise<boolean> {
  const key = partnerPrivacyAckStorageKey(userId);
  try {
    const stored = await unifiedStorage.getItem(key);
    if (stored === '1') return true;
  } catch {
    // fall through to prompt
  }

  return new Promise((resolve) => {
    Alert.alert('Before you connect', FIRST_PARTNER_CONFIRM_MESSAGE, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      {
        text: 'I understand',
        onPress: () => {
          void unifiedStorage.setItem(key, '1').finally(() => resolve(true));
        },
      },
    ]);
  });
}

export function getVisibilityCopy(visibility: ActivityVisibility) {
  return VISIBILITY_OPTIONS.find((opt) => opt.key === visibility) ?? VISIBILITY_OPTIONS[0];
}
