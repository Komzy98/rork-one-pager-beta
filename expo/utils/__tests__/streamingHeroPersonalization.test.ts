import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildStreamingHeroWhyLabel } from '@/utils/streamingHeroPersonalization';

describe('buildStreamingHeroWhyLabel', () => {
  it('names platform and section', () => {
    const label = buildStreamingHeroWhyLabel('trending', {
      younifySourceService: { name: 'Disney+' },
    }, null);
    assert.equal(label, 'Trending on Disney+');
  });

  it('appends list match when saved', () => {
    const label = buildStreamingHeroWhyLabel(
      'recommended',
      { tmdbId: 42, younifySourceService: { name: 'Netflix' } },
      {
        savedTmdbIds: new Set([42]),
        continueWatchingTmdbIds: new Set(),
        younifyLinkedTmdbIds: new Set(),
        regionalTmdbIds: new Set(),
        genreWeights: new Map(),
        favoriteCountryCodes: [],
      },
    );
    assert.match(label, /Recommended on Netflix/);
    assert.match(label, /Matches your list/);
  });
});
