import test from 'node:test';
import assert from 'node:assert/strict';
import BackendApiService from './BackendApiService.js';

test('createRating posts the expected payload and returns the response body', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ ratingId: 42 })
        };
    };

    try {
        const result = await BackendApiService.createRating({
            title: 'Title',
            body: 'Body',
            reviewText: 'Review',
            score: 4.5,
            mediaObjectKey: 'uploads/photo.jpg',
            mediaContentType: 'image/jpeg'
        });

        assert.deepEqual(result, { ratingId: 42 });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/feed/ratings');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            title: 'Title',
            body: 'Body',
            reviewText: 'Review',
            score: 4.5,
            mediaObjectKey: 'uploads/photo.jpg',
            mediaContentType: 'image/jpeg'
        });
    } finally {
        delete globalThis.fetch;
    }
});

test('getUploadUrl posts filename and content type', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ uploadUrl: 'https://example.com/upload', key: 'uploads/1_photo.jpg' })
        };
    };

    try {
        const result = await BackendApiService.getUploadUrl('photo.jpg', 'image/jpeg');

        assert.deepEqual(result, {
            uploadUrl: 'https://example.com/upload',
            key: 'uploads/1_photo.jpg'
        });
        assert.equal(calls[0].url, '/api/s3/images');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            filename: 'photo.jpg',
            contentType: 'image/jpeg'
        });
    } finally {
        delete globalThis.fetch;
    }
});

test('createRating surfaces backend error messages', async () => {
    globalThis.fetch = async () => ({
        ok: false,
        json: async () => ({ message: 'No default rating scale' })
    });

    try {
        await assert.rejects(
            () => BackendApiService.createRating({
                title: 'Title',
                body: 'Body',
                reviewText: 'Review',
                score: 4,
                mediaObjectKey: null,
                mediaContentType: null
            }),
            /No default rating scale/
        );
    } finally {
        delete globalThis.fetch;
    }
});
