import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import CommentThread from '../components/CommentThread.jsx';
import FeedTimeline from '../components/FeedTimeline.jsx';
import PostActions from '../components/PostActions.jsx';
import StarRating from '../components/StarRating.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const PROFILE_POST_PAGE_SIZE = 5;
const FIVE_STAR_SCALE = { max: 5, symbol: 'star' };

const Profile = () => {
    const navigate = useNavigate();
    const { userId: routeUserId } = useParams();
    const { user: currentUser, isLoading: isAuthLoading } = useAuth();
    const { notify } = useNotifications();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [postPage, setPostPage] = useState(0);
    const [postRowCount, setPostRowCount] = useState(0);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [isPostsLoading, setIsPostsLoading] = useState(true);
    const [isPostsLoadingMore, setIsPostsLoadingMore] = useState(false);
    const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [postsError, setPostsError] = useState('');
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [activeComposer, setActiveComposer] = useState(null);
    const [commentsByRating, setCommentsByRating] = useState({});
    const [commentDrafts, setCommentDrafts] = useState({});
    const [hoveredCommentScores, setHoveredCommentScores] = useState({});
    const [hoveredRerateScores, setHoveredRerateScores] = useState({});
    const [rerateDrafts, setRerateDrafts] = useState({});
    const sentinelRef = useRef(null);
    const postsInitializedForUserIdRef = useRef(null);

    const resolvedUserId = useMemo(() => {
        if (routeUserId != null) {
            const parsed = Number(routeUserId);
            return Number.isFinite(parsed) ? parsed : null;
        }

        return currentUser?.userId ?? currentUser?.id ?? null;
    }, [routeUserId, currentUser?.userId, currentUser?.id]);

    const isOwnProfile = useMemo(() => {
        const currentUserId = currentUser?.userId ?? currentUser?.id;

        if (resolvedUserId == null || currentUserId == null) {
            return false;
        }

        return resolvedUserId === currentUserId;
    }, [resolvedUserId, currentUser?.userId, currentUser?.id]);

    const loadProfile = useCallback(async (nextUserId) => {
        if (nextUserId == null) {
            return;
        }

        setIsProfileLoading(true);
        setProfileError('');

        try {
            const nextProfile = await BackendApiService.getUserProfile(nextUserId);
            setProfile(nextProfile);
        } catch (error) {
            setProfile(null);
            setProfileError(error.message || 'Failed to load profile');
            notify({ message: error.message || 'Failed to load profile', type: 'error' });
        } finally {
            setIsProfileLoading(false);
        }
    }, [notify]);

    const loadPosts = useCallback(async (nextUserId, nextPage = 0, append = false) => {
        if (nextUserId == null) {
            return;
        }

        if (append) {
            setIsPostsLoadingMore(true);
        } else {
            setIsPostsLoading(true);
            setPosts([]);
        }
        setPostsError('');

        try {
            const page = await BackendApiService.getUserPosts({
                userId: nextUserId,
                page: nextPage,
                size: PROFILE_POST_PAGE_SIZE
            });
            const nextRows = page.content || [];

            setPosts((current) => (append ? [...current, ...nextRows] : nextRows));
            setPostRowCount(page.totalElements || 0);
            setPostPage(page.number || nextPage);
            setHasMorePosts(((page.number ?? nextPage) + 1) * (page.size || PROFILE_POST_PAGE_SIZE) < (page.totalElements || 0));
            if (!append && nextPage === 0) {
                postsInitializedForUserIdRef.current = nextUserId;
            }
        } catch (error) {
            setPostsError(error.message || 'Failed to load posts');
            notify({ message: error.message || 'Failed to load posts', type: 'error' });
        } finally {
            setIsPostsLoading(false);
            setIsPostsLoadingMore(false);
        }
    }, [notify]);

    const handleFollowAction = async () => {
        if (resolvedUserId == null || profile == null || isOwnProfile) {
            return;
        }

        setIsFollowActionLoading(true);

        try {
            if (profile.followRelation === 'NOT_FOLLOWING') {
                await BackendApiService.followUser(resolvedUserId);
                setProfile((current) => current ? {
                    ...current,
                    followRelation: 'FOLLOWING',
                    followerCount: (current.followerCount || 0) + 1
                } : current);
                notify({ message: 'Now following.', type: 'info' });
            } else if (profile.followRelation === 'FOLLOWING') {
                await BackendApiService.unfollowUser(resolvedUserId);
                setProfile((current) => current ? {
                    ...current,
                    followRelation: 'NOT_FOLLOWING',
                    followerCount: Math.max(0, (current.followerCount || 0) - 1)
                } : current);
                notify({ message: 'Unfollowed.', type: 'info' });
            }
        } catch (error) {
            notify({ message: error.message || 'Failed to update follow', type: 'error' });
            loadProfile(resolvedUserId);
        } finally {
            setIsFollowActionLoading(false);
        }
    };

    const openPost = (ratingId) => {
        if (ratingId == null) {
            return;
        }

        navigate(`/posts/${ratingId}`);
    };

    const updatePostItem = (ratingId, updater) => {
        setPosts((items) => items.map((item) => (
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

    const toggleLike = async (item) => {
        const wasLiked = Boolean(item.likedByCurrentUser);

        updatePostItem(item.ratingId, (current) => ({
            ...current,
            likedByCurrentUser: !wasLiked,
            likeCount: Math.max(0, (current.likeCount || 0) + (wasLiked ? -1 : 1))
        }));

        try {
            const updated = wasLiked
                ? await BackendApiService.unlikeRating(item.ratingId)
                : await BackendApiService.likeRating(item.ratingId);

            if (updated) {
                updatePostItem(item.ratingId, (current) => ({
                    ...current,
                    likedByCurrentUser: updated.likedByCurrentUser ?? current.likedByCurrentUser,
                    likeCount: updated.likeCount ?? current.likeCount
                }));
            }
        } catch (error) {
            updatePostItem(item.ratingId, (current) => ({
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
            updatePostItem(ratingId, (current) => ({
                ...current,
                commentCount: (current.commentCount || 0) + 1
            }));
        } catch (error) {
            notify({ message: error.message || 'Failed to comment', type: 'error' });
        }
    };

    const renderCommentComposer = (item, parentCommentId = null) => {
        const ratingId = item.ratingId;
        const draft = getCommentDraft(ratingId, parentCommentId);
        const commentScore = draft.score || getDefaultCommentScore(item);
        const draftKey = getCommentDraftKey(ratingId, parentCommentId);
        const previewScore = hoveredCommentScores[draftKey] || commentScore;

        return (
            <div className={parentCommentId == null ? 'comment-composer' : 'comment-composer comment-composer-nested'}>
                <div className="comment-rating-control">
                    <label>Your rating</label>
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
                            onAuthorClick={(userId) => navigate(`/users/${userId}`)}
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
            const nextPosts = await BackendApiService.getUserPosts({
                userId: resolvedUserId,
                page: postPage,
                size: PROFILE_POST_PAGE_SIZE
            });
            setPosts(nextPosts.content || []);
        } catch (error) {
            notify({ message: error.message || 'Failed to re-rate', type: 'error' });
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
                <label>Your rating</label>
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

    useEffect(() => {
        if (resolvedUserId == null) {
            postsInitializedForUserIdRef.current = null;
            setProfile(null);
            setPosts([]);
            setIsProfileLoading(false);
            setIsPostsLoading(false);
            setHasMorePosts(false);
            setActiveComposer(null);
            setCommentsByRating({});
            setCommentDrafts({});
            setHoveredCommentScores({});
            setHoveredRerateScores({});
            setRerateDrafts({});
            return;
        }

        setPostPage(0);
        setPostRowCount(0);
        setPosts([]);
        setHasMorePosts(true);
        setActiveComposer(null);
        setCommentsByRating({});
        setCommentDrafts({});
        setHoveredCommentScores({});
        setHoveredRerateScores({});
        setRerateDrafts({});
        postsInitializedForUserIdRef.current = null;

        let isMounted = true;

        Promise.all([
            loadProfile(resolvedUserId),
            loadPosts(resolvedUserId, 0, false)
        ]).catch(() => {}).finally(() => {
            if (!isMounted) {
                return;
            }
        });

        return () => {
            isMounted = false;
        };
    }, [resolvedUserId, loadProfile, loadPosts]);

    useEffect(() => {
        if (
            resolvedUserId == null ||
            profileError ||
            postsError ||
            isPostsLoading ||
            isPostsLoadingMore ||
            !hasMorePosts ||
            postsInitializedForUserIdRef.current !== resolvedUserId
        ) {
            return undefined;
        }

        const sentinel = sentinelRef.current;
        if (!sentinel) {
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setPostPage((current) => current + 1);
            }
        }, {
            root: null,
            rootMargin: '200px 0px',
            threshold: 0
        });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [resolvedUserId, profileError, postsError, isPostsLoading, isPostsLoadingMore, hasMorePosts]);

    useEffect(() => {
        if (resolvedUserId == null || postPage === 0) {
            return;
        }

        loadPosts(resolvedUserId, postPage, true);
    }, [resolvedUserId, postPage, loadPosts]);

    const profileTitle = isOwnProfile ? 'Your Profile' : 'Profile';
    const profileSubtitle = profile
        ? `@${profile.username}`
        : 'View a user profile and their posts';
    const followActionLabel = {
        NOT_FOLLOWING: 'Follow',
        FOLLOWING: 'Following'
    }[profile?.followRelation];
    const canUseFollowAction = Boolean(followActionLabel) && profile?.followRelation !== 'SELF';

    return (
        <div className="feed-page">
            <main className="twitter-shell profile-shell">
                <div className="timeline-header">
                    <h1>{profileTitle}</h1>
                </div>

                {isAuthLoading || isProfileLoading ? (
                    <div className="profile-loading">Loading profile...</div>
                ) : profileError ? (
                    <div className="profile-empty-state">{profileError}</div>
                ) : profile ? (
                    <>
                        <section className="profile-banner">
                            <UserAvatar
                                username={profile.username}
                                profilePicUrl={profile.profilePicUrl}
                                alt={profile.username || 'Profile'}
                                size="xl"
                                fallbackText="No Image"
                            />
                            <div className="profile-banner-copy">
                                <div className="profile-name-row">
                                    <h2>{profile.username}</h2>
                                    {!isOwnProfile && canUseFollowAction && (
                                        <button
                                            type="button"
                                            className={
                                                profile.followRelation === 'FOLLOWING'
                                                    ? 'profile-action-button secondary-action-button'
                                                    : 'profile-action-button'
                                            }
                                            disabled={isFollowActionLoading}
                                            onClick={handleFollowAction}
                                        >
                                            {isFollowActionLoading ? 'Updating...' : followActionLabel}
                                        </button>
                                    )}
                                </div>
                                <div className="profile-subtitle">{profileSubtitle}</div>
                                <div className="profile-social-counts">
                                    <button
                                        type="button"
                                        onClick={() => resolvedUserId != null && navigate(`/users/${resolvedUserId}/following`)}
                                    >
                                        <strong>{profile.followingCount || 0}</strong>
                                        <span>Following</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => resolvedUserId != null && navigate(`/users/${resolvedUserId}/followers`)}
                                    >
                                        <strong>{profile.followerCount || 0}</strong>
                                        <span>Followers</span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="profile-posts">
                            <div className="profile-section-header">
                                <h3>Posts</h3>
                                <span>{postRowCount} total</span>
                            </div>

                            {postsError ? (
                                <div className="profile-empty-state">{postsError}</div>
                            ) : isPostsLoading ? (
                                <div className="profile-loading">Loading posts...</div>
                            ) : posts.length === 0 ? (
                                <div className="profile-empty-state">No posts to show.</div>
                            ) : (
                                    <FeedTimeline
                                        items={posts}
                                        onAuthorClick={(userId) => navigate(`/users/${userId}`)}
                                        onPostClick={openPost}
                                        renderFooter={(item) => {
                                            const canEdit = item.author?.userId != null
                                                && item.author.userId === currentUser?.userId
                                                && !item.deleted
                                                && !item.deletedAt;

                                            return (
                                                <PostActions
                                                    liked={item.likedByCurrentUser}
                                                    likeCount={item.likeCount}
                                                    commentCount={item.commentCount}
                                                    onLike={() => toggleLike(item)}
                                                    onRerate={() => setActiveComposer((current) => (
                                                            current === `${item.ratingId}:rerate` ? null : `${item.ratingId}:rerate`
                                                    ))}
                                                    onComment={() => openComments(item.ratingId)}
                                                    onEdit={canEdit ? () => navigate(`/posts/${item.ratingId}/edit`) : undefined}
                                                />
                                            );
                                        }}
                                    renderAfterItem={(item) => {
                                        const rerateKey = `${item.ratingId}:rerate`;
                                        const isCommentThreadActive = activeComposer?.startsWith(`${item.ratingId}:comment`);

                                        return (
                                            <>
                                                {activeComposer === rerateKey && renderRerate(item)}
                                                {isCommentThreadActive && renderComments(item)}
                                            </>
                                        );
                                    }}
                                    sentinelRef={sentinelRef}
                                    hasMore={hasMorePosts}
                                    isLoadingMore={isPostsLoadingMore}
                                    loadingMoreMessage="Loading more..."
                                    endMessage="No more posts to show."
                                />
                            )}
                        </section>
                    </>
                ) : (
                    <div className="profile-empty-state">Profile not found.</div>
                )}
            </main>
        </div>
    );
};

export default Profile;
