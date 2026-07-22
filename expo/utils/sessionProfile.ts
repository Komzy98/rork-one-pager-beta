/** True when local UserProfile storage belongs to the active auth user (avoids cross-account avatar bleed). */
export function isProfileForUser(
  profile: { id?: string } | null | undefined,
  userId: string | null | undefined,
): boolean {
  return Boolean(userId && profile?.id && profile.id === userId);
}
