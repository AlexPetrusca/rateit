import { Fragment } from 'react';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import PostActions from './PostActions.jsx';

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
    onLikeClick,
    onEditClick,
    activeReplyKey,
    activeEditKey,
    getReplyKey,
    getEditKey,
    renderReplyComposer,
    renderEditComposer,
    currentUserId,
    avatarSize = 'sm',
    indentStep = 18,
    authorFallback = 'Someone',
    replyButtonLabel = 'Reply',
    expandedReplyKeys = [],
    onToggleReplies,
    onlyShowExpandedReplies = false,
    nestRepliesInParentCard = false
}) => {
    const expandedReplyKeySet = new Set(expandedReplyKeys);

    const getCommentReplyKey = (comment, depth) => (
        typeof getReplyKey === 'function' ? getReplyKey(comment, depth) : comment.id
    );

    const hasActiveReplyInTree = (threadComments, depth = 0) => {
        return threadComments.some((comment) => {
            const replyKey = getCommentReplyKey(comment, depth);
            const replies = comment.replies || [];

            return activeReplyKey === replyKey || hasActiveReplyInTree(replies, depth + 1);
        });
    };

    const renderCommentCard = (comment, depth, replyKey, editKey, replies, repliesAreVisible) => {
        const canReply = typeof onReplyClick === 'function';
        const canLike = typeof onLikeClick === 'function';
        const canEdit = typeof onEditClick === 'function' && comment.author?.userId != null && currentUserId != null && comment.author.userId === currentUserId;
        const authorName = comment.author?.username || authorFallback;
        const hasReplies = replies.length > 0;
        const handleCommentClick = () => {
            if (hasReplies && typeof onToggleReplies === 'function') {
                onToggleReplies(comment, replyKey);
                return;
            }

            onReplyClick(comment);
        };

        return (
            <>
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
                        <PostActions
                            liked={Boolean(comment.likedByCurrentUser)}
                            likeCount={comment.likeCount || 0}
                            commentCount={replies.length}
                            onLike={canLike ? () => onLikeClick(comment) : undefined}
                            onComment={canReply ? handleCommentClick : undefined}
                            onEdit={canEdit ? () => onEditClick(comment) : undefined}
                            commentLabel={replyButtonLabel}
                            commentAriaLabel={`${replyButtonLabel} on comment. ${replies.length} replies`}
                            showCommentCount={replies.length > 0}
                        />
                    </div>
                </div>
                {activeReplyKey === replyKey && typeof renderReplyComposer === 'function' && (
                    renderReplyComposer(comment, depth)
                )}
                {activeEditKey === editKey && typeof renderEditComposer === 'function' && (
                    renderEditComposer(comment, depth)
                )}
                {repliesAreVisible && (
                    <div className="comment-replies">
                        {renderComments(replies, depth + 1)}
                    </div>
                )}
            </>
        );
    };

    const renderComments = (threadComments, depth = 0) => {
        return threadComments.map((comment) => {
            const replies = comment.replies || [];
            const replyKey = getCommentReplyKey(comment, depth);
            const editKey = typeof getEditKey === 'function' ? getEditKey(comment, depth) : `edit:${comment.id}`;
            const repliesAreVisible = replies.length > 0 && (
                expandedReplyKeySet.has(replyKey)
                    || (!onlyShowExpandedReplies && (activeReplyKey === replyKey || hasActiveReplyInTree(replies, depth + 1)))
            );
            const content = renderCommentCard(comment, depth, replyKey, editKey, replies, repliesAreVisible);

            if (nestRepliesInParentCard && depth > 0) {
                return (
                    <Fragment key={comment.id}>
                        {content}
                    </Fragment>
                );
            }

            return (
                <div className="comment-thread" key={comment.id} data-depth={depth}>
                    {content}
                </div>
            );
        });
    };

    return renderComments(comments);
};

export default CommentThread;
