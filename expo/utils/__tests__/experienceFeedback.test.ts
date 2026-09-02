import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyExperienceSignal,
  EMPTY_EXPERIENCE_FEEDBACK,
  experienceEvidenceScore,
  experienceKey,
} from '@/utils/experienceFeedback';

describe('experience feedback learning', () => {
  it('weights actual behaviour much more strongly than a declared preference', () => {
    const declared = applyExperienceSignal(EMPTY_EXPERIENCE_FEEDBACK, {
      kind: 'event',
      subjectId: 'comedy-1',
      title: 'Comedy night',
      tags: ['comedy'],
      action: 'declared',
      occurredAt: '2026-09-01T10:00:00Z',
    });
    const chosen = applyExperienceSignal(declared, {
      kind: 'event',
      subjectId: 'comedy-1',
      title: 'Comedy night',
      tags: ['comedy'],
      action: 'chosen',
      occurredAt: '2026-09-01T11:00:00Z',
    });
    const completed = applyExperienceSignal(chosen, {
      kind: 'event',
      subjectId: 'comedy-1',
      title: 'Comedy night',
      tags: ['comedy'],
      action: 'completed',
      occurredAt: '2026-09-01T20:00:00Z',
    });
    const loved = applyExperienceSignal(completed, {
      kind: 'event',
      subjectId: 'comedy-1',
      title: 'Comedy night',
      tags: ['comedy'],
      action: 'enjoyed',
      value: 5,
      occurredAt: '2026-09-01T22:00:00Z',
    });

    const key = experienceKey('event', 'comedy-1');
    assert.ok(experienceEvidenceScore(loved.entries[key]) > experienceEvidenceScore(declared.entries[key]) * 10);
    assert.ok((loved.kindAffinity.event ?? 0) > (declared.kindAffinity.event ?? 0));
    assert.ok((loved.tagAffinity.comedy ?? 0) > (declared.tagAffinity.comedy ?? 0));
  });

  it('treats a skipped plan as weak evidence rather than dislike', () => {
    const chosen = applyExperienceSignal(EMPTY_EXPERIENCE_FEEDBACK, {
      kind: 'event', subjectId: 'event-1', action: 'chosen', tags: ['music'],
    });
    const skipped = applyExperienceSignal(chosen, {
      kind: 'event', subjectId: 'event-1', action: 'skipped', tags: ['music'],
    });

    assert.ok((skipped.kindAffinity.event ?? 0) > 0);
    assert.ok((skipped.tagAffinity.music ?? 0) > 0);
  });

  it('moves affinity up for loved experiences and down for disliked ones', () => {
    const loved = applyExperienceSignal(EMPTY_EXPERIENCE_FEEDBACK, {
      kind: 'recipe', subjectId: 'pasta', action: 'enjoyed', value: 5, tags: ['italian'],
    });
    const disliked = applyExperienceSignal(EMPTY_EXPERIENCE_FEEDBACK, {
      kind: 'recipe', subjectId: 'salad', action: 'enjoyed', value: 2, tags: ['salad'],
    });

    assert.ok((loved.kindAffinity.recipe ?? 0) > 0);
    assert.ok((loved.tagAffinity.italian ?? 0) > 0);
    assert.ok((disliked.kindAffinity.recipe ?? 0) < 0);
    assert.ok((disliked.tagAffinity.salad ?? 0) < 0);
  });

  it('remembers a dismissed prompt without changing taste affinity', () => {
    const chosen = applyExperienceSignal(EMPTY_EXPERIENCE_FEEDBACK, {
      kind: 'show', subjectId: 'show-1', action: 'chosen', tags: ['drama'],
    });
    const before = chosen.kindAffinity.show ?? 0;
    const dismissed = applyExperienceSignal(chosen, {
      kind: 'show', subjectId: 'show-1', action: 'dismissed', tags: ['drama'], occurredAt: '2026-09-02T12:00:00Z',
    });

    assert.equal(dismissed.kindAffinity.show ?? 0, before);
    assert.equal(dismissed.entries[experienceKey('show', 'show-1')].lastPromptDismissedAt, '2026-09-02T12:00:00Z');
  });
});
