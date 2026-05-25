import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildCreateRatingRequest,
    MAX_RATING_SCORE,
    MIN_RATING_SCORE,
    normalizeText,
    validateCreateRatingDraft
} from './createRating.js';

test('normalizeText trims values and collapses blanks to null', () => {
    assert.equal(normalizeText('  hello  '), 'hello');
    assert.equal(normalizeText('   '), null);
    assert.equal(normalizeText(null), null);
});

test('validateCreateRatingDraft rejects invalid and empty submissions', () => {
    assert.equal(
        validateCreateRatingDraft({ body: '', selectedFile: null, score: '0' }),
        'Pick a score between 1 and 5.'
    );

    assert.equal(
        validateCreateRatingDraft({ body: '   ', selectedFile: null, score: '4' }),
        'Add text or upload a photo before posting.'
    );
});

test('validateCreateRatingDraft accepts text or photo posts in range', () => {
    assert.equal(
        validateCreateRatingDraft({ body: 'A post', selectedFile: null, score: '4.5' }),
        null
    );

    assert.equal(
        validateCreateRatingDraft({ body: '', selectedFile: { name: 'photo.jpg' }, score: '5' }),
        null
    );
});

test('buildCreateRatingRequest normalizes payload fields', () => {
    const payload = buildCreateRatingRequest({
        title: '  Title  ',
        body: '  Body  ',
        reviewText: '  Review  ',
        score: '4.5',
        mediaObjectKey: ' uploads/photo.jpg ',
        mediaContentType: ' image/jpeg '
    });

    assert.deepEqual(payload, {
        title: 'Title',
        body: 'Body',
        reviewText: 'Review',
        score: 4.5,
        mediaObjectKey: 'uploads/photo.jpg',
        mediaContentType: 'image/jpeg'
    });
});

test('create rating score bounds stay aligned with the form', () => {
    assert.equal(MIN_RATING_SCORE, 1);
    assert.equal(MAX_RATING_SCORE, 5);
});
