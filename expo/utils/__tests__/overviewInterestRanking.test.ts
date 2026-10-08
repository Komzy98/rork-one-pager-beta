import assert from 'node:assert/strict';
import test from 'node:test';
import type { LiveFootballMatch } from '@/types/habit';
import type { PersonalSignal } from '../interestSignalEngine';
import { buildOverviewInterestSignals } from '../overviewInterestRanking';

const match: LiveFootballMatch = {
  id: 'm1',
  homeTeam: 'Manchester United',
  awayTeam: 'Tottenham',
  date: '2026-10-10T17:30:00+01:00',
  time: '17:30',
  status: 'Scheduled',
  league: 'Premier League',
};

function football(priority: number): PersonalSignal {
  return {
    id: 'football-upcoming:m1',
    kind: 'football_upcoming',
    priority,
    title: 'Manchester United play Tottenham',
    subtitle: 'Sat 10 Oct · 17:30 · Premier League',
    reason: 'Because you follow Manchester United',
    occurredAt: match.date,
    match,
  };
}

const showInput = {
  showId: 'dark-matter',
  showTitle: 'Dark Matter',
  tmdbId: 196322,
  platform: 'Apple TV+',
  showStatus: 'Watching',
  latestEpisode: {
    name: 'Episode 4',
    seasonNumber: 2,
    episodeNumber: 4,
    airDate: '2026-10-01',
  },
  nextEpisode: {
    name: 'Episode 5',
    seasonNumber: 2,
    episodeNumber: 5,
    airDate: '2026-10-09',
  },
};

test('tomorrow episode is surfaced truthfully, never as already out', () => {
  const result = buildOverviewInterestSignals({
    footballSignals: [],
    showEpisodes: [showInput],
    todayYmd: '2026-10-08',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.kind, 'episode');
  if (result[0]?.kind !== 'episode') return;
  assert.equal(result[0].timing, 'tomorrow');
  assert.equal(result[0].title, 'Dark Matter has a new episode tomorrow');
  assert.match(result[0].subtitle, /TOMORROW/);
});

test('higher urgency signal wins the single Overview slot', () => {
  const result = buildOverviewInterestSignals({
    footballSignals: [football(96)],
    showEpisodes: [showInput],
    todayYmd: '2026-10-08',
    limit: 1,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.kind, 'football');
});

test('actively watched shows get stronger affinity than passive watchlist items', () => {
  const watching = buildOverviewInterestSignals({
    footballSignals: [],
    showEpisodes: [showInput],
    todayYmd: '2026-10-08',
  })[0];

  const planned = buildOverviewInterestSignals({
    footballSignals: [],
    showEpisodes: [{ ...showInput, showStatus: 'Plan to Watch' }],
    todayYmd: '2026-10-08',
  })[0];

  assert.ok(watching && planned);
  assert.ok(watching.priority > planned.priority);
});
