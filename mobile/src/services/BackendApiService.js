import { getApiUrl } from '../config.js';

const parseError = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  const error = new Error(data.message || fallbackMessage);
  error.status = response.status;
  throw error;
};

const request = async (path, options = {}, fallbackMessage = 'Request failed') => {
  const response = await fetch(getApiUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    await parseError(response, fallbackMessage);
  }

  return response.status === 204 ? null : response.json();
};

const jsonBody = (body) => JSON.stringify(body);
const encodeObjectKeyPath = (objectKey) => objectKey.split('/').map(encodeURIComponent).join('/');

const BackendApiService = {
  sendOtp: (phoneNumber) => request('/auth/send_otp', {
    method: 'POST',
    body: jsonBody({ phoneNumber })
  }, 'Failed to send OTP'),

  verifyOtp: (phoneNumber, code) => request('/auth/login', {
    method: 'POST',
    body: jsonBody({ phoneNumber, code })
  }, 'Invalid code'),

  getCurrentUser: async () => {
    const response = await fetch(getApiUrl('/api/users/me'), { credentials: 'include' });
    if (response.status === 204 || response.status === 404) {
      return null;
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
    return response.json();
  },

  getUserProfile: (userId) => request(`/api/users/${encodeURIComponent(userId)}`, {}, 'Failed to fetch user profile'),

  getUserPosts: ({ userId, page = 0, size = 5 } = {}) => request(
    `/api/users/${encodeURIComponent(userId)}/posts?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,
    {},
    'Failed to fetch user posts'
  ),

  searchUsers: ({ query, limit = 10 } = {}) => request(
    `/api/users/search?query=${encodeURIComponent(query || '')}&limit=${encodeURIComponent(limit)}`,
    {},
    'Failed to search users'
  ),

  followUser: (userId) => request(`/api/follows/${encodeURIComponent(userId)}`, {
    method: 'POST'
  }, 'Failed to follow user'),

  unfollowUser: (userId) => request(`/api/follows/${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  }, 'Failed to unfollow user'),

  getFollowers: (userId) => request(`/api/users/${encodeURIComponent(userId)}/followers`, {}, 'Failed to fetch followers'),

  getFollowing: (userId) => request(`/api/users/${encodeURIComponent(userId)}/following`, {}, 'Failed to fetch following'),

  logout: () => request('/auth/logout', { method: 'POST' }, 'Failed to log out'),

  getFeed: ({ page = 0, size = 20 } = {}) => request(
    `/api/feed?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(size)}`,
    {},
    'Failed to fetch feed'
  ),

  getFollowingFeed: ({ page = 0, size = 20 } = {}) => request(
    `/api/feed/following?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(size)}`,
    {},
    'Failed to fetch following feed'
  ),

  getTopicRatings: ({ rateableItemId, page = 0, size = 20 } = {}) => request(
    `/api/feed/topics/${encodeURIComponent(rateableItemId)}?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(size)}`,
    {},
    'Failed to fetch topic'
  ),

  getTopic: (rateableItemId) => request(`/api/topics/${encodeURIComponent(rateableItemId)}`, {}, 'Failed to fetch topic'),

  getRating: (ratingId) => request(`/api/feed/ratings/${encodeURIComponent(ratingId)}`, {}, 'Failed to fetch post'),

  likeRating: (ratingId) => request(`/api/feed/ratings/${encodeURIComponent(ratingId)}/like`, {
    method: 'POST'
  }, 'Failed to like rating'),

  unlikeRating: (ratingId) => request(`/api/feed/ratings/${encodeURIComponent(ratingId)}/like`, {
    method: 'DELETE'
  }, 'Failed to unlike rating'),

  getRatingComments: (ratingId) => request(
    `/api/feed/ratings/${encodeURIComponent(ratingId)}/comments`,
    {},
    'Failed to fetch comments'
  ),

  createRatingComment: (ratingId, text, score, parentCommentId = null) => request(
    `/api/feed/ratings/${encodeURIComponent(ratingId)}/comments`,
    {
      method: 'POST',
      body: jsonBody({ text, score, parentCommentId })
    },
    'Failed to comment'
  ),

  likeComment: (commentId) => request(`/api/feed/comments/${encodeURIComponent(commentId)}/like`, {
    method: 'POST'
  }, 'Failed to like comment'),

  unlikeComment: (commentId) => request(`/api/feed/comments/${encodeURIComponent(commentId)}/like`, {
    method: 'DELETE'
  }, 'Failed to unlike comment'),

  updateRatingComment: (commentId, text, score) => request(`/api/feed/comments/${encodeURIComponent(commentId)}`, {
    method: 'PUT',
    body: jsonBody({ text, score })
  }, 'Failed to update comment'),

  rerate: (ratingId, score, reviewText) => request(`/api/feed/ratings/${encodeURIComponent(ratingId)}/rerate`, {
    method: 'POST',
    body: jsonBody({ score, reviewText })
  }, 'Failed to re-rate'),

  updateRating: (ratingId, ratingData) => request(`/api/feed/ratings/${encodeURIComponent(ratingId)}`, {
    method: 'PUT',
    body: jsonBody(ratingData)
  }, 'Failed to update post'),

  deleteRating: (ratingId) => request(`/api/feed/ratings/${encodeURIComponent(ratingId)}`, {
    method: 'DELETE'
  }, 'Failed to delete post'),

  createRating: ({ body, reviewText, score, mediaObjectKey, mediaContentType }) => request('/api/feed/ratings', {
    method: 'POST',
    body: jsonBody({ body, reviewText, score, mediaObjectKey, mediaContentType })
  }, 'Failed to create rating'),

  getUploadUrl: (filename, contentType) => request('/api/s3/images', {
    method: 'POST',
    body: jsonBody({ filename, contentType })
  }, 'Failed to get upload URL'),

  getImageDownloadUrl: (objectKey) => request(
    `/api/s3/images/url/${encodeObjectKeyPath(objectKey)}`,
    {},
    'Failed to load image URL'
  ),

  uploadFileToS3: async (uploadUrl, file) => {
    const uploadBody = file?.uri
      ? await fetch(file.uri).then((response) => response.blob())
      : file;
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: uploadBody,
      headers: { 'Content-Type': file?.type || 'application/octet-stream' }
    });
    if (!response.ok) {
      throw new Error('Failed to upload file to S3');
    }
  },

  createOrUpdateUser: (userData) => request('/api/users/me', {
    method: 'POST',
    body: jsonBody(userData)
  }, 'Failed to update profile'),

  updateCurrentUser: (userData) => request('/api/users/me', {
    method: 'PUT',
    body: jsonBody(userData)
  }, 'Failed to update profile'),

  getAdminUsers: ({ page = 0, size = 20 } = {}) => request(
    `/api/admin/users?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,
    {},
    'Failed to load users'
  ),

  updateAdminUser: (userId, userData) => request(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: jsonBody(userData)
  }, 'Failed to update user'),

  deleteAdminUser: (userId) => request(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  }, 'Failed to delete user'),

  deleteAllTestUsers: () => request('/api/admin/users/test-users', {
    method: 'DELETE'
  }, 'Failed to delete test users'),

  bulkDeleteAdminUsers: (ids) => request('/api/admin/users/bulk-delete', {
    method: 'POST',
    body: jsonBody({ ids })
  }, 'Failed to delete users'),

  getAdminStatus: () => request('/api/admin/status', {}, 'Failed to load admin status'),

  getAdminPosts: ({ page = 0, size = 20 } = {}) => request(
    `/api/admin/posts?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,
    {},
    'Failed to load posts'
  ),

  getAdminComments: ({ page = 0, size = 20 } = {}) => request(
    `/api/admin/comments?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,
    {},
    'Failed to load comments'
  ),

  updateAdminPost: (postId, postData) => request(`/api/admin/posts/${encodeURIComponent(postId)}`, {
    method: 'PUT',
    body: jsonBody(postData)
  }, 'Failed to update post'),

  deleteAdminPost: (postId) => request(`/api/admin/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE'
  }, 'Failed to delete post'),

  bulkDeleteAdminPosts: (ids) => request('/api/admin/posts/bulk-delete', {
    method: 'POST',
    body: jsonBody({ ids })
  }, 'Failed to delete posts'),

  updateAdminComment: (commentId, commentData) => request(`/api/admin/comments/${encodeURIComponent(commentId)}`, {
    method: 'PUT',
    body: jsonBody(commentData)
  }, 'Failed to update comment'),

  deleteAdminComment: (commentId) => request(`/api/admin/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE'
  }, 'Failed to delete comment'),

  bulkDeleteAdminComments: (ids) => request('/api/admin/comments/bulk-delete', {
    method: 'POST',
    body: jsonBody({ ids })
  }, 'Failed to delete comments'),

  createUsersJob: ({ count, usernamePrefix, phonePrefix }) => request('/api/admin/jobs/create-users', {
    method: 'POST',
    body: jsonBody({ count, usernamePrefix, phonePrefix })
  }, 'Failed to queue user job'),

  createPostsJob: ({ count, bodyPrefix, reviewPrefix }) => request('/api/admin/jobs/create-posts', {
    method: 'POST',
    body: jsonBody({ count, bodyPrefix, reviewPrefix })
  }, 'Failed to queue post job'),

  createCommentsJob: ({ count, maxDepth, replyChance, commentPrefix, replyPrefix }) => request('/api/admin/jobs/create-comments', {
    method: 'POST',
    body: jsonBody({ count, maxDepth, replyChance, commentPrefix, replyPrefix })
  }, 'Failed to queue comment job'),

  createLikesJob: ({ count }) => request('/api/admin/jobs/create-likes', {
    method: 'POST',
    body: jsonBody({ count })
  }, 'Failed to queue like job'),

  getAdminJobs: (limit = 20) => request(`/api/admin/jobs?limit=${encodeURIComponent(limit)}`, {}, 'Failed to load jobs'),

  getAdminJob: (jobId) => request(`/api/admin/jobs/${encodeURIComponent(jobId)}`, {}, 'Failed to load job'),

  getSuggestions: ({ page = 0, size = 20 } = {}) => request(
    `/api/suggestions?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,
    {},
    'Failed to load suggestions'
  ),

  createSuggestion: ({ title, body }) => request('/api/suggestions', {
    method: 'POST',
    body: jsonBody({ title, body })
  }, 'Failed to create suggestion'),

  getAdminSuggestions: ({ page = 0, size = 20 } = {}) => request(
    `/api/admin/suggestions?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,
    {},
    'Failed to load suggestions'
  ),

  deleteAdminSuggestion: (suggestionId) => request(`/api/admin/suggestions/${encodeURIComponent(suggestionId)}`, {
    method: 'DELETE'
  }, 'Failed to delete suggestion'),

  getDrafts: () => request('/api/feed/drafts', {}, 'Failed to fetch drafts'),

  saveDraft: ({ id, body, reviewText, score, mediaObjectKey, mediaContentType }) => request('/api/feed/drafts', {
    method: 'POST',
    body: jsonBody({ id, body, reviewText, score, mediaObjectKey, mediaContentType })
  }, 'Failed to save draft'),

  deleteDraft: (draftId) => request(`/api/feed/drafts/${encodeURIComponent(draftId)}`, {
    method: 'DELETE'
  }, 'Failed to delete draft'),

  publishDraft: (draftId) => request(`/api/feed/drafts/${encodeURIComponent(draftId)}/publish`, {
    method: 'POST'
  }, 'Failed to publish draft')
};

export default BackendApiService;
