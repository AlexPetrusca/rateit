import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    const [isFeedLoading, setIsFeedLoading] = useState(false);
    const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false);
    const [feedError, setFeedError] = useState(null);
    const [feedPage, setFeedPage] = useState(0);
    const [hasMoreFeed, setHasMoreFeed] = useState(true);
    const [activeComposer, setActiveComposer] = useState(null);
    const [commentsByRating, setCommentsByRating] = useState({});
    const [commentDrafts, setCommentDrafts] = useState({});
    const [hoveredCommentScores, setHoveredCommentScores] = useState({});
    const [hoveredRerateScores, setHoveredRerateScores] = useState({});
    const [rerateDrafts, setRerateDrafts] = useState({});
    const feedSentinelRef = useRef(null);

    const topicRateableItemId = useMemo(() => {
        const parsed = Number(routeRateableItemId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [routeRateableItemId]);

    const topicLabel = useMemo(() => {
        const firstItem = feedItems[0]?.rateableItem;
        return firstItem?.body || firstItem?.title || 'Topic';
    }, [feedItems]);

    const isFullyAuthenticated = isAuthenticated && user != null;

    useEffect(() => {
        if (!isFullyAuthenticated) {
            return;
        }

        setFeedItems([]);
        setFeedPage(0);
        setHasMoreFeed(true);
        setActiveComposer(null);
        setCommentsByRating({});
        setCommentDrafts({});
        setHoveredCommentScores({});
        setHoveredRerateScores({});
        setRerateDrafts({});
    }, [isFullyAuthenticated, topicRateableItemId]);

    useEffect(() => {
        if (!isFullyAuthenticated) {
            setFeedItems([]);
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

    const openPost = (ratingId) => {
        if (ratingId == null) {
            return;
        }

        navigate(`/posts/${ratingId}`);
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

    const submitRerate = async (ratingId) => {
        const draft = rerateDrafts[ratingId] || {};
        const score = Number(draft.score);

        if (!score) {
            notify({ message: 'Add a score before re-rating.', type: 'warning' });
            return;
        }

        try {
            await BackendApiService.rerate(ratingId, score, draft.reviewText || '');
            setRerateDrafts((current) => ({
                ...current,
                [ratingId]: { score: '', reviewText: '' }
            }));
            setActiveComposer(null);
            const items = await BackendApiService.getTopicRatings({
                rateableItemId: topicRateableItemId,
                page: 0,
                size: Math.max(feedItems.length, TOPIC_PAGE_SIZE)
            });
            setFeedItems(items);
        } catch (error) {
            notify({ message: error.message, type: 'error' });
        }
    };

    const renderRerate = (item) => {
        const ratingId = item.ratingId;
        const draft = rerateDrafts[ratingId] || {};
        const currentScore = draft.score ? Number(draft.score) : null;
        const previewScore = hoveredRerateScores[ratingId] ?? currentScore;
        const scoreLabel = Number.isFinite(Number(previewScore))
            ? `${Number(previewScore).toFixed(1)} / 5`
            : '0.0 / 5';

        return (
            <div className="feed-composer">
                <label id={`rerate-score-label-${ratingId}`}>Your rating</label>
                <div className="score-row">
                    <output className="score-value">{scoreLabel}</output>
                    <StarRating
                        value={previewScore ?? 0}
                        label={`Selected rating: ${scoreLabel}`}
                        size="lg"
                        interactive
                        onChange={(nextScore) => setRerateDrafts((current) => ({
                            ...current,
                            [ratingId]: {
                                ...current[ratingId],
                                score: nextScore.toString()
                            }
                        }))}
                        onHoverChange={(nextScore) => setHoveredRerateScores((current) => {
                            const next = { ...current };

                            if (nextScore == null) {
                                delete next[ratingId];
                            } else {
                                next[ratingId] = nextScore;
                            }

                            return next;
                        })}
                    />
                </div>
                <textarea
                    value={draft.reviewText || ''}
                    onChange={(event) => setRerateDrafts((current) => ({
                        ...current,
                        [ratingId]: {
                            ...current[ratingId],
                            reviewText: event.target.value
                        }
                    }))}
                    placeholder="Add your take on this topic"
                    rows="3"
                />
                <div className="composer-actions">
                    <button type="button" onClick={() => submitRerate(ratingId)}>
                        Re-rate
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="feed-page">
            {isFullyAuthenticated ? (
                <main className="twitter-shell">
                    <>
                        <div className="timeline-header">
                            <h1>Topic</h1>
                        </div>
                        <div className="topic-header-copy">
                            <p>{topicLabel}</p>
                        </div>

                        {isFeedLoading && <p className="feed-status">Loading ratings...</p>}
                        {!isFeedLoading && !feedError && feedItems.length === 0 && (
                            <p className="feed-status">No ratings yet.</p>
                        )}

                        <FeedTimeline
                            items={feedItems}
                            onAuthorClick={openProfile}
                            onPostClick={openPost}
                            renderFooter={(item) => {
                                const rerateKey = getComposerKey(item.ratingId, 'rerate');
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
                                        onRerate={() => setActiveComposer((current) => (
                                            current === rerateKey ? null : rerateKey
                                        ))}
                                        onComment={() => openComments(item.ratingId)}
                                        onEdit={canEdit ? () => navigate(`/posts/${item.ratingId}/edit`) : undefined}
                                    />
                                );
                            }}
                            renderAfterItem={(item) => {
                                const rerateKey = getComposerKey(item.ratingId, 'rerate');
                                const isCommentThreadActive = activeComposer?.startsWith(`${item.ratingId}:comment`);

                                return (
                                    <>
                                        {activeComposer === rerateKey && renderRerate(item)}
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

                        {!isFeedLoading && feedError && (
                            <div className="inline-error">{feedError}</div>
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
