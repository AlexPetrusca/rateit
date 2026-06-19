import assert from 'node:assert/strict';
import test from 'node:test';
import { ratingForPosition } from './ratingDisplay.js';

test('ratingForPosition maps a sliding position to half-star steps', () => {
  assert.equal(ratingForPosition(0, 200), 0.5);
  assert.equal(ratingForPosition(100, 200), 2.5);
  assert.equal(ratingForPosition(200, 200), 5);
});
