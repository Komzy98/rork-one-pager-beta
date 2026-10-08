import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyEpisodeTiming,
  formatEpisodeTimingLabel,
  resolveEpisodeForSurface,
} from '../episodeReleaseTiming';

const ep = (airDate: string, episodeNumber = 1) => ({
  name: `Episode ${episodeNumber}`,
  seasonNumber: 2,
  episodeNumber,
  airDate,
});

test('future episode is never classified as recent', () => {
  assert.deepEqual(classifyEpisodeTiming('2026-10-09', '2026-10-08'), {
    timing: 'tomorrow',
    daysFromToday: 1,
  });
});

test('today is distinct from recent past', () => {
  assert.equal(classifyEpisodeTiming('2026-10-08', '2026-10-08').timing, 'today');
  assert.equal(classifyEpisodeTiming('2026-10-07', '2026-10-08').timing, 'recent');
});

test('date-only comparisons do not drift with timezone parsing', () => {
  assert.equal(classifyEpisodeTiming('2026-10-09T00:00:00Z', '2026-10-08').timing, 'tomorrow');
});

test('resolver prefers tomorrow over an older recent episode', () => {
  const resolved = resolveEpisodeForSurface(
    ep('2026-10-04', 4),
    ep('2026-10-09', 5),
    '2026-10-08',
  );
  assert.ok(resolved);
  assert.equal(resolved.episode.episodeNumber, 5);
  assert.equal(resolved.timing, 'tomorrow');
  assert.equal(formatEpisodeTimingLabel(resolved), 'TOMORROW');
});

test('resolver keeps a genuinely recent release when no imminent episode exists', () => {
  const resolved = resolveEpisodeForSurface(
    ep('2026-10-07', 4),
    ep('2026-10-20', 5),
    '2026-10-08',
  );
  assert.ok(resolved);
  assert.equal(resolved.episode.episodeNumber, 4);
  assert.equal(resolved.timing, 'recent');
  assert.equal(formatEpisodeTimingLabel(resolved), 'NOW STREAMING');
});

test('resolver ignores stale and far-future episodes', () => {
  assert.equal(
    resolveEpisodeForSurface(ep('2026-09-01', 1), ep('2026-11-01', 2), '2026-10-08'),
    null,
  );
});
