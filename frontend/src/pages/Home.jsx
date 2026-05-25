import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import StarRating from '../components/StarRating.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import '../App.css';

const FIVE_STAR_SCALE = { max: 5, symbol: 'star' };
const FEED_PAGE_SIZE = 5;

const Home = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [feedItems, setFeedItems] = useState([]);
    const [isFeedLoading, setIsFeedLoading] = useState(false);
    const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false);
    const [feedError, setFeedError] = useState(null);
    const [feedLimit, setFeedLimit] = useState(FEED_PAGE_SIZE);
    const [hasMoreFeed, setHasMoreFeed] = useState(true);
    const [activeComposer, setActiveComposer] = useState(null);
    const [commentsByRating, setCommentsByRating] = useState({});
    const [commentDrafts, setCommentDrafts] = useState({});
    const [hoveredCommentScores, setHoveredCommentScores] = useState({});
    const [hoveredRerateScores, setHoveredRerateScores] = useState({});
    const [rerateDrafts, setRerateDrafts] = useState({});
    const feedSentinelRef = useRef(null);
    const { notify } = useNotifications();

    const isFullyAuthenticated = isAuthenticated && user != null;

    useEffect(() => {
        if (!isFullyAuthenticated) {
            return;
        }

        setFeedItems([]);
        setFeedLimit(FEED_PAGE_SIZE);
        setHasMoreFeed(true);
        setActiveComposer(null);
        setCommentsByRating({});
        setCommentDrafts({});
        setHoveredCommentScores({});
        setHoveredRerateScores({});
        setRerateDrafts({});
    }, [isFullyAuthenticated]);

    useEffect(() => {
        if (!isFullyAuthenticated) {
            setFeedItems([]);
            setFeedLimit(FEED_PAGE_SIZE);
            setHasMoreFeed(true);
            setIsFeedLoading(false);
            setIsFeedLoadingMore(false);
            return;
        }

        let isMounted = true;
        const isInitialLoad = feedLimit === FEED_PAGE_SIZE;
        setIsFeedLoading(isInitialLoad);
        setIsFeedLoadingMore(!isInitialLoad);
        setFeedError(null);

        BackendApiService.getFeed(feedLimit)
            .then((items) => {
                if (isMounted) {
                    setFeedItems(items);
                    setHasMoreFeed(items.length >= feedLimit);
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
    }, [isFullyAuthenticated, feedLimit]);

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
                setFeedLimit((current) => current + FEED_PAGE_SIZE);
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

    const formatScore = (item) => {
        return formatScoreValue(item.score, item.ratingScale);
    };

    const formatCommentScore = (comment) => {
        return formatScoreValue(comment.score, FIVE_STAR_SCALE);
    };

    const getCommentDraftKey = (ratingId, parentCommentId = null) => {
        return parentCommentId == null ? `${ratingId}:root` : `${ratingId}:${parentCommentId}`;
    };

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

    const getDefaultCommentScore = (item) => {
        return 2.5;
    };

    const isScoreInRange = (score, item) => {
        return Number.isFinite(score)
            && score >= 0.5
            && score <= 5;
    };

    const formatDate = (createdAt) => {
        if (!createdAt) {
            return '';
        }

        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date(createdAt));
    };

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

    const getComposerKey = (ratingId, type) => `${ratingId}:${type}`;
    const getCommentReplyKey = (ratingId, parentCommentId = null) => (
        parentCommentId == null ? getComposerKey(ratingId, 'comment') : `${ratingId}:comment:${parentCommentId}`
    );

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
            setActionError(error.message);
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
            setActionError(error.message);
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

        if (!isScoreInRange(score, item)) {
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
            notify({ message: error.message, type: 'error' });
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
                    placeholder={parentCommentId == null ? 'Add your comment' : 'Reply in thread'}
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

    const renderCommentThread = (item, comments, depth = 0) => {
        return comments.map((comment) => {
            const replyKey = getCommentReplyKey(item.ratingId, comment.id);
            const replies = comment.replies || [];

            return (
                <div className="comment-thread" key={comment.id}>
                    <div className="comment-row" style={{ marginLeft: `${depth * 18}px` }}>
                    <div className="comment-avatar-column">
                        {comment.author?.userId != null ? (
                            <button
                                type="button"
                                className="profile-link profile-link-avatar"
                                onClick={() => openProfile(comment.author.userId)}
                                aria-label={`Open profile for ${comment.author.username}`}
                            >
                                <UserAvatar
                                    username={comment.author?.username}
                                    profilePicUrl={comment.author?.profilePicUrl}
                                    alt=""
                                    size="sm"
                                />
                            </button>
                        ) : (
                            <UserAvatar
                                username={comment.author?.username}
                                profilePicUrl={comment.author?.profilePicUrl}
                                alt=""
                                size="sm"
                            />
                        )}
                    </div>

                        <div className="comment-body">
                            <div className="comment-meta">
                                {comment.author?.userId != null ? (
                                    <button
                                        type="button"
                                        className="profile-link profile-link-text"
                                        onClick={() => openProfile(comment.author.userId)}
                                    >
                                        <div className="comment-author">{comment.author?.username || 'Someone'}</div>
                                    </button>
                                ) : (
                                    <div className="comment-author">{comment.author?.username || 'Someone'}</div>
                                )}
                                {comment.score != null && (
                                    <div className="comment-score">
                                        <StarRating value={comment.score} label={formatCommentScore(comment)} size="sm" />
                                    </div>
                                )}
                            </div>
                            <div className="comment-text">{comment.text}</div>
                            <button
                                type="button"
                                className="comment-reply-button"
                                onClick={() => setActiveComposer((current) => (
                                    current === replyKey ? getComposerKey(item.ratingId, 'comment') : replyKey
                                ))}
                            >
                                Reply
                            </button>
                        </div>
                    </div>
                    {activeComposer === replyKey && renderCommentComposer(item, comment.id)}
                    {replies.length > 0 && (
                        <div className="comment-replies">
                            {renderCommentThread(item, replies, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
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
            const items = await BackendApiService.getFeed();
            setFeedItems(items);
        } catch (error) {
            notify({ message: error.message, type: 'error' });
        }
    };

    const renderComments = (item) => {
        const ratingId = item.ratingId;
        const comments = commentsByRating[ratingId] || [];

        return (
            <div className="feed-composer">
                <div className="comment-list">
                    {comments.length === 0 ? (
                        <p className="feed-muted">No comments yet.</p>
                    ) : renderCommentThread(item, comments)}
                </div>
                {activeComposer === getComposerKey(ratingId, 'comment') && renderCommentComposer(item)}
            </div>
        );
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
                    placeholder="Add your take"
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
                            <h1>Home</h1>
                        </div>

                        {isFeedLoading && <p className="feed-status">Loading ratings...</p>}
                        {!isFeedLoading && !feedError && feedItems.length === 0 && (
                            <p className="feed-status">No ratings yet.</p>
                        )}

                        <section className="timeline" aria-label="Recent ratings">
                            {feedItems.map((item) => {
                                const rerateKey = getComposerKey(item.ratingId, 'rerate');
                                const isCommentThreadActive = activeComposer?.startsWith(`${item.ratingId}:comment`);
                                const hasMedia = Boolean(item.rateableItem?.mediaObjectKey);
                                const isTextOnlyPost = !hasMedia;

                                return (
                                    <article
                                        className={isTextOnlyPost ? 'tweet-card tweet-card-text' : 'tweet-card tweet-card-media'}
                                        key={item.ratingId}
                                    >
                                        <div className="tweet-avatar-column">
                                            {item.author?.userId != null ? (
                                                <button
                                                    type="button"
                                                    className="profile-link profile-link-avatar"
                                                    onClick={() => openProfile(item.author.userId)}
                                                    aria-label={`Open profile for ${item.author.username}`}
                                                >
                                                    <UserAvatar
                                                        username={item.author?.username}
                                                        profilePicUrl={item.author?.profilePicUrl}
                                                        alt=""
                                                        size="lg"
                                                    />
                                                </button>
                                            ) : (
                                                <UserAvatar
                                                    username={item.author?.username}
                                                    profilePicUrl={item.author?.profilePicUrl}
                                                    alt=""
                                                    size="lg"
                                                />
                                            )}
                                        </div>

                                        <div className="tweet-main">
                                            <header className="tweet-meta">
                                                {item.author?.userId != null ? (
                                                    <button
                                                        type="button"
                                                        className="profile-link profile-link-text"
                                                        onClick={() => openProfile(item.author.userId)}
                                                    >
                                                        <span className="tweet-name">{item.author?.username}</span>
                                                        <span className="tweet-handle">@{item.author?.username}</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <span className="tweet-name">{item.author?.username}</span>
                                                        <span className="tweet-handle">@{item.author?.username}</span>
                                                    </>
                                                )}
                                                <span className="tweet-dot">.</span>
                                                <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                                            </header>

                                            <button
                                                type="button"
                                                className="post-click-target"
                                                onClick={() => openPost(item.ratingId)}
                                            >
                                                {hasMedia && (
                                                    <div className="rating-object">
                                                        <img
                                                            src={`/api/s3/images/${item.rateableItem.mediaObjectKey}`}
                                                            alt="Rated item"
                                                            className="rating-object-media"
                                                        />
                                                    </div>
                                                )}

                                                <div className="text-rating">
                                                    {item.rateableItem?.body && (
                                                        <p className="text-post-body">{item.rateableItem.body}</p>
                                                    )}
                                                    <div className="text-rating-score">
                                                        <strong className="op-rating-stars">
                                                            <StarRating value={item.score} label={formatScore(item)} max={item.ratingScale?.max} size="sm" />
                                                        </strong>
                                                    </div>
                                                </div>
                                                {item.reviewText && (
                                                    <p className="tweet-review">{item.reviewText}</p>
                                                )}
                                            </button>

                                            <div className="tweet-actions" aria-label="Rating actions">
                                                <button
                                                    type="button"
                                                    className={item.likedByCurrentUser ? 'tweet-action is-liked' : 'tweet-action'}
                                                    onClick={() => toggleLike(item)}
                                                >
                                                    <span className="action-icon">Like</span>
                                                    <span>{item.likeCount || 0}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tweet-action"
                                                    onClick={() => setActiveComposer((current) => (
                                                        current === rerateKey ? null : rerateKey
                                                    ))}
                                                >
                                                    <span className="action-icon">Re-rate</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tweet-action"
                                                    onClick={() => openComments(item.ratingId)}
                                                >
                                                    <span className="action-icon">Comment</span>
                                                    <span>{item.commentCount || 0}</span>
                                                </button>
                                            </div>

                                            {activeComposer === rerateKey && renderRerate(item)}
                                            {isCommentThreadActive && renderComments(item)}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>

                        <div ref={feedSentinelRef} className="feed-sentinel" aria-hidden="true" />
                        {!isFeedLoading && !feedError && feedItems.length > 0 && !hasMoreFeed && (
                            <p className="feed-end-message">You’ve reached the end of the feed.</p>
                        )}
                        {isFeedLoadingMore && (
                            <p className="feed-status">Loading more ratings...</p>
                        )}
                    </>
                </main>
            ) : (
                <main className="guest-shell">
                    <div className="guest-card">
                        <h2>Welcome to RateIt!</h2>
                        <p>Please login to continue.</p>
                    </div>
                </main>
            )}
        </div>
    );
};

export default Home;
