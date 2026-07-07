import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countOptionalLeagueIds,
  canAddOptionalLeagueId,
  normalizeFavoriteLeagueIds,
  PROFILE_OPTIONAL_LEAGUE_LIMIT,
} from '../footballLeagueFamily.ts';
import { WORLD_CUP_FAMILY_LEAGUE_IDS } from '../footballQueryContext.ts';

describe('World Cup family league cap', () => {
  it('does not count WC family toward optional limit', () => {
    const allWc = [...WORLD_CUP_FAMILY_LEAGUE_IDS];
    assert.equal(countOptionalLeagueIds(allWc), 0);
  });

  it('allows adding optional league when at cap only if not WC', () => {
    const optional = Array.from({ length: PROFILE_OPTIONAL_LEAGUE_LIMIT }, (_, i) => 100 + i);
    const withWc = [...WORLD_CUP_FAMILY_LEAGUE_IDS, ...optional];
    assert.equal(canAddOptionalLeagueId(withWc, 39), false);
    assert.equal(canAddOptionalLeagueId(withWc, 1), true);
  });

  it('normalize keeps WC family and caps optional at 8', () => {
    const manyOptional = Array.from({ length: 12 }, (_, i) => 200 + i);
    const normalized = normalizeFavoriteLeagueIds([...WORLD_CUP_FAMILY_LEAGUE_IDS, ...manyOptional]);
    assert.ok(WORLD_CUP_FAMILY_LEAGUE_IDS.every((id) => normalized.includes(id)));
    assert.equal(countOptionalLeagueIds(normalized), PROFILE_OPTIONAL_LEAGUE_LIMIT);
  });
});
