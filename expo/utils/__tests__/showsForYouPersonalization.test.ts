import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildForYouHeroCandidates,
  buildForYouPersonalizationContext,
  pickForYouHeroItems,
  scoreForYouItem,
  sortForYouRailItems,
  toForYouMediaItem,
} from '../showsForYouPersonalization.ts';

const baseCtx = buildForYouPersonalizationContext({
  savedTmdbIds: [100],
  continueWatchingTmdbIds: [200],
  younifyLinkedTmdbIds: [300],
  regionalTmdbIds: [400],
  heroCandidates: [],
});

describe('pickForYouHeroItems', () => {
  it('prefers continue watching and saved titles over plain trending', () => {
    const candidates = [
      toForYouMediaItem({ id: 1, vote_average: 9, genre_ids: [] }, 'movie', 'trending'),
      toForYouMediaItem({ id: 100, vote_average: 6, genre_ids: [18] }, 'movie', 'trending'),
      toForYouMediaItem({ id: 200, vote_average: 5, genre_ids: [] }, 'tv', 'region'),
    ];
    const ctx = buildForYouPersonalizationContext({
      savedTmdbIds: [100],
      continueWatchingTmdbIds: [200],
      younifyLinkedTmdbIds: [],
      regionalTmdbIds: [],
      heroCandidates: candidates,
    });
    const hero = pickForYouHeroItems(candidates, ctx, 3);
    assert.deepEqual(
      hero.map((h) => h.id),
      [200, 100, 1],
    );
  });

  it('returns stable order across calls (no random shuffle)', () => {
    const candidates = [
      toForYouMediaItem({ id: 10, vote_average: 7 }, 'movie', 'trending'),
      toForYouMediaItem({ id: 11, vote_average: 7 }, 'movie', 'trending'),
      toForYouMediaItem({ id: 12, vote_average: 7 }, 'tv', 'trending'),
    ];
    const first = pickForYouHeroItems(candidates, baseCtx, 3).map((h) => h.id);
    const second = pickForYouHeroItems(candidates, baseCtx, 3).map((h) => h.id);
    assert.deepEqual(first, second);
  });

  it('prioritizes region pool when building candidates', () => {
    const hero = buildForYouHeroCandidates({
      regionMovies: [toForYouMediaItem({ id: 50 }, 'movie', 'region')],
      trendingMovies: [toForYouMediaItem({ id: 50 }, 'movie', 'trending'), toForYouMediaItem({ id: 51 }, 'movie', 'trending')],
    });
    assert.equal(hero.length, 2);
    assert.equal(hero[0].id, 50);
    assert.equal((hero[0] as { _forYouSource?: string })._forYouSource, 'region');
  });
});

describe('sortForYouRailItems', () => {
  it('boosts items on linked services within a rail', () => {
    const items = [
      toForYouMediaItem({ id: 1 }, 'movie', 'popular'),
      toForYouMediaItem({ id: 300 }, 'movie', 'popular'),
    ];
    const ctx = buildForYouPersonalizationContext({
      savedTmdbIds: [],
      continueWatchingTmdbIds: [],
      younifyLinkedTmdbIds: [300],
      regionalTmdbIds: [],
      heroCandidates: items,
    });
    const sorted = sortForYouRailItems(items, ctx);
    assert.deepEqual(sorted.map((i) => i.id), [300, 1]);
  });
});

describe('scoreForYouItem', () => {
  it('adds genre affinity from saved titles', () => {
    const item = toForYouMediaItem({ id: 99, genre_ids: [18, 28] }, 'movie', 'trending');
    const ctx = buildForYouPersonalizationContext({
      savedTmdbIds: [1],
      continueWatchingTmdbIds: [],
      younifyLinkedTmdbIds: [],
      regionalTmdbIds: [],
      heroCandidates: [
        toForYouMediaItem({ id: 1, genre_ids: [18] }, 'movie', 'trending'),
        item,
      ],
    });
    const withoutGenre = toForYouMediaItem({ id: 99, genre_ids: [99] }, 'movie', 'trending');
    assert.ok(scoreForYouItem(item, ctx) > scoreForYouItem(withoutGenre, ctx));
  });
});
