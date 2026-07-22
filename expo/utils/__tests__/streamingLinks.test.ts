import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrimeVideoOpenTargets,
  buildPrimeVideoSearchUrl,
  convertAivSchemeToPrimeVideoHttps,
  normalizePrimeVideoWatchUrl,
  isPrimeVideoProviderId,
} from '@/utils/primeVideoLinks';
import {
  normalizeDisneyPlusWatchUrl,
  isDisneyPlusSearchOrGenericUrl,
  extractDisneyPlusUrlFromText,
  buildDisneyPlusOpenTargets,
} from '@/utils/disneyPlusLinks';
import {
  buildNetflixOpenTargets,
  isNetflixSearchOrGenericUrl,
  normalizeNetflixWatchUrl,
  extractNetflixTitleOrWatchId,
} from '@/utils/netflixLinks';

describe('Prime Video deep links', () => {
  it('treats Prime Video with Ads (2100) as Prime', () => {
    assert.equal(isPrimeVideoProviderId(2100), true);
    assert.equal(isPrimeVideoProviderId(119), true);
  });

  it('buildPrimeVideoSearchUrl uses app.primevideo.com', () => {
    const url = buildPrimeVideoSearchUrl('The Boys');
    assert.ok(url.includes('app.primevideo.com'));
    assert.ok(url.includes('phrase=The%20Boys'));
    assert.ok(!url.includes('amazon.com'));
  });

  it('rewrites amazon detail pages to app.primevideo.com', () => {
    const url = normalizePrimeVideoWatchUrl(
      'https://www.amazon.com/gp/video/detail/B08XYZ1234',
    );
    assert.equal(url, 'https://app.primevideo.com/detail/B08XYZ1234');
  });

  it('rewrites amazon detail query asin to app.primevideo.com', () => {
    const url = normalizePrimeVideoWatchUrl(
      'https://www.amazon.com/gp/video/detail?asin=B08XYZ1234',
    );
    assert.equal(url, 'https://app.primevideo.com/detail/B08XYZ1234');
  });

  it('rewrites amazon instant-video search to prime video search', () => {
    const url = normalizePrimeVideoWatchUrl(
      'https://www.amazon.com/s?i=instant-video&k=Interstellar',
    );
    assert.ok(url.includes('app.primevideo.com/search'));
    assert.ok(url.includes('Interstellar'));
    assert.ok(!url.includes('amazon.com'));
  });

  it('rewrites amazon video hub to prime video app', () => {
    const url = normalizePrimeVideoWatchUrl('https://www.amazon.com/gp/video');
    assert.equal(url, 'https://app.primevideo.com');
  });

  it('rewrites www.primevideo.com to app host', () => {
    const url = normalizePrimeVideoWatchUrl(
      'https://www.primevideo.com/detail/B08XYZ1234',
    );
    assert.ok(url.includes('app.primevideo.com/detail/B08XYZ1234'));
  });

  it('rewrites aiv punchout links to app.primevideo.com gti detail', () => {
    const url = convertAivSchemeToPrimeVideoHttps(
      'aiv://aiv/detail?gti=amzn1.dv.gti.abc-123&action=watch',
    );
    assert.equal(
      url,
      'https://app.primevideo.com/detail?gti=amzn1.dv.gti.abc-123',
    );
  });

  it('buildPrimeVideoOpenTargets prefers app.primevideo.com over amazon.com', () => {
    const targets = buildPrimeVideoOpenTargets({
      url: 'https://www.amazon.com/gp/video/detail/B08XYZ1234',
      asin: 'B08XYZ1234',
    });
    assert.equal(targets[0], 'https://app.primevideo.com/detail/B08XYZ1234');
    assert.ok(!targets.some((t) => t.includes('amazon.com/gp/video')));
  });
});

describe('Disney+ deep links', () => {
  it('flags search URLs as non–universal-link destinations', () => {
    assert.equal(
      isDisneyPlusSearchOrGenericUrl('https://www.disneyplus.com/search?q=The+Bear'),
      true,
    );
    assert.equal(
      isDisneyPlusSearchOrGenericUrl('https://www.disneyplus.com/series/the-bear/4UkCRH2aE2xK'),
      false,
    );
  });

  it('normalizes disneyplus hosts and strips irclickid', () => {
    const url = normalizeDisneyPlusWatchUrl(
      'https://m.disneyplus.com/movies/joy/5MV7qtNPTJz7?irclickid=abc',
    );
    assert.equal(url, 'https://www.disneyplus.com/movies/joy/5MV7qtNPTJz7');
  });

  it('extracts content URLs from embedded strings', () => {
    const url = extractDisneyPlusUrlFromText(
      'See https://www.disneyplus.com/series/the-bear/4UkCRH2aE2xK today',
    );
    assert.equal(url, 'https://www.disneyplus.com/series/the-bear/4UkCRH2aE2xK');
  });

  it('buildDisneyPlusOpenTargets includes play alias and native scheme', () => {
    const targets = buildDisneyPlusOpenTargets(
      'https://www.disneyplus.com/video/550e8400-e29b-41d4-a716-446655440000',
    );
    assert.ok(targets.some((t) => t.includes('/play/')));
    assert.ok(targets.some((t) => t.startsWith('disneyplus://')));
  });
});

describe('Netflix deep links', () => {
  it('flags search URLs as unreliable deep-link targets', () => {
    assert.equal(
      isNetflixSearchOrGenericUrl('https://www.netflix.com/search?q=Stranger'),
      true,
    );
    assert.equal(
      isNetflixSearchOrGenericUrl('https://www.netflix.com/title/80057281'),
      false,
    );
  });

  it('buildNetflixOpenTargets prefers watch/title paths with nflx fallback', () => {
    const targets = buildNetflixOpenTargets({
      url: 'https://www.netflix.com/title/80057281',
      resumeSeconds: 120,
    });
    assert.equal(targets[0], 'https://www.netflix.com/title/80057281?t=120');
    assert.ok(targets.some((t) => t.startsWith('nflx://www.netflix.com/title/80057281')));
  });

  it('extractNetflixTitleOrWatchId parses watch links', () => {
    const parsed = extractNetflixTitleOrWatchId('https://www.netflix.com/watch/12345');
    assert.deepEqual(parsed, { kind: 'watch', id: '12345' });
  });
});
