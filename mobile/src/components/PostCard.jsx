import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import RichText from './RichText.jsx';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import { colors, spacing, text } from '../theme.js';
import { formatShortTimestamp } from '../utils/dateTime.js';
import { formatScoreValue } from '../utils/ratingDisplay.js';

const PostCard = ({
  post,
  actions,
  expandedContent,
  onAuthorPress,
  onTopicPress,
  onCardPress,
  showTopicText = true,
  showMedia = true,
  compact = false,
  style
}) => {
  const { width } = useWindowDimensions();
  const isCompact = compact || width < 375;

  if (!post) {
    return null;
  }

  const isDeleted = Boolean(post.deleted || post.deletedAt);
  const topicLabel = post.rateableItem?.title || post.rateableItem?.body || '';
  const mediaUrl = useResolvedImageUrl(!isDeleted ? post.rateableItem?.mediaObjectKey : null);

  return (
    <View style={[styles.card, isCompact && styles.compact, style]}>
      <View style={styles.main}>
        <View style={styles.meta}>
          <Pressable
            disabled={!post.author?.userId || !onAuthorPress}
            onPress={() => onAuthorPress?.(post.author.userId)}
            style={styles.avatarButton}
          >
            <UserAvatar username={post.author?.username} profilePicUrl={post.author?.profilePicUrl} size={isCompact ? 'sm' : 'md'} />
          </Pressable>
          <Pressable
            disabled={!post.author?.userId || !onAuthorPress}
            onPress={() => onAuthorPress?.(post.author.userId)}
            style={styles.authorText}
          >
            <Text numberOfLines={1} style={styles.name}>{post.author?.username || 'Someone'}</Text>
            <Text numberOfLines={1} style={styles.handle}>@{post.author?.username || 'unknown'}</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          {post.createdAt ? <Text style={styles.time}>{formatShortTimestamp(post.createdAt)}</Text> : null}
        </View>

        {showMedia && mediaUrl ? (
          <Pressable disabled={!onCardPress && !onTopicPress} onPress={() => onCardPress?.(post) || onTopicPress?.(post.rateableItem?.id)}>
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
          </Pressable>
        ) : null}

        <Pressable disabled={!onCardPress && !onTopicPress} onPress={() => onCardPress?.(post) || onTopicPress?.(post.rateableItem?.id)}>
          {isDeleted ? (
            <Text style={styles.deleted}>This post has been deleted.</Text>
          ) : (
            <>
              {topicLabel && showTopicText ? (
                <RichText style={styles.topic}>{topicLabel}</RichText>
              ) : null}

              <View style={styles.scoreRow}>
                <StarRating value={post.score} size="sm" label={formatScoreValue(post.score, post.ratingScale)} />
              </View>

              {post.reviewText ? <RichText style={styles.review}>{post.reviewText}</RichText> : null}
            </>
          )}
        </Pressable>

        {actions}
      </View>
      {expandedContent ? <View style={styles.expanded}>{expandedContent}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    gap: spacing.md
  },
  compact: {
    padding: spacing.sm
  },
  main: {
    gap: spacing.sm
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40
  },
  avatarButton: {
    marginRight: spacing.xs
  },
  authorText: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flex: 1,
    minWidth: 0
  },
  name: {
    fontWeight: '800',
    color: colors.text,
    flexShrink: 1
  },
  handle: {
    color: colors.textMuted,
    flexShrink: 2
  },
  time: {
    color: colors.textSubtle
  },
  dot: {
    color: colors.textMuted
  },
  media: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm
  },
  topic: {
    ...text.body,
    fontWeight: '600',
    marginBottom: spacing.sm
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  review: {
    ...text.body
  },
  deleted: {
    ...text.muted,
    fontStyle: 'italic'
  },
  expanded: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md
  }
});

export default PostCard;
