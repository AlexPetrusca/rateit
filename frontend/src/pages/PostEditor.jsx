import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import Modal from '../components/Modal.jsx';
import PostCard from '../components/PostCard.jsx';
import { parseRichText } from '../components/RichText.jsx';
import RichTextarea from '../components/RichTextarea.jsx';
import StarRating from '../components/StarRating.jsx';
import BackendApiService from '../services/BackendApiService';
import { FIVE_STAR_SCALE, formatScoreValue } from '../utils/ratingDisplay.js';
import '../App.css';

const PostEditor = () => {
    const navigate = useNavigate();
    const { ratingId: routeRatingId } = useParams();
    const { user: currentUser, isLoading: isAuthLoading } = useAuth();
    const { notify } = useNotifications();
    const [post, setPost] = useState(null);
    const [body, setBody] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [score, setScore] = useState('');
    const [hoveredScore, setHoveredScore] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const ratingId = useMemo(() => {
        const parsed = Number(routeRatingId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [routeRatingId]);

    const currentUserId = currentUser?.userId ?? currentUser?.id ?? null;
    const isOwnPost = Boolean(post?.author?.userId != null && post.author.userId === currentUserId);
    const previewScore = hoveredScore ?? Number(score || post?.score || 0);

    useEffect(() => {
        if (ratingId == null) {
            setPost(null);
            setLoadError('Post not found.');
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        setLoadError('');

        BackendApiService.getRating(ratingId)
            .then((nextPost) => {
                if (!isMounted) {
                    return;
                }

                setPost(nextPost);
                setBody(nextPost?.rateableItem?.body ?? '');
                setReviewText(nextPost?.reviewText ?? '');
                setScore(nextPost?.score != null ? nextPost.score.toString() : '');
            })
            .catch((error) => {
                if (!isMounted) {
                    return;
                }

                setLoadError(error.message || 'Failed to load post');
                notify({ message: error.message || 'Failed to load post', type: 'error' });
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [notify, ratingId]);

    const previewPost = useMemo(() => {
        if (!post) {
            return null;
        }

        const numericScore = Number(score);

        return {
            ...post,
            score: Number.isFinite(numericScore) ? numericScore : post.score,
            reviewText,
            rateableItem: {
                ...post.rateableItem,
                body
            }
        };
    }, [body, post, reviewText, score]);

    const handleSave = async () => {
        if (ratingId == null) {
            return;
        }

        const numericScore = Number(score);
        if (!Number.isFinite(numericScore) || numericScore <= 0) {
            notify({ message: 'Add a score before saving.', type: 'warning' });
            return;
        }

        setIsSaving(true);

        try {
            const updated = await BackendApiService.updateRating(ratingId, {
                body,
                reviewText,
                score: numericScore
            });
            setPost(updated);
            notify({ message: 'Post updated', type: 'info' });
            navigate(`/topics/${updated?.rateableItem?.id ?? post?.rateableItem?.id ?? ratingId}`);
        } catch (error) {
            notify({ message: error.message || 'Failed to update post', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (ratingId == null) {
            return;
        }

        setIsDeleting(true);

        try {
            await BackendApiService.deleteRating(ratingId);
            notify({ message: 'Post deleted', type: 'info' });
            navigate(`/topics/${post?.rateableItem?.id ?? ratingId}`);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete post', type: 'error' });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const hasLoadedPost = post != null;

    return (
        <div className="feed-page">
            <main className="twitter-shell create-shell">
                <div className="timeline-header">
                    <h1>Edit Post</h1>
                </div>

                {isAuthLoading || isLoading ? (
                    <div className="profile-loading">Loading post...</div>
                ) : loadError ? (
                    <div className="profile-empty-state">{loadError}</div>
                ) : !hasLoadedPost ? (
                    <div className="profile-empty-state">Post not found.</div>
                ) : post.deleted || post.deletedAt ? (
                    <div className="profile-empty-state">This post has been deleted and can no longer be edited.</div>
                ) : !isOwnPost ? (
                    <div className="profile-empty-state">You can only edit your own posts.</div>
                ) : (
                    <section className="create-form">
                        <div className="create-layout">
                            <div className="create-fields">
                                <div className="form-group">
                                    <label htmlFor="edit-topic">Topic</label>
                                    <RichTextarea
                                        id="edit-topic"
                                        value={body}
                                        onChange={setBody}
                                        placeholder="Write the thing you want to rate"
                                        rows={5}
                                        bold={false}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="edit-review">Your review</label>
                                    <RichTextarea
                                        id="edit-review"
                                        value={reviewText}
                                        onChange={setReviewText}
                                        placeholder="Add your rating context"
                                        rows={4}
                                    />
                                </div>

                                <div className="form-group score-group">
                                    <label id="edit-score-label">Rating</label>
                                    <div className="score-row">
                                        <output className="score-value">
                                            {formatScoreValue(previewScore, FIVE_STAR_SCALE)}
                                        </output>
                                        <StarRating
                                            value={previewScore}
                                            label={`Selected rating: ${formatScoreValue(previewScore, FIVE_STAR_SCALE)}`}
                                            size="lg"
                                            interactive
                                            onChange={(nextScore) => setScore(nextScore.toString())}
                                            onHoverChange={setHoveredScore}
                                        />
                                    </div>
                                </div>

                                <div className="composer-actions create-actions">
                                    <button type="button" onClick={handleSave} disabled={isSaving || isDeleting}>
                                        {isSaving ? 'Saving...' : 'Save changes'}
                                    </button>
                                    <button
                                        type="button"
                                        className="link-button destructive-link-button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isSaving || isDeleting}
                                    >
                                        Delete post
                                    </button>
                                </div>
                            </div>

                            <aside className="create-preview">
                                <div className="post-editor-preview">
                                    {previewPost ? (
                                        <PostCard
                                            post={previewPost}
                                            className="post-editor-preview-card"
                                        />
                                    ) : (
                                        <div className="create-preview-placeholder">
                                            Your post preview will appear here
                                        </div>
                                    )}
                                </div>
                                <div className="create-preview-meta">
                                    <p>{body.trim() ? parseRichText(body.trim()) : 'Add text to describe the thing you are rating.'}</p>
                                </div>
                            </aside>
                        </div>
                    </section>
                )}
            </main>

            <Modal
                isOpen={showDeleteConfirm}
                title="Delete post"
                onClose={() => setShowDeleteConfirm(false)}
            >
                <div className="editor-delete-modal">
                    <p>This will replace the post with a deleted placeholder and keep the comments attached.</p>
                    <div className="composer-actions">
                        <button type="button" className="link-button" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                            Cancel
                        </button>
                        <button type="button" className="destructive-button" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete post'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PostEditor;
