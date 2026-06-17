import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import CommentComposer from '../components/CommentComposer.jsx';
import CommentThread from '../components/CommentThread.jsx';
import FeedTimeline from '../components/FeedTimeline.jsx';
import PostActions from '../components/PostActions.jsx';
import RatingComposer from '../components/RatingComposer.jsx';
import BackendApiService from '../services/BackendApiService';
import { DEFAULT_COMMENT_SCORE, isFiveStarScoreInRange } from '../utils/ratingDisplay.js';
import '../App.css';

const FEED_PAGE_SIZE = 5;

const Home = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const currentUserId = user?.userId ?? user?.id ?? null;
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
    const { notify } = useNotifications();

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
    }, [isFullyAuthenticated]);

    useEffect(() => {
        if (!isFullyAuthenticated) {
            setFeedItems([]);
            setFeedPage(0);
            setHasMoreFeed(true);
            setIsFeedLoading(false);
            setIsFeedLoadingMore(false);
            return;
        }

        let isMounted = true;
        const isInitialLoad = feedPage === 0;
        setIsFeedLoading(isInitialLoad);
        setIsFeedLoadingMore(!isInitialLoad);
        setFeedError(null);

        BackendApiService.getFeed({ page: feedPage, size: FEED_PAGE_SIZE })
            .then((items) => {
                if (isMounted) {
                    setFeedItems((current) => (feedPage === 0 ? items : [...current, ...items]));
                    setHasMoreFeed(items.length === FEED_PAGE_SIZE);
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
    }, [isFullyAuthenticated, feedPage]);

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
            notify({ message: error.message || 'Failed to like post', type: 'error' });
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
        const score = Number(draft.score || DEFAULT_COMMENT_SCORE);

        if (!text) {
            notify({ message: 'Add a comment before replying.', type: 'warning' });
            return;
        }

        if (!isFiveStarScoreInRange(score)) {
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
            setActiveComposer(parentCommentId == null
                ? getComposerKey(ratingId, 'comment')
                : getCommentReplyKey(ratingId, parentCommentId));
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
        const commentScore = draft.score || DEFAULT_COMMENT_SCORE;
        const draftKey = getCommentDraftKey(ratingId, parentCommentId);
        const previewScore = hoveredCommentScores[draftKey] || commentScore;

        return (
            <CommentComposer
                nested={parentCommentId != null}
                title="Your rating"
                score={commentScore}
                previewScore={previewScore}
                onScoreChange={(nextScore) => updateCommentDraft(ratingId, parentCommentId, 'score', nextScore.toString())}
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
                onTextChange={(value) => updateCommentDraft(ratingId, parentCommentId, 'text', value)}
                placeholder={parentCommentId == null ? 'Add your take on this take' : 'Reply in thread'}
                submitLabel="Reply"
                onSubmit={() => submitComment(item, parentCommentId)}
            />
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
            const items = await BackendApiService.getFeed({
                page: 0,
                size: Math.max(feedItems.length, FEED_PAGE_SIZE)
            });
            setFeedItems(items);
        } catch (error) {
            notify({ message: error.message, type: 'error' });
        }
    };

    const renderComments = (item) => {
        const ratingId = item.ratingId;
        const comments = commentsByRating[ratingId] || [];

        return (
            <div className="feed-composer comment-panel">
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

    const renderRerate = (item) => {
        const ratingId = item.ratingId;
        const draft = rerateDrafts[ratingId] || {};
        const currentScore = draft.score ? Number(draft.score) : null;
        const previewScore = hoveredRerateScores[ratingId] ?? currentScore;

        return (
            <RatingComposer
                label="Your rating"
                score={currentScore}
                previewScore={previewScore}
                onScoreChange={(nextScore) => setRerateDrafts((current) => ({
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
                text={draft.reviewText || ''}
                onTextChange={(value) => setRerateDrafts((current) => ({
                    ...current,
                    [ratingId]: {
                        ...current[ratingId],
                        reviewText: value
                    }
                }))}
                placeholder="Add your take on this topic"
                submitLabel="Re-rate"
                onSubmit={() => submitRerate(ratingId)}
            />
        );
    };

    return (
        <div className="feed-page">
            {isFullyAuthenticated ? (
                <main className="twitter-shell">
                    <>
                        {isFeedLoading && <p className="feed-status">Loading ratings...</p>}
                        {!isFeedLoading && !feedError && feedItems.length === 0 && (
                            <p className="feed-status">No ratings yet.</p>
                        )}

                        <FeedTimeline
                            items={feedItems}
                            onAuthorClick={openProfile}
                            onPostClick={openPost}
                            onTopicClick={openTopic}
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
                            endMessage="You’ve reached the end of the feed."
                        />

                        {!isFeedLoading && feedError && (
                            <div className="inline-error">{feedError}</div>
                        )}
                    </>
                </main>
            ) : (
                <main className="guest-shell" />
            )}
        </div>
    );
};

export default Home;
