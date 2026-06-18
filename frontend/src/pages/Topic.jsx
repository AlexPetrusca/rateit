import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import UserAvatar from '../components/UserAvatar.jsx';
import CommentComposer from '../components/CommentComposer.jsx';
import CommentThread from '../components/CommentThread.jsx';
import FeedTimeline from '../components/FeedTimeline.jsx';
import PostActions from '../components/PostActions.jsx';
import RatingComposer from '../components/RatingComposer.jsx';
import { parseRichText } from '../components/RichText.jsx';
import BackendApiService from '../services/BackendApiService';
import {
    DEFAULT_COMMENT_SCORE,
    isFiveStarScoreInRange
} from '../utils/ratingDisplay.js';
import { getBackTarget } from '../utils/navigationHistory';
import '../App.css';

const TOPIC_PAGE_SIZE = 5;

const formatAverageRating = (value) => {
    const score = Number(value);

    if (!Number.isFinite(score)) {
        return '0';
    }

    return score.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const AVERAGE_STAR_POINTS = '50 5 61 36 95 36 67 57 78 91 50 72 22 91 33 57 5 36 39 36';
const AVERAGE_STAR_FILLED_COLOR = '#ff303a';
const AVERAGE_STAR_EMPTY_COLOR = '#cfd9de';

let averageStarRatingCounter = 0;

const AverageStarRating = ({ value, max = 5, label }) => {
    const instanceId = useRef(++averageStarRatingCounter);
    const score = Number(value);
    const starCount = Number.isFinite(max) && max > 0 ? Math.round(max) : 5;
    const clampedScore = Number.isFinite(score) ? Math.max(0, Math.min(starCount, score)) : 0;

    return (
        <span className="topic-average-stars" aria-label={label}>
            {Array.from({ length: starCount }, (_, index) => {
                const fill = Math.max(0, Math.min(1, clampedScore - index));
                const clipId = `topic-average-star-clip-${instanceId.current}-${index}`;

                return (
                    <svg
                        key={index + 1}
                        className="topic-average-star-svg"
                        viewBox="0 0 100 100"
                        aria-hidden="true"
                    >
                        <defs>
                            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                                <rect x="0" y="0" width={fill} height="1" />
                            </clipPath>
                        </defs>
                        <polygon points={AVERAGE_STAR_POINTS} fill={AVERAGE_STAR_EMPTY_COLOR} />
                        <polygon points={AVERAGE_STAR_POINTS} fill={AVERAGE_STAR_FILLED_COLOR} clipPath={`url(#${clipId})`} />
                    </svg>
                );
            })}
        </span>
    );
};

const Topic = () => {
    const navigate = useNavigate();
    const { rateableItemId: routeRateableItemId } = useParams();
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const currentUserId = user?.userId ?? user?.id ?? null;
    const { notify } = useNotifications();
    const [feedItems, setFeedItems] = useState([]);
    const [topicDetails, setTopicDetails] = useState(null);
    const [isFeedLoading, setIsFeedLoading] = useState(false);
    const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false);
    const [feedError, setFeedError] = useState(null);
    const [feedPage, setFeedPage] = useState(0);
    const [hasMoreFeed, setHasMoreFeed] = useState(true);
    const [activeComposer, setActiveComposer] = useState(null);
    const [expandedRatingId, setExpandedRatingId] = useState(null);
    const [activeCommentEditKey, setActiveCommentEditKey] = useState(null);
    const [topicComposerDraft, setTopicComposerDraft] = useState({ score: '', reviewText: '' });
    const [hoveredTopicScore, setHoveredTopicScore] = useState(null);
    const [commentsByRating, setCommentsByRating] = useState({});
    const [loadingCommentsByRating, setLoadingCommentsByRating] = useState({});
    const [commentDrafts, setCommentDrafts] = useState({});
    const [hoveredCommentScores, setHoveredCommentScores] = useState({});
    const [expandedCommentReplyKeys, setExpandedCommentReplyKeys] = useState([]);
    const [expandedTopicImageUrl, setExpandedTopicImageUrl] = useState(null);
    const [fullscreenReview, setFullscreenReview] = useState(null);
    const [topicPhotoBlur, setTopicPhotoBlur] = useState(0);
    const feedSentinelRef = useRef(null);

    const topicRateableItemId = useMemo(() => {
        const parsed = Number(routeRateableItemId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [routeRateableItemId]);

    const topicLabel = useMemo(() => {
        return topicDetails?.body || topicDetails?.title || feedItems[0]?.rateableItem?.body || feedItems[0]?.rateableItem?.title || '';
    }, [feedItems, topicDetails]);

    const topicRatingCount = topicDetails?.ratingCount ?? feedItems.length;
    const topicAverageRating = useMemo(() => {
        if (topicDetails?.averageScore != null) {
            return Number(topicDetails.averageScore);
        }

        if (feedItems.length === 0) {
            return 0;
        }

        const total = feedItems.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
        return total / feedItems.length;
    }, [feedItems, topicDetails]);
    const displayedFeedItems = useMemo(() => [...feedItems].reverse(), [feedItems]);
    const topicMediaUrl = useMemo(() => {
        const mediaObjectKey = topicDetails?.mediaObjectKey || feedItems[0]?.rateableItem?.mediaObjectKey;
        return mediaObjectKey ? `/api/s3/images/${mediaObjectKey}` : null;
    }, [feedItems, topicDetails]);
    const hasTopicPhoto = Boolean(topicMediaUrl);
    const topicTitleStyle = useMemo(() => {
        const titleLength = topicLabel.trim().length;

        if (titleLength <= 12) {
            return { '--topic-photo-title-size': 'clamp(2.6rem, 7.5vw, 5.2rem)' };
        }

        if (titleLength <= 24) {
            return { '--topic-photo-title-size': 'clamp(2.35rem, 6.8vw, 4.8rem)' };
        }

        if (titleLength <= 40) {
            return { '--topic-photo-title-size': 'clamp(2.1rem, 6vw, 4.2rem)' };
        }

        return { '--topic-photo-title-size': 'clamp(1.9rem, 5.2vw, 3.7rem)' };
    }, [topicLabel]);
    const topicComposerScore = hoveredTopicScore ?? Number(topicComposerDraft.score);

    const isFullyAuthenticated = isAuthenticated && user != null;
    const topicShellClassName = hasTopicPhoto
        ? 'twitter-shell topic-shell topic-photo-shell'
        : 'twitter-shell topic-shell topic-photo-shell topic-photo-shell--no-photo';
    const topicHeroClassName = hasTopicPhoto
        ? 'topic-photo-hero'
        : 'topic-photo-hero topic-photo-hero--no-photo';
    const topicHeroAriaLabel = topicLabel ? `${topicLabel} topic header` : 'Topic header';

    useLayoutEffect(() => {
        if (!isFullyAuthenticated) {
            return;
        }

        const previousScrollRestoration = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        setTopicPhotoBlur(0);
        setFeedItems([]);
        setTopicDetails(null);
        setFeedPage(0);
        setHasMoreFeed(true);
        setActiveComposer(null);
        setExpandedRatingId(null);
        setActiveCommentEditKey(null);
        setTopicComposerDraft({ score: '', reviewText: '' });
        setHoveredTopicScore(null);
        setCommentsByRating({});
        setLoadingCommentsByRating({});
        setCommentDrafts({});
        setHoveredCommentScores({});
        setExpandedCommentReplyKeys([]);

        return () => {
            window.history.scrollRestoration = previousScrollRestoration;
        };
    }, [isFullyAuthenticated, topicRateableItemId]);

    useEffect(() => {
        if (!isFullyAuthenticated) {
            setFeedItems([]);
            setTopicDetails(null);
            setFeedPage(0);
            setHasMoreFeed(true);
            setIsFeedLoading(false);
            setIsFeedLoadingMore(false);
            setExpandedRatingId(null);
            setExpandedCommentReplyKeys([]);
            return;
        }

        if (topicRateableItemId == null) {
            setFeedError('Topic not found.');
            setIsFeedLoading(false);
            return;
        }

        let isMounted = true;
        const isInitialLoad = feedPage === 0;
        setIsFeedLoading(isInitialLoad);
        setIsFeedLoadingMore(!isInitialLoad);
        setFeedError(null);

        BackendApiService.getTopicRatings({ rateableItemId: topicRateableItemId, page: feedPage, size: TOPIC_PAGE_SIZE })
            .then((items) => {
                if (isMounted) {
                    setFeedItems((current) => (feedPage === 0 ? items : [...current, ...items]));
                    setHasMoreFeed(items.length === TOPIC_PAGE_SIZE);
                }
            })
            .catch((error) => {
                if (isMounted) {
                    setFeedError(error.message);
                    notify({ message: error.message, type: 'error', persistent: true });
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsFeedLoading(false);
                    setIsFeedLoadingMore(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isFullyAuthenticated, feedPage, topicRateableItemId]);

    useEffect(() => {
        if (!isFullyAuthenticated) {
            return;
        }

        if (topicRateableItemId == null) {
            return;
        }

        let isMounted = true;

        BackendApiService.getTopic(topicRateableItemId)
            .then((topic) => {
                if (isMounted) {
                    setTopicDetails(topic);
                }
            })
            .catch((error) => {
                if (isMounted) {
                    notify({ message: error.message || 'Failed to load topic', type: 'error', persistent: true });
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isFullyAuthenticated, topicRateableItemId]);

    useEffect(() => {
        if (!isFullyAuthenticated || feedError || isFeedLoading || isFeedLoadingMore || !hasMoreFeed) {
            return undefined;
        }

        const sentinel = feedSentinelRef.current;
        if (!sentinel) {
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setFeedPage((current) => current + 1);
            }
        }, {
            root: null,
            rootMargin: '200px 0px',
            threshold: 0
        });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [isFullyAuthenticated, feedError, isFeedLoading, isFeedLoadingMore, hasMoreFeed]);

    useEffect(() => {
        let rafId = 0;

        const updateBlur = () => {
            rafId = 0;
            setTopicPhotoBlur(Math.min(14, window.scrollY / 70));
        };

        const onScroll = () => {
            if (rafId !== 0) {
                return;
            }

            rafId = window.requestAnimationFrame(updateBlur);
        };

        updateBlur();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            if (rafId !== 0) {
                window.cancelAnimationFrame(rafId);
            }

            window.removeEventListener('scroll', onScroll);
        };
    }, [topicRateableItemId]);

    useEffect(() => {
        if (!isFullyAuthenticated || expandedRatingId == null || commentsByRating[expandedRatingId] != null) {
            return;
        }

        let isMounted = true;

        setLoadingCommentsByRating((current) => ({
            ...current,
            [expandedRatingId]: true
        }));

        BackendApiService.getRatingComments(expandedRatingId)
            .then((comments) => {
                if (!isMounted) {
                    return;
                }

                setCommentsByRating((current) => ({
                    ...current,
                    [expandedRatingId]: comments
                }));
            })
            .catch((error) => {
                if (isMounted) {
                    notify({ message: error.message || 'Failed to load comments', type: 'error' });
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoadingCommentsByRating((current) => ({
                        ...current,
                        [expandedRatingId]: false
                    }));
                }
            });

        return () => {
            isMounted = false;
        };
    }, [commentsByRating, expandedRatingId, isFullyAuthenticated, notify]);

    useEffect(() => {
        const targetId = location.state?.openReviewId;
        if (!targetId || !feedItems.length) return;
        const item = feedItems.find((f) => f.ratingId === targetId);
        if (item) setFullscreenReview(item);
    }, [feedItems, location.state?.openReviewId]);

    const updateFeedItem = (ratingId, updater) => {
        setFeedItems((items) => items.map((item) => (
            item.ratingId === ratingId ? updater(item) : item
        )));
    };

    const getCommentDraftKey = (ratingId, parentCommentId = null) => (
        parentCommentId == null ? `${ratingId}:root` : `${ratingId}:${parentCommentId}`
    );

    const getCommentDraft = (ratingId, parentCommentId = null) => {
        const draft = commentDrafts[getCommentDraftKey(ratingId, parentCommentId)];

        if (typeof draft === 'string') {
            return { text: draft, score: '' };
        }

        return draft || { text: '', score: '' };
    };

    const updateCommentDraft = (ratingId, parentCommentId, field, value) => {
        const draftKey = getCommentDraftKey(ratingId, parentCommentId);

        setCommentDrafts((current) => ({
            ...current,
            [draftKey]: {
                ...(typeof current[draftKey] === 'string'
                    ? { text: current[draftKey], score: '' }
                    : current[draftKey] || { text: '', score: '' }),
                [field]: value
            }
        }));
    };

    const getCommentEditDraftKey = (commentId) => `edit:${commentId}`;

    const getCommentDraftByKey = (draftKey) => {
        const draft = commentDrafts[draftKey];

        if (typeof draft === 'string') {
            return { text: draft, score: '' };
        }

        return draft || { text: '', score: '' };
    };

    const updateCommentDraftByKey = (draftKey, field, value) => {
        setCommentDrafts((current) => ({
            ...current,
            [draftKey]: {
                ...(typeof current[draftKey] === 'string'
                    ? { text: current[draftKey], score: '' }
                    : current[draftKey] || { text: '', score: '' }),
                [field]: value
            }
        }));
    };

    const replaceCommentInTree = (comments, updatedComment) => {
        let changed = false;

        const nextComments = comments.map((comment) => {
            if (comment.id === updatedComment.id) {
                changed = true;
                return {
                    ...comment,
                    ...updatedComment,
                    replies: Array.isArray(updatedComment.replies) && updatedComment.replies.length > 0
                        ? updatedComment.replies
                        : comment.replies
                };
            }

            if (Array.isArray(comment.replies) && comment.replies.length > 0) {
                const nextReplies = replaceCommentInTree(comment.replies, updatedComment);

                if (nextReplies !== comment.replies) {
                    changed = true;
                    return {
                        ...comment,
                        replies: nextReplies
                    };
                }
            }

            return comment;
        });

        return changed ? nextComments : comments;
    };

    const updateCommentById = (comments, commentId, updater) => {
        let changed = false;

        const nextComments = comments.map((comment) => {
            if (comment.id === commentId) {
                changed = true;
                return updater(comment);
            }

            if (Array.isArray(comment.replies) && comment.replies.length > 0) {
                const nextReplies = updateCommentById(comment.replies, commentId, updater);

                if (nextReplies !== comment.replies) {
                    changed = true;
                    return {
                        ...comment,
                        replies: nextReplies
                    };
                }
            }

            return comment;
        });

        return changed ? nextComments : comments;
    };

    const updateCommentsByRating = (ratingId, updater) => {
        setCommentsByRating((current) => ({
            ...current,
            [ratingId]: updater(current[ratingId] || [])
        }));
    };

    const getComposerKey = (ratingId, type) => `${ratingId}:${type}`;
    const getCommentReplyKey = (ratingId, parentCommentId = null) => (
        parentCommentId == null ? getComposerKey(ratingId, 'comment') : `${ratingId}:comment:${parentCommentId}`
    );

    const openProfile = (userId) => {
        if (userId == null) {
            return;
        }

        navigate(`/users/${userId}`);
    };

    const toggleLike = async (item) => {
        const wasLiked = Boolean(item.likedByCurrentUser);

        updateFeedItem(item.ratingId, (current) => ({
            ...current,
            likedByCurrentUser: !wasLiked,
            likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? -1 : 1))
        }));

        try {
            const updated = wasLiked
                ? await BackendApiService.unlikeRating(item.ratingId)
                : await BackendApiService.likeRating(item.ratingId);

            if (updated) {
                updateFeedItem(item.ratingId, (current) => ({
                    ...current,
                    likedByCurrentUser: updated.likedByCurrentUser ?? current.likedByCurrentUser,
                    likeCount: updated.likeCount ?? current.likeCount
                }));
            }
        } catch (error) {
            updateFeedItem(item.ratingId, (current) => ({
                ...current,
                likedByCurrentUser: wasLiked,
                likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? 1 : -1))
            }));
            notify({ message: error.message || 'Failed to like rating', type: 'error' });
        }
    };

    const toggleRatingExpansion = (ratingId) => {
        setExpandedRatingId((current) => (current === ratingId ? null : ratingId));
        setActiveComposer(null);
        setActiveCommentEditKey(null);
        setExpandedCommentReplyKeys([]);
    };

    const openRatingComposer = (ratingId) => {
        setExpandedRatingId(ratingId);
        setActiveComposer(getComposerKey(ratingId, 'comment'));
    };

    const openEditComment = (item, comment) => {
        const draftKey = getCommentEditDraftKey(comment.id);
        const currentDraft = getCommentDraftByKey(draftKey);

        setCommentDrafts((current) => ({
            ...current,
            [draftKey]: {
                ...currentDraft,
                text: comment.text || '',
                score: comment.score != null ? comment.score.toString() : ''
            }
        }));
        setActiveCommentEditKey((current) => (current === draftKey ? null : draftKey));
        setActiveComposer(getComposerKey(item.ratingId, 'comment'));
    };

    const toggleCommentLike = async (item, comment) => {
        const wasLiked = Boolean(comment.likedByCurrentUser);
        const ratingId = item.ratingId;

        updateCommentsByRating(ratingId, (comments) => updateCommentById(comments, comment.id, (current) => ({
            ...current,
            likedByCurrentUser: !wasLiked,
            likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? -1 : 1))
        })));

        try {
            const updated = wasLiked
                ? await BackendApiService.unlikeComment(comment.id)
                : await BackendApiService.likeComment(comment.id);

            if (updated) {
                updateCommentsByRating(ratingId, (comments) => replaceCommentInTree(comments, updated));
            }
        } catch (error) {
            updateCommentsByRating(ratingId, (comments) => updateCommentById(comments, comment.id, (current) => ({
                ...current,
                likedByCurrentUser: wasLiked,
                likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? 1 : -1))
            })));
            notify({ message: error.message || 'Failed to like comment', type: 'error' });
        }
    };

    const submitComment = async (item, parentCommentId = null, editingComment = null) => {
        const ratingId = item.ratingId;
        const draftKey = editingComment ? getCommentEditDraftKey(editingComment.id) : getCommentDraftKey(ratingId, parentCommentId);
        const draft = editingComment ? getCommentDraftByKey(draftKey) : getCommentDraft(ratingId, parentCommentId);
        const text = draft.text?.trim();
        const score = Number(draft.score || DEFAULT_COMMENT_SCORE);

        if (!text) {
            notify({ message: editingComment ? 'Add a comment before saving.' : 'Add a comment before replying.', type: 'warning' });
            return;
        }

        if (!isFiveStarScoreInRange(score)) {
            notify({ message: editingComment ? 'Add a rating before saving.' : 'Add a rating before replying.', type: 'warning' });
            return;
        }

        try {
            if (editingComment) {
                const updatedComment = await BackendApiService.updateRatingComment(editingComment.id, text, score);
                updateCommentsByRating(ratingId, (comments) => replaceCommentInTree(comments, updatedComment));
                setCommentDrafts((current) => {
                    const next = { ...current };
                    delete next[draftKey];
                    return next;
                });
                setActiveCommentEditKey(null);
            } else {
                await BackendApiService.createRatingComment(ratingId, text, score, parentCommentId);
                const comments = await BackendApiService.getRatingComments(ratingId);
                setCommentsByRating((current) => ({
                    ...current,
                    [ratingId]: comments
                }));
                setCommentDrafts((current) => ({
                    ...current,
                    [draftKey]: { text: '', score: '' }
                }));
                setActiveComposer(parentCommentId == null
                    ? getComposerKey(ratingId, 'comment')
                    : getCommentReplyKey(ratingId, parentCommentId));
                if (parentCommentId != null) {
                    const replyKey = getCommentReplyKey(ratingId, parentCommentId);
                    setExpandedCommentReplyKeys((current) => (
                        current.includes(replyKey) ? current : [...current, replyKey]
                    ));
                }
                updateFeedItem(ratingId, (item) => ({
                    ...item,
                    commentCount: (item.commentCount || 0) + 1
                }));
            }
        } catch (error) {
            notify({ message: error.message || (editingComment ? 'Failed to update comment' : 'Failed to comment'), type: 'error' });
        }
    };

    const renderCommentComposer = (item, parentCommentId = null, editingComment = null) => {
        const ratingId = item.ratingId;
        const draftKey = editingComment ? getCommentEditDraftKey(editingComment.id) : getCommentDraftKey(ratingId, parentCommentId);
        const draft = editingComment ? getCommentDraftByKey(draftKey) : getCommentDraft(ratingId, parentCommentId);
        const commentScore = draft.score || (editingComment?.score != null ? editingComment.score : DEFAULT_COMMENT_SCORE);
        const previewScore = hoveredCommentScores[draftKey] || commentScore;
        const composerTitle = editingComment ? 'Edit your take on this take' : 'Add your take on this take';
        const composerPlaceholder = editingComment ? 'Edit your take on this take' : (parentCommentId == null ? 'Add your take on this take' : 'Reply in thread');
        const submitLabel = editingComment ? 'Save' : 'Reply';
        const isNestedComposer = parentCommentId != null || (editingComment?.parentCommentId != null);

        return (
            <CommentComposer
                className="comment-composer topic-comment-composer"
                nested={isNestedComposer}
                title={composerTitle}
                score={commentScore}
                previewScore={previewScore}
                onScoreChange={(nextScore) => updateCommentDraftByKey(draftKey, 'score', nextScore.toString())}
                onHoverChange={(nextScore) => setHoveredCommentScores((current) => {
                    const next = { ...current };

                    if (nextScore == null) {
                        delete next[draftKey];
                    } else {
                        next[draftKey] = nextScore;
                    }

                    return next;
                })}
                text={draft.text}
                onTextChange={(value) => updateCommentDraftByKey(draftKey, 'text', value)}
                placeholder={composerPlaceholder}
                submitLabel={submitLabel}
                onSubmit={() => submitComment(item, parentCommentId, editingComment)}
                onClose={() => setActiveComposer(null)}
            />
        );
    };

    const toggleTopicCommentReplies = (replyKey) => {
        setExpandedCommentReplyKeys((current) => (
            current.includes(replyKey)
                ? current.filter((key) => key !== replyKey)
                : [...current, replyKey]
        ));
    };

    const renderComments = (item) => {
        const ratingId = item.ratingId;
        const comments = commentsByRating[ratingId];
        const isLoadingComments = Boolean(loadingCommentsByRating[ratingId]);
        const composerKey = getComposerKey(ratingId, 'comment');
        const isComposerOpen = activeComposer === composerKey;

        return (
            <div className="topic-rating-comments comment-panel">
                <div className="comment-list">
                    {isLoadingComments && comments == null && (
                        <p className="feed-muted">Loading comments...</p>
                    )}
                    {!isLoadingComments && comments != null && comments.length === 0 && (
                        <p className="feed-muted">No comments yet.</p>
                    )}
                    {comments != null && comments.length > 0 && (
                        <CommentThread
                            comments={comments}
                            onAuthorClick={openProfile}
                            onReplyClick={(comment) => {
                                const replyKey = getCommentReplyKey(ratingId, comment.id);
                                setActiveComposer((current) => (
                                    current === replyKey
                                        ? getComposerKey(ratingId, 'comment')
                                        : replyKey
                                ));
                            }}
                            onLikeClick={(comment) => toggleCommentLike(item, comment)}
                            onEditClick={(comment) => openEditComment(item, comment)}
                            activeReplyKey={activeComposer}
                            activeEditKey={activeCommentEditKey}
                            getReplyKey={(comment) => getCommentReplyKey(ratingId, comment.id)}
                            getEditKey={(comment) => getCommentEditDraftKey(comment.id)}
                            renderReplyComposer={(comment) => renderCommentComposer(item, comment.id)}
                            renderEditComposer={(comment) => renderCommentComposer(item, null, comment)}
                            currentUserId={currentUserId}
                            replyButtonLabel="Reply"
                            expandedReplyKeys={expandedCommentReplyKeys}
                            onToggleReplies={(comment, replyKey) => toggleTopicCommentReplies(replyKey)}
                            onlyShowExpandedReplies
                            nestRepliesInParentCard
                            rootThreadClassName="topic-comment-root"
                            repliesClassName="comment-replies topic-comment-replies"
                        />
                    )}
                </div>
                {isComposerOpen && renderCommentComposer(item)}
            </div>
        );
    };

    const renderTopicComposer = () => (
        <RatingComposer
            className="feed-composer topic-rating-composer topic-photo-card topic-photo-composer"
            showLabel={false}
            score={Number.isFinite(topicComposerScore) ? topicComposerScore : null}
            previewScore={topicComposerScore}
            onScoreChange={(nextScore) => setTopicComposerDraft((current) => ({
                ...current,
                score: nextScore.toString()
            }))}
            onHoverChange={setHoveredTopicScore}
            text={topicComposerDraft.reviewText}
            onTextChange={(value) => setTopicComposerDraft((current) => ({
                ...current,
                reviewText: value
            }))}
            placeholder="Add your take on this topic"
            submitLabel="Add rating"
            onSubmit={submitTopicRating}
            onClose={() => { const t = getBackTarget(); t === -1 ? navigate(-1) : navigate(t); }}
        />
    );

    const submitTopicRating = async () => {
        const sourceRatingId = feedItems.find((item) => !item.deleted && !item.deletedAt)?.ratingId ?? null;
        const score = Number(topicComposerDraft.score);
        const reviewText = topicComposerDraft.reviewText || '';

        if (sourceRatingId == null) {
            notify({ message: 'Add a rating before posting another one to this topic.', type: 'warning' });
            return;
        }

        if (!isFiveStarScoreInRange(score)) {
            notify({ message: 'Add a score before posting.', type: 'warning' });
            return;
        }

        try {
            await BackendApiService.rerate(sourceRatingId, score, reviewText);
            setTopicComposerDraft({ score: '', reviewText: '' });
            setHoveredTopicScore(null);

            const requestedSize = Math.max(feedItems.length + 1, TOPIC_PAGE_SIZE);
            const items = await BackendApiService.getTopicRatings({
                rateableItemId: topicRateableItemId,
                page: 0,
                size: requestedSize
            });
            setFeedItems(items);
            setHasMoreFeed(items.length === requestedSize);
            const topic = await BackendApiService.getTopic(topicRateableItemId);
            setTopicDetails(topic);
        } catch (error) {
            notify({ message: error.message, type: 'error' });
        }
    };

    return (
        <div className="feed-page">
            {isFullyAuthenticated ? (
                <main className={topicShellClassName}>
                    <>
                        <section
                            className={topicHeroClassName}
                            style={{
                                ...(hasTopicPhoto ? {
                                    '--topic-photo-url': `url(${topicMediaUrl})`,
                                    '--topic-photo-blur': `${topicPhotoBlur}px`
                                } : {
                                    '--topic-photo-blur': `${topicPhotoBlur}px`
                                })
                            }}
                            aria-label={topicHeroAriaLabel}
                        >
                            {hasTopicPhoto && (
                                <button
                                    type="button"
                                    className="topic-photo-hero-button"
                                    onClick={() => setExpandedTopicImageUrl(topicMediaUrl)}
                                    aria-label="Open topic photo"
                                />
                            )}
                            <div className="topic-photo-hero-overlay" />
                            <div className="topic-photo-hero-content">
                                {topicLabel && (
                                    <Typography
                                        variant="h3"
                                        component="h1"
                                        fontWeight={800}
                                        className="topic-photo-title"
                                        style={topicTitleStyle}
                                    >
                                        {parseRichText(topicLabel)}
                                    </Typography>
                                )}
                                <div className="topic-photo-meta">
                                    <div className="topic-photo-rating-row">
                                        <Typography variant="body1" className="topic-photo-average">
                                            {formatAverageRating(topicAverageRating)}
                                        </Typography>
                                        <AverageStarRating
                                            value={topicAverageRating}
                                            label={`Average rating: ${formatAverageRating(topicAverageRating)} out of 5`}
                                        />
                                    </div>
                                    <Typography variant="body2" className="topic-photo-count">
                                        {topicRatingCount} {topicRatingCount === 1 ? 'rating' : 'ratings'}
                                    </Typography>
                                </div>
                            </div>
                        </section>

                        {isFeedLoading && <p className="feed-status">Loading ratings...</p>}
                        {!isFeedLoading && !feedError && feedItems.length === 0 && (
                            <p className="feed-status">No ratings yet.</p>
                        )}

                        <FeedTimeline
                            className="topic-feed topic-photo-feed"
                            items={displayedFeedItems}
                            onAuthorClick={openProfile}
                            onItemClick={(item) => setFullscreenReview(item)}
                            getItemClassName={(item) => (
                                item.ratingId === expandedRatingId
                                    ? 'topic-rating-card is-expanded'
                                    : 'topic-rating-card'
                            )}
                            showTopicText={false}
                            showMedia={false}
                            renderFooter={(item) => {
                                const isExpanded = item.ratingId === expandedRatingId;
                                const canEdit = item.author?.userId != null
                                    && item.author.userId === currentUserId
                                    && !item.deleted
                                    && !item.deletedAt;
                                return (
                                    <PostActions
                                        liked={item.likedByCurrentUser}
                                        likeCount={item.likeCount}
                                        commentCount={item.commentCount}
                                        onLike={() => toggleLike(item)}
                                        onReply={() => openRatingComposer(item.ratingId)}
                                        onComment={() => toggleRatingExpansion(item.ratingId)}
                                        onEdit={canEdit ? () => navigate(`/posts/${item.ratingId}/edit`) : undefined}
                                        shareUrl={`${window.location.origin}/posts/${item.ratingId}`}
                                        commentLabel={isExpanded ? 'Hide comments' : 'Comments'}
                                        replyLabel="Reply"
                                    />
                                );
                            }}
                            renderExpandedContent={(item) => (
                                item.ratingId === expandedRatingId ? renderComments(item) : null
                            )}
                            sentinelRef={feedSentinelRef}
                            hasMore={hasMoreFeed}
                            isLoadingMore={isFeedLoadingMore}
                            loadingMoreMessage="Loading more ratings..."
                        />

                        {!!feedItems.length && renderTopicComposer()}

                        {!isFeedLoading && feedError && (
                            <div className="inline-error">{feedError}</div>
                        )}

                        {fullscreenReview && (
                            <div
                                className="review-fullscreen"
                                role="dialog"
                                aria-modal="true"
                                onClick={() => setFullscreenReview(null)}
                            >
                                <button
                                    type="button"
                                    className="image-lightbox-close"
                                    onClick={() => setFullscreenReview(null)}
                                    aria-label="Close review"
                                >
                                    ×
                                </button>
                                <div
                                    className="review-fullscreen-card"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {fullscreenReview.rateableItem?.mediaObjectKey && (
                                        <img
                                            className="review-fullscreen-image"
                                            src={`/api/s3/images/${fullscreenReview.rateableItem.mediaObjectKey}`}
                                            alt={fullscreenReview.rateableItem?.title || ''}
                                        />
                                    )}
                                    {(fullscreenReview.rateableItem?.title || fullscreenReview.rateableItem?.body) && (
                                        <p className="review-fullscreen-title">
                                            {fullscreenReview.rateableItem?.title || fullscreenReview.rateableItem?.body}
                                        </p>
                                    )}
                                    <div className="review-fullscreen-header">
                                        <UserAvatar
                                            username={fullscreenReview.author?.username}
                                            profilePicUrl={fullscreenReview.author?.profilePicUrl}
                                            size="lg"
                                        />
                                        <div className="review-fullscreen-meta">
                                            <span className="review-fullscreen-author">
                                                {fullscreenReview.author?.username}
                                            </span>
                                            <AverageStarRating
                                                value={fullscreenReview.score}
                                                max={fullscreenReview.ratingScale?.max}
                                                label={`${fullscreenReview.score} stars`}
                                            />
                                        </div>
                                    </div>
                                    {fullscreenReview.reviewText && (
                                        <p className="review-fullscreen-text">
                                            {parseRichText(fullscreenReview.reviewText)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {expandedTopicImageUrl && (
                            <div
                                className="image-lightbox"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Expanded topic photo"
                                onClick={() => setExpandedTopicImageUrl(null)}
                            >
                                <button
                                    type="button"
                                    className="image-lightbox-close"
                                    onClick={() => setExpandedTopicImageUrl(null)}
                                    aria-label="Close photo"
                                >
                                    x
                                </button>
                                <div className="image-lightbox-frame">
                                    <img
                                        src={expandedTopicImageUrl}
                                        alt="Expanded topic"
                                        className="image-lightbox-image"
                                        onClick={(event) => event.stopPropagation()}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                </main>
            ) : (
                <main className="guest-shell" />
            )}
        </div>
    );
};

export default Topic;
