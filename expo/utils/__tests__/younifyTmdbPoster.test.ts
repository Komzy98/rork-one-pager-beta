import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inferYounifyRowMediaType } from '@/utils/younifyRowMedia';
import {
  scoreYounifyRowTitleMatch,
  YOUNIFY_TMDB_ID_MIN_TITLE_MATCH,
} from '@/utils/younifyRowTitleMatch';

describe('younifyTmdbPoster', () => {
  it('rejects TMDB id poster when franchise title does not match row title', () => {
    const row = { title: 'Diary of a Wimpy Kid', tmdbId: 60308 };
    const youngJusticeScore = scoreYounifyRowTitleMatch('Young Justice', row);
    const wimpyScore = scoreYounifyRowTitleMatch('Diary of a Wimpy Kid', row);
    assert.ok(youngJusticeScore < YOUNIFY_TMDB_ID_MIN_TITLE_MATCH);
    assert.ok(wimpyScore >= YOUNIFY_TMDB_ID_MIN_TITLE_MATCH);
  });

  it('accepts spinoff-adjacent rows when series title matches', () => {
    const row = { showTitle: 'Better Call Saul', title: 'Something Legal' };
    const score = scoreYounifyRowTitleMatch('Better Call Saul', row);
    assert.ok(score >= YOUNIFY_TMDB_ID_MIN_TITLE_MATCH);
  });
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
