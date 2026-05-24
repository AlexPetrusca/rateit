import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const Home = () => {
    const { user, isAuthenticated } = useAuth();
    const [feedItems, setFeedItems] = useState([]);
    const [isFeedLoading, setIsFeedLoading] = useState(false);
    const [feedError, setFeedError] = useState(null);
    const [activeComposer, setActiveComposer] = useState(null);
    const [commentsByRating, setCommentsByRating] = useState({});
    const [commentDrafts, setCommentDrafts] = useState({});
    const [rerateDrafts, setRerateDrafts] = useState({});
    const [actionError, setActionError] = useState(null);

    const isFullyAuthenticated = isAuthenticated && user != null;

    useEffect(() => {
        if (!isFullyAuthenticated) {
            setFeedItems([]);
            return;
        }

        let isMounted = true;
        setIsFeedLoading(true);
        setFeedError(null);

        BackendApiService.getFeed()
            .then((items) => {
                if (isMounted) {
                    setFeedItems(items);
                }
            })
            .catch((error) => {
                if (isMounted) {
                    setFeedError(error.message);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsFeedLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isFullyAuthenticated]);

    const updateFeedItem = (ratingId, updater) => {
        setFeedItems((items) => items.map((item) => (
            item.ratingId === ratingId ? updater(item) : item
        )));
    };

    const formatScore = (item) => {
        const score = Number(item.score);
        const max = Number(item.ratingScale?.max);
        const symbol = item.ratingScale?.symbol === 'star'
            ? 'stars'
            : item.ratingScale?.symbol;
        const displayScore = Number.isInteger(score) ? score.toString() : score.toFixed(1);
        const displayMax = Number.isInteger(max) ? max.toString() : max.toFixed(1);

        return `${displayScore}${max ? ` / ${displayMax}` : ''}${symbol ? ` ${symbol}` : ''}`;
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

    const getComposerKey = (ratingId, type) => `${ratingId}:${type}`;

    const toggleLike = async (item) => {
        setActionError(null);
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
        setActionError(null);

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

    const submitComment = async (ratingId) => {
        const draft = commentDrafts[ratingId]?.trim();
        if (!draft) {
            return;
        }

        setActionError(null);

        try {
            const comment = await BackendApiService.createRatingComment(ratingId, draft);
            setCommentsByRating((current) => ({
                ...current,
                [ratingId]: [...(current[ratingId] || []), comment]
            }));
            setCommentDrafts((current) => ({
                ...current,
                [ratingId]: ''
            }));
            updateFeedItem(ratingId, (item) => ({
                ...item,
                commentCount: (item.commentCount || 0) + 1
            }));
        } catch (error) {
            setActionError(error.message);
        }
    };

    const submitRerate = async (ratingId) => {
        const draft = rerateDrafts[ratingId] || {};
        const score = Number(draft.score);

        if (!score) {
            setActionError('Add a score before re-rating.');
            return;
        }

        setActionError(null);

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
            setActionError(error.message);
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
                    ) : comments.map((comment) => (
                        <div className="comment-row" key={comment.id}>
                            <div className="comment-author">{comment.author?.username || 'Someone'}</div>
                            <div className="comment-text">{comment.text}</div>
                        </div>
                    ))}
                </div>
                <textarea
                    value={commentDrafts[ratingId] || ''}
                    onChange={(event) => setCommentDrafts((current) => ({
                        ...current,
                        [ratingId]: event.target.value
                    }))}
                    placeholder="Post your reply"
                    rows="3"
                />
                <div className="composer-actions">
                    <button type="button" onClick={() => submitComment(ratingId)}>
                        Reply
                    </button>
                </div>
            </div>
        );
    };

    const renderRerate = (item) => {
        const ratingId = item.ratingId;
        const draft = rerateDrafts[ratingId] || {};

        return (
            <div className="feed-composer">
                <label htmlFor={`rerate-score-${ratingId}`}>Your rating</label>
                <input
                    id={`rerate-score-${ratingId}`}
                    type="number"
                    min={item.ratingScale?.min || 1}
                    max={item.ratingScale?.max || 5}
                    step="0.5"
                    value={draft.score || ''}
                    onChange={(event) => setRerateDrafts((current) => ({
                        ...current,
                        [ratingId]: {
                            ...current[ratingId],
                            score: event.target.value
                        }
                    }))}
                    placeholder="4.5"
                />
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
            <main className="twitter-shell">
                {isFullyAuthenticated ? (
                    <>
                        <div className="timeline-header">
                            <h1>Home</h1>
                        </div>

                        {actionError && <p className="inline-error">{actionError}</p>}
                        {isFeedLoading && <p className="feed-status">Loading ratings...</p>}
                        {feedError && <p className="error">{feedError}</p>}
                        {!isFeedLoading && !feedError && feedItems.length === 0 && (
                            <p className="feed-status">No ratings yet.</p>
                        )}

                        <section className="timeline" aria-label="Recent ratings">
                            {feedItems.map((item) => {
                                const commentKey = getComposerKey(item.ratingId, 'comment');
                                const rerateKey = getComposerKey(item.ratingId, 'rerate');

                                return (
                                    <article className="tweet-card" key={item.ratingId}>
                                        <div className="tweet-avatar-column">
                                            {item.author?.profilePicUrl ? (
                                                <img
                                                    src={`/api/s3/images/${item.author.profilePicUrl}`}
                                                    alt=""
                                                    className="tweet-avatar"
                                                />
                                            ) : (
                                                <div className="tweet-avatar tweet-avatar-placeholder">
                                                    {item.author?.username?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                        </div>

                                        <div className="tweet-main">
                                            <header className="tweet-meta">
                                                <span className="tweet-name">{item.author?.username}</span>
                                                <span className="tweet-handle">@{item.author?.username}</span>
                                                <span className="tweet-dot">.</span>
                                                <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                                            </header>

                                            <div className="rating-object">
                                                {item.rateableItem?.mediaObjectKey ? (
                                                    <img
                                                        src={`/api/s3/images/${item.rateableItem.mediaObjectKey}`}
                                                        alt={item.rateableItem?.title || 'Rated item'}
                                                        className="rating-object-media"
                                                    />
                                                ) : (
                                                    <div className="rating-object-empty">
                                                        {item.rateableItem?.type || 'rating'}
                                                    </div>
                                                )}

                                                <div className="rating-object-title">
                                                    {item.rateableItem?.title || 'Untitled rating'}
                                                </div>

                                                <div className="rating-summary">
                                                    <span>OP rating</span>
                                                    <strong>{formatScore(item)}</strong>
                                                </div>
                                            </div>

                                            {item.rateableItem?.body && (
                                                <p className="tweet-body">{item.rateableItem.body}</p>
                                            )}
                                            {item.reviewText && (
                                                <p className="tweet-review">{item.reviewText}</p>
                                            )}

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
                                            {activeComposer === commentKey && renderComments(item)}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    </>
                ) : (
                    <div className="container">
                        <h2>Welcome to RateIt!</h2>
                        <p>Please login to continue.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Home;
