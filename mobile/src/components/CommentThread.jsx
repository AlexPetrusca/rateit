import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import PostActions from './PostActions.jsx';
import RichText from './RichText.jsx';
import UserAvatar from './UserAvatar.jsx';
import { colors, spacing, text } from '../theme.js';

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
  onCommentPress,
  commentNumberOfLines,
  highlightCommentId,
  scrollRef,
  autoExpandDepth = 3,
  autoExpandFlatLimit = 8,
  currentUserId
}) => {
  const expandedSet = new Set(expandedReplyKeys);
  const highlightViewRef = useRef(null);
  const scrolledForRef = useRef(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 59, 69, 0)', 'rgba(255, 59, 69, 0.18)']
  });

  // On landing on the deep-linked comment (once): flash it red, fade back to
  // transparent after a beat, and scroll it into view in the enclosing modal.
  const scrollToHighlight = () => {
    if (scrolledForRef.current === highlightCommentId) return;
    scrolledForRef.current = highlightCommentId;

    highlightAnim.setValue(1);
    Animated.timing(highlightAnim, { toValue: 0, duration: 700, delay: 1000, useNativeDriver: false }).start();

    const sr = scrollRef?.current;
    const view = highlightViewRef.current;
    if (!sr || !view?.measureLayout) return;
    const node = sr.getInnerViewNode?.() ?? sr.getScrollableNode?.();
    if (!node) return;
    view.measureLayout(node, (x, y) => sr.scrollTo?.({ y: Math.max(0, y - 24), animated: true }), () => {});
  };

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
      const isEditing = activeEditKey === editKey && Boolean(renderEditComposer);
      const isHighlight = highlightCommentId != null && String(comment.id) === String(highlightCommentId);

      return (
        <View
          key={comment.id}
          ref={isHighlight ? highlightViewRef : undefined}
          onLayout={isHighlight ? scrollToHighlight : undefined}
          style={[styles.comment, depth > 1 && { marginLeft: Math.min(24, (depth - 1) * 6) }, isHighlight && styles.commentHighlight]}
        >
          {isHighlight ? <Animated.View pointerEvents="none" style={[styles.commentHighlightLayer, { backgroundColor: highlightBg }]} /> : null}
          <View style={styles.row}>
            <UserAvatar username={comment.author?.username} profilePicUrl={comment.author?.profilePicUrl} size="sm" />
            <View style={styles.body}>
              <Text style={styles.author}>{comment.author?.username || 'Someone'}</Text>
              {/* Hide the comment body/actions while its edit composer is open,
                  so the text isn't shown twice. */}
              {isEditing ? null : (
                <>
                  {onCommentPress ? (
                    <Pressable onPress={() => onCommentPress(comment)}>
                      <RichText style={styles.text} numberOfLines={commentNumberOfLines}>{comment.text}</RichText>
                    </Pressable>
                  ) : (
                    <RichText style={styles.text} numberOfLines={commentNumberOfLines}>{comment.text}</RichText>
                  )}
                  <PostActions
                    liked={Boolean(comment.likedByCurrentUser)}
                    likeCount={comment.likeCount || 0}
                    commentCount={replyCount}
                    onLike={onLikePress ? () => onLikePress(comment) : undefined}
                    onComment={onReplyPress ? () => onReplyPress(comment) : undefined}
                    onEdit={canEdit ? () => onEditPress(comment) : undefined}
                    commentLabel="Reply"
                    showCommentCount={replyCount > 0}
                  />
                </>
              )}
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
    gap: 0
  },
  comment: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm
  },
  commentHighlight: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm
  },
  commentHighlightLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12
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
  text: text.body,
  replies: {
    marginLeft: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border
  }
});

export default CommentThread;
