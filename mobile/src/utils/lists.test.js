import assert from 'node:assert/strict';
import test from 'node:test';
import { isNearListEnd, mergeUniqueBy } from './lists.js';

test('mergeUniqueBy keeps one updated item per id', () => {
  assert.deepEqual(
    mergeUniqueBy([{ id: 22, value: 'old' }], [{ id: 22, value: 'new' }, { id: 23 }], (item) => item.id),
    [{ id: 22, value: 'new' }, { id: 23 }]
  );
});

test('isNearListEnd detects the final scroll region', () => {
  assert.equal(isNearListEnd({ visibleLength: 700, offset: 900, contentLength: 1800 }), true);
  assert.equal(isNearListEnd({ visibleLength: 700, offset: 400, contentLength: 1800 }), false);
});
