import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import CommentThread from '../components/CommentThread.jsx';
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
    const { isLoading: isAuthLoading } = useAuth();
    const { notify } = useNotifications();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [commentError, setCommentError] = useState('');
    const [activeComposer, setActiveComposer] = useState(null);
    const [commentDraft, setCommentDraft] = useState({ text: '', score: '2.5' });
    const [hoveredScore, setHoveredScore] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ratingId = useMemo(() => {
        const parsed = Number(routeRatingId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [routeRatingId]);

    const currentScore = Number(commentDraft.score);
    const previewScore = hoveredScore ?? currentScore;

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

    const submitComment = async () => {
        if (ratingId == null) {
            return;
        }

        const text = commentDraft.text.trim();
        const score = Number(commentDraft.score);

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
            await BackendApiService.createRatingComment(ratingId, text, score);
            setCommentDraft({ text: '', score: '2.5' });
            setHoveredScore(null);
            setActiveComposer(null);
            setCommentError('');
            await reloadComments();
            notify({ message: 'Comment added', type: 'info' });
        } catch (error) {
            setCommentError(error.message || 'Failed to comment');
            notify({ message: error.message || 'Failed to comment', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCommentsComposer = () => {
        setActiveComposer((current) => (current === 'root-comment' ? null : 'root-comment'));
    };

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
                                <div className="tweet-actions" aria-label="Rating actions">
                                    <button
                                        type="button"
                                        className="tweet-action"
                                        onClick={openCommentsComposer}
                                    >
                                        <span className="action-icon">Comment</span>
                                        <span>{post.commentCount || 0}</span>
                                    </button>
                                </div>
                            )}
                        />

                        <section className="post-comments">
                            <div className="profile-section-header">
                                <h3>Comments</h3>
                                <span>{post.commentCount || 0} total</span>
                            </div>

                            {commentError && <div className="profile-empty-state">{commentError}</div>}

                            {comments.length === 0 ? (
                                <div className="profile-empty-state">No comments yet.</div>
                            ) : (
                                <div className="comment-list">
                                    <CommentThread
                                        comments={comments}
                                        onAuthorClick={openProfile}
                                    />
                                </div>
                            )}

                            <div className="feed-composer">
                                <div className="comment-rating-control">
                                    <label id="post-comment-score-label">Your rating</label>
                                    <output aria-live="polite">
                                        {formatScoreValue(previewScore, FIVE_STAR_SCALE)}
                                    </output>
                                    <StarRating
                                        value={previewScore}
                                        label={`Selected rating: ${formatScoreValue(commentDraft.score, FIVE_STAR_SCALE)}`}
                                        size="sm"
                                        interactive
                                        onChange={(nextScore) => setCommentDraft((current) => ({
                                            ...current,
                                            score: nextScore.toString()
                                        }))}
                                        onHoverChange={setHoveredScore}
                                    />
                                </div>
                                <textarea
                                    value={commentDraft.text}
                                    onChange={(event) => setCommentDraft((current) => ({
                                        ...current,
                                        text: event.target.value
                                    }))}
                                    placeholder="Add your comment"
                                    rows="3"
                                />
                                <div className="composer-actions">
                                    <button type="button" onClick={submitComment} disabled={isSubmitting}>
                                        {isSubmitting ? 'Posting...' : 'Reply'}
                                    </button>
                                </div>
                            </div>
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
