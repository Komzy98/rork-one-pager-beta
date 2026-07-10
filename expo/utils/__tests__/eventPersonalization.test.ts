import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankEventsForYou,
  scoreEventForUser,
  buildEventPersonalizationContext,
  buildHabitBasedEventRow,
  buildEditorialEventRows,
  buildHabitEventSignals,
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

  it('boosts onboarding event category picks', () => {
    const profile = {
      interests: ['events'],
      favoriteEventCategories: ['networking', 'comedy'],
      favoriteTeams: [],
    } as unknown as UserProfile;
    const ctx = buildEventPersonalizationContext(profile);
    const networking = scoreEventForUser(baseEvent({ category: 'networking', title: 'Startup meetup' }), ctx);
    const music = scoreEventForUser(baseEvent({ category: 'music', title: 'Rock gig' }), ctx);
    assert.ok(networking > music);
    assert.ok((ctx.categoryWeights.get('networking') ?? 0) > (ctx.categoryWeights.get('music') ?? 0));
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
      habitCategoryWeights: { sports: 3 },
      habitLabels: ['Morning yoga'],
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

  it('builds a habit-based editorial row from tracked habits', () => {
    const profile = { interests: [], favoriteTeams: [] } as unknown as UserProfile;
    const input = {
      profile,
      habitKeywords: ['yoga', 'wellness'],
      habitCategoryWeights: { sports: 5 },
      habitLabels: ['Morning yoga'],
    };
    const row = buildHabitBasedEventRow(
      [
        baseEvent({ id: 'a', category: 'music', title: 'Rock gig' }),
        baseEvent({ id: 'b', category: 'sports', title: 'Sunrise yoga in the park' }),
      ],
      input,
    );
    assert.ok(row);
    assert.match(row!.title, /Morning yoga|Based on your habits/);
    assert.equal(row!.events[0]?.id, 'b');
  });

  it('routes profile-interest sports to editorial row, not habit row', () => {
    const profile = {
      interests: ['nba'],
      favoriteNBATeams: [{ id: 'gsw', name: 'Golden State Warriors', abbreviation: 'GSW', conference: 'Western' }],
      favoriteTeams: [],
    } as unknown as UserProfile;
    const input = {
      profile,
      habitKeywords: ['gym', 'workout'],
      habitCategoryWeights: { sports: 5 },
      habitLabels: ['Gym session'],
    };
    const events = [
      baseEvent({ id: 'wnba', category: 'sports', title: 'Golden State Valkyries vs Washington Mystics', venue: 'Chase Center' }),
      baseEvent({ id: 'yoga', category: 'sports', title: 'Sunrise yoga in the park' }),
    ];

    const habitRow = buildHabitBasedEventRow(events, input);
    if (habitRow) {
      assert.equal(habitRow.events.some((event) => event.id === 'wnba'), false);
    }

    const editorialRows = buildEditorialEventRows(events, input, 2);
    const sportsRow = editorialRows.find((row) => row.categoryId === 'sports');
    assert.ok(sportsRow);
    assert.equal(sportsRow!.events[0]?.id, 'wnba');
  });

  it('dedupes editorial rows against habit rail events', () => {
    const profile = { interests: [], favoriteTeams: [] } as unknown as UserProfile;
    const input = {
      profile,
      habitKeywords: ['yoga'],
      habitCategoryWeights: { sports: 5 },
      habitLabels: ['Morning yoga'],
    };
    const events = [
      baseEvent({ id: 'shared', category: 'sports', title: 'Sunrise yoga in the park' }),
      baseEvent({ id: 'other', category: 'sports', title: 'Local run club 5k' }),
    ];
    const habitRow = buildHabitBasedEventRow(events, input);
    assert.ok(habitRow);
    const exclude = new Set(habitRow!.events.map((event) => event.id));
    const editorialRows = buildEditorialEventRows(events, input, 2, exclude);
    const sportsRow = editorialRows.find((row) => row.categoryId === 'sports');
    if (sportsRow) {
      assert.equal(sportsRow.events.some((event) => event.id === 'shared'), false);
    }
  });

  it('infers habit signals from task habits', () => {
    const signals = buildHabitEventSignals([
      {
        id: 'h1',
        title: 'Morning yoga',
        description: 'Stretch and breathe',
        isHabit: true,
        category: 'health',
        tags: ['wellness'],
        priority: 'medium',
        status: 'todo',
        subTasks: [],
        reminders: [],
        attachments: [],
        createdAt: '',
        updatedAt: '',
        completionLogs: [],
        progress: 0,
        isRecurring: true,
      },
    ]);
    assert.ok(signals.keywords.includes('yoga'));
    assert.ok((signals.categoryWeights.sports ?? 0) > 0);
    assert.equal(signals.habitLabels[0], 'Morning yoga');
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
