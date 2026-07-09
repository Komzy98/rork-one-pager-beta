import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankEventsForYou,
  scoreEventForUser,
  buildEventPersonalizationContext,
  explainEventPersonalization,
  getPrimaryEventRecommendationReason,
  getPrimaryEventRecommendationReasonForCategory,
  getCompactRecommendationLabel,
  getEditorialRowChipLabel,
  getEditorialRowSecondaryChipLabel,
  isEditorialReasonRelevant,
} from '@/utils/eventPersonalization';
import type { LocalEvent } from '@/types/events';
import type { UserProfile } from '@/types/habit';

const baseEvent = (overrides: Partial<LocalEvent> = {}): LocalEvent => ({
  id: '1',
  title: 'Test Event',
  venue: 'Venue',
  location: 'London',
  date: 'Sat, 12 Apr',
  time: '20:00',
  category: 'music',
  price: '£20',
  image: '',
  isSaved: false,
  attendees: 0,
  rating: 4.5,
  tags: [],
  description: '',
  latitude: 51.5,
  longitude: -0.1,
  ...overrides,
});

describe('eventPersonalization', () => {
  it('boosts sports events for football fans', () => {
    const profile = {
      interests: ['football'],
      favoriteTeams: [{ id: '1', name: 'Arsenal', sport: 'football' }],
    } as unknown as UserProfile;
    const ctx = buildEventPersonalizationContext(profile);
    const sports = scoreEventForUser(baseEvent({ category: 'sports', title: 'Arsenal vs Chelsea' }), ctx);
    const comedy = scoreEventForUser(baseEvent({ category: 'comedy', title: 'Stand up' }), ctx);
    assert.ok(sports > comedy);
  });

  it('ranks interest-aligned events first', () => {
    const profile = {
      interests: ['comedy'],
      favoriteTeams: [],
    } as unknown as UserProfile;
    const ranked = rankEventsForYou(
      [
        baseEvent({ id: 'a', category: 'music', title: 'Rock gig' }),
        baseEvent({ id: 'b', category: 'comedy', title: 'Comedy night', tags: ['comedy'] }),
      ],
      profile
    );
    assert.equal(ranked[0]?.id, 'b');
  });

  it('handles events missing tags or price without throwing', () => {
    const ranked = rankEventsForYou(
      [baseEvent({ tags: undefined as unknown as string[], price: undefined as unknown as string })],
      null,
    );
    assert.equal(ranked.length, 1);
  });

  it('explains why an event matches profile interests', () => {
    const profile = {
      interests: ['comedy'],
      favoriteTeams: [],
    } as unknown as UserProfile;
    const reason = explainEventPersonalization(
      baseEvent({ category: 'comedy', title: 'Comedy night', tags: ['comedy'] }),
      profile
    );
    assert.ok(reason);
    assert.match(reason!, /comedy/i);
  });

  it('returns structured team follow reason when event mentions the team', () => {
    const profile = {
      interests: ['football'],
      favoriteTeams: [{ id: '1', name: 'Manchester United', sport: 'football' }],
    } as unknown as UserProfile;
    const reason = getPrimaryEventRecommendationReason(
      baseEvent({ category: 'sports', title: 'Manchester United vs Liverpool' }),
      { profile },
    );
    assert.ok(reason);
    assert.match(reason!.label, /Manchester United/i);
    assert.equal(reason!.kind, 'team');
  });

  it('returns saved category reason when user saved similar events', () => {
    const profile = { interests: [], favoriteTeams: [] } as unknown as UserProfile;
    const reason = getPrimaryEventRecommendationReason(
      baseEvent({ category: 'comedy', title: 'Comedy Allstars' }),
      {
        profile,
        savedSnapshots: [
          {
            id: 'saved-1',
            title: 'Past show',
            category: 'comedy',
            startAt: '2026-01-01T19:00:00',
            venueName: 'Club',
            latitude: 51.5,
            longitude: -0.1,
            source: 'ticketmaster',
            savedAt: '2025-12-01T12:00:00',
          },
        ],
      },
    );
    assert.ok(reason);
    assert.match(reason!.label, /saved comedy events before/i);
  });

  it('boosts NBA events for basketball fans', () => {
    const profile = {
      interests: ['nba'],
      favoriteNBATeams: [{ id: '1', name: 'Los Angeles Lakers', abbreviation: 'LAL', conference: 'Western' }],
      favoriteTeams: [],
    } as unknown as UserProfile;
    const ctx = buildEventPersonalizationContext(profile);
    const nba = scoreEventForUser(
      baseEvent({ category: 'sports', title: 'Lakers vs Celtics watch party' }),
      ctx,
    );
    const comedy = scoreEventForUser(baseEvent({ category: 'comedy', title: 'Stand up' }), ctx);
    assert.ok(nba > comedy);
  });

  it('returns NBA team follow reason', () => {
    const profile = {
      interests: ['nba'],
      favoriteNBATeams: [{ id: '1', name: 'Boston Celtics', abbreviation: 'BOS', conference: 'Eastern' }],
      favoriteTeams: [],
    } as unknown as UserProfile;
    const reason = getPrimaryEventRecommendationReason(
      baseEvent({ category: 'sports', title: 'Boston Celtics fan meetup' }),
      { profile },
    );
    assert.ok(reason);
    assert.match(reason!.label, /Boston Celtics/i);
    assert.equal(reason!.kind, 'nba');
  });

  it('uses effective joy sources in ranking', () => {
    const profile = { interests: [], favoriteTeams: [] } as unknown as UserProfile;
    const input = {
      profile,
      effectiveJoySources: { music: ['Burna Boy'] },
    };
    const ranked = rankEventsForYou(
      [
        baseEvent({ id: 'a', category: 'music', title: 'Rock gig' }),
        baseEvent({ id: 'b', category: 'music', title: 'Burna Boy live', tags: ['afrobeats'] }),
      ],
      input,
    );
    assert.equal(ranked[0]?.id, 'b');
  });

  it('boosts events that match habit keywords', () => {
    const profile = { interests: [], favoriteTeams: [] } as unknown as UserProfile;
    const input = {
      profile,
      habitKeywords: ['yoga'],
    };
    const ranked = rankEventsForYou(
      [
        baseEvent({ id: 'a', category: 'fitness', title: 'HIIT bootcamp' }),
        baseEvent({ id: 'b', category: 'fitness', title: 'Sunrise yoga in the park' }),
      ],
      input,
    );
    assert.equal(ranked[0]?.id, 'b');
  });

  it('prefers gentle events during recovery mode', () => {
    const profile = {
      interests: [],
      favoriteTeams: [],
      recoveryMode: { active: true },
    } as unknown as UserProfile;
    const ctx = buildEventPersonalizationContext(profile, { recoveryModeActive: true });
    const gentle = scoreEventForUser(baseEvent({ category: 'arts', title: 'Gallery walk', price: 'Free' }), ctx);
    const nightlife = scoreEventForUser(baseEvent({ category: 'nightlife', title: 'Club night' }), ctx);
    assert.ok(gentle > nightlife);
  });

  it('does not show sport chip on non-sports events', () => {
    const profile = {
      interests: ['football'],
      favoriteTeams: [{ id: '1', name: 'United', sport: 'football' }],
    } as unknown as UserProfile;
    const reason = getPrimaryEventRecommendationReason(
      baseEvent({ category: 'music', title: 'United Live in Concert' }),
      { profile },
    );
    assert.ok(reason);
    assert.equal(getCompactRecommendationLabel(reason, baseEvent({ category: 'music' })), 'Picked for you');
  });

  it('shows specific team chip labels on sports events', () => {
    const profile = {
      interests: ['football'],
      favoriteTeams: [{ id: '1', name: 'Arsenal', sport: 'football' }],
    } as unknown as UserProfile;
    const reason = getPrimaryEventRecommendationReason(
      baseEvent({ category: 'sports', title: 'Arsenal vs Chelsea' }),
      { profile },
    );
    assert.ok(reason);
    assert.equal(
      getCompactRecommendationLabel(reason, baseEvent({ category: 'sports', title: 'Arsenal vs Chelsea' })),
      'Because you follow Arsenal',
    );
  });

  it('filters sport reasons out of editorial music row chips', () => {
    const profile = {
      interests: ['football', 'music'],
      favoriteTeams: [{ id: '1', name: 'United', sport: 'football' }],
    } as unknown as UserProfile;
    const event = baseEvent({ category: 'music', title: 'United Live in Concert' });
    const input = { profile };
    const globalReason = getPrimaryEventRecommendationReason(event, input);
    assert.ok(globalReason);
    assert.equal(globalReason!.kind, 'team');
    assert.equal(isEditorialReasonRelevant(globalReason!, event, 'music'), false);

    const rowReason = getPrimaryEventRecommendationReasonForCategory(event, input, 'music');
    assert.ok(rowReason);
    assert.notEqual(rowReason!.kind, 'team');

    const chip = getEditorialRowChipLabel('music', event, rowReason);
    assert.notEqual(chip, 'Because you follow sport');
    assert.notEqual(rowReason!.kind, 'team');
  });

  it('uses category-aligned secondary chips in editorial rows', () => {
    const chip = getEditorialRowSecondaryChipLabel('theatre', baseEvent({ category: 'theatre' }));
    assert.equal(chip, 'Theatre');
  });
});
