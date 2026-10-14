/**
 * A cloud collection that is explicitly [] represents deletion, not corruption.
 * Only fill in from local disk when the cloud document lacks that field entirely.
 * Re-adding deleted records breaks multi-device sync and users' intent.
 */
export function reconcileCloudCollections<T extends Record<string, any>>(
  cloud: T | null | undefined,
  local: T | null | undefined,
  collectionKeys: readonly string[],
): T {
  const result = { ...(cloud ?? {}) } as T;
  for (const key of collectionKeys) {
    if (!Object.prototype.hasOwnProperty.call(result, key) && Array.isArray(local?.[key])) {
      (result as any)[key] = local![key];
    }
  }
  return result;
}
