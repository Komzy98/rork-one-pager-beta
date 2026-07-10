import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalEvent } from '@/types/events';
import type { UserProfile } from '@/types/habit';
import {
  includesSportToken,
  detectEventSportDiscipline,
  eventMatchesNbaFollow,
} from '@/utils/eventSportMatching';
import {
  getPrimaryEventRecommendationReason,
  rankEventsForYou,
} from '@/utils/eventPersonalization';

function base(title: string, extra: Partial<LocalEvent> = {}): LocalEvent {
  return {
    id: '1',
    title,
    venue: 'Oracle Park',
    location: 'San Francisco',
    date: 'Thu 10 Jul',
    time: '19:00',
    category: 'sports',
    price: '$20',
    image: '',
    isSaved: false,
    attendees: 0,
    rating: 4.5,
    tags: ['baseball', 'mlb'],
    description: 'MLB game',
    latitude: 37.7,
    longitude: -122.4,
    ...extra,
  };
}

const nbaProfile = {
  interests: ['nba'],
  favoriteNBATeams: [
    { id: 'cle', name: 'Cleveland Cavaliers', abbreviation: 'CLE', conference: 'Eastern' },
  ],
  favoriteTeams: [],
} as unknown as UserProfile;

describe('eventSportMatching', () => {
  it('does not treat CLE as matching oracle park', () => {
    const text = 'giants vs colorado rockies oracle park san francisco sports baseball mlb mlb game';
    assert.equal(includesSportToken(text, 'cle'), false);
    assert.equal(includesSportToken(text, 'CLE'), false);
  });

  it('detects baseball discipline for Giants games', () => {
    assert.equal(
      detectEventSportDiscipline({
        title: 'Giants vs Colorado Rockies',
        venue: 'Oracle Park',
        location: 'San Francisco',
        category: 'sports',
        tags: ['mlb', 'baseball'],
      }),
      'baseball',
    );
  });

  it('does not match Cavaliers on Giants baseball game', () => {
    assert.equal(
      eventMatchesNbaFollow(
        {
          title: 'Giants vs Colorado Rockies',
          venue: 'Oracle Park',
          location: 'San Francisco',
          category: 'sports',
          tags: ['mlb', 'baseball'],
        },
        { name: 'Cleveland Cavaliers', abbreviation: 'CLE' },
      ),
      false,
    );
  });
});

describe('event sport recommendations', () => {
  it('does not claim Cavaliers follow on Giants baseball game', () => {
    const reason = getPrimaryEventRecommendationReason(base('Giants vs Colorado Rockies'), {
      profile: nbaProfile,
    });
    if (reason) assert.notEqual(reason.kind, 'nba');
    if (reason) assert.notEqual(reason.kind, 'team');
  });

  it('prefers basketball events over baseball for NBA-only fans', () => {
    const ranked = rankEventsForYou(
      [
        base('Giants vs Colorado Rockies'),
        base('Cleveland Cavaliers vs Boston Celtics', { tags: ['nba', 'basketball'] }),
      ],
      { profile: nbaProfile },
    );
    assert.equal(ranked[0]?.title, 'Cleveland Cavaliers vs Boston Celtics');
  });
});
