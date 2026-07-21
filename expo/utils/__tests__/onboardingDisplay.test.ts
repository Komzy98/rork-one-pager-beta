import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatInterestLabel,
  formatInterestsSummary,
  polishDailyStackHeadline,
} from '@/utils/onboardingDisplay';

describe('onboardingDisplay', () => {
  it('formats known interest ids', () => {
    assert.equal(formatInterestLabel('football'), 'Football');
    assert.equal(formatInterestLabel('ufc'), 'UFC / MMA');
  });

  it('summarizes interests with overflow', () => {
    assert.equal(
      formatInterestsSummary(['football', 'ufc', 'nba', 'f1']),
      'Football, UFC / MMA, NBA +1'
    );
  });

  it('title-cases daily stack snippets after Today:', () => {
    assert.equal(
      polishDailyStackHeadline(
        'Today: add a daily rhythm in tasks · Barcelona — scores & tonight · time to unwind · plans nearby'
      ),
      'Today: Add a daily rhythm in tasks · Barcelona — scores & tonight · Time to unwind · Plans nearby'
    );
  });
});
