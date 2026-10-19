import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Show } from '../../types/habit';
import { filterLibrary, libraryMediaType, normalizeLibraryKey, nextWatchedEpisode } from '../showsLibrary';
import { buildForYouPersonalizationContext, scoreForYouItem } from '../showsForYouPersonalization';

const makeShow = (id: string, status: Show['status'], type: Show['type'], title: string): Show => ({
  id, status, type, title,
  platform: 'Other', mediaType: type === 'Movie' ? 'movie' : 'tv',
  tmdbId: Number(id), createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
});
const records = [
  makeShow('1', 'Watching', 'Series', 'Severance'),
  makeShow('2', 'Plan to Watch', 'Movie', 'Dune'),
  makeShow('3', 'Completed', 'Movie', 'Oppenheimer'),
  makeShow('4', 'On Hold', 'Series', 'Silo'),
];

describe('Shows library redesign', () => {
  it('keeps existing persisted status keys and displays the correct movie/TV distinction', () => {
    assert.equal(filterLibrary(records, { section: 'Watching', media: 'all' })[0].title, 'Severance');
    assert.equal(libraryMediaType(records[1]), 'movie');
    assert.equal(libraryMediaType(records[3]), 'tv');
    assert.equal(filterLibrary(records, { section: 'Plan to Watch', media: 'movie' }).length, 1);
  });
  it('filters search by title and sorts alphabetically', () => {
    assert.deepEqual(filterLibrary(records, { section: 'all', media: 'all', sort: 'title' }).map(s => s.title),
      ['Dune', 'Oppenheimer', 'Severance', 'Silo']);
    assert.deepEqual(filterLibrary(records, { section: 'all', media: 'tv', search: 'sev' }).map(s => s.title),
      ['Severance']);
  });
  it('keeps TMDB IDs scoped by media type', () => {
    assert.notEqual(normalizeLibraryKey(100, 'tv'), normalizeLibraryKey(100, 'movie'));
  });
  it('advances to the next aired episode, not an unreleased episode', () => {
    const result = nextWatchedEpisode({ season: 1, episode: 1 }, [
      { season_number: 1, episodes: [
        { episode_number: 1, air_date: '2026-01-01' },
        { episode_number: 2, air_date: '2026-01-05' },
        { episode_number: 3, air_date: '2027-02-05' },
      ] },
    ], '2026-10-19');
    assert.deepEqual(result.next, { season: 1, episode: 2 });
    assert.equal(nextWatchedEpisode({season:1, episode:2}, [
      { season_number: 1, episodes: [
        { episode_number: 2, air_date: '2026-01-05' },
        { episode_number: 3, air_date: '2027-02-05' },
      ] },
    ], '2026-10-19').next, null);
  });
  it('skips specials and advances to the next season when episodes have aired', () => {
    const res = nextWatchedEpisode({season:1, episode:8}, [
      {season_number:0, episodes:[{ episode_number:9, air_date:'2026-01-01' }]},
      {season_number:1, episodes:[{ episode_number:8, air_date:'2026-01-01' }]},
      {season_number:2, episodes:[{ episode_number:1, air_date:'2026-02-01' }]},
    ], '2026-10-19');
    assert.deepEqual(res.next, { season: 2, episode: 1 });
  });
  it('uses saved genre hints even when saved titles are not in trending candidates', () => {
    const context = buildForYouPersonalizationContext({
      savedTmdbIds: [9999], continueWatchingTmdbIds: [], younifyLinkedTmdbIds: [],
      regionalTmdbIds: [], heroCandidates: [], savedGenreIds: [878],
    });
    assert.equal(context.preferredGenreIds.has(878), true);
    assert.ok(scoreForYouItem({id:123, media_type:'tv', genre_ids:[878]}, context) >
      scoreForYouItem({id:124, media_type:'tv', genre_ids:[35]}, context));
  });
});
