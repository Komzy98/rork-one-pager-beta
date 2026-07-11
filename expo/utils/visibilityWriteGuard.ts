import type { ActivityVisibility } from '@/utils/friendsService';

const WRITE_TTL_MS = 8000;

let pending: { userId: string; value: ActivityVisibility; at: number } | null = null;

/** Mark a visibility change in flight so stale profile syncs do not overwrite the UI. */
export function markVisibilityWrite(userId: string, value: ActivityVisibility): void {
  pending = { userId, value, at: Date.now() };
}

export function clearVisibilityWrite(): void {
  pending = null;
}

/** Prefer the in-flight local value over a possibly stale server read. */
export function preferLocalActivityVisibility(
  userId: string,
  serverValue: ActivityVisibility,
): ActivityVisibility {
  if (
    pending &&
    pending.userId === userId &&
    Date.now() - pending.at < WRITE_TTL_MS
  ) {
    return pending.value;
  }
  return serverValue;
}

export function hasPendingVisibilityWrite(userId: string): boolean {
  return !!(
    pending &&
    pending.userId === userId &&
    Date.now() - pending.at < WRITE_TTL_MS
  );
}
