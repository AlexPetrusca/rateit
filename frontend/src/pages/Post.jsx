import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import CommentThread from '../components/CommentThread.jsx';
import PostActions from '../components/PostActions.jsx';
import PostCard from '../components/PostCard.jsx';
import StarRating from '../components/StarRating.jsx';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const FIVE_STAR_SCALE = { max: 5, symbol: 'star' };

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

const Post = () => {
    const navigate = useNavigate();
    const { ratingId: routeRatingId } = useParams();
    const { user: currentUser, isLoading: isAuthLoading } = useAuth();
    const { notify } = useNotifications();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [commentError, setCommentError] = useState('');
    const [activeComposer, setActiveComposer] = useState(null);
    const [commentDrafts, setCommentDrafts] = useState({});
    const [hoveredCommentScores, setHoveredCommentScores] = useState({});
    const [hoveredRerateScore, setHoveredRerateScore] = useState(null);
    const [rerateDraft, setRerateDraft] = useState({ score: '', reviewText: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ratingId = useMemo(() => {
        const parsed = Number(routeRatingId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [routeRatingId]);
    const currentUserId = currentUser?.userId ?? currentUser?.id ?? null;
    const canEditPost = post?.author?.userId != null
        && post.author.userId === currentUserId
        && !post.deleted
        && !post.deletedAt;

    const getCommentDraftKey = (parentCommentId = null) => (
        parentCommentId == null ? 'root' : `reply:${parentCommentId}`
    );

    const getCommentDraft = (parentCommentId = null) => {
        const draft = commentDrafts[getCommentDraftKey(parentCommentId)];

        if (typeof draft === 'string') {
            return { text: draft, score: '' };
        }

        return draft || { text: '', score: '' };
    };

    const updateCommentDraft = (parentCommentId, field, value) => {
        const draftKey = getCommentDraftKey(parentCommentId);

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

    const getRerateScore = () => {
        const score = Number(rerateDraft.score);
        return Number.isFinite(score) ? score : null;
    };

    const loadPost = useCallback(async (nextRatingId) => {
        if (nextRatingId == null) {
            return;
        }

        setIsLoading(true);
        setLoadError('');
        setCommentError('');

        try {
            const nextPost = await BackendApiService.getRating(nextRatingId);
            const nextComments = await BackendApiService.getRatingComments(nextRatingId);
            setPost(nextPost);
            setComments(nextComments || []);
        } catch (error) {
            setPost(null);
            setComments([]);
            setLoadError(error.message || 'Failed to load post');
            notify({ message: error.message || 'Failed to load post', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        if (ratingId == null) {
            setIsLoading(false);
            setPost(null);
            setComments([]);
            setLoadError('Post not found.');
            return;
        }

        loadPost(ratingId);
    }, [ratingId, loadPost]);

    const openProfile = (userId) => {
        if (userId == null) {
            return;
        }

        navigate(`/users/${userId}`);
    };

    const reloadComments = async () => {
        if (ratingId == null) {
            return;
        }

        const nextComments = await BackendApiService.getRatingComments(ratingId);
        setComments(nextComments || []);
    };

    const toggleLike = async () => {
        if (ratingId == null) {
            return;
        }

        const wasLiked = Boolean(post?.likedByCurrentUser);

        setPost((current) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                likedByCurrentUser: !wasLiked,
                likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? -1 : 1))
            };
        });

        try {
            const updated = wasLiked
                ? await BackendApiService.unlikeRating(ratingId)
                : await BackendApiService.likeRating(ratingId);

            if (updated) {
                setPost((current) => {
                    if (!current) {
                        return current;
                    }

                    return {
                        ...current,
                        likedByCurrentUser: updated.likedByCurrentUser ?? current.likedByCurrentUser,
                        likeCount: updated.likeCount ?? current.likeCount
                    };
                });
            }
        } catch (error) {
            setPost((current) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    likedByCurrentUser: wasLiked,
                    likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? 1 : -1))
                };
            });
            notify({ message: error.message || 'Failed to like rating', type: 'error' });
        }
    };

    const openComposer = (type) => {
        setActiveComposer((current) => (current === type ? null : type));
    };

    const submitComment = async (parentCommentId = null) => {
        if (ratingId == null) {
            return;
        }

        const draft = getCommentDraft(parentCommentId);
        const text = draft.text.trim();
        const score = Number(draft.score || getDefaultCommentScore());

        if (!text) {
            notify({ message: 'Add a comment before posting.', type: 'warning' });
            return;
        }

        if (!Number.isFinite(score) || score < 0.5 || score > 5) {
            notify({ message: 'Pick a score between 0.5 and 5.', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            await BackendApiService.createRatingComment(ratingId, text, score, parentCommentId);
            setCommentDrafts((current) => ({
                ...current,
                [getCommentDraftKey(parentCommentId)]: { text: '', score: '' }
            }));
            setHoveredCommentScores((current) => {
                const next = { ...current };
                delete next[getCommentDraftKey(parentCommentId)];
                return next;
            });
            setActiveComposer(null);
            setCommentError('');
            await reloadComments();
            setPost((current) => current ? {
                ...current,
                commentCount: (current.commentCount || 0) + 1
            } : current);
            notify({ message: 'Comment added', type: 'info' });
        } catch (error) {
            setCommentError(error.message || 'Failed to comment');
            notify({ message: error.message || 'Failed to comment', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitRerate = async () => {
        if (ratingId == null) {
            return;
        }

        const score = Number(rerateDraft.score);

        if (!Number.isFinite(score) || score <= 0) {
            notify({ message: 'Add a score before re-rating.', type: 'warning' });
            return;
        }

        setIsSubmitting(true);
        try {
            await BackendApiService.rerate(ratingId, score, rerateDraft.reviewText || '');
            setRerateDraft({ score: '', reviewText: '' });
            setHoveredRerateScore(null);
            setActiveComposer(null);
            await loadPost(ratingId);
            notify({ message: 'Re-rating posted', type: 'info' });
        } catch (error) {
            notify({ message: error.message || 'Failed to re-rate', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCommentComposer = (parentCommentId = null) => {
        const draft = getCommentDraft(parentCommentId);
        const draftKey = getCommentDraftKey(parentCommentId);
        const currentScore = Number(draft.score || getDefaultCommentScore());
        const previewScore = hoveredCommentScores[draftKey] ?? currentScore;

        return (
            <div className={parentCommentId == null ? 'comment-composer' : 'comment-composer comment-composer-nested'}>
                <div className="comment-rating-control">
                    <label id={`post-comment-score-${draftKey}`}>Your rating</label>
                    <output aria-live="polite">
                        {formatScoreValue(previewScore, FIVE_STAR_SCALE)}
                    </output>
                    <StarRating
                        value={previewScore}
                        label={`Selected rating: ${formatScoreValue(currentScore, FIVE_STAR_SCALE)}`}
                        size="sm"
                        interactive
                        onChange={(nextScore) => updateCommentDraft(parentCommentId, 'score', nextScore.toString())}
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
                    onChange={(event) => updateCommentDraft(parentCommentId, 'text', event.target.value)}
                    placeholder={parentCommentId == null ? 'Add your comment' : 'Reply in thread'}
                    rows="3"
                />
                <div className="composer-actions">
                    <button type="button" onClick={() => submitComment(parentCommentId)} disabled={isSubmitting}>
                        {isSubmitting ? 'Posting...' : 'Reply'}
                    </button>
                </div>
            </div>
        );
    };

    const renderRerateComposer = () => {
        const currentScore = getRerateScore();
        const previewScore = hoveredRerateScore ?? currentScore;
        const scoreLabel = Number.isFinite(Number(previewScore))
            ? `${Number(previewScore).toFixed(1)} / 5`
            : '0.0 / 5';

        return (
            <div className="feed-composer">
                <label id={`rerate-score-${ratingId}`}>Your rating</label>
                <div className="score-row">
                    <output className="score-value">{scoreLabel}</output>
                    <StarRating
                        value={previewScore ?? 0}
                        label={`Selected rating: ${scoreLabel}`}
                        size="lg"
                        interactive
                        onChange={(nextScore) => setRerateDraft((current) => ({
                            ...current,
                            score: nextScore.toString()
                        }))}
                        onHoverChange={setHoveredRerateScore}
                    />
                </div>
                <textarea
                    value={rerateDraft.reviewText}
                    onChange={(event) => setRerateDraft((current) => ({
                        ...current,
                        reviewText: event.target.value
                    }))}
                    placeholder="Add your take"
                    rows="3"
                />
                <div className="composer-actions">
                    <button type="button" onClick={submitRerate} disabled={isSubmitting}>
                        {isSubmitting ? 'Posting...' : 'Re-rate'}
                    </button>
                </div>
            </div>
        );
    };

    const renderComments = () => (
        <div className="feed-composer">
            <div className="comment-list">
                {comments.length === 0 ? (
                    <p className="feed-muted">No comments yet.</p>
                ) : (
                    <CommentThread
                        comments={comments}
                        onAuthorClick={openProfile}
                        onReplyClick={(comment) => {
                            const replyKey = `reply:${comment.id}`;
                            setActiveComposer((current) => (
                                current === replyKey
                                    ? 'root-comment'
                                    : replyKey
                            ));
                        }}
                        activeReplyKey={activeComposer}
                        getReplyKey={(comment) => `reply:${comment.id}`}
                        renderReplyComposer={(comment) => renderCommentComposer(comment.id)}
                    />
                )}
            </div>
            {activeComposer === 'root-comment' && renderCommentComposer()}
        </div>
    );

    return (
        <div className="feed-page">
            <main className="twitter-shell profile-shell">
                <div className="timeline-header">
                    <h1>Post</h1>
                </div>

                {isAuthLoading || isLoading ? (
                    <div className="profile-loading">Loading post...</div>
                ) : loadError ? (
                    <div className="profile-empty-state">{loadError}</div>
                ) : post ? (
                    <>
                        <PostCard
                            post={post}
                            onAuthorClick={openProfile}
                            footer={(
                                <PostActions
                                    liked={post.likedByCurrentUser}
                                    likeCount={post.likeCount}
                                    commentCount={post.commentCount}
                                    onLike={toggleLike}
                                    onRerate={() => openComposer('rerate')}
                                    onComment={() => openComposer('root-comment')}
                                    onEdit={canEditPost ? () => navigate(`/posts/${ratingId}/edit`) : undefined}
                                />
                            )}
                        />

                        <section className="post-comments">
                            <div className="profile-section-header">
                                <h3>Comments</h3>
                                <span>{post.commentCount || 0} total</span>
                            </div>

                            {commentError && <div className="profile-empty-state">{commentError}</div>}

                            {activeComposer === 'rerate' && renderRerateComposer()}
                            {renderComments()}
                        </section>
                    </>
                ) : (
                    <div className="profile-empty-state">Post not found.</div>
                )}
            </main>
        </div>
    );
};

export default Post;
