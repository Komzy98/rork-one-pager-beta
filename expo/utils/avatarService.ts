import { supabase, supabaseConfigured } from '@/utils/supabaseClient';
import { isLocalAvatarUri, isRemoteAvatarUrl, avatarStoragePath } from '@/utils/avatarUtils';

export {
  isLocalAvatarUri,
  isRemoteAvatarUrl,
  pickPublishedAvatarUrl,
  resolveDisplayAvatarUrl,
} from '@/utils/avatarUtils';

const AVATAR_BUCKET = 'avatars';

export async function uploadProfileAvatar(
  userId: string,
  localUri: string,
): Promise<string | null> {
  if (!supabaseConfigured || !userId || !localUri?.trim()) return null;
  if (isRemoteAvatarUrl(localUri)) return localUri.trim();

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('Could not read the selected photo.');
  }

  const body =
    typeof response.arrayBuffer === 'function'
      ? await response.arrayBuffer()
      : await response.blob();
  const ext = localUri.toLowerCase().includes('.png')
    ? 'png'
    : localUri.toLowerCase().includes('.webp')
      ? 'webp'
      : 'jpg';
  const path = avatarStoragePath(userId, ext);
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(error.message || 'Could not upload your profile photo.');
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl || null;
}
