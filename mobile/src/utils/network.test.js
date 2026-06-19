import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveEmulatorLoopback } from './network.js';

test('Android emulator routes host loopback through 10.0.2.2', () => {
  assert.equal(resolveEmulatorLoopback('http://localhost:8080', 'android'), 'http://10.0.2.2:8080');
  assert.equal(resolveEmulatorLoopback('http://127.0.0.1:8080', 'android'), 'http://10.0.2.2:8080');
  assert.equal(resolveEmulatorLoopback('http://localhost:8080', 'ios'), 'http://localhost:8080');
});
