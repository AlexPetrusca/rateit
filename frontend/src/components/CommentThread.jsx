import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';

const FIVE_STAR_SCALE = { max: 5, symbol: 'star' };

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

const CommentThread = ({
    comments = [],
    onAuthorClick,
    onReplyClick,
    activeReplyKey,
    getReplyKey,
    renderReplyComposer,
    avatarSize = 'sm',
    indentStep = 18,
    authorFallback = 'Someone',
    replyButtonLabel = 'Reply'
}) => {
    const renderComments = (threadComments, depth = 0) => {
        return threadComments.map((comment) => {
            const replies = comment.replies || [];
            const replyKey = typeof getReplyKey === 'function' ? getReplyKey(comment, depth) : comment.id;
            const canReply = typeof onReplyClick === 'function';
            const authorName = comment.author?.username || authorFallback;

            return (
                <div className="comment-thread" key={comment.id}>
                    <div className="comment-row" style={{ marginLeft: `${depth * indentStep}px` }}>
                        <div className="comment-avatar-column">
                            {comment.author?.userId != null && typeof onAuthorClick === 'function' ? (
                                <button
                                    type="button"
                                    className="profile-link profile-link-avatar"
                                    onClick={() => onAuthorClick(comment.author.userId)}
                                    aria-label={`Open profile for ${authorName}`}
                                >
                                    <UserAvatar
                                        username={comment.author?.username}
                                        profilePicUrl={comment.author?.profilePicUrl}
                                        alt=""
                                        size={avatarSize}
                                    />
                                </button>
                            ) : (
                                <UserAvatar
                                    username={comment.author?.username}
                                    profilePicUrl={comment.author?.profilePicUrl}
                                    alt=""
                                    size={avatarSize}
                                />
                            )}
                        </div>

                        <div className="comment-body">
                            <div className="comment-meta">
                                {comment.author?.userId != null && typeof onAuthorClick === 'function' ? (
                                    <button
                                        type="button"
                                        className="profile-link profile-link-text"
                                        onClick={() => onAuthorClick(comment.author.userId)}
                                    >
                                        <div className="comment-author">{authorName}</div>
                                    </button>
                                ) : (
                                    <div className="comment-author">{authorName}</div>
                                )}
                                {comment.score != null && (
                                    <div className="comment-score">
                                        <StarRating
                                            value={comment.score}
                                            label={formatScoreValue(comment.score, FIVE_STAR_SCALE)}
                                            size="sm"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="comment-text">{comment.text}</div>
                            {canReply && (
                                <button
                                    type="button"
                                    className="comment-reply-button"
                                    onClick={() => onReplyClick(comment)}
                                >
                                    {replyButtonLabel}
                                </button>
                            )}
                        </div>
                    </div>
                    {activeReplyKey === replyKey && typeof renderReplyComposer === 'function' && (
                        renderReplyComposer(comment, depth)
                    )}
                    {replies.length > 0 && (
                        <div className="comment-replies">
                            {renderComments(replies, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return renderComments(comments);
};

export default CommentThread;
