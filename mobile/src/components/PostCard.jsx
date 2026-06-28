import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  reviewNumberOfLines,
  openCardOnlyWhenTruncated = false,
  compact = false,
  style
}) => {
  const { width } = useWindowDimensions();
  const isCompact = compact || width < 375;
  const isDeleted = Boolean(post?.deleted || post?.deletedAt);
  const mediaUrl = useResolvedImageUrl(!isDeleted ? post?.rateableItem?.mediaObjectKey : null);
  const [isReviewTruncated, setIsReviewTruncated] = useState(false);
  const [reviewHeights, setReviewHeights] = useState({ visible: 0, full: 0 });

  useEffect(() => {
    setIsReviewTruncated(false);
    setReviewHeights({ visible: 0, full: 0 });
  }, [post?.ratingId, post?.reviewText, reviewNumberOfLines]);

  useEffect(() => {
    if (Platform.OS === 'web' && reviewHeights.visible && reviewHeights.full) {
      setIsReviewTruncated(reviewHeights.full > reviewHeights.visible + 1);
    }
  }, [reviewHeights]);

  if (!post) {
    return null;
  }

  const topicLabel = post.rateableItem?.title || post.rateableItem?.body || '';
  const openPost = () => {
    if (onCardPress && (!openCardOnlyWhenTruncated || !reviewNumberOfLines || isReviewTruncated)) {
      onCardPress(post);
      return;
    }
    onTopicPress?.(post.rateableItem?.id);
  };

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
          <Pressable disabled={!onCardPress && !onTopicPress} onPress={openPost}>
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
          </Pressable>
        ) : null}

        <Pressable disabled={!onCardPress && !onTopicPress} onPress={openPost}>
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

              {post.reviewText ? (
                <View>
                  <RichText
                    numberOfLines={reviewNumberOfLines}
                    ellipsizeMode="tail"
                    onLayout={Platform.OS === 'web' ? ({ nativeEvent }) => {
                      setReviewHeights((current) => ({
                        ...current,
                        visible: nativeEvent.layout.height
                      }));
                    } : undefined}
                    style={styles.review}
                  >
                    {post.reviewText}
                  </RichText>
                  {reviewNumberOfLines ? (
                    <RichText
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      onLayout={Platform.OS === 'web' ? ({ nativeEvent }) => {
                        setReviewHeights((current) => ({
                          ...current,
                          full: nativeEvent.layout.height
                        }));
                      } : undefined}
                      onTextLayout={Platform.OS !== 'web' ? ({ nativeEvent }) => {
                        setIsReviewTruncated(nativeEvent.lines.length > reviewNumberOfLines);
                      } : undefined}
                      pointerEvents="none"
                      style={[styles.review, styles.reviewMeasure]}
                    >
                      {post.reviewText}
                    </RichText>
                  ) : null}
                </View>
              ) : null}
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
  reviewMeasure: {
    position: 'absolute',
    right: 0,
    left: 0,
    opacity: 0
  },
  deleted: {
    ...text.muted,
    fontStyle: 'italic'
  },
  expanded: {
    gap: spacing.md
  }
});

export default PostCard;
