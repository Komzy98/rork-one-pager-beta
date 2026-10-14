import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AMBIGUOUS_NATIONAL_TEAM_API_IDS,
  collectNationalTeamApiIds,
  collectNationalTeamNames,
  resolveNationalTeamApiId,
} from '../nationalTeamApiIds.ts';

describe('nationalTeamApiIds', () => {
  it('does not trust a catalogue ID shared by Nigeria and Netherlands', () => {
    assert.equal(AMBIGUOUS_NATIONAL_TEAM_API_IDS.has(1118), true);
    assert.equal(
      resolveNationalTeamApiId({ id: 'nigeria', name: 'Nigeria', apiId: 1118 }),
      undefined,
    );
  });

  it('keeps unambiguous known IDs such as England', () => {
    assert.equal(
      resolveNationalTeamApiId({ id: 'england', name: 'England', apiId: 10 }),
      10,
    );
  });

  it('drops ambiguous IDs from direct queries but preserves country names for backend resolution', () => {
    const nationalities = [
      { id: 'nigeria', name: 'Nigeria', apiId: 1118 },
      { id: 'england', name: 'England', apiId: 10 },
    ];

    assert.deepEqual(collectNationalTeamApiIds(nationalities), [10]);
    assert.deepEqual(collectNationalTeamNames(nationalities), ['Nigeria', 'England']);
  });
});
