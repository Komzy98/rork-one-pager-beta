import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCloudCollections } from '@/utils/syncCollectionReconciliation';

describe('cloud collection deletion semantics', () => {
  it('respects explicit remote deletion even if this device still has old data', () => {
    const result = reconcileCloudCollections({ tasks: [], habits: [] }, { tasks: [{ id: 'old' }], habits: [{ id: 'stale' }] }, ['tasks', 'habits']);
    assert.deepEqual(result, { tasks: [], habits: [] });
  });
  it('backfills missing legacy fields, but never overrides a real cloud field', () => {
    const result = reconcileCloudCollections({ tasks: [{ id: 'new' }] }, { tasks: [{ id: 'old' }], shows: [{ id: 'local' }] }, ['tasks', 'shows']);
    assert.deepEqual(result, { tasks: [{ id: 'new' }], shows: [{ id: 'local' }] });
  });
});
