import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildOsrmRouteUrl, parseOsrmRoute, validRoutingCoordinates } from '../../backend/services/eventRouteService';
import { computeEventDeparture } from '../eventDeparturePlan';

const origin = { latitude: 53.4808, longitude: -2.2446 };
const venue = { latitude: 53.4698, longitude: -2.2199 };
describe('P2 grounded route estimates', () => {
  it('only accepts real points, not placeholder zeros', () => {
    assert.equal(validRoutingCoordinates({ latitude: 0, longitude: 0 }), false);
    assert.equal(validRoutingCoordinates(origin), true);
  });
  it('constructs walking and driving URLs without exposing keys', () => {
    assert.match(buildOsrmRouteUrl(origin, venue, 'walking'), /routed-foot.*-2.2446,53.4808;-2.2199,53.4698/);
    assert.match(buildOsrmRouteUrl(origin, venue, 'driving'), /routed-car/);
  });
  it('only uses returned route duration and distance', () => {
    const route = parseOsrmRoute({ code: 'Ok', routes: [{ duration: 918, distance: 2400 }] }, 'driving');
    assert.equal(route?.durationMinutes, 15);
    assert.equal(route?.distanceKm, 2.4);
    assert.equal(route?.isLiveTraffic, false);
    assert.equal(parseOsrmRoute({ code: 'NoRoute', routes: [] }, 'walking'), null);
  });
  it('computes departure from real route duration plus a user buffer', () => {
    const event = new Date('2026-11-16T19:00:00Z');
    const result = computeEventDeparture(event, 30, 20, new Date('2026-11-16T17:00:00Z'));
    assert.equal(result?.departAt.toISOString(), '2026-11-16T18:10:00.000Z');
    assert.equal(result?.minutesUntilDeparture, 70);
  });
  it('does not recommend leaving before event dates are verified', () => {
    assert.equal(computeEventDeparture(new Date('invalid'), 20, 15), null);
  });
});
