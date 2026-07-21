import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inferYounifyRowMediaType } from '@/utils/younifyRowMedia';

describe('younifyTmdbPoster', () => {
  it('infers TV for continue-watching rows with show title and season/episode', () => {
    assert.equal(
      inferYounifyRowMediaType({
        showTitle: 'Suits',
        title: 'Borrowed Time',
        seasonNumber: 6,
        episodeNumber: 10,
      }),
      'tv',
    );
  });

  it('infers TV when episode title differs from series title', () => {
    assert.equal(
      inferYounifyRowMediaType({
        showTitle: 'Suits',
        title: 'Borrowed Time',
      }),
      'tv',
    );
  });
});
