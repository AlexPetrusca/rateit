import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import UserAvatar from '../components/UserAvatar.jsx';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const getFollowActionLabel = (relation) => ({
    NOT_FOLLOWING: 'Follow',
    FOLLOWING: 'Following'
}[relation]);

const SearchUsers = () => {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeUserId, setActiveUserId] = useState(null);
    const [error, setError] = useState('');

    const runSearch = async (event) => {
        event?.preventDefault();
        const trimmedQuery = query.trim();

        setHasSearched(true);
        setError('');

        if (!trimmedQuery) {
            setResults([]);
            return;
        }

        setIsLoading(true);

        try {
            const nextResults = await BackendApiService.searchUsers({ query: trimmedQuery, limit: 10 });
            setResults(nextResults);
        } catch (searchError) {
            const message = searchError.message || 'Failed to search users';
            setError(message);
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const updateRelation = (userId, followRelation) => {
        setResults((current) => current.map((result) => (
            result.userId === userId
                ? { ...result, followRelation }
                : result
        )));
    };

    const handleFollowAction = async (result) => {
        const relation = result.followRelation;

        if (result.userId == null || relation === 'SELF') {
            return;
        }

        setActiveUserId(result.userId);

        try {
            if (relation === 'NOT_FOLLOWING') {
                await BackendApiService.followUser(result.userId);
                updateRelation(result.userId, 'FOLLOWING');
                notify({ message: 'Now following.', type: 'info' });
            } else if (relation === 'FOLLOWING') {
                await BackendApiService.unfollowUser(result.userId);
                updateRelation(result.userId, 'NOT_FOLLOWING');
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

                <form className="user-search-form" onSubmit={runSearch}>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by username"
                        aria-label="Search by username"
                    />
                    <button type="submit" disabled={isLoading}>
                        Search
                    </button>
                </form>

                {error ? (
                    <div className="profile-empty-state">{error}</div>
                ) : isLoading ? (
                    <div className="profile-loading">Searching...</div>
                ) : hasSearched && results.length === 0 ? (
                    <div className="profile-empty-state">No users found.</div>
                ) : (
                    <section className="user-search-results" aria-label="User search results">
                        {results.map((result) => {
                            const followActionLabel = getFollowActionLabel(result.followRelation);
                            const canUseFollowAction = Boolean(followActionLabel);
                            const isActive = activeUserId === result.userId;

                            return (
                                <article className="user-search-result" key={result.userId}>
                                    <button
                                        type="button"
                                        className="notification-person"
                                        onClick={() => navigate(`/users/${result.userId}`)}
                                    >
                                        <UserAvatar
                                            username={result.username}
                                            profilePicUrl={result.profilePicUrl}
                                            alt={result.username || 'User'}
                                            size="md"
                                        />
                                        <span>
                                            <strong>{result.username}</strong>
                                            <span>@{result.username}</span>
                                        </span>
                                    </button>
                                    {result.followRelation === 'SELF' ? (
                                        <span className="user-search-note">You</span>
                                    ) : canUseFollowAction ? (
                                        <button
                                            type="button"
                                            className={
                                                result.followRelation === 'FOLLOWING'
                                                    ? 'secondary-action-button'
                                                    : ''
                                            }
                                            disabled={isActive}
                                            onClick={() => handleFollowAction(result)}
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

export default SearchUsers;
