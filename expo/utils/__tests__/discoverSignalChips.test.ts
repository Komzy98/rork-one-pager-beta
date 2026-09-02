import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { UserProfile } from '@/types/habit';
import type {
  DiscoverEngineResult,
  DiscoverLifeContext,
  DiscoverOpportunity,
} from '@/utils/discoverLifeEngine';
import { buildDiscoverSignalChips } from '@/utils/discoverSignalChips';

function opportunity(overrides: Partial<DiscoverOpportunity>): DiscoverOpportunity {
  return {
    id: 'event-1',
    key: 'event:event-1',
    kind: 'event',
    title: 'Arsenal v Chelsea: Premier League screening',
    subtitle: '5 days · 15:30 · Boxpark',
    eyebrow: 'WORTH GOING OUT FOR',
    reasons: ['Sunday morning is open · 9:00 am – 10:00 pm', 'Because you follow Arsenal'],
    score: 100,
    route: '/(tabs)/events',
    actionLabel: 'Add to my life',
    accent: '#315ED8',
    startsAt: new Date('2026-09-06T15:30:00'),
    durationMinutes: 120,
    event: {
      id: 'event-1',
      title: 'Arsenal v Chelsea: Premier League screening',
      venue: 'Boxpark',
      location: 'Liverpool',
      date: 'Sun 6 Sep',
      time: '15:30',
      startIso: '2026-09-06T15:30:00',
      category: 'sports',
      price: 'Free',
      image: '',
      isSaved: false,
      attendees: 0,
      rating: 4.5,
      tags: ['football'],
      description: '',
      latitude: 0,
      longitude: 0,
    },
    ...overrides,
  };
}

function context(): DiscoverLifeContext {
  return {
    now: new Date('2026-09-02T11:25:00'),
    areaLabel: 'Manchester',
    openWindows: [{
      id: 'sun',
      start: new Date('2026-09-06T09:00:00'),
      end: new Date('2026-09-06T22:00:00'),
      durationMinutes: 780,
      label: 'Sunday morning',
      rangeLabel: '9:00 am – 10:00 pm',
      part: 'morning',
      isToday: false,
      isWeekend: true,
    }],
    primaryWindow: null,
    taskPressure: { score: 0, label: 'light', urgent: 0, high: 0, overdue: 0, dueToday: 0, estimatedMinutes: 0 },
    energy: { mode: 'normal', label: 'Normal capacity', peakNow: false, windDown: false },
    weather: { available: false, outdoorFriendly: true },
    interests: ['Football'],
    identityGoals: [],
    joyTerms: [],
    // This reproduces the old misleading behaviour: United happened to be the first saved team.
    signalChips: ['Music', 'Comedy', 'Manchester United', 'Football'],
    recoveryActive: false,
    busyModeActive: false,
  };
}

function engine(hero: DiscoverOpportunity, alternatives: DiscoverOpportunity[] = []): DiscoverEngineResult {
  return {
    ranked: [hero, ...alternatives],
    hero,
    alternatives,
    later: [],
    serendipity: null,
    eventPicks: [hero, ...alternatives].filter((item) => item.kind === 'event'),
  };
}

describe('Discover recommendation-aware signal chips', () => {
  it('shows Arsenal when Arsenal drives the hero instead of blindly showing the first saved team', () => {
    const profile = {
      favoriteTeams: [
        { id: 'man-utd', name: 'Manchester United' },
        { id: 'arsenal', name: 'Arsenal' },
      ],
    } as unknown as UserProfile;

    const chips = buildDiscoverSignalChips({
      profile,
      context: context(),
      engine: engine(opportunity({})),
      sportSignals: [],
    });

    assert.equal(chips[0], 'Arsenal');
    assert.ok(chips.includes('Football'));
    assert.ok(chips.some((chip) => /Sunday morning free/i.test(chip)));
    assert.equal(chips.includes('Manchester United'), false);
  });

  it('can show several favourite teams when several visible recommendations genuinely use them', () => {
    const profile = {
      favoriteTeams: [
        { id: 'man-utd', name: 'Manchester United' },
        { id: 'arsenal', name: 'Arsenal' },
      ],
    } as unknown as UserProfile;

    const united = opportunity({
      id: 'event-2',
      key: 'event:event-2',
      title: 'Manchester United supporters screening',
      reasons: ['Because you follow Manchester United'],
    });

    const chips = buildDiscoverSignalChips({
      profile,
      context: context(),
      engine: engine(opportunity({}), [united]),
      sportSignals: [],
    });

    assert.ok(chips.includes('Arsenal'));
    assert.ok(chips.includes('Manchester United'));
  });
});
