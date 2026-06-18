import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RepeatIcon from '@mui/icons-material/Repeat';
import ReplyIcon from '@mui/icons-material/Reply';
import ChatBubbleHD from '../assets/icons/hand_drawn/chat_bubble.svg?react';
import PencilHD from '../assets/icons/hand_drawn/pencil.svg?react';
import EmptyHeartHD from '../assets/icons/hand_drawn/empty_heart.svg?react';
import FullHeartHD from '../assets/icons/hand_drawn/full_heart.svg?react';
import CycleHD from '../assets/icons/hand_drawn/cycle.svg?react';
import ReplyHD from '../assets/icons/hand_drawn/reply.svg?react';
import { useIconPack } from '../contexts/IconPackContext.jsx';

const PostActions = ({
    liked = false,
    likeCount = 0,
    commentCount = 0,
    onLike,
    onRerate,
    onComment,
    onReply,
    onEdit,
    commentLabel = 'Comment',
    replyLabel = 'Reply',
    commentAriaLabel,
    showCommentCount = true
}) => {
    const { iconPack } = useIconPack();
    const hd = iconPack === 'hand_drawn';

    return (
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
                        {liked
                            ? (hd ? <FullHeartHD /> : <FavoriteIcon />)
                            : (hd ? <EmptyHeartHD /> : <FavoriteBorderIcon />)
                        }
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
                        {hd ? <CycleHD /> : <RepeatIcon />}
                    </span>
                    <span className="sr-only">Re-rate</span>
                </button>
            )}
            {onComment && (
                <button
                    type="button"
                    className="tweet-action"
                    onClick={onComment}
                    aria-label={commentAriaLabel || `${commentLabel} on post. ${commentCount || 0} comments`}
                    title={commentLabel}
                >
                    <span className="action-icon">
                        {hd ? <ChatBubbleHD /> : <ChatBubbleOutlineIcon />}
                    </span>
                    <span className="sr-only">{commentLabel}</span>
                    {showCommentCount && <span className="tweet-action-count">{commentCount || 0}</span>}
                </button>
            )}
            {onReply && (
                <button
                    type="button"
                    className="tweet-action"
                    onClick={onReply}
                    aria-label={`${replyLabel} on post`}
                    title={replyLabel}
                >
                    <span className="action-icon">
                        {hd ? <ReplyHD /> : <ReplyIcon />}
                    </span>
                    <span className="sr-only">{replyLabel}</span>
                </button>
            )}
            {onEdit && (
                <button
                    type="button"
                    className="tweet-action"
                    onClick={onEdit}
                    aria-label="Edit post"
                    title="Edit"
                >
                    <span className="action-icon">
                        {hd ? <PencilHD /> : <EditOutlinedIcon />}
                    </span>
                    <span className="sr-only">Edit</span>
                </button>
            )}
        </div>
    );
};

export default PostActions;
