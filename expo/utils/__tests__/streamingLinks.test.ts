import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrimeVideoOpenTargets,
  buildPrimeVideoSearchUrl,
  convertAivSchemeToPrimeVideoHttps,
  normalizePrimeVideoWatchUrl,
} from '@/utils/primeVideoLinks';

describe('Prime Video deep links', () => {
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
