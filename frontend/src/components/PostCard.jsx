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
    footer,
    actions,
    className = '',
    avatarSize = 'lg',
    postBodyClassName = '',
    bodyClassName = ''
}) => {
    if (!post) {
        return null;
    }

    const isDeleted = Boolean(post.deleted || post.deletedAt);
    const hasMedia = !isDeleted && Boolean(post.rateableItem?.mediaObjectKey);
    const cardClassName = [
        'tweet-card',
        isDeleted ? 'tweet-card-deleted' : '',
        hasMedia ? 'tweet-card-media' : 'tweet-card-text',
        className
    ].filter(Boolean).join(' ');

    const postContent = (
        <>
            {isDeleted ? (
                <div className="deleted-post-placeholder">
                    This post has been deleted.
                </div>
            ) : hasMedia && (
                <div className="rating-object">
                    <img
                        src={`/api/s3/images/${post.rateableItem.mediaObjectKey}`}
                        alt="Rated item"
                        className="rating-object-media"
                    />
                </div>
            )}

            {!isDeleted && (
                <div className="text-rating">
                    {post.rateableItem?.body && (
                        <p className={['text-post-body', bodyClassName].filter(Boolean).join(' ')}>
                            {post.rateableItem.body}
                        </p>
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
            )}

            {!isDeleted && post.reviewText && (
                <p className={['tweet-review', postBodyClassName].filter(Boolean).join(' ')}>
                    {post.reviewText}
                </p>
            )}
        </>
    );

    return (
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

                {typeof onPostClick === 'function' ? (
                    <button
                        type="button"
                        className="post-click-target"
                        onClick={() => onPostClick(post.ratingId)}
                    >
                        {postContent}
                    </button>
                ) : (
                    <div className="post-click-target post-click-target-static">
                        {postContent}
                    </div>
                )}

                {footer ?? actions}
            </div>
        </article>
    );
};

export default PostCard;
