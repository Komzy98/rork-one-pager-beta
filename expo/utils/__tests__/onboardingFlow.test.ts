import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOnboardingPath, getNextOnboardingRoute } from '../onboardingFlow.ts';

describe('onboardingFlow events branch', () => {
  it('inserts event-categories after interests when events is selected', () => {
    const path = buildOnboardingPath(['events']);
    assert.deepEqual(path, ['interests', 'event-categories', 'chronotype', 'calendar', 'joy-sources', 'complete']);
  });

  it('skips event-categories when events is not selected', () => {
    const path = buildOnboardingPath(['football']);
    assert.ok(!path.includes('event-categories'));
  });

  it('routes interests to event-categories when events is selected', () => {
    assert.equal(
      getNextOnboardingRoute('interests', ['events', 'movies']),
      '/(onboarding)/event-categories',
    );
  });

  it('routes event-categories to streaming when movies is also selected', () => {
    assert.equal(
      getNextOnboardingRoute('event-categories', ['events', 'movies']),
      '/(onboarding)/streaming',
    );
  });
});

/**
 * Locks in the guarantee that ONLY interest-relevant steps appear in the flow.
 * Every screen except `interests` / `joy-sources` / `complete` must be gated
 * behind a specific interest.
 */
describe('onboardingFlow only shows relevant steps', () => {
  const CONDITIONAL_SCREENS = [
    'event-categories',
    'football-favorites',
    'nba-teams',
    'streaming',
    'chronotype',
    'calendar',
    'feed-tuning',
  ] as const;

  it('no interests → just interests + joy-sources + complete', () => {
    assert.deepEqual(buildOnboardingPath([]), ['interests', 'joy-sources', 'complete']);
  });

  it('UFC-only takes the short path (no sports/movies/habit steps)', () => {
    const path = buildOnboardingPath(['ufc']);
    assert.deepEqual(path, ['interests', 'joy-sources', 'complete']);
    for (const screen of CONDITIONAL_SCREENS) assert.ok(!path.includes(screen), screen);
  });

  it('F1-only takes the short path', () => {
    assert.deepEqual(buildOnboardingPath(['f1']), ['interests', 'joy-sources', 'complete']);
  });

  it('football-only → favorites + feed-tuning, nothing else', () => {
    const path = buildOnboardingPath(['football']);
    assert.deepEqual(path, [
      'interests',
      'football-favorites',
      'feed-tuning',
      'joy-sources',
      'complete',
    ]);
    assert.ok(!path.includes('nba-teams'));
    assert.ok(!path.includes('streaming'));
    assert.ok(!path.includes('event-categories'));
    assert.ok(!path.includes('chronotype'));
  });

  it('football + nba → nba-teams nested before feed-tuning', () => {
    assert.deepEqual(buildOnboardingPath(['football', 'nba']), [
      'interests',
      'football-favorites',
      'nba-teams',
      'feed-tuning',
      'joy-sources',
      'complete',
    ]);
  });

  it('nba-only → nba-teams, no football feed-tuning', () => {
    const path = buildOnboardingPath(['nba']);
    assert.deepEqual(path, ['interests', 'nba-teams', 'joy-sources', 'complete']);
    assert.ok(!path.includes('feed-tuning'));
    assert.ok(!path.includes('football-favorites'));
  });

  it('movies-only → streaming, no sports/habit steps', () => {
    const path = buildOnboardingPath(['movies']);
    assert.deepEqual(path, ['interests', 'streaming', 'joy-sources', 'complete']);
    assert.ok(!path.includes('chronotype'));
  });

  it('fitness-only → chronotype + calendar, no sports/movies steps', () => {
    const path = buildOnboardingPath(['fitness']);
    assert.deepEqual(path, ['interests', 'chronotype', 'calendar', 'joy-sources', 'complete']);
    assert.ok(!path.includes('football-favorites'));
    assert.ok(!path.includes('streaming'));
  });

  it('full combo keeps a stable, deduped, relevant order', () => {
    assert.deepEqual(buildOnboardingPath(['football', 'nba', 'movies', 'fitness', 'events']), [
      'interests',
      'event-categories',
      'football-favorites',
      'nba-teams',
      'feed-tuning',
      'streaming',
      'chronotype',
      'calendar',
      'joy-sources',
      'complete',
    ]);
  });

  it('every conditional screen is gated behind its interest', () => {
    // With no triggering interests present, none of the conditional screens appear.
    const path = buildOnboardingPath(['ufc', 'f1']);
    for (const screen of CONDITIONAL_SCREENS) {
      assert.ok(!path.includes(screen), `${screen} should not show without its interest`);
    }
  });

  it('getNextOnboardingRoute skips irrelevant steps end-to-end (football-only)', () => {
    // interests → football-favorites → feed-tuning → joy-sources → complete
    assert.equal(getNextOnboardingRoute('interests', ['football']), '/(onboarding)/football-favorites');
    assert.equal(getNextOnboardingRoute('football-favorites', ['football']), '/(onboarding)/feed-tuning');
    assert.equal(getNextOnboardingRoute('feed-tuning', ['football']), '/(onboarding)/joy-sources');
    assert.equal(getNextOnboardingRoute('joy-sources', ['football']), '/(onboarding)/complete');
  });
});
