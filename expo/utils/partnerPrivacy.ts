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
    key: 'private',
    label: 'Private',
    summary:
      'Recommended default — partners see your name, avatar, and streak only. Activity, saves, and RSVPs stay hidden until you choose to share more.',
  },
  {
    key: 'friends',
    label: 'Partners',
    summary:
      'Partners see your streak, saved events, RSVPs, and activity summaries (habits, shows, sports). Use Partner Controls below to limit further.',
  },
  {
    key: 'public',
    label: 'Public',
    summary:
      'Any signed-in One Pager user can see the same activity as partners. Use only if you want maximum visibility.',
  },
];

export const DEFAULT_ACTIVITY_VISIBILITY: ActivityVisibility = 'private';

export const FIRST_PARTNER_CONFIRM_MESSAGE =
  'By default, partners only see your name, avatar, and streak — not your full activity.\n\nUse “Partners” visibility or the Partner Controls below when you want to share events, habits, or activity summaries.\n\nYou can switch back to Private anytime.';

export const UNFRIEND_REVOKE_MESSAGE =
  'They will immediately lose access to your activity feed, saved events, and RSVPs. Unfriending revokes that view — they can only see what your visibility setting allows if they find your profile again.';

/** Privacy policy copy — what accountability partners can see. */
export const WHAT_PARTNERS_SEE_SECTION = {
  title: 'What Accountability Partners See',
  content:
    'When you connect with an accountability partner, they may see information based on your visibility, partner controls, and which habits you explicitly share:\n\n' +
    '• Habits: partners only see check-ins for habits you share with them (invite link or Habit → Accountability). Other habits stay private.\n\n' +
    '• Partners visibility (when enabled): generic or specific activity summaries (habit check-ins, saved events, RSVPs, sports pins, watchlist adds), saved event snapshots, shared plan RSVPs, and lightweight presence (“active today”) unless you hide last active.\n\n' +
    '• Private mode (default for new accounts): partners keep name, avatar, and streak only — no activity feed, saves, RSVPs, or event plans until you opt in.\n\n' +
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

const PARTNER_INVITE_OVERVIEW_DISMISS_KEY = 'partner_invite_overview_dismissed';
const PARTNER_INVITE_BANNER_DISMISS_KEY = 'partner_invite_banner_dismissed';

function partnerInviteOverviewDismissKey(userId: string): string {
  return `${PARTNER_INVITE_OVERVIEW_DISMISS_KEY}_${userId}`;
}

function partnerInviteBannerDismissKey(userId: string): string {
  return `${PARTNER_INVITE_BANNER_DISMISS_KEY}_${userId}`;
}

export async function isPartnerInviteOverviewDismissed(userId: string): Promise<boolean> {
  try {
    return (await unifiedStorage.getItem(partnerInviteOverviewDismissKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function markPartnerInviteOverviewDismissed(userId: string): Promise<void> {
  await unifiedStorage.setItem(partnerInviteOverviewDismissKey(userId), '1');
}

export async function isPartnerInviteBannerDismissed(userId: string): Promise<boolean> {
  try {
    return (await unifiedStorage.getItem(partnerInviteBannerDismissKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function markPartnerInviteBannerDismissed(userId: string): Promise<void> {
  await unifiedStorage.setItem(partnerInviteBannerDismissKey(userId), '1');
}
