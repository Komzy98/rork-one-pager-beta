import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  containsActivitySecret,
  sanitizeActivityMetadata,
  sanitizePublishedActivity,
  stripActivityPii,
} from '@/utils/socialActivityPublish';

describe('socialActivityPublish operational safety', () => {
  it('strips JWT-like tokens from titles', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    assert.equal(stripActivityPii(`Saved event ${token}`), 'Saved event [redacted]');
    assert.equal(containsActivitySecret(token), true);
  });

  it('drops secret metadata values', () => {
    const meta = sanitizeActivityMetadata('event_saved', {
      domain: 'events',
      eventId: 'evt-1',
      category: 'api_key=supersecret123',
    });
    assert.equal(meta.category, undefined);
    assert.equal(meta.eventId, 'evt-1');
  });

  it('minimizes metadata in generic mode', () => {
    const meta = sanitizeActivityMetadata(
      'workout',
      { domain: 'tasks', habitId: 'habit-abc' },
      { genericCopy: true },
    );
    assert.deepEqual(meta, { domain: 'tasks' });
  });

  it('replaces poisoned published activity payloads', () => {
    const out = sanitizePublishedActivity({
      type: 'workout',
      title: 'Bearer abcdef1234567890',
      body: 'token=hidden',
      metadata: { domain: 'tasks', habitId: 'x' },
    });
    assert.equal(out.title, 'Shared an update');
    assert.equal(out.body, null);
    assert.deepEqual(out.metadata, { domain: 'tasks' });
  });
});
