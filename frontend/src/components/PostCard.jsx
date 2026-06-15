import { useState } from 'react';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';

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

const formatPostDate = (createdAt, options) => {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(createdAt));
};

const PostCard = ({
    post,
    onAuthorClick,
    onPostClick,
    onTopicClick,
    showTopicText = true,
    footer,
    actions,
    className = '',
    avatarSize = 'lg',
    postBodyClassName = '',
    bodyClassName = ''
}) => {
    const [expandedImageUrl, setExpandedImageUrl] = useState(null);

    if (!post) {
        return null;
    }

    const isDeleted = Boolean(post.deleted || post.deletedAt);
    const hasMedia = !isDeleted && Boolean(post.rateableItem?.mediaObjectKey);
    const topicLabel = post.rateableItem?.title || post.rateableItem?.body || '';
    const mediaUrl = hasMedia ? `/api/s3/images/${post.rateableItem.mediaObjectKey}` : null;
    const cardClassName = [
        'tweet-card',
        isDeleted ? 'tweet-card-deleted' : '',
        hasMedia ? 'tweet-card-media' : 'tweet-card-text',
        className
    ].filter(Boolean).join(' ');

    const mediaContent = hasMedia && (
        <button
            type="button"
            className="rating-object rating-object-button"
            onClick={() => setExpandedImageUrl(mediaUrl)}
            aria-label="Open photo"
        >
            <img
                src={mediaUrl}
                alt="Rated item"
                className="rating-object-media"
            />
        </button>
    );

    const ratingTextContent = !isDeleted && (
        <div className="text-rating">
            {topicLabel && showTopicText && (
                onTopicClick ? (
                    <button
                        type="button"
                        className={['text-post-body', 'text-post-topic-link', bodyClassName].filter(Boolean).join(' ')}
                        onClick={(event) => {
                            event.stopPropagation();
                            onTopicClick(post.rateableItem.id);
                        }}
                    >
                        {topicLabel}
                    </button>
                ) : (
                    <p className={['text-post-body', bodyClassName].filter(Boolean).join(' ')}>
                        {topicLabel}
                    </p>
                )
            )}
            <div className="text-rating-score">
                <strong className="op-rating-stars">
                    <StarRating
                        value={post.score}
                        label={formatScoreValue(post.score, post.ratingScale)}
                        max={post.ratingScale?.max}
                        size="sm"
                    />
                </strong>
            </div>
        </div>
    );

    const reviewContent = !isDeleted && post.reviewText && (
        <p className={['tweet-review', postBodyClassName].filter(Boolean).join(' ')}>
            {post.reviewText}
        </p>
    );

    const clickableContent = (
        <>
            {isDeleted ? (
                <div className="deleted-post-placeholder">
                    This post has been deleted.
                </div>
            ) : (
                <>
                    {ratingTextContent}
                    {reviewContent}
                </>
            )}
        </>
    );

    return (
        <>
            <article className={cardClassName}>
                <div className="tweet-avatar-column">
                    {post.author?.userId != null && typeof onAuthorClick === 'function' ? (
                        <button
                            type="button"
                            className="profile-link profile-link-avatar"
                            onClick={() => onAuthorClick(post.author.userId)}
                            aria-label={`Open profile for ${post.author.username}`}
                        >
                            <UserAvatar
                                username={post.author?.username}
                                profilePicUrl={post.author?.profilePicUrl}
                                alt=""
                                size={avatarSize}
                            />
                        </button>
                    ) : (
                        <UserAvatar
                            username={post.author?.username}
                            profilePicUrl={post.author?.profilePicUrl}
                            alt=""
                            size={avatarSize}
                        />
                    )}
                </div>

                <div className="tweet-main">
                    <header className="tweet-meta">
                        {post.author?.userId != null && typeof onAuthorClick === 'function' ? (
                            <button
                                type="button"
                                className="profile-link profile-link-text"
                                onClick={() => onAuthorClick(post.author.userId)}
                            >
                                <span className="tweet-name">{post.author?.username}</span>
                                <span className="tweet-handle">@{post.author?.username}</span>
                            </button>
                        ) : (
                            <>
                                <span className="tweet-name">{post.author?.username}</span>
                                <span className="tweet-handle">@{post.author?.username}</span>
                            </>
                        )}
                        <span className="tweet-dot">.</span>
                        <time className="tweet-time-desktop" dateTime={post.createdAt}>
                            {formatPostDate(post.createdAt, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </time>
                        <time className="tweet-time-mobile" dateTime={post.createdAt}>
                            {formatPostDate(post.createdAt, {
                                month: 'short',
                                day: 'numeric'
                            })}
                        </time>
                    </header>

                    {typeof onPostClick === 'function' && mediaContent}

                    {typeof onPostClick === 'function' ? (
                        <div
                            className="post-click-target"
                            role="button"
                            tabIndex={0}
                            onClick={() => onPostClick(post.ratingId)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onPostClick(post.ratingId);
                                }
                            }}
                        >
                            {clickableContent}
                        </div>
                    ) : (
                        <div className="post-click-target post-click-target-static">
                            {mediaContent}
                            {clickableContent}
                        </div>
                    )}

                    {footer ?? actions}
                </div>
            </article>

            {expandedImageUrl && (
                <div
                    className="image-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Expanded photo"
                    onClick={() => setExpandedImageUrl(null)}
                >
                    <button
                        type="button"
                        className="image-lightbox-close"
                        onClick={() => setExpandedImageUrl(null)}
                        aria-label="Close photo"
                    >
                        x
                    </button>
                    <div className="image-lightbox-frame">
                        <img
                            src={expandedImageUrl}
                            alt="Expanded rated item"
                            className="image-lightbox-image"
                            onClick={(event) => event.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default PostCard;
