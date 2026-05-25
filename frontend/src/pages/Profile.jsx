import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import StarRating from '../components/StarRating.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const PROFILE_POST_PAGE_SIZE = 5;

const formatTimestamp = (value) => {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(value));
};

const formatScoreValue = (score, ratingScale) => {
    const numericScore = Number(score);
    const max = Number(ratingScale?.max);
    const symbol = ratingScale?.symbol === 'star' ? 'stars' : ratingScale?.symbol;

    if (!Number.isFinite(numericScore)) {
        return '';
    }

    const displayScore = Number.isInteger(numericScore) ? numericScore.toString() : numericScore.toFixed(1);
    const displayMax = Number.isFinite(max)
        ? (Number.isInteger(max) ? max.toString() : max.toFixed(1))
        : '';

    return `${displayScore}${Number.isFinite(max) ? ` / ${displayMax}` : ''}${symbol ? ` ${symbol}` : ''}`;
};

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
    const [profileError, setProfileError] = useState('');
    const [postsError, setPostsError] = useState('');
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const sentinelRef = useRef(null);
    const postsInitializedForUserIdRef = useRef(null);

    const resolvedUserId = useMemo(() => {
        if (routeUserId != null) {
            const parsed = Number(routeUserId);
            return Number.isFinite(parsed) ? parsed : null;
        }

        return currentUser?.userId ?? null;
    }, [routeUserId, currentUser?.userId]);

    const isOwnProfile = useMemo(() => {
        if (resolvedUserId == null || currentUser?.userId == null) {
            return false;
        }

        return resolvedUserId === currentUser.userId;
    }, [resolvedUserId, currentUser?.userId]);

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

    useEffect(() => {
        if (resolvedUserId == null) {
            postsInitializedForUserIdRef.current = null;
            setProfile(null);
            setPosts([]);
            setIsProfileLoading(false);
            setIsPostsLoading(false);
            setHasMorePosts(false);
            return;
        }

        setPostPage(0);
        setPostRowCount(0);
        setPosts([]);
        setHasMorePosts(true);
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
                                    <span className="profile-role">{profile.role}</span>
                                </div>
                                <div className="profile-subtitle">{profileSubtitle}</div>
                                <div className="profile-meta-grid">
                                    <div>
                                        <strong>User ID</strong>
                                        <span>{profile.userId}</span>
                                    </div>
                                    <div>
                                        <strong>Phone</strong>
                                        <span>{profile.phoneNumber}</span>
                                    </div>
                                    <div>
                                        <strong>Posts</strong>
                                        <span>{postRowCount}</span>
                                    </div>
                                    <div>
                                        <strong>Created</strong>
                                        <span>{formatTimestamp(profile.createdAt)}</span>
                                    </div>
                                    <div>
                                        <strong>Status</strong>
                                        <span>{profile.deletedAt ? 'Deleted' : 'Active'}</span>
                                    </div>
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
                                <>
                                    <div className="profile-post-list">
                                        {posts.map((post) => (
                                            <article key={post.ratingId} className="profile-post-card">
                                                <div className="profile-post-header">
                                                    <div className="profile-post-score">
                                                        <StarRating
                                                            value={post.score}
                                                            label={`Score ${formatScoreValue(post.score, post.ratingScale)}`}
                                                            max={post.ratingScale?.max}
                                                            size="sm"
                                                            readOnly
                                                        />
                                                        <span>{formatScoreValue(post.score, post.ratingScale)}</span>
                                                    </div>
                                                    <span className="profile-post-time">{formatTimestamp(post.createdAt)}</span>
                                                </div>
                                                {post.rateableItem?.mediaObjectKey && (
                                                    <div className="profile-post-media">
                                                        <img
                                                            src={`/api/s3/images/${post.rateableItem.mediaObjectKey}`}
                                                            alt="Post media"
                                                        />
                                                    </div>
                                                )}
                                                <div className="profile-post-body">{post.rateableItem?.body || '—'}</div>
                                                <div className="profile-post-review">{post.reviewText || 'No review text.'}</div>
                                                <div className="profile-post-footer">
                                                    <span>{post.likeCount} likes</span>
                                                    <span>{post.commentCount} comments</span>
                                                    <span>{post.rateableItem?.type}</span>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                    <div ref={sentinelRef} className="profile-post-sentinel" />
                                    {isPostsLoadingMore && <div className="profile-loading">Loading more...</div>}
                                    {!hasMorePosts && posts.length > 0 && (
                                        <div className="profile-empty-state profile-end-state">
                                            No more posts to show.
                                        </div>
                                    )}
                                </>
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
