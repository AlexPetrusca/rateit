import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPhoneNumber, normalizePhoneNumber, parsePhoneDigits, sanitizePhoneDigits } from './loginPhone.js';

test('login phone helpers format and validate ten local digits', () => {
  assert.equal(sanitizePhoneDigits('+1 (555) 555-1212'), '1555555121');
  assert.equal(formatPhoneNumber('5555551212'), '(555) 555-1212');
  assert.equal(parsePhoneDigits('+1 (555) 555-1212'), '5555551212');
  assert.equal(normalizePhoneNumber('+1', '5555551212'), '+15555551212');
  assert.equal(normalizePhoneNumber('+1', '555'), '');
});
