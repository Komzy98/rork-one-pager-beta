import type { ActivityEvent } from '@/utils/activityService';
import {
  isPartnerHabitActivityVisible,
  type PartnerHabitShareRow,
} from '@/utils/partnerHabitShares';

export function filterFeedByHabitShares(
  feed: ActivityEvent[],
  myUserId: string,
  shares: PartnerHabitShareRow[],
): ActivityEvent[] {
  return feed.filter((event) =>
    isPartnerHabitActivityVisible(
      shares,
      myUserId,
      event.userId,
      event.metadata ?? {},
      event.type,
    ),
  );
}
