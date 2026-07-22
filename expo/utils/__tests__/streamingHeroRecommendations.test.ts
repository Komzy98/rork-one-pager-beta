import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStreamingHeroRecommendations,
  STREAMING_HERO_MIN_ITEMS,
} from '../streamingHeroRecommendations';
import type { ForYouPersonalizationContext } from '../showsForYouPersonalization';

function row(title: string, serviceId: string, extra: Record<string, unknown> = {}) {
  return {
    title,
    younifySourceService: { id: serviceId, name: serviceId },
    ...extra,
  };
}

const emptyCtx: ForYouPersonalizationContext = {
  savedTmdbIds: new Set(),
  continueWatchingTmdbIds: new Set(),
  younifyLinkedTmdbIds: new Set(),
  regionalTmdbIds: new Set(),
  preferredGenreIds: new Set(),
};

describe('streamingHeroRecommendations', () => {
  it('returns at least 10 picks balanced across linked providers when catalog allows', () => {
    const sections = [
      {
        id: 'recommended',
        items: [
          row('Show A', '8'),
          row('Show B', '8'),
          row('Show C', '8'),
          row('Show D', '8'),
          row('Show E', '8'),
        ],
      },
      {
        id: 'trending',
        items: [
          row('Show F', '337'),
          row('Show G', '337'),
          row('Show H', '337'),
          row('Show I', '337'),
          row('Show J', '337'),
        ],
      },
    ];

    const hero = buildStreamingHeroRecommendations(sections, [8, 337], emptyCtx, {
      minItems: STREAMING_HERO_MIN_ITEMS,
      maxItems: 12,
    });

    assert.ok(hero.length >= STREAMING_HERO_MIN_ITEMS);
    const netflix = hero.filter((r) => String((r.younifySourceService as any)?.id) === '8');
    const disney = hero.filter((r) => String((r.younifySourceService as any)?.id) === '337');
    assert.ok(netflix.length >= 1);
    assert.ok(disney.length >= 1);
  });

  it('prefers recommended section over trending when scores tie', () => {
    const sections = [
      { id: 'trending', items: [row('Trending Only', '8', { rating: 5 })] },
      { id: 'recommended', items: [row('Recommended Pick', '8', { rating: 5 })] },
    ];
    const hero = buildStreamingHeroRecommendations(sections, [8], emptyCtx, {
      minItems: 1,
      maxItems: 2,
    });
    assert.equal(String(hero[0]?.title), 'Recommended Pick');
  });

  it('skips continue watching section for hero recommendations', () => {
    const sections = [
      { id: 'continue', items: [row('In Progress', '8')] },
      { id: 'recommended', items: [row('Fresh Rec', '8')] },
    ];
    const hero = buildStreamingHeroRecommendations(sections, [8], emptyCtx, {
      minItems: 1,
      maxItems: 4,
    });
    assert.equal(hero.length, 1);
    assert.equal(String(hero[0]?.title), 'Fresh Rec');
  });
});
