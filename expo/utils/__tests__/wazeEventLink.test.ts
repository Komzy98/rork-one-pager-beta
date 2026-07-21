import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWazeEventUrl } from '@/utils/wazeEventLink';

describe('wazeEventLink', () => {
  it('builds Waze navigate URL with venue label and coordinates', () => {
    const url = buildWazeEventUrl({
      venue: 'The Trading Route',
      location: 'Manchester',
      latitude: 53.48,
      longitude: -2.24,
    });
    assert.match(url, /^https:\/\/waze\.com\/ul\?/);
    assert.match(url, /navigate=yes/);
    assert.match(url, /ll=53\.48,-2\.24/);
    assert.match(url, /q=The%20Trading%20Route/);
  });
});
