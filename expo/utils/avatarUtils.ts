export function isRemoteAvatarUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  return /^https?:\/\//i.test(url.trim());
}

export function isLocalAvatarUri(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  return u.startsWith('file://') || u.startsWith('ph://') || u.startsWith('content://');
}

/** Prefer a stable remote URL; never replace an existing remote URL with null. */
export function pickPublishedAvatarUrl(
  existing?: string | null,
  incoming?: string | null,
): string | null {
  const current = existing?.trim() || null;
  const next = incoming?.trim() || null;

  if (isRemoteAvatarUrl(next)) return next;
  if (isRemoteAvatarUrl(current)) return current;
  if (next) return next;
  return current;
}

export function resolveDisplayAvatarUrl(options: {
  profileAvatar?: string | null;
  authAvatar?: string | null;
  socialAvatar?: string | null;
}): string | null {
  const candidates = [options.profileAvatar, options.socialAvatar, options.authAvatar];
  const remote = candidates.find((url) => isRemoteAvatarUrl(url));
  if (remote) return remote.trim();
  const local = candidates.find((url) => isLocalAvatarUri(url));
  if (local) return local.trim();
  return null;
}
