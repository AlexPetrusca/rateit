const HeartIcon = ({ filled = false }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'is-filled' : ''}>
        <path d="M20.8 4.6c-1.7-1.6-4.4-1.5-6 .2L12 7.7 9.2 4.8c-1.6-1.7-4.3-1.8-6-.2-1.8 1.7-1.9 4.5-.2 6.3l9 9.1 9-9.1c1.7-1.8 1.6-4.6-.2-6.3Z" />
    </svg>
);

const CycleIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 2v5h-5" />
        <path d="M7 22v-5h5" />
        <path d="M19 9a7 7 0 0 0-11.9-4.9L7 5" />
        <path d="M5 15a7 7 0 0 0 11.9 4.9L17 19" />
    </svg>
);

const CommentIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 11.5a8.5 8.5 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.6-5A8.1 8.1 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
    </svg>
);

const PostActions = ({
    liked = false,
    likeCount = 0,
    commentCount = 0,
    onLike,
    onRerate,
    onComment
}) => (
    <div className="tweet-actions" aria-label="Rating actions">
        {onLike && (
            <button
                type="button"
                className={liked ? 'tweet-action is-liked' : 'tweet-action'}
                onClick={onLike}
                aria-label={`${liked ? 'Unlike' : 'Like'} post. ${likeCount || 0} likes`}
                title={liked ? 'Unlike' : 'Like'}
            >
                <span className="action-icon">
                    <HeartIcon filled={liked} />
                </span>
                <span className="sr-only">{liked ? 'Unlike' : 'Like'}</span>
                <span className="tweet-action-count">{likeCount || 0}</span>
            </button>
        )}
        {onRerate && (
            <button
                type="button"
                className="tweet-action"
                onClick={onRerate}
                aria-label="Re-rate post"
                title="Re-rate"
            >
                <span className="action-icon">
                    <CycleIcon />
                </span>
                <span className="sr-only">Re-rate</span>
            </button>
        )}
        {onComment && (
            <button
                type="button"
                className="tweet-action"
                onClick={onComment}
                aria-label={`Comment on post. ${commentCount || 0} comments`}
                title="Comment"
            >
                <span className="action-icon">
                    <CommentIcon />
                </span>
                <span className="sr-only">Comment</span>
                <span className="tweet-action-count">{commentCount || 0}</span>
            </button>
        )}
    </div>
);

export default PostActions;
