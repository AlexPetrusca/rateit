import assert from 'node:assert/strict';
import test from 'node:test';
import { AVATAR_MAX_DIMENSION, computeTargetSize } from './imageScaling.js';

test('computeTargetSize downscales the longest edge and keeps aspect ratio', () => {
  assert.deepEqual(computeTargetSize(4032, 3024, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(computeTargetSize(3024, 4032, 1600), { width: 1200, height: 1600 });
});

test('computeTargetSize leaves images already under the cap alone', () => {
  assert.equal(computeTargetSize(800, 600, 1600), null);
  assert.equal(computeTargetSize(1600, 1200, 1600), null);
});

test('computeTargetSize shrinks a camera original to an avatar', () => {
  // The 12MP originals that were being served as 32px avatars.
  assert.deepEqual(computeTargetSize(4032, 3024, AVATAR_MAX_DIMENSION), { width: 512, height: 384 });
});

test('computeTargetSize tolerates missing dimensions', () => {
  assert.equal(computeTargetSize(0, 0, 1600), null);
  assert.equal(computeTargetSize(undefined, undefined, 1600), null);
});
