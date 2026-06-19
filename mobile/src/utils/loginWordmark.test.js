import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseCyclingRows } from './loginWordmark.js';

test('wordmark cycling selects three or four unique rows', () => {
  const threeRows = chooseCyclingRows(22, () => 0);
  const fourRows = chooseCyclingRows(22, () => 0.99);
  assert.equal(threeRows.length, 3);
  assert.equal(fourRows.length, 4);
  assert.equal(new Set(fourRows).size, 4);
});
