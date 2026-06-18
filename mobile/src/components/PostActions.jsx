import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme.js';

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
      <Text style={[styles.icon, active && styles.activeText]}>{icon}</Text>
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
      <ActionButton icon={liked ? '♥' : '♡'} label={liked ? 'Unlike' : 'Like'} count={likeCount} onPress={onLike} active={liked} />
      <ActionButton icon="↻" label="Re-rate" onPress={onRerate} showCount={false} />
      <ActionButton icon="◌" label={commentLabel} count={commentCount} onPress={onComment} showCount={showCommentCount} />
      <ActionButton icon="↪" label={replyLabel} onPress={onReply} showCount={false} />
      <ActionButton icon="⇧" label="Share" onPress={shareUrl ? handleShare : undefined} showCount={false} />
      <ActionButton icon="✎" label="Edit" onPress={onEdit} showCount={false} />
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
    minHeight: 34,
    minWidth: 40,
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
  icon: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '800'
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
