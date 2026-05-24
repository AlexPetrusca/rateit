import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const Home = () => {
    const { user, isAuthenticated } = useAuth();
    const [feedItems, setFeedItems] = useState([]);
    const [isFeedLoading, setIsFeedLoading] = useState(false);
    const [feedError, setFeedError] = useState(null);

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

    return (
        <div className="feed-page">
            <main className="feed-shell">
                {isFullyAuthenticated ? (
                    <>
                        <div className="feed-header">
                            <div>
                                <p className="eyebrow">Hello, {user?.username}</p>
                                <h1>Recent ratings</h1>
                            </div>
                        </div>

                        {isFeedLoading && <p className="feed-status">Loading ratings...</p>}
                        {feedError && <p className="error">{feedError}</p>}
                        {!isFeedLoading && !feedError && feedItems.length === 0 && (
                            <p className="feed-status">No ratings yet.</p>
                        )}

                        <section className="feed-list" aria-label="Recent ratings">
                            {feedItems.map((item) => (
                                <article className="feed-card" key={item.ratingId}>
                                    <header className="feed-card-header">
                                        <div className="feed-author">
                                            {item.author?.profilePicUrl ? (
                                                <img
                                                    src={`/api/s3/images/${item.author.profilePicUrl}`}
                                                    alt=""
                                                    className="feed-avatar"
                                                />
                                            ) : (
                                                <div className="feed-avatar feed-avatar-placeholder">
                                                    {item.author?.username?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <div className="feed-author-name">{item.author?.username}</div>
                                                <time className="feed-time" dateTime={item.createdAt}>
                                                    {formatDate(item.createdAt)}
                                                </time>
                                            </div>
                                        </div>
                                        <div className="feed-score">{formatScore(item)}</div>
                                    </header>

                                    {item.rateableItem?.mediaObjectKey && (
                                        <img
                                            src={`/api/s3/images/${item.rateableItem.mediaObjectKey}`}
                                            alt={item.rateableItem?.title || 'Rated item'}
                                            className="feed-media"
                                        />
                                    )}

                                    <div className="feed-card-body">
                                        <h2>{item.rateableItem?.title || 'Untitled rating'}</h2>
                                        {item.rateableItem?.body && <p>{item.rateableItem.body}</p>}
                                        {item.reviewText && (
                                            <blockquote>{item.reviewText}</blockquote>
                                        )}
                                    </div>
                                </article>
                            ))}
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
