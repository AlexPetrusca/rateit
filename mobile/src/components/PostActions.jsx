import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme.js';
import HandDrawnIcon from './HandDrawnIcon.jsx';

const ActionButton = ({ icon, label, count, onPress, active = false, showCount = true }) => {
  if (!onPress) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        active && styles.active,
        pressed && styles.pressed
      ]}
    >
      <HandDrawnIcon name={icon} color={active ? colors.accent : colors.textMuted} />
      {showCount ? <Text style={[styles.count, active && styles.activeText]}>{count || 0}</Text> : null}
    </Pressable>
  );
};

const PostActions = ({
  liked = false,
  likeCount = 0,
  commentCount = 0,
  onLike,
  onRerate,
  onComment,
  onReply,
  onEdit,
  shareUrl,
  commentLabel = 'Comments',
  replyLabel = 'Reply',
  showCommentCount = true
}) => {
  const handleShare = () => {
    if (shareUrl) {
      Share.share({ message: shareUrl, url: shareUrl });
    }
  };

  return (
    <View style={styles.container}>
      <ActionButton icon={liked ? 'fullHeart' : 'emptyHeart'} label={liked ? 'Unlike' : 'Like'} count={likeCount} onPress={onLike} active={liked} />
      <ActionButton icon="cycle" label="Re-rate" onPress={onRerate} showCount={false} />
      <ActionButton icon="chatBubble" label={commentLabel} count={commentCount} onPress={onComment} showCount={showCommentCount} />
      <ActionButton icon="reply" label={replyLabel} onPress={onReply} showCount={false} />
      <ActionButton icon="share" label="Share" onPress={shareUrl ? handleShare : undefined} showCount={false} />
      <ActionButton icon="pencil" label="Edit" onPress={onEdit} showCount={false} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center'
  },
  action: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  pressed: {
    backgroundColor: colors.surfacePressed
  },
  active: {
    backgroundColor: colors.accentSoft
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700'
  },
  activeText: {
    color: colors.accent
  }
});

export default PostActions;
