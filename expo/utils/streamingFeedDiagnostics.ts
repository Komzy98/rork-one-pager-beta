/**
 * Lightweight diagnostics when linked streaming feeds are empty or fail.
 * Wire to Sentry/Datadog later via a single adapter.
 */

export type StreamingHeroDiagnosticContext = {
  linkedProviderCount: number;
  sectionIds: string[];
  sectionItemCounts: Record<string, number>;
  heroCount: number;
  younifyLoading: boolean;
  streamingInitialized: boolean;
  errorMessage?: string | null;
};

export function logStreamingHeroDiagnostic(context: StreamingHeroDiagnosticContext): void {
  const totalItems = Object.values(context.sectionItemCounts).reduce((a, b) => a + b, 0);
  const shouldLog =
    context.linkedProviderCount > 0 &&
    context.streamingInitialized &&
    !context.younifyLoading &&
    context.heroCount === 0 &&
    totalItems === 0;

  if (!shouldLog) return;

  const payload = {
    kind: 'streaming_hero_empty',
    ...context,
    totalSectionItems: totalItems,
    at: new Date().toISOString(),
  };

  if (__DEV__) {
    console.warn('[streamingFeed]', payload);
    return;
  }

  // Production: structured log for log drains (Railway, Xcode, Metro-less builds).
  console.warn(`[streamingFeed] ${JSON.stringify(payload)}`);
}

export function logForYouFeedDiagnostic(context: {
  heroCount: number;
  hasAnyContent: boolean;
  trendingError: boolean;
  popularError: boolean;
  usingCachedTrending: boolean;
  usingCachedPopular: boolean;
}): void {
  if (context.hasAnyContent || context.heroCount > 0) return;
  if (!context.trendingError && !context.popularError) return;

  const payload = {
    kind: 'for_you_feed_failed',
    ...context,
    at: new Date().toISOString(),
  };

  if (__DEV__) {
    console.warn('[forYouFeed]', payload);
  } else {
    console.warn(`[forYouFeed] ${JSON.stringify(payload)}`);
  }
}
