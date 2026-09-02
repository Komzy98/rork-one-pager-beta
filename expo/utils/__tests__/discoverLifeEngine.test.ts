import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { UserProfile } from '@/types/habit';
import type { Task } from '@/types/task';
import type { DiscoverEngineResult, DiscoverOpportunity } from '@/utils/discoverLifeEngine';
import {
  buildDiscoverLifeContext,
  buildEnergyContext,
  buildOpenWindows,
  buildTaskPressure,
} from '@/utils/discoverLifeEngine';
import { rerankDiscoverEngine } from '@/utils/discoverBehavioralBoosts';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Important task',
    priority: 'medium',
    status: 'todo',
    category: 'work',
    tags: [],
    subTasks: [],
    reminders: [],
    attachments: [],
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    completionLogs: [],
    progress: 0,
    isRecurring: false,
    ...overrides,
  };
}

function opportunity(overrides: Partial<DiscoverOpportunity> = {}): DiscoverOpportunity {
  return {
    id: 'op-1',
    key: 'watch:op-1',
    kind: 'watch',
    title: 'Continue a show',
    subtitle: 'Episode 4',
    eyebrow: 'CONTINUE WATCHING',
    reasons: ['You already started this'],
    score: 70,
    route: '/(tabs)/shows',
    actionLabel: 'Continue',
    accent: '#7057E8',
    durationMinutes: 50,
    ...overrides,
  };
}

function engine(rows: DiscoverOpportunity[]): DiscoverEngineResult {
  return {
    ranked: rows,
    hero: rows[0] ?? null,
    alternatives: rows.slice(1),
    later: [],
    serendipity: null,
    eventPicks: rows.filter((row) => row.kind === 'event'),
  };
}

describe('Discover life context', () => {
  it('creates open windows that do not overlap real calendar commitments', () => {
    const now = new Date('2026-09-02T08:00:00');
    const windows = buildOpenWindows(
      [{
        title: 'Work',
        startDate: new Date('2026-09-02T09:00:00'),
        endDate: new Date('2026-09-02T17:00:00'),
        allDay: false,
      }],
      null,
      now,
      0,
    );

    assert.ok(windows.length >= 1);
    for (const window of windows) {
      const overlapsWork =
        window.start.getTime() < new Date('2026-09-02T17:00:00').getTime() &&
        window.end.getTime() > new Date('2026-09-02T09:00:00').getTime();
      assert.equal(overlapsWork, false);
    }
    assert.ok(windows.some((window) => window.start.getHours() >= 17));
  });

  it('marks urgent, overdue work as heavy pressure', () => {
    const now = new Date('2026-09-02T12:00:00');
    const pressure = buildTaskPressure([
      task({ id: 'urgent', priority: 'urgent', dueDate: '2026-09-01T15:00:00', estimatedDuration: 90 }),
      task({ id: 'high', priority: 'high', dueDate: '2026-09-02T18:00:00', estimatedDuration: 60 }),
      task({ id: 'high-2', priority: 'high', dueDate: '2026-09-02T19:00:00', estimatedDuration: 60 }),
    ], now);

    assert.equal(pressure.urgent, 1);
    assert.equal(pressure.overdue, 1);
    assert.ok(pressure.score >= 52);
    assert.ok(pressure.label === 'busy' || pressure.label === 'heavy');
  });

  it('lets recovery state override normal chronotype energy', () => {
    const profile = {
      chronotype: 'lion',
      recoveryMode: { active: true },
    } as unknown as UserProfile;

    const energy = buildEnergyContext({
      profile,
      now: new Date('2026-09-02T09:00:00'),
    });

    assert.equal(energy.mode, 'recovery');
  });
});

describe('Discover behavioural reranking', () => {
  it('removes a recently rejected recommendation from the feed', () => {
    const context = buildDiscoverLifeContext({
      profile: null,
      tasks: [],
      calendarEvents: [],
      now: new Date(),
    });
    const rejected = opportunity({ id: 'reject', key: 'watch:reject', score: 120 });
    const kept = opportunity({ id: 'keep', key: 'watch:keep', title: 'Another show', score: 70 });

    const result = rerankDiscoverEngine({
      engine: engine([rejected, kept]),
      context,
      profile: null,
      tasks: [],
      feedback: {
        entries: {
          'watch:reject': {
            key: 'watch:reject',
            kind: 'watch',
            positive: 0,
            negative: 1,
            lastNegativeAt: new Date().toISOString(),
            reasons: { not_for_me: 1 },
          },
        },
        kindAffinity: {},
      },
    });

    assert.equal(result.ranked.some((row) => row.key === 'watch:reject'), false);
    assert.equal(result.hero?.key, 'watch:keep');
  });

  it('uses historical tab visits as a soft preference, not a hard filter', () => {
    const profile = {
      tabVisitCounts: { shows: 30, events: 1 },
    } as unknown as UserProfile;
    const context = buildDiscoverLifeContext({
      profile,
      tasks: [],
      calendarEvents: [],
      now: new Date('2026-09-02T18:00:00'),
    });
    const watch = opportunity({ id: 'watch', key: 'watch:watch', score: 60 });
    const event = opportunity({
      id: 'event',
      key: 'event:event',
      kind: 'event',
      title: 'Local event',
      score: 60,
      route: '/(tabs)/events',
    });

    const result = rerankDiscoverEngine({
      engine: engine([event, watch]),
      context,
      profile,
      tasks: [],
      feedback: null,
    });

    assert.equal(result.hero?.kind, 'watch');
    assert.ok(result.ranked.some((row) => row.kind === 'event'));
  });

  it('learns the user’s productive hour from task completion history', () => {
    const context = buildDiscoverLifeContext({
      profile: null,
      tasks: [],
      calendarEvents: [],
      now: new Date('2026-09-02T10:00:00'),
    });
    const history = [
      task({ id: 'a', completionLogs: [{ id: '1', taskId: 'a', completedAt: '2026-09-01T10:05:00', effort: 2 }] }),
      task({ id: 'b', completionLogs: [{ id: '2', taskId: 'b', completedAt: '2026-08-31T10:25:00', effort: 3 }] }),
      task({ id: 'c', completionLogs: [{ id: '3', taskId: 'c', completedAt: '2026-08-30T15:00:00', effort: 3 }] }),
    ];
    const taskPick = opportunity({ id: 'task', key: 'task:task', kind: 'task', title: 'Focus work', score: 60, route: '/(tabs)/tasks' });
    const mediaPick = opportunity({ id: 'media', key: 'media:media', kind: 'media', title: 'New movie', score: 60, route: '/(tabs)/shows' });

    const result = rerankDiscoverEngine({
      engine: engine([mediaPick, taskPick]),
      context,
      profile: null,
      tasks: history,
      feedback: null,
    });

    assert.equal(result.behavior.preferredProductiveHour, 10);
    assert.equal(result.hero?.kind, 'task');
  });
});
