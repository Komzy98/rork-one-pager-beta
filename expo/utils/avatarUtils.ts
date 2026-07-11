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

const AVATAR_FILE_PATTERN = /^[0-9a-f-]{36}\/avatar\.(jpg|jpeg|png|webp)$/i;

/** Canonical Storage path: `{userId}/avatar.{jpg|png|webp}` — no other paths allowed. */
export function avatarStoragePath(
  userId: string,
  ext: 'jpg' | 'jpeg' | 'png' | 'webp' = 'jpg',
): string {
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  return `${userId}/avatar.${normalized}`;
}

export function isValidAvatarStoragePath(userId: string, path: string): boolean {
  if (!userId || !path) return false;
  return AVATAR_FILE_PATTERN.test(path) && path.startsWith(`${userId}/`);
}
