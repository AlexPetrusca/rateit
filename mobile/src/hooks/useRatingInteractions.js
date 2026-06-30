import { useCallback, useState } from 'react';
import BackendApiService from '../services/BackendApiService.js';
import { DEFAULT_COMMENT_SCORE, isFiveStarScoreInRange } from '../utils/ratingDisplay.js';

const getComposerKey = (ratingId, type) => `${ratingId}:${type}`;
const getReplyKey = (ratingId, commentId = null) => (
  commentId == null ? getComposerKey(ratingId, 'comment') : `${ratingId}:comment:${commentId}`
);

export const useRatingInteractions = ({ notify, updateItem }) => {
  const [expandedRatings, setExpandedRatings] = useState([]);
  const [commentsByRating, setCommentsByRating] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [activeComposer, setActiveComposer] = useState(null);
  const [expandedReplyKeys, setExpandedReplyKeys] = useState([]);
  const [rerateDrafts, setRerateDrafts] = useState({});

  const loadComments = useCallback(async (ratingId, force = false) => {
    if (!force && commentsByRating[ratingId]) {
      return commentsByRating[ratingId];
    }

    const comments = await BackendApiService.getRatingComments(ratingId);
    setCommentsByRating((current) => ({ ...current, [ratingId]: comments }));
    return comments;
  }, [commentsByRating]);

  const toggleComments = useCallback((ratingId) => {
    setExpandedRatings((current) => (
      current.includes(ratingId) ? current.filter((id) => id !== ratingId) : [...current, ratingId]
    ));
    loadComments(ratingId).catch((error) => notify?.({ message: error.message, type: 'error' }));
  }, [loadComments, notify]);

  const openCommentComposer = useCallback((ratingId) => {
    setExpandedRatings((current) => (current.includes(ratingId) ? current : [...current, ratingId]));
    setActiveComposer(getComposerKey(ratingId, 'comment'));
    loadComments(ratingId).catch((error) => notify?.({ message: error.message, type: 'error' }));
  }, [loadComments, notify]);

  const getDraft = useCallback((ratingId, parentCommentId = null) => {
    return commentDrafts[getReplyKey(ratingId, parentCommentId)] || { text: '', score: String(DEFAULT_COMMENT_SCORE) };
  }, [commentDrafts]);

  const updateDraft = useCallback((ratingId, parentCommentId, patch) => {
    const key = getReplyKey(ratingId, parentCommentId);
    setCommentDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] || { text: '', score: String(DEFAULT_COMMENT_SCORE) }),
        ...patch
      }
    }));
  }, []);

  const submitComment = useCallback(async (item, parentCommentId = null) => {
    const ratingId = item.ratingId;
    const draft = getDraft(ratingId, parentCommentId);
    const text = draft.text?.trim();
    const score = Number(draft.score || DEFAULT_COMMENT_SCORE);

    if (!text) {
      notify?.({ message: 'Add a comment before replying.', type: 'warning' });
      return;
    }

    if (!isFiveStarScoreInRange(score)) {
      notify?.({ message: 'Add a rating before replying.', type: 'warning' });
      return;
    }

    await BackendApiService.createRatingComment(ratingId, text, score, parentCommentId);
    await loadComments(ratingId, true);
    setCommentDrafts((current) => ({
      ...current,
      [getReplyKey(ratingId, parentCommentId)]: { text: '', score: String(DEFAULT_COMMENT_SCORE) }
    }));
    setExpandedRatings((current) => (current.includes(ratingId) ? current : [...current, ratingId]));
    if (parentCommentId != null) {
      const replyKey = getReplyKey(ratingId, parentCommentId);
      setExpandedReplyKeys((current) => (current.includes(replyKey) ? current : [...current, replyKey]));
      setActiveComposer(replyKey);
    } else {
      setActiveComposer(getComposerKey(ratingId, 'comment'));
    }
    updateItem?.(ratingId, (current) => ({ ...current, commentCount: (current.commentCount || 0) + 1 }));
  }, [getDraft, loadComments, notify, updateItem]);

  const toggleLike = useCallback(async (item) => {
    const wasLiked = Boolean(item.likedByCurrentUser);
    updateItem?.(item.ratingId, (current) => ({
      ...current,
      likedByCurrentUser: !wasLiked,
      likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? -1 : 1))
    }));

    try {
      const updated = wasLiked
        ? await BackendApiService.unlikeRating(item.ratingId)
        : await BackendApiService.likeRating(item.ratingId);
      if (updated) {
        updateItem?.(item.ratingId, (current) => ({ ...current, ...updated }));
      }
    } catch (error) {
      updateItem?.(item.ratingId, (current) => ({
        ...current,
        likedByCurrentUser: wasLiked,
        likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? 1 : -1))
      }));
      notify?.({ message: error.message || 'Failed to like post', type: 'error' });
    }
  }, [notify, updateItem]);

  const toggleRerateComposer = useCallback((item) => {
    const ratingId = item.ratingId;
    const key = getComposerKey(ratingId, 'rerate');
    setRerateDrafts((current) => ({
      ...current,
      [ratingId]: current[ratingId] || {
        score: String(item.score || 4),
        reviewText: ''
      }
    }));
    setActiveComposer((current) => (current === key ? null : key));
  }, []);

  const submitRerate = useCallback(async (ratingId, refresh) => {
    const draft = rerateDrafts[ratingId] || {};
    const score = Number(draft.score);
    if (!isFiveStarScoreInRange(score)) {
      notify?.({ message: 'Add a score before re-rating.', type: 'warning' });
      return;
    }

    await BackendApiService.rerate(ratingId, score, draft.reviewText || '');
    setRerateDrafts((current) => ({ ...current, [ratingId]: { score: '', reviewText: '' } }));
    setActiveComposer(null);
    await refresh?.();
  }, [notify, rerateDrafts]);

  const toggleReplies = useCallback((comment, replyKey) => {
    setExpandedReplyKeys((current) => (
      current.includes(replyKey) ? current.filter((key) => key !== replyKey) : [...current, replyKey]
    ));
  }, []);

  return {
    notify,
    activeComposer,
    setActiveComposer,
    commentsByRating,
    commentDrafts,
    expandedRatings,
    expandedReplyKeys,
    rerateDrafts,
    setRerateDrafts,
    getComposerKey,
    getReplyKey,
    getDraft,
    updateDraft,
    loadComments,
    toggleComments,
    openCommentComposer,
    submitComment,
    toggleLike,
    toggleRerateComposer,
    submitRerate,
    toggleReplies
  };
};
