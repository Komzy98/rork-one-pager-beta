import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFootballKickoffLabel,
  formatFootballMatchBadgeTime,
  resolveFootballKickoffTime,
} from '@/utils/footballKickoffLabel';

function tomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('footballKickoffLabel', () => {
  it('includes kickoff time with Tomorrow', () => {
    const label = formatFootballKickoffLabel(tomorrowDateString(), '15:00');
    assert.match(label, /Tomorrow/);
    assert.match(label, /15:00/);
  });

  it('derives kickoff from ISO date when time field is missing', () => {
    const iso = `${tomorrowDateString()}T15:30:00.000Z`;
    const kickoff = resolveFootballKickoffTime(iso, '');
    assert.ok(kickoff.length > 0);
    const label = formatFootballMatchBadgeTime(iso, '');
    assert.match(label, /·/);
  });

  it('badge time for tomorrow includes clock', () => {
    const badge = formatFootballMatchBadgeTime(tomorrowDateString(), '20:00');
    assert.equal(badge, 'Tomorrow · 20:00');
  });
});
