const BackendApiService = {
    sendOtp: async (phoneNumber) => {
        const response = await fetch('/auth/send_otp', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to send OTP');
        }
    },

    verifyOtp: async (phoneNumber, code) => {
        const response = await fetch('/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, code })
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Invalid code');
        }
    },

    getCurrentUser: async () => {
        const response = await fetch('/api/users/me', { credentials: 'include' });
        if (response.status === 204 || response.status === 404) {
            return null; // Authenticated but no profile
        }
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authenticated');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const error = new Error('Failed to fetch user');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    getUserProfile: async (userId) => {
        const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authenticated');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const error = new Error('Failed to fetch user profile');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    getUserPosts: async ({ userId, page = 0, size = 5 } = {}) => {
        const response = await fetch(`/api/users/${encodeURIComponent(userId)}/posts?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authenticated');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const error = new Error('Failed to fetch user posts');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    searchUsers: async ({ query, limit = 10 } = {}) => {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(query || '')}&limit=${encodeURIComponent(limit)}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to search users');
        }
        return await response.json();
    },

    followUser: async (userId) => {
        const response = await fetch(`/api/follows/${encodeURIComponent(userId)}`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to follow user');
        }
        return await response.json();
    },

    unfollowUser: async (userId) => {
        const response = await fetch(`/api/follows/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to unfollow user');
        }
        return await response.json();
    },

    getFollowers: async (userId) => {
        const response = await fetch(`/api/users/${encodeURIComponent(userId)}/followers`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch followers');
        }
        return await response.json();
    },

    getFollowing: async (userId) => {
        const response = await fetch(`/api/users/${encodeURIComponent(userId)}/following`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch following');
        }
        return await response.json();
    },

    logout: async () => {
        await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    },

    getFeed: async ({ page = 0, size = 20 } = {}) => {
        const response = await fetch(`/api/feed?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch feed');
        }
        return await response.json();
    },

    getTopicRatings: async ({ rateableItemId, page = 0, size = 20 } = {}) => {
        const response = await fetch(`/api/feed/topics/${encodeURIComponent(rateableItemId)}?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch topic');
        }
        return await response.json();
    },

    getRating: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${encodeURIComponent(ratingId)}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch post');
        }
        return await response.json();
    },

    likeRating: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to like rating');
        }
        return response.status === 204 ? null : await response.json();
    },

    unlikeRating: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/like`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to unlike rating');
        }
        return response.status === 204 ? null : await response.json();
    },

    getRatingComments: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/comments`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch comments');
        }
        return await response.json();
    },

    createRatingComment: async (ratingId, text, score, parentCommentId = null) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/comments`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, score, parentCommentId })
        });
        if (!response.ok) {
            throw new Error('Failed to comment');
        }
        return await response.json();
    },

    rerate: async (ratingId, score, reviewText) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/rerate`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score, reviewText })
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to re-rate');
        }
        return await response.json();
    },

    updateRating: async (ratingId, ratingData) => {
        const response = await fetch(`/api/feed/ratings/${encodeURIComponent(ratingId)}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ratingData)
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to update post');
        }
        return await response.json();
    },

    deleteRating: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${encodeURIComponent(ratingId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete post');
        }
        return response.status === 204 ? null : await response.json();
    },

    createRating: async ({ body, reviewText, score, mediaObjectKey, mediaContentType }) => {
        const response = await fetch('/api/feed/ratings', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                body,
                reviewText,
                score,
                mediaObjectKey,
                mediaContentType
            })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to create rating');
        }

        return await response.json();
    },

    getUploadUrl: async (filename, contentType) => {
        const response = await fetch('/api/s3/images', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, contentType })
        });
        if (!response.ok) {
            throw new Error('Failed to get upload URL');
        }
        return await response.json(); // { uploadUrl, key }
    },

    uploadFileToS3: async (uploadUrl, file) => {
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            credentials: 'include',
            body: file,
            headers: { 'Content-Type': file.type }
        });
        if (!response.ok) {
            throw new Error('Failed to upload file to S3');
        }
    },

    createOrUpdateUser: async (userData) => {
        const response = await fetch('/api/users/me', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to update profile');
        }
        return await response.json();
    },

    updateCurrentUser: async (userData) => {
        const response = await fetch('/api/users/me', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to update profile');
        }
        return await response.json();
    },

    getAdminUsers: async ({ page = 0, size = 20 } = {}) => {
        const response = await fetch(`/api/admin/users?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        return await response.json();
    },

    updateAdminUser: async (userId, userData) => {
        const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to update user');
        }
        return await response.json();
    },

    deleteAdminUser: async (userId) => {
        const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete user');
        }
        return response.status === 204 ? null : await response.json();
    },

    deleteAllTestUsers: async () => {
        const response = await fetch('/api/admin/users/test-users', {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete test users');
        }
        return await response.json();
    },

    bulkDeleteAdminUsers: async (ids) => {
        const response = await fetch('/api/admin/users/bulk-delete', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete users');
        }
        return await response.json();
    },

    getAdminStatus: async () => {
        const response = await fetch('/api/admin/status', { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load admin status');
        }
        return await response.json();
    },

    getAdminPosts: async ({ page = 0, size = 20 } = {}) => {
        const response = await fetch(`/api/admin/posts?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        return await response.json();
    },

    getAdminComments: async ({ page = 0, size = 20 } = {}) => {
        const response = await fetch(`/api/admin/comments?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load comments');
        }
        return await response.json();
    },

    updateAdminPost: async (postId, postData) => {
        const response = await fetch(`/api/admin/posts/${encodeURIComponent(postId)}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to update post');
        }
        return await response.json();
    },

    deleteAdminPost: async (postId) => {
        const response = await fetch(`/api/admin/posts/${encodeURIComponent(postId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete post');
        }
        return response.status === 204 ? null : await response.json();
    },

    updateAdminComment: async (commentId, commentData) => {
        const response = await fetch(`/api/admin/comments/${encodeURIComponent(commentId)}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentData)
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to update comment');
        }
        return await response.json();
    },

    deleteAdminComment: async (commentId) => {
        const response = await fetch(`/api/admin/comments/${encodeURIComponent(commentId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete comment');
        }
        return response.status === 204 ? null : await response.json();
    },

    bulkDeleteAdminComments: async (ids) => {
        const response = await fetch('/api/admin/comments/bulk-delete', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete comments');
        }
        return await response.json();
    },

    bulkDeleteAdminPosts: async (ids) => {
        const response = await fetch('/api/admin/posts/bulk-delete', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete posts');
        }
        return await response.json();
    },

    createUsersJob: async ({ count, usernamePrefix, phonePrefix }) => {
        const response = await fetch('/api/admin/jobs/create-users', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count, usernamePrefix, phonePrefix })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to queue user job');
        }
        return await response.json();
    },

    createPostsJob: async ({ count, bodyPrefix, reviewPrefix }) => {
        const response = await fetch('/api/admin/jobs/create-posts', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count, bodyPrefix, reviewPrefix })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to queue post job');
        }
        return await response.json();
    },

    createCommentsJob: async ({ count, maxDepth, replyChance, commentPrefix, replyPrefix }) => {
        const response = await fetch('/api/admin/jobs/create-comments', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count, maxDepth, replyChance, commentPrefix, replyPrefix })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to queue comment job');
        }
        return await response.json();
    },

    createLikesJob: async ({ count }) => {
        const response = await fetch('/api/admin/jobs/create-likes', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to queue like job');
        }
        return await response.json();
    },

    getAdminJobs: async (limit = 20) => {
        const response = await fetch(`/api/admin/jobs?limit=${encodeURIComponent(limit)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load jobs');
        }
        return await response.json();
    },

    getAdminJob: async (jobId) => {
        const response = await fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load job');
        }
        return await response.json();
    },

    getSuggestions: async ({ page = 0, size = 20 } = {}) => {
        const response = await fetch(`/api/suggestions?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authenticated');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load suggestions');
        }
        return await response.json();
    },

    createSuggestion: async ({ title, body }) => {
        const response = await fetch('/api/suggestions', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body })
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authenticated');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to create suggestion');
        }
        return await response.json();
    },

    getAdminSuggestions: async ({ page = 0, size = 20 } = {}) => {
        const response = await fetch(`/api/admin/suggestions?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load suggestions');
        }
        return await response.json();
    },

    deleteAdminSuggestion: async (suggestionId) => {
        const response = await fetch(`/api/admin/suggestions/${encodeURIComponent(suggestionId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete suggestion');
        }
        return response.status === 204 ? null : await response.json();
    }
};

export default BackendApiService;
