import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatFootballLeagueLabel } from '../footballLeagueLabel';

describe('formatFootballLeagueLabel', () => {
  it('labels UCL qualifying as Champions League Qualifying, not plain Champions League', () => {
    const label = formatFootballLeagueLabel(
      'UEFA Champions League',
      'World',
      2,
      '1st Qualifying Round',
    );
    assert.equal(label, 'Champions League Qualifying');
  });

  it('labels Conference League qualifying correctly', () => {
    const label = formatFootballLeagueLabel(
      'UEFA Europa Conference League',
      'World',
      848,
      '1st Qualifying Round',
    );
    assert.equal(label, 'Conference League Qualifying');
  });

  it('labels Europa League qualifying correctly', () => {
    const label = formatFootballLeagueLabel(
      'UEFA Europa League',
      'World',
      3,
      '2nd Qualifying Round',
    );
    assert.equal(label, 'Europa League Qualifying');
  });

  it('keeps main-stage UCL short label', () => {
    const label = formatFootballLeagueLabel(
      'UEFA Champions League',
      'World',
      2,
      'Group Stage - 1',
    );
    assert.equal(label, 'Champions League');
  });

  it('trusts API name for Conference League even when id is unexpected', () => {
    const label = formatFootballLeagueLabel(
      'UEFA Europa Conference League',
      'World',
      2,
      '1st Qualifying Round',
    );
    assert.equal(label, 'Conference League Qualifying');
  });

  it('prefixes ambiguous domestic league names with country', () => {
    const label = formatFootballLeagueLabel('Premier League', 'Armenia', 342);
    assert.equal(label, 'Armenia · Premier League');
  });
});
