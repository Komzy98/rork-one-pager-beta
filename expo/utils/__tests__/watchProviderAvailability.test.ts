import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyReleaseAwareWatchProviders,
  isInTheatricalWindow,
} from '../watchProviderAvailability.ts';

const prime = { provider_id: 9, provider_name: 'Amazon Video', logo_path: '/x.jpg', display_priority: 1 };

describe('isInTheatricalWindow', () => {
  it('treats recent releases as in cinema window', () => {
    const now = new Date('2026-07-22T12:00:00');
    assert.equal(isInTheatricalWindow('2026-06-01', now), true);
  });

  it('allows digital options long after release', () => {
    const now = new Date('2026-07-22T12:00:00');
    assert.equal(isInTheatricalWindow('2016-01-01', now), false);
  });
});

describe('applyReleaseAwareWatchProviders', () => {
  it('clears digital buckets for recent releases', () => {
    const out = applyReleaseAwareWatchProviders(
      { streaming: [], rent: [prime], buy: [prime], link: 'https://example.com' },
      '2026-05-01',
      { now: new Date('2026-07-22T12:00:00') },
    );
    assert.equal(out.rent.length, 0);
    assert.equal(out.buy.length, 0);
    assert.equal(out.link, undefined);
    assert.equal(out.suppressDigitalReason, 'recent_or_upcoming_release');
  });
});
