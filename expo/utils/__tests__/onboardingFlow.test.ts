import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOnboardingPath, getNextOnboardingRoute, getNextOnboardingScreen,
  getOnboardingProgressMeta, getQuickSetupFocus, resolveLegacyOnboardingRoute,
} from '../onboardingFlow.ts';

describe('Onboarding V2: fast path to the existing app', () => {
  it('uses one quick preference screen when a supported interest was picked', () => {
    for (const interest of ['football', 'nba', 'events', 'movies', 'productivity', 'fitness', 'learning']) {
      assert.deepEqual(buildOnboardingPath([interest]), ['interests', 'quick-setup', 'complete']);
    }
  });
  it('does not ask irrelevant questions for F1, UFC, cooking or no interests', () => {
    assert.deepEqual(buildOnboardingPath(['ufc', 'f1']), ['interests', 'complete']);
    assert.deepEqual(buildOnboardingPath(['cooking']), ['interests', 'complete']);
    assert.deepEqual(buildOnboardingPath([]), ['interests', 'complete']);
  });
  it('even a full set of interests takes at most one extra screen', () => {
    const interests = ['football', 'nba', 'movies', 'fitness', 'events', 'cooking'];
    assert.deepEqual(buildOnboardingPath(interests), ['interests', 'quick-setup', 'complete']);
    assert.equal(getNextOnboardingRoute('interests', interests), '/(onboarding)/quick-setup');
    assert.equal(getNextOnboardingRoute('quick-setup', interests), '/(onboarding)/complete');
  });
  it('honours selection order when deciding which interest to personalise first', () => {
    assert.equal(getQuickSetupFocus(['events', 'football', 'movies']), 'events');
    assert.equal(getQuickSetupFocus(['football', 'events']), 'football');
    assert.equal(getQuickSetupFocus(['fitness', 'nba']), 'task');
    assert.equal(getQuickSetupFocus(['ufc', 'movies']), 'movies');
    assert.equal(getQuickSetupFocus(['ufc', 'cooking']), null);
  });
  it('does not require streaming auth, location permission, chronotype or calendar', () => {
    const path = buildOnboardingPath(['events', 'movies', 'fitness', 'football']);
    for (const legacy of ['streaming', 'chronotype', 'calendar', 'feed-tuning', 'joy-sources', 'football-favorites']) {
      assert.ok(!path.includes(legacy as any), legacy);
    }
  });
  it('keeps deterministic progress for the quick path', () => {
    assert.deepEqual(getOnboardingProgressMeta('interests', ['events']), { currentStep: 1, totalSteps: 2 });
    assert.deepEqual(getOnboardingProgressMeta('quick-setup', ['events']), { currentStep: 2, totalSteps: 2 });
    assert.deepEqual(getOnboardingProgressMeta('interests', ['ufc']), { currentStep: 1, totalSteps: 1 });
  });
  it('supports older deep links to original advanced setup screens', () => {
    assert.equal(resolveLegacyOnboardingRoute('leagues'), '/(onboarding)/football-favorites');
    assert.equal(resolveLegacyOnboardingRoute('teams'), '/(onboarding)/football-favorites');
    assert.equal(getNextOnboardingScreen('feed-tuning', ['football']), 'complete');
  });
});
