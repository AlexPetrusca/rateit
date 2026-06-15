import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import CommentThread from '../components/CommentThread.jsx';
import FeedTimeline from '../components/FeedTimeline.jsx';
import PostActions from '../components/PostActions.jsx';
import StarRating from '../components/StarRating.jsx';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const FIVE_STAR_SCALE = { max: 5, symbol: 'star' };
const TOPIC_PAGE_SIZE = 5;

const formatAverageRating = (value) => {
    const score = Number(value);

    if (!Number.isFinite(score)) {
        return '0';
    }

    return score.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const AVERAGE_STAR_POINTS = '50 5 61 36 95 36 67 57 78 91 50 72 22 91 33 57 5 36 39 36';

const AverageStarRating = ({ value, max = 5, label }) => {
    const score = Number(value);
    const starCount = Number.isFinite(max) && max > 0 ? Math.round(max) : 5;
    const clampedScore = Number.isFinite(score) ? Math.max(0, Math.min(starCount, score)) : 0;

    return (
        <span className="topic-average-stars" aria-label={label}>
            {Array.from({ length: starCount }, (_, index) => {
                const fill = Math.max(0, Math.min(1, clampedScore - index));
                const clipId = `topic-average-star-clip-${index}`;

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
                        <polygon points={AVERAGE_STAR_POINTS} fill="#cfd9de" />
                        <polygon points={AVERAGE_STAR_POINTS} fill="#1d9bf0" clipPath={`url(#${clipId})`} />
                    </svg>
                );
            })}
        </span>
    );
};

const formatScoreValue = (scoreValue, ratingScale) => {
    const score = Number(scoreValue);
    const max = Number(ratingScale?.max);
    const symbol = ratingScale?.symbol === 'star'
        ? 'stars'
        : ratingScale?.symbol;

    if (!Number.isFinite(score)) {
        return '';
    }

    const displayScore = Number.isInteger(score) ? score.toString() : score.toFixed(1);
    const displayMax = Number.isFinite(max)
        ? (Number.isInteger(max) ? max.toString() : max.toFixed(1))
        : '';

    return `${displayScore}${Number.isFinite(max) ? ` / ${displayMax}` : ''}${symbol ? ` ${symbol}` : ''}`;
};

