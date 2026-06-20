import assert from 'node:assert/strict';
import test from 'node:test';
import { insertLink, wrapSelection } from './richTextEditing.js';

test('rich-text edits wrap selections and place the cursor correctly', () => {
  assert.deepEqual(wrapSelection('hello world', { start: 6, end: 11 }, '**'), {
    value: 'hello **world**',
    cursor: 13
  });
  assert.deepEqual(insertLink('visit', { start: 0, end: 5 }), {
    value: '[visit]()',
    cursor: 8
  });
});
