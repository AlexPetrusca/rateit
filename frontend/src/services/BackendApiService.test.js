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

test('getRating requests the single-post endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            status: 200,
            json: async () => ({ ratingId: 7 })
        };
    };

    try {
        const result = await BackendApiService.getRating(7);

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/feed/ratings/7');
        assert.equal(calls[0].options.method, undefined);
        assert.deepEqual(result, { ratingId: 7 });
    } finally {
        delete globalThis.fetch;
    }
});

test('getFeed requests the paged feed endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ([{ ratingId: 1 }])
        };
    };

    try {
        const result = await BackendApiService.getFeed({ page: 2, size: 15 });

        assert.deepEqual(result, [{ ratingId: 1 }]);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/feed?page=2&limit=15');
    } finally {
        delete globalThis.fetch;
    }
});

test('searchUsers requests encoded user search endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ([{ userId: 2, username: 'bob_bananas' }])
        };
    };

    try {
        const result = await BackendApiService.searchUsers({ query: 'bob bananas', limit: 7 });

        assert.deepEqual(result, [{ userId: 2, username: 'bob_bananas' }]);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/users/search?query=bob%20bananas&limit=7');
        assert.equal(calls[0].options.method, undefined);
    } finally {
        delete globalThis.fetch;
    }
});

test('followUser posts to the follow endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ userId: 2, followRelation: 'FOLLOWING' })
        };
    };

    try {
        const result = await BackendApiService.followUser(2);

        assert.deepEqual(result, { userId: 2, followRelation: 'FOLLOWING' });
        assert.equal(calls[0].url, '/api/follows/2');
        assert.equal(calls[0].options.method, 'POST');
    } finally {
        delete globalThis.fetch;
    }
});

test('getFollowers requests profile followers endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ([{ userId: 3, username: 'beta' }])
        };
    };

    try {
        const result = await BackendApiService.getFollowers(2);

        assert.deepEqual(result, [{ userId: 3, username: 'beta' }]);
        assert.equal(calls[0].url, '/api/users/2/followers');
        assert.equal(calls[0].options.method, undefined);
    } finally {
        delete globalThis.fetch;
    }
});

test('getAdminPosts requests the paged admin post endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ content: [], totalElements: 0 })
        };
    };

    try {
        const result = await BackendApiService.getAdminPosts({ page: 2, size: 15 });

        assert.deepEqual(result, { content: [], totalElements: 0 });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/admin/posts?page=2&size=15');
    } finally {
        delete globalThis.fetch;
    }
});

test('getAdminComments requests the paged admin comment endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ content: [], totalElements: 0 })
        };
    };

    try {
        const result = await BackendApiService.getAdminComments({ page: 1, size: 12 });

        assert.deepEqual(result, { content: [], totalElements: 0 });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/admin/comments?page=1&size=12');
    } finally {
        delete globalThis.fetch;
    }
});

test('createPostsJob posts the expected payload and returns the response body', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ id: 99, status: 'PENDING' })
        };
    };

    try {
        const result = await BackendApiService.createPostsJob({
            count: 5,
            bodyPrefix: 'body',
            reviewPrefix: 'review'
        });

        assert.deepEqual(result, { id: 99, status: 'PENDING' });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/admin/jobs/create-posts');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            count: 5,
            bodyPrefix: 'body',
            reviewPrefix: 'review'
        });
    } finally {
        delete globalThis.fetch;
    }
});

test('createCommentsJob posts the expected payload and returns the response body', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ id: 101, status: 'PENDING' })
        };
    };

    try {
        const result = await BackendApiService.createCommentsJob({
            count: 7,
            maxDepth: 3,
            replyChance: 0.5,
            commentPrefix: 'root',
            replyPrefix: 'reply'
        });

        assert.deepEqual(result, { id: 101, status: 'PENDING' });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/admin/jobs/create-comments');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            count: 7,
            maxDepth: 3,
            replyChance: 0.5,
            commentPrefix: 'root',
            replyPrefix: 'reply'
        });
    } finally {
        delete globalThis.fetch;
    }
});

test('createLikesJob posts the expected payload and returns the response body', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ id: 102, status: 'PENDING' })
        };
    };

    try {
        const result = await BackendApiService.createLikesJob({ count: 9 });

        assert.deepEqual(result, { id: 102, status: 'PENDING' });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/admin/jobs/create-likes');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), { count: 9 });
    } finally {
        delete globalThis.fetch;
    }
});

test('bulkDeleteAdminUsers posts selected ids', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ deletedCount: 2 })
        };
    };

    try {
        const result = await BackendApiService.bulkDeleteAdminUsers([1, 2]);

        assert.deepEqual(result, { deletedCount: 2 });
        assert.equal(calls[0].url, '/api/admin/users/bulk-delete');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), { ids: [1, 2] });
    } finally {
        delete globalThis.fetch;
    }
});

test('bulkDeleteAdminPosts posts selected ids', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ deletedCount: 2 })
        };
    };

    try {
        const result = await BackendApiService.bulkDeleteAdminPosts([10, 11]);

        assert.deepEqual(result, { deletedCount: 2 });
        assert.equal(calls[0].url, '/api/admin/posts/bulk-delete');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), { ids: [10, 11] });
    } finally {
        delete globalThis.fetch;
    }
});

test('updateAdminComment posts editable fields', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ commentId: 5, text: 'Updated' })
        };
    };

    try {
        const result = await BackendApiService.updateAdminComment(5, { text: 'Updated', score: 4.5 });

        assert.deepEqual(result, { commentId: 5, text: 'Updated' });
        assert.equal(calls[0].url, '/api/admin/comments/5');
        assert.equal(calls[0].options.method, 'PUT');
        assert.deepEqual(JSON.parse(calls[0].options.body), { text: 'Updated', score: 4.5 });
    } finally {
        delete globalThis.fetch;
    }
});

test('updateRating posts editable fields', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            status: 200,
            json: async () => ({ ratingId: 22, score: 4.5, reviewText: 'Updated' })
        };
    };

    try {
        const result = await BackendApiService.updateRating(22, { body: 'Updated topic', reviewText: 'Updated', score: 4.5 });

        assert.deepEqual(result, { ratingId: 22, score: 4.5, reviewText: 'Updated' });
        assert.equal(calls[0].url, '/api/feed/ratings/22');
        assert.equal(calls[0].options.method, 'PUT');
        assert.equal(JSON.parse(calls[0].options.body).body, 'Updated topic');
    } finally {
        delete globalThis.fetch;
    }
});

test('deleteRating calls the delete endpoint', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            status: 204,
            json: async () => ({})
        };
    };

    try {
        const result = await BackendApiService.deleteRating(33);

        assert.equal(result, null);
        assert.equal(calls[0].url, '/api/feed/ratings/33');
        assert.equal(calls[0].options.method, 'DELETE');
    } finally {
        delete globalThis.fetch;
    }
});

test('bulkDeleteAdminComments posts selected ids', async () => {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        return {
            ok: true,
            json: async () => ({ deletedCount: 3 })
        };
    };

    try {
        const result = await BackendApiService.bulkDeleteAdminComments([3, 4, 5]);

        assert.deepEqual(result, { deletedCount: 3 });
        assert.equal(calls[0].url, '/api/admin/comments/bulk-delete');
        assert.equal(calls[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(calls[0].options.body), { ids: [3, 4, 5] });
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
