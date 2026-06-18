import { StyleSheet, Text, View } from 'react-native';
import PostActions from './PostActions.jsx';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import { colors, spacing, text } from '../theme.js';
import { formatScoreValue } from '../utils/ratingDisplay.js';

const descendantCount = (comment) => {
  const replies = comment.replies || [];
  return replies.reduce((total, reply) => total + 1 + descendantCount(reply), 0);
};

const hasActiveReply = (comments, activeReplyKey, getReplyKey) => (
  comments.some((comment) => {
    const key = getReplyKey(comment);
    return key === activeReplyKey || hasActiveReply(comment.replies || [], activeReplyKey, getReplyKey);
  })
);

const CommentThread = ({
  comments = [],
  onAuthorPress,
  onReplyPress,
  onEditPress,
  onLikePress,
  activeReplyKey,
  activeEditKey,
  getReplyKey = (comment) => String(comment.id),
  getEditKey = (comment) => `edit:${comment.id}`,
  renderReplyComposer,
  renderEditComposer,
  expandedReplyKeys = [],
  onToggleReplies,
  autoExpandDepth = 3,
  autoExpandFlatLimit = 8,
  currentUserId
}) => {
  const expandedSet = new Set(expandedReplyKeys);

  const renderComments = (threadComments, depth = 0, autoState = { depthRemaining: autoExpandDepth, budget: { remaining: autoExpandFlatLimit } }) => (
    threadComments.map((comment) => {
      const replyKey = getReplyKey(comment);
      const editKey = getEditKey(comment);
      const replies = comment.replies || [];
      const replyCount = descendantCount(comment);
      const manuallyExpanded = expandedSet.has(replyKey);
      const hasActiveChild = hasActiveReply(replies, activeReplyKey, getReplyKey);
      const canAutoOpen = autoState
        && autoState.depthRemaining > 0
        && autoState.budget.remaining > 0
        && replies.length > 0;
      const repliesVisible = replies.length > 0 && (manuallyExpanded || hasActiveChild || canAutoOpen);
      const childAutoState = repliesVisible && canAutoOpen
        ? { depthRemaining: autoState.depthRemaining - 1, budget: { remaining: autoState.budget.remaining - 1 } }
        : null;
      const canEdit = Boolean(onEditPress) && currentUserId != null && comment.author?.userId === currentUserId;

      return (
        <View key={comment.id} style={[styles.comment, depth > 1 && { marginLeft: Math.min(48, (depth - 1) * 10) }]}>
          <View style={styles.row}>
            <UserAvatar username={comment.author?.username} profilePicUrl={comment.author?.profilePicUrl} size="sm" />
            <View style={styles.body}>
              <Text style={styles.author}>{comment.author?.username || 'Someone'}</Text>
              {comment.score != null ? (
                <View style={styles.score}>
                  <StarRating value={comment.score} size="sm" label={formatScoreValue(comment.score)} />
                  <Text style={styles.scoreLabel}>{formatScoreValue(comment.score)}</Text>
                </View>
              ) : null}
              <Text style={styles.text}>{comment.text}</Text>
              <PostActions
                liked={Boolean(comment.likedByCurrentUser)}
                likeCount={comment.likeCount || 0}
                commentCount={replyCount}
                onLike={onLikePress ? () => onLikePress(comment) : undefined}
                onComment={replyCount > 0 ? () => onToggleReplies?.(comment, replyKey) : undefined}
                onReply={onReplyPress ? () => onReplyPress(comment) : undefined}
                onEdit={canEdit ? () => onEditPress(comment) : undefined}
                commentLabel={repliesVisible ? 'Hide replies' : 'Replies'}
                replyLabel="Reply"
                showCommentCount={replyCount > 0}
              />
            </View>
          </View>
          {activeReplyKey === replyKey && renderReplyComposer ? renderReplyComposer(comment) : null}
          {activeEditKey === editKey && renderEditComposer ? renderEditComposer(comment) : null}
          {repliesVisible ? (
            <View style={styles.replies}>
              {renderComments(replies, depth + 1, childAutoState)}
            </View>
          ) : null}
        </View>
      );
    })
  );

  return <View style={styles.thread}>{renderComments(comments)}</View>;
};

const styles = StyleSheet.create({
  thread: {
    gap: spacing.sm
  },
  comment: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  body: {
    flex: 1,
    gap: spacing.xs
  },
  author: {
    fontWeight: '800',
    color: colors.text
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  scoreLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  text: text.body,
  replies: {
    marginLeft: spacing.lg,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border
  }
});

export default CommentThread;
