import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import UserAvatar from '../components/UserAvatar.jsx';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const getFollowActionLabel = (relation) => ({
    NOT_FOLLOWING: 'Follow',
    FOLLOWING: 'Following'
}[relation]);

const FollowList = ({ type }) => {
    const navigate = useNavigate();
    const { userId } = useParams();
    const { notify } = useNotifications();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeUserId, setActiveUserId] = useState(null);
    const [error, setError] = useState('');

    const resolvedUserId = useMemo(() => {
        const parsed = Number(userId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [userId]);

    const title = type === 'following' ? 'Following' : 'Followers';

    const loadUsers = useCallback(async () => {
        if (resolvedUserId == null) {
            setUsers([]);
            setIsLoading(false);
            setError('Profile not found.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const nextUsers = type === 'following'
                ? await BackendApiService.getFollowing(resolvedUserId)
                : await BackendApiService.getFollowers(resolvedUserId);
            setUsers(nextUsers);
        } catch (loadError) {
            const message = loadError.message || `Failed to load ${title.toLowerCase()}`;
            setError(message);
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [notify, resolvedUserId, title, type]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const updateRelation = (nextUserId, followRelation) => {
        setUsers((current) => current.map((user) => (
            user.userId === nextUserId
                ? { ...user, followRelation }
                : user
        )));
    };

    const handleFollowAction = async (user) => {
        if (user.userId == null || user.followRelation === 'SELF') {
            return;
        }

        setActiveUserId(user.userId);

        try {
            if (user.followRelation === 'NOT_FOLLOWING') {
                await BackendApiService.followUser(user.userId);
                updateRelation(user.userId, 'FOLLOWING');
                notify({ message: 'Now following.', type: 'info' });
            } else if (user.followRelation === 'FOLLOWING') {
                await BackendApiService.unfollowUser(user.userId);
                updateRelation(user.userId, 'NOT_FOLLOWING');
                notify({ message: 'Unfollowed.', type: 'info' });
            }
        } catch (actionError) {
            notify({ message: actionError.message || 'Failed to update follow', type: 'error' });
        } finally {
            setActiveUserId(null);
        }
    };

    return (
        <div className="feed-page">
            <main className="twitter-shell search-shell">

                {isLoading ? (
                    <div className="profile-loading">Loading {title.toLowerCase()}...</div>
                ) : error ? (
                    <div className="profile-empty-state">{error}</div>
                ) : users.length === 0 ? (
                    <div className="profile-empty-state">No {title.toLowerCase()} yet.</div>
                ) : (
                    <section className="user-search-results" aria-label={title}>
                        {users.map((user) => {
                            const followActionLabel = getFollowActionLabel(user.followRelation);
                            const isActive = activeUserId === user.userId;

                            return (
                                <article className="user-search-result" key={user.userId}>
                                    <button
                                        type="button"
                                        className="notification-person"
                                        onClick={() => navigate(`/users/${user.userId}`)}
                                    >
                                        <UserAvatar
                                            username={user.username}
                                            profilePicUrl={user.profilePicUrl}
                                            alt={user.username || 'User'}
                                            size="md"
                                        />
                                        <span>
                                            <strong>{user.username}</strong>
                                            <span>@{user.username}</span>
                                        </span>
                                    </button>
                                    {user.followRelation === 'SELF' ? (
                                        <span className="user-search-note">You</span>
                                    ) : followActionLabel ? (
                                        <button
                                            type="button"
                                            className="profile-action-button"
                                            disabled={isActive}
                                            onClick={() => handleFollowAction(user)}
                                        >
                                            {isActive ? 'Updating...' : followActionLabel}
                                        </button>
                                    ) : null}
                                </article>
                            );
                        })}
                    </section>
                )}
            </main>
        </div>
    );
};

export default FollowList;