const Topic = () => {
    const navigate = useNavigate();
    const { rateableItemId: routeRateableItemId } = useParams();
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
    const [topicComposerDraft, setTopicComposerDraft] = useState({ score: '', reviewText: '' });
    const [hoveredTopicScore, setHoveredTopicScore] = useState(null);
    const [commentsByRating, setCommentsByRating] = useState({});
    const [commentDrafts, setCommentDrafts] = useState({});
    const [hoveredCommentScores, setHoveredCommentScores] = useState({});
    const [expandedTopicImageUrl, setExpandedTopicImageUrl] = useState(null);
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
    const topicComposerScore = hoveredTopicScore ?? Number(topicComposerDraft.score);

    const isFullyAuthenticated = isAuthenticated && user != null;

    useEffect(() => {
        if (!isFullyAuthenticated) {
            return;
        }

        setFeedItems([]);
        setTopicDetails(null);
        setFeedPage(0);
        setHasMoreFeed(true);
        setActiveComposer(null);
        setTopicComposerDraft({ score: '', reviewText: '' });
        setHoveredTopicScore(null);
        setCommentsByRating({});
        setCommentDrafts({});
        setHoveredCommentScores({});
    }, [isFullyAuthenticated, topicRateableItemId]);

    useEffect(() => {
        if (!isFullyAuthenticated) {
            setFeedItems([]);
            setTopicDetails(null);
            setFeedPage(0);
            setHasMoreFeed(true);
            setIsFeedLoading(false);
            setIsFeedLoadingMore(false);
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

    const getDefaultCommentScore = () => 2.5;
    const isScoreInRange = (score) => Number.isFinite(score) && score >= 0.5 && score <= 5;
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

    const openPost = (rateableItemId) => {
        if (rateableItemId == null) {
            return;
        }

        navigate(`/topics/${rateableItemId}`);
    };

    const openTopic = (rateableItemId) => {
        if (rateableItemId == null) {
            return;
        }

        navigate(`/topics/${rateableItemId}`);
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

    const openComments = async (ratingId) => {
        const key = getComposerKey(ratingId, 'comment');
        setActiveComposer((current) => (current === key ? null : key));

        if (commentsByRating[ratingId]) {
            return;
        }

        try {
            const comments = await BackendApiService.getRatingComments(ratingId);
            setCommentsByRating((current) => ({
                ...current,
                [ratingId]: comments
            }));
        } catch (error) {
            notify({ message: error.message || 'Failed to load comments', type: 'error' });
        }
    };

    const submitComment = async (item, parentCommentId = null) => {
        const ratingId = item.ratingId;
        const draft = getCommentDraft(ratingId, parentCommentId);
        const draftKey = getCommentDraftKey(ratingId, parentCommentId);
        const text = draft.text?.trim();
        const score = Number(draft.score || getDefaultCommentScore(item));

        if (!text) {
            notify({ message: 'Add a comment before replying.', type: 'warning' });
            return;
        }

        if (!isScoreInRange(score)) {
            notify({ message: 'Add a rating before replying.', type: 'warning' });
            return;
        }

        try {
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
            setActiveComposer(getComposerKey(ratingId, 'comment'));
            updateFeedItem(ratingId, (item) => ({
                ...item,
                commentCount: (item.commentCount || 0) + 1
            }));
        } catch (error) {
            notify({ message: error.message || 'Failed to comment', type: 'error' });
        }
    };

    const renderCommentComposer = (item, parentCommentId = null) => {
        const ratingId = item.ratingId;
        const draft = getCommentDraft(ratingId, parentCommentId);
        const commentScore = draft.score || getDefaultCommentScore(item);
        const scoreInputId = `comment-score-${ratingId}-${parentCommentId || 'root'}`;
        const draftKey = getCommentDraftKey(ratingId, parentCommentId);
        const previewScore = hoveredCommentScores[draftKey] || commentScore;

        return (
            <div className={parentCommentId == null ? 'comment-composer' : 'comment-composer comment-composer-nested'}>
                <div className="comment-rating-control">
                    <label id={`${scoreInputId}-label`}>Your rating</label>
                    <output aria-live="polite">
                        {formatScoreValue(previewScore, FIVE_STAR_SCALE)}
                    </output>
                    <StarRating
                        value={previewScore}
                        label={`Selected rating: ${formatScoreValue(commentScore, FIVE_STAR_SCALE)}`}
                        size="sm"
                        interactive
                        onChange={(nextScore) => updateCommentDraft(ratingId, parentCommentId, 'score', nextScore.toString())}
                        onHoverChange={(nextScore) => setHoveredCommentScores((current) => {
                            const next = { ...current };

                            if (nextScore == null) {
                                delete next[draftKey];
                            } else {
                                next[draftKey] = nextScore;
                            }

                            return next;
                        })}
                    />
                </div>
                <textarea
                    value={draft.text}
                    onChange={(event) => updateCommentDraft(ratingId, parentCommentId, 'text', event.target.value)}
                    placeholder={parentCommentId == null ? 'Add your take on this take' : 'Reply in thread'}
                    rows="3"
                />
                <div className="composer-actions">
                    <button type="button" onClick={() => submitComment(item, parentCommentId)}>
                        Reply
                    </button>
                </div>
            </div>
        );
    };

    const renderComments = (item) => {
        const ratingId = item.ratingId;
        const comments = commentsByRating[ratingId] || [];

        return (
            <div className="feed-composer">
                <div className="comment-list">
                    {comments.length === 0 ? (
                        <p className="feed-muted">No comments yet.</p>
                    ) : (
                        <CommentThread
                            comments={comments}
                            onAuthorClick={openProfile}
                            onReplyClick={(comment) => {
                                const replyKey = getCommentReplyKey(item.ratingId, comment.id);
                                setActiveComposer((current) => (
                                    current === replyKey
                                        ? getComposerKey(item.ratingId, 'comment')
                                        : replyKey
                                ));
                            }}
                            activeReplyKey={activeComposer}
                            getReplyKey={(comment) => getCommentReplyKey(item.ratingId, comment.id)}
                            renderReplyComposer={(comment) => renderCommentComposer(item, comment.id)}
                        />
                    )}
                </div>
                {activeComposer === getComposerKey(ratingId, 'comment') && renderCommentComposer(item)}
            </div>
        );
    };

    const submitTopicRating = async () => {
        const sourceRatingId = feedItems.find((item) => !item.deleted && !item.deletedAt)?.ratingId ?? null;
        const score = Number(topicComposerDraft.score);
        const reviewText = topicComposerDraft.reviewText || '';

        if (sourceRatingId == null) {
            notify({ message: 'Add a rating before posting another one to this topic.', type: 'warning' });
            return;
        }

        if (!isScoreInRange(score)) {
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
                <main className="twitter-shell">
                    <>
                        <Paper elevation={2} className="topic-summary-card">
                            <Stack spacing={1}>
                                {topicMediaUrl && (
                                    <button
                                        type="button"
                                        className="topic-summary-media-button"
                                        onClick={() => setExpandedTopicImageUrl(topicMediaUrl)}
                                        aria-label="Open topic photo"
                                    >
                                        <img
                                            src={topicMediaUrl}
                                            alt={topicLabel}
                                            className="topic-summary-media"
                                        />
                                    </button>
                                )}
                                {topicLabel && (
                                    <Typography variant="h5" component="div" fontWeight={700}>
                                        {topicLabel}
                                    </Typography>
                                )}
                                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={700}>
                                        {topicRatingCount}
                                    </Typography>
                                    <AverageStarRating
                                        value={topicAverageRating}
                                        label={`Average rating: ${formatAverageRating(topicAverageRating)} out of 5`}
                                    />
                                </Stack>
                            </Stack>
                        </Paper>

                        {isFeedLoading && <p className="feed-status">Loading ratings...</p>}
                        {!isFeedLoading && !feedError && feedItems.length === 0 && (
                            <p className="feed-status">No ratings yet.</p>
                        )}

                        <FeedTimeline
                            items={displayedFeedItems}
                            onAuthorClick={openProfile}
                            onPostClick={openPost}
                            showTopicText={false}
                            showMedia={false}
                            renderFooter={(item) => {
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
                                        onComment={() => openComments(item.ratingId)}
                                        onEdit={canEdit ? () => navigate(`/posts/${item.ratingId}/edit`) : undefined}
                                    />
                                );
                            }}
                            renderAfterItem={(item) => {
                                const isCommentThreadActive = activeComposer?.startsWith(`${item.ratingId}:comment`);

                                return (
                                    <>
                                        {isCommentThreadActive && renderComments(item)}
                                    </>
                                );
                            }}
                            sentinelRef={feedSentinelRef}
                            hasMore={hasMoreFeed}
                            isLoadingMore={isFeedLoadingMore}
                            loadingMoreMessage="Loading more ratings..."
                            endMessage="You’ve reached the end of the topic."
                            onTopicClick={openTopic}
                        />

                        {!!feedItems.length && (
                            <div className="feed-composer topic-rating-composer">
                                <label id="topic-rating-label">Add your rating</label>
                                <div className="score-row">
                                    <output className="score-value">
                                        {Number.isFinite(topicComposerScore)
                                            ? `${topicComposerScore.toFixed(1)} / 5`
                                            : '0.0 / 5'}
                                    </output>
                                    <StarRating
                                        value={Number.isFinite(topicComposerScore) ? topicComposerScore : 0}
                                        label="Selected rating for this topic"
                                        size="lg"
                                        interactive
                                        onChange={(nextScore) => setTopicComposerDraft((current) => ({
                                            ...current,
                                            score: nextScore.toString()
                                        }))}
                                        onHoverChange={setHoveredTopicScore}
                                    />
                                </div>
                                <textarea
                                    value={topicComposerDraft.reviewText}
                                    onChange={(event) => setTopicComposerDraft((current) => ({
                                        ...current,
                                        reviewText: event.target.value
                                    }))}
                                    placeholder="Add your take on this topic"
                                    rows="3"
                                />
                                <div className="composer-actions">
                                    <button type="button" onClick={submitTopicRating}>
                                        Add rating
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isFeedLoading && feedError && (
                            <div className="inline-error">{feedError}</div>
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
                <main className="guest-shell">
                    <div className="guest-card">
                        <h2>Welcome to Critic!</h2>
                        <p>Please login to continue.</p>
                    </div>
                </main>
            )}
        </div>
    );
};

export default Topic;
