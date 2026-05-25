const BackendApiService = {
    sendOtp: async (phoneNumber) => {
        const response = await fetch('/auth/send_otp', {
            method: 'POST',
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, code })
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Invalid code');
        }
    },

    getCurrentUser: async () => {
        const response = await fetch('/api/users/me');
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

    logout: async () => {
        await fetch('/auth/logout', { method: 'POST' });
    },

    getFeed: async (limit = 20) => {
        const response = await fetch(`/api/feed?limit=${encodeURIComponent(limit)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch feed');
        }
        return await response.json();
    },

    likeRating: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/like`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Failed to like rating');
        }
        return response.status === 204 ? null : await response.json();
    },

    unlikeRating: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/like`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to unlike rating');
        }
        return response.status === 204 ? null : await response.json();
    },

    getRatingComments: async (ratingId) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/comments`);
        if (!response.ok) {
            throw new Error('Failed to fetch comments');
        }
        return await response.json();
    },

    createRatingComment: async (ratingId, text, score, parentCommentId = null) => {
        const response = await fetch(`/api/feed/ratings/${ratingId}/comments`, {
            method: 'POST',
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score, reviewText })
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to re-rate');
        }
        return await response.json();
    },

    createRating: async ({ title, body, reviewText, score, mediaObjectKey, mediaContentType }) => {
        const response = await fetch('/api/feed/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        return await response.json();
    },

    getAdminStatus: async () => {
        const response = await fetch('/api/admin/status');
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

    createUsersJob: async ({ count, usernamePrefix, phonePrefix }) => {
        const response = await fetch('/api/admin/jobs/create-users', {
            method: 'POST',
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

    getAdminJobs: async (limit = 20) => {
        const response = await fetch(`/api/admin/jobs?limit=${encodeURIComponent(limit)}`);
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
        const response = await fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}`);
        if (response.status === 401 || response.status === 403) {
            const error = new Error('Not authorized');
            error.status = response.status;
            throw error;
        }
        if (!response.ok) {
            throw new Error('Failed to load job');
        }
        return await response.json();
    }
};

export default BackendApiService;
