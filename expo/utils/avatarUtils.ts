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
  const candidates = collectAvatarUrlCandidates(options);
  return candidates[0] ?? null;
}

/** Ordered fallbacks for `<Image onError />` when the primary URL fails to load. */
export function collectAvatarUrlCandidates(options: {
  profileAvatar?: string | null;
  authAvatar?: string | null;
  socialAvatar?: string | null;
}): string[] {
  const ordered = [options.profileAvatar, options.socialAvatar, options.authAvatar];
  const seen = new Set<string>();
  const remotes: string[] = [];
  const locals: string[] = [];

  for (const url of ordered) {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    if (isRemoteAvatarUrl(trimmed)) remotes.push(trimmed);
    else if (isLocalAvatarUri(trimmed)) locals.push(trimmed);
  }

  return [...remotes, ...locals];
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
