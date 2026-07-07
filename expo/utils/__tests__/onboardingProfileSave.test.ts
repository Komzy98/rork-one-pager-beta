import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickOnboardingTeams,
  shouldApplyNationalities,
} from '../onboardingProfileSave.ts';

describe('pickOnboardingTeams', () => {
  const arsenal = { id: 'arsenal', name: 'Arsenal', league: 'Premier League', apiId: 42 };

  it('persists when dirty even if profile already had teams', () => {
    const result = pickOnboardingTeams({
      dirty: true,
      selected: [arsenal],
      existing: [{ id: 'other', name: 'Other FC', league: 'X', apiId: 1 }],
    });
    assert.deepEqual(result, [arsenal]);
  });

  it('seeds first selection without dirty when profile is empty', () => {
    const result = pickOnboardingTeams({
      dirty: false,
      selected: [arsenal],
      existing: [],
    });
    assert.deepEqual(result, [arsenal]);
  });

  it('does not overwrite existing teams when untouched', () => {
    const result = pickOnboardingTeams({
      dirty: false,
      selected: [arsenal],
      existing: [{ id: 'liverpool', name: 'Liverpool', league: 'PL', apiId: 40 }],
    });
    assert.equal(result, undefined);
  });
});

describe('shouldApplyNationalities', () => {
  it('applies when user edited national teams', () => {
    assert.equal(
      shouldApplyNationalities({ dirty: true, selectedCount: 1, existingCount: 0 }),
      true,
    );
  });

  it('auto-applies first-time selections only when profile has none', () => {
    assert.equal(
      shouldApplyNationalities({ dirty: false, selectedCount: 1, existingCount: 0 }),
      true,
    );
    assert.equal(
      shouldApplyNationalities({ dirty: false, selectedCount: 1, existingCount: 1 }),
      false,
    );
  });
});
