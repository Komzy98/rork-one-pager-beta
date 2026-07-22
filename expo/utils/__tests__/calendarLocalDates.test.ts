import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarEventOnLocalDay,
  getLocalYmdFromCalendarStart,
} from '../dateUtils.ts';

describe('calendar local dates', () => {
  it('does not treat UTC ISO prefix as local calendar day (all-day EventKit)', () => {
    // July 23 00:00 Europe/London → 2026-07-22T23:00:00.000Z
    const iso = '2026-07-22T23:00:00.000Z';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localYmd = getLocalYmdFromCalendarStart(iso, true);
    if (tz === 'Europe/London' || tz === 'Europe/Dublin') {
      assert.equal(localYmd, '2026-07-23');
      assert.equal(calendarEventOnLocalDay(iso, '2026-07-22', true), false);
      assert.equal(calendarEventOnLocalDay(iso, '2026-07-23', true), true);
    } else {
      assert.ok(localYmd);
      assert.equal(calendarEventOnLocalDay(iso, localYmd!, true), true);
    }
  });

  it('matches plain date-only all-day strings', () => {
    assert.equal(getLocalYmdFromCalendarStart('2026-07-23', true), '2026-07-23');
    assert.equal(calendarEventOnLocalDay('2026-07-23', '2026-07-23', true), true);
    assert.equal(calendarEventOnLocalDay('2026-07-23', '2026-07-22', true), false);
  });
});
