import { useState } from 'react';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import { formatScoreValue } from '../utils/ratingDisplay.js';

const formatPostDate = (createdAt, options) => {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(createdAt));
};

const PostCard = ({
    post,
    onAuthorClick,
    onPostClick,
    onTopicClick,
    showTopicText = true,
    showMedia = true,
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
            onClick={(event) => {
                event.stopPropagation();

                if (typeof onTopicClick === 'function' && post.rateableItem?.id != null) {
                    onTopicClick(post.rateableItem.id);
                    return;
                }

                setExpandedImageUrl(mediaUrl);
            }}
            aria-label={typeof onTopicClick === 'function' ? 'Open topic' : 'Open photo'}
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

                    {(typeof onPostClick === 'function' || typeof onTopicClick === 'function') && showMedia && mediaContent}

                    {typeof onTopicClick === 'function' || typeof onPostClick === 'function' ? (
                        <div
                            className="post-click-target"
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                if (typeof onTopicClick === 'function' && post.rateableItem?.id != null) {
                                    onTopicClick(post.rateableItem.id);
                                    return;
                                }

                                onPostClick(post.rateableItem?.id ?? post.ratingId);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    if (typeof onTopicClick === 'function' && post.rateableItem?.id != null) {
                                        onTopicClick(post.rateableItem.id);
                                        return;
                                    }

                                    onPostClick(post.rateableItem?.id ?? post.ratingId);
                                }
                            }}
                        >
                            {clickableContent}
                        </div>
                    ) : (
                        <div className="post-click-target post-click-target-static">
                            {showMedia && mediaContent}
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
