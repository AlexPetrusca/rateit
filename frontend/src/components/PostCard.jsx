import { useState } from 'react';
import { parseRichText } from './RichText.jsx';
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
    expandedContent,
    onCardClick,
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
                        {parseRichText(topicLabel)}
                    </button>
                ) : (
                    <p className={['text-post-body', bodyClassName].filter(Boolean).join(' ')}>
                        {parseRichText(topicLabel)}
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
            {parseRichText(post.reviewText)}
        </p>
    );

    const hasClickAction = typeof onCardClick === 'function'
        || typeof onTopicClick === 'function'
        || typeof onPostClick === 'function';

    const handleCardClick = () => {
        if (typeof onCardClick === 'function') {
            onCardClick(post);
            return;
        }

        if (typeof onTopicClick === 'function' && post.rateableItem?.id != null) {
            onTopicClick(post.rateableItem.id);
            return;
        }

        if (typeof onPostClick === 'function') {
            onPostClick(post.rateableItem?.id ?? post.ratingId);
        }
    };

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
                <div className="tweet-main">
                    <header className="tweet-meta">
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

                    {hasClickAction ? (
                        <div
                            className="post-click-target"
                            role="button"
                            tabIndex={0}
                            aria-expanded={typeof onCardClick === 'function' ? Boolean(expandedContent) : undefined}
                            onClick={handleCardClick}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleCardClick();
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
                {expandedContent && (
                    <div className="tweet-expanded-content">
                        {expandedContent}
                    </div>
                )}
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
