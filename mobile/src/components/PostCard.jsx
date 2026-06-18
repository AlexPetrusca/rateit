import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
  if (!post) {
    return null;
  }

  const isDeleted = Boolean(post.deleted || post.deletedAt);
  const topicLabel = post.rateableItem?.title || post.rateableItem?.body || '';
  const mediaUrl = useResolvedImageUrl(!isDeleted ? post.rateableItem?.mediaObjectKey : null);

  return (
    <View style={[styles.card, compact && styles.compact, style]}>
      <View style={styles.main}>
        <View style={styles.meta}>
          <Pressable
            disabled={!post.author?.userId || !onAuthorPress}
            onPress={() => onAuthorPress?.(post.author.userId)}
            style={styles.avatarButton}
          >
            <UserAvatar username={post.author?.username} profilePicUrl={post.author?.profilePicUrl} size={compact ? 'sm' : 'md'} />
          </Pressable>
          <Pressable
            disabled={!post.author?.userId || !onAuthorPress}
            onPress={() => onAuthorPress?.(post.author.userId)}
            style={styles.authorText}
          >
            <Text style={styles.name}>{post.author?.username || 'Someone'}</Text>
            <Text style={styles.handle}>@{post.author?.username || 'unknown'}</Text>
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
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
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
    flexShrink: 1
  },
  name: {
    fontWeight: '800',
    color: colors.text
  },
  handle: {
    color: colors.textMuted
  },
  time: {
    color: colors.textSubtle
  },
  dot: {
    color: colors.textMuted
  },
  media: {
    width: '100%',
    height: 320,
    borderRadius: 8,
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
