import { Fragment } from 'react';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import PostActions from './PostActions.jsx';
import { FIVE_STAR_SCALE, formatScoreValue } from '../utils/ratingDisplay.js';

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
    indentStep = 10,
    authorFallback = 'Someone',
    replyButtonLabel = 'Reply',
    expandedReplyKeys = [],
    onToggleReplies,
    onlyShowExpandedReplies = false,
    autoExpandDepth = 3,
    autoExpandFlatLimit = 8,
    nestRepliesInParentCard = false,
    threadClassName = 'comment-thread',
    rootThreadClassName = '',
    repliesClassName = 'comment-replies'
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

    const getReplyDescendantCount = (comment) => {
        const replies = comment.replies || [];

        return replies.reduce((total, reply) => total + 1 + getReplyDescendantCount(reply), 0);
    };

    const createAutoExpandState = () => ({
        depthRemaining: autoExpandDepth,
        budget: { remaining: autoExpandFlatLimit }
    });

    const getNextAutoExpandState = (autoExpandState, replies) => {
        if (!autoExpandState || replies.length === 0) {
            return null;
        }

        if (autoExpandState.depthRemaining <= 1 || autoExpandState.budget.remaining <= 0) {
            return null;
        }

        autoExpandState.budget.remaining -= 1;

        return {
            depthRemaining: autoExpandState.depthRemaining - 1,
            budget: autoExpandState.budget
        };
    };

    const renderCommentCard = (comment, depth, replyKey, editKey, replies, repliesAreVisible, replyCount, nextAutoExpandState) => {
        const canReply = typeof onReplyClick === 'function';
        const canLike = typeof onLikeClick === 'function';
        const canEdit = typeof onEditClick === 'function' && comment.author?.userId != null && currentUserId != null && comment.author.userId === currentUserId;
        const authorName = comment.author?.username || authorFallback;
        const hasReplies = replyCount > 0;
        const replyCountLabel = `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
        const toggleLabel = hasReplies
            ? (repliesAreVisible ? 'Hide replies' : 'Replies')
            : 'Reply';
        const handleCommentClick = () => {
            if (hasReplies && typeof onToggleReplies === 'function') {
                onToggleReplies(comment, replyKey);
                return;
            }

            onReplyClick(comment);
        };

        return (
            <>
                <div className="comment-row" style={{ marginLeft: `${Math.max(0, depth - 1) * indentStep}px` }}>
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
                            commentCount={replyCount}
                            onLike={canLike ? () => onLikeClick(comment) : undefined}
                            onComment={canReply ? handleCommentClick : undefined}
                            onReply={canReply ? () => onReplyClick(comment) : undefined}
                            onEdit={canEdit ? () => onEditClick(comment) : undefined}
                            commentLabel={toggleLabel}
                            replyLabel={replyButtonLabel}
                            commentAriaLabel={`${replyButtonLabel} on comment. ${replyCountLabel}`}
                            showCommentCount={replyCount > 0}
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
                    <div className={repliesClassName}>
                        {renderComments(replies, depth + 1, nextAutoExpandState)}
                    </div>
                )}
            </>
        );
    };

    const renderComments = (threadComments, depth = 0, autoExpandState = null) => {
        return threadComments.map((comment) => {
            const replies = comment.replies || [];
            const replyKey = getCommentReplyKey(comment, depth);
            const editKey = typeof getEditKey === 'function' ? getEditKey(comment, depth) : `edit:${comment.id}`;
            const replyCount = getReplyDescendantCount(comment);
            const isManuallyExpanded = expandedReplyKeySet.has(replyKey);
            const nextAutoExpandState = getNextAutoExpandState(autoExpandState, replies);
            const repliesAreVisible = replies.length > 0 && (
                nextAutoExpandState != null
                    || isManuallyExpanded
                    || (!onlyShowExpandedReplies && (activeReplyKey === replyKey || hasActiveReplyInTree(replies, depth + 1)))
            );
            const childAutoExpandState = isManuallyExpanded || (!onlyShowExpandedReplies && activeReplyKey === replyKey)
                ? createAutoExpandState()
                : nextAutoExpandState;
            const content = renderCommentCard(comment, depth, replyKey, editKey, replies, repliesAreVisible, replyCount, childAutoExpandState);

            if (nestRepliesInParentCard && depth > 0) {
                return (
                    <Fragment key={comment.id}>
                        {content}
                    </Fragment>
                );
            }

            return (
                <div
                    className={[
                        threadClassName,
                        depth === 0 ? rootThreadClassName : ''
                    ].filter(Boolean).join(' ')}
                    key={comment.id}
                    data-depth={depth}
                >
                    {content}
                </div>
            );
        });
    };

    return renderComments(comments);
};

export default CommentThread;
