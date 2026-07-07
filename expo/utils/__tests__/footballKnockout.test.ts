import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildKnockoutInsightContextLine,
  buildKnockoutRoundGroups,
  detectKnockoutPhase,
  isKnockoutFixture,
  isKnockoutRoundRaw,
} from '../footballKnockout.ts';

describe('isKnockoutRoundRaw', () => {
  it('detects round of 16', () => {
    assert.equal(isKnockoutRoundRaw('Round of 16'), true);
  });

  it('rejects group stage', () => {
    assert.equal(isKnockoutRoundRaw('Group Stage - 3'), false);
    assert.equal(isKnockoutRoundRaw('Group A'), false);
  });
});

describe('detectKnockoutPhase', () => {
  it('returns true when any fixture is knockout', () => {
    assert.equal(
      detectKnockoutPhase([
        { round: 'Group Stage - 3' },
        { round: 'Round of 16' },
      ]),
      true,
    );
  });

  it('returns false for group-only fixtures', () => {
    assert.equal(detectKnockoutPhase([{ round: 'Group B' }]), false);
  });
});

describe('buildKnockoutRoundGroups', () => {
  it('orders rounds from R32 to final', () => {
    const groups = buildKnockoutRoundGroups([
      {
        id: '1',
        homeTeam: 'A',
        awayTeam: 'B',
        status: 'Upcoming',
        round: 'Final',
        date: '2026-07-19T19:00:00Z',
      },
      {
        id: '2',
        homeTeam: 'C',
        awayTeam: 'D',
        status: 'Completed',
        round: 'Round of 16',
        date: '2026-07-05T19:00:00Z',
        homeScore: 2,
        awayScore: 1,
      },
    ]);
    assert.equal(groups[0]?.roundLabel, 'Round of 16');
    assert.equal(groups[1]?.roundLabel, 'Final');
  });
});

describe('buildKnockoutInsightContextLine', () => {
  it('uses round label and skips group framing', () => {
    const line = buildKnockoutInsightContextLine({
      homeTeam: 'Argentina',
      awayTeam: 'France',
      round: 'Round of 16',
    });
    assert.match(line ?? '', /Round of 16/);
    assert.match(line ?? '', /knockout/i);
  });

  it('includes form when available', () => {
    const line = buildKnockoutInsightContextLine({
      homeTeam: 'Brazil',
      awayTeam: 'Japan',
      homeTeamId: 10,
      round: 'Quarter-final',
      homeForm: [
        {
          teams: { home: { id: 10 }, away: { id: 99 } },
          goals: { home: 2, away: 0 },
        },
      ],
    });
    assert.match(line ?? '', /Quarter-final/);
    assert.match(line ?? '', /1W in last 5/);
  });
});

describe('isKnockoutFixture', () => {
  it('delegates to round string', () => {
    assert.equal(isKnockoutFixture({ round: 'Round of 32' }), true);
    assert.equal(isKnockoutFixture({ round: 'Group H' }), false);
  });
});
