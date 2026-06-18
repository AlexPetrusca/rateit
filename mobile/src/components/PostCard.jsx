import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Card from './Card.jsx';
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
  compact = false
}) => {
  if (!post) {
    return null;
  }

  const isDeleted = Boolean(post.deleted || post.deletedAt);
  const topicLabel = post.rateableItem?.title || post.rateableItem?.body || '';
  const mediaUrl = useResolvedImageUrl(!isDeleted ? post.rateableItem?.mediaObjectKey : null);

  return (
    <Card style={[styles.card, compact && styles.compact]}>
      <View style={styles.row}>
        <Pressable
          disabled={!post.author?.userId || !onAuthorPress}
          onPress={() => onAuthorPress?.(post.author.userId)}
        >
          <UserAvatar username={post.author?.username} profilePicUrl={post.author?.profilePicUrl} size={compact ? 'md' : 'lg'} />
        </Pressable>
        <View style={styles.main}>
          <Pressable
            disabled={!post.author?.userId || !onAuthorPress}
            onPress={() => onAuthorPress?.(post.author.userId)}
            style={styles.meta}
          >
            <Text style={styles.name}>{post.author?.username || 'Someone'}</Text>
            <Text style={styles.handle}>@{post.author?.username || 'unknown'}</Text>
            {post.createdAt ? <Text style={styles.time}>{formatShortTimestamp(post.createdAt)}</Text> : null}
          </Pressable>

          <Pressable disabled={!onCardPress && !onTopicPress} onPress={() => onCardPress?.(post) || onTopicPress?.(post.rateableItem?.id)}>
            {isDeleted ? (
              <Text style={styles.deleted}>This post has been deleted.</Text>
            ) : (
              <>
                {showMedia && mediaUrl ? (
                  <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
                ) : null}

                {topicLabel && showTopicText ? (
                  <Text style={styles.topic}>{topicLabel}</Text>
                ) : null}

                <View style={styles.scoreRow}>
                  <StarRating value={post.score} size="sm" label={formatScoreValue(post.score, post.ratingScale)} />
                  <Text style={styles.scoreLabel}>{formatScoreValue(post.score, post.ratingScale)}</Text>
                </View>

                {post.reviewText ? <Text style={styles.review}>{post.reviewText}</Text> : null}
              </>
            )}
          </Pressable>

          {actions}
        </View>
      </View>
      {expandedContent ? <View style={styles.expanded}>{expandedContent}</View> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md
  },
  compact: {
    padding: spacing.sm
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md
  },
  main: {
    flex: 1,
    gap: spacing.sm
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs
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
  media: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm
  },
  topic: {
    ...text.body,
    fontWeight: '700',
    marginBottom: spacing.sm
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  scoreLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700'
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
