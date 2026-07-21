import type { ActivityEvent } from '@/utils/activityService';
import type { IncomingRequest, FriendNudge } from '@/utils/friendsService';
import {
  formatActionOrientedHeadline,
  getActivityRowAction,
  type ActivityRowActionKind,
} from '@/utils/socialAccountability';
import { formatActivityTimeAgo } from '@/utils/activityFeedMeta';

export type PartnerInboxItemKind =
  | 'partner_request'
  | 'nudge'
  | 'partner_activity'
  | 'cheers_received';

export type PartnerInboxAction =
  | { type: 'accept_request'; requestId: string }
  | { type: 'nudge_back'; userId: string }
  | { type: 'open_tasks' }
  | { type: 'activity_action'; event: ActivityEvent; kind: ActivityRowActionKind }
  | { type: 'open_partners' };

export type PartnerInboxItem = {
  id: string;
  kind: PartnerInboxItemKind;
  title: string;
  subtitle: string;
  timeLabel?: string;
  priority: number;
  primaryAction: { label: string; action: PartnerInboxAction };
  secondaryAction?: { label: string; action: PartnerInboxAction };
};

export type BuildPartnerInboxInput = {
  incomingRequests: IncomingRequest[];
  unreadNudges: FriendNudge[];
  feed: ActivityEvent[];
  lastSeenAt: string | null;
  currentUserId?: string;
  unreadCheerCount: number;
  maxItems?: number;
};

function partnerDisplayName(from: { displayName?: string | null; username?: string | null } | null): string {
  return from?.displayName?.trim() || from?.username?.trim() || 'A partner';
}

function isUnreadSince(iso: string, lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return true;
  return new Date(iso).getTime() > new Date(lastSeenAt).getTime();
}

function unreadPartnerFeedEvents(
  feed: ActivityEvent[],
  lastSeenAt: string | null,
  currentUserId?: string,
): ActivityEvent[] {
  return feed.filter((event) => {
    if (currentUserId && event.userId === currentUserId) return false;
    return isUnreadSince(event.createdAt, lastSeenAt);
  });
}

export function buildPartnerInboxItems(input: BuildPartnerInboxInput): PartnerInboxItem[] {
  const maxItems = input.maxItems ?? 5;
  const items: PartnerInboxItem[] = [];

  for (const request of input.incomingRequests) {
    const name = partnerDisplayName(request.from);
    items.push({
      id: `request-${request.id}`,
      kind: 'partner_request',
      title: name,
      subtitle: 'Wants to show up with you',
      priority: 100,
      primaryAction: {
        label: 'Accept',
        action: { type: 'accept_request', requestId: request.id },
      },
    });
  }

  for (const nudge of input.unreadNudges) {
    const name = partnerDisplayName(nudge.from);
    items.push({
      id: `nudge-${nudge.id}`,
      kind: 'nudge',
      title: name,
      subtitle: nudge.message?.trim() || 'Sent you a nudge to keep showing up',
      timeLabel: formatActivityTimeAgo(nudge.createdAt),
      priority: 92,
      primaryAction: {
        label: 'Send cheer',
        action: { type: 'nudge_back', userId: nudge.fromUserId },
      },
      secondaryAction: {
        label: 'Show up',
        action: { type: 'open_tasks' },
      },
    });
  }

  const unreadFeed = unreadPartnerFeedEvents(input.feed, input.lastSeenAt, input.currentUserId);
  for (const event of unreadFeed) {
    const { line, detail } = formatActionOrientedHeadline(event);
    const rowAction = getActivityRowAction(event);
    items.push({
      id: `activity-${event.id}`,
      kind: 'partner_activity',
      title: line,
      subtitle: detail?.trim() || formatActivityTimeAgo(event.createdAt),
      timeLabel: formatActivityTimeAgo(event.createdAt),
      priority: event.type === 'workout' ? 88 : event.type === 'streak_milestone' ? 86 : 80,
      primaryAction: {
        label: rowAction.label,
        action: { type: 'activity_action', event, kind: rowAction.kind },
      },
    });
  }

  if (input.unreadCheerCount > 0) {
    items.push({
      id: 'cheers-received',
      kind: 'cheers_received',
      title:
        input.unreadCheerCount === 1
          ? 'Someone cheered your progress'
          : `${input.unreadCheerCount} cheers on your progress`,
      subtitle: 'Your circle noticed you showing up',
      priority: 75,
      primaryAction: {
        label: 'View',
        action: { type: 'open_partners' },
      },
    });
  }

  return items.sort((a, b) => b.priority - a.priority).slice(0, maxItems);
}

export function countPartnerInboxTotal(input: Omit<BuildPartnerInboxInput, 'maxItems'>): number {
  const unreadFeed = unreadPartnerFeedEvents(input.feed, input.lastSeenAt, input.currentUserId);
  return (
    input.incomingRequests.length +
    input.unreadNudges.length +
    unreadFeed.length +
    (input.unreadCheerCount > 0 ? 1 : 0)
  );
}
