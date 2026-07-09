import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import RichText from './RichText.jsx';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

// A topic-first feed card: the OP's avatar/name in the header, then the topic's
// title and image, then the most recent rating featured directly beneath. Any
// remaining recent ratings follow as compact, display-only rows. Tapping a
// rating opens the full topic page, where liking/commenting/re-rating live.
const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

const TopicFeedCard = ({ item, onTopicPress, onAuthorPress }) => {
  const rateableItemId = item.rateableItem?.id;
  const mediaUrl = useResolvedImageUrl(item.rateableItem?.mediaObjectKey);
  const topicLabel = item.rateableItem?.title || item.rateableItem?.body || 'Topic';
  const ratingCount = Number(item.rateableItem?.ratingCount ?? 1);
  const [others, setOthers] = useState(null);

  // Only single-topic-with-multiple-ratings cards need the full list (for the
  // other rows); single-rating topics render from the OP alone.
  useEffect(() => {
    if (ratingCount <= 1 || rateableItemId == null) {
      setOthers([]);
      return undefined;
    }
    let cancelled = false;
    BackendApiService.getTopicRatings({ rateableItemId, page: 0, size: 50 })
      .then((rows) => { if (!cancelled) setOthers(rows || []); })
      .catch(() => { if (!cancelled) setOthers([]); });
    return () => { cancelled = true; };
  }, [rateableItemId, ratingCount]);

  // The five most recent ratings, newest first. The newest is featured beneath
  // the topic; the rest fill the list below.
  const topRatings = useMemo(() => {
    const rest = (others || []).filter((r) => r.ratingId !== item.ratingId);
    return [item, ...rest].sort(byNewest).slice(0, 5);
  }, [item, others]);

  const featured = topRatings[0];
  const rest = topRatings.slice(1);

  const openTopic = () => onTopicPress?.(rateableItemId);

  const renderRating = (r, style) => (
    <Pressable key={r.ratingId} onPress={() => onTopicPress?.(rateableItemId, r.ratingId)} style={style}>
      <View style={styles.ratingHead}>
        <Pressable
          disabled={!r.author?.userId || !onAuthorPress}
          onPress={() => onAuthorPress?.(r.author.userId)}
          style={styles.author}
        >
          <UserAvatar username={r.author?.username} profilePicUrl={r.author?.profilePicUrl} size="sm" />
          <Text style={styles.username} numberOfLines={1}>{r.author?.username || 'Someone'}</Text>
          {r.ratingId === item.ratingId ? <Text style={styles.opBadge}>OP</Text> : null}
        </Pressable>
        <StarRating value={Number(r.score) || 0} size="sm" />
      </View>
      {r.reviewText ? (
        <RichText numberOfLines={2} ellipsizeMode="tail" style={styles.review}>{r.reviewText}</RichText>
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.card}>
      <Pressable
        disabled={!item.author?.userId || !onAuthorPress}
        onPress={() => onAuthorPress?.(item.author.userId)}
        style={styles.opHeader}
      >
        <UserAvatar username={item.author?.username} profilePicUrl={item.author?.profilePicUrl} size="sm" />
        <Text style={styles.opName} numberOfLines={1}>{item.author?.username || 'Someone'}</Text>
        <Text style={styles.opBadge}>OP</Text>
      </Pressable>

      <Pressable onPress={openTopic}>
        {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" /> : null}
        <RichText style={styles.title} numberOfLines={2}>{topicLabel}</RichText>
      </Pressable>

      {featured ? renderRating(featured, styles.featuredRow) : null}

      {rest.length > 0 ? (
        <View style={styles.ratings}>
          {rest.map((r) => renderRating(r, styles.ratingRow))}
        </View>
      ) : null}
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
  opHeader: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  opName: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.text,
    fontWeight: '700',
    fontSize: 14
  },
  media: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm
  },
  title: {
    ...text.h3
  },
  featuredRow: {
    gap: spacing.xs
  },
  ratings: {
    gap: spacing.md
  },
  ratingRow: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  ratingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  author: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  username: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.text,
    fontWeight: '700',
    fontSize: 14
  },
  opBadge: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  review: {
    ...text.body
  }
});

export default TopicFeedCard;
