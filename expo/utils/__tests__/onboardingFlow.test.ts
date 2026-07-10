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
