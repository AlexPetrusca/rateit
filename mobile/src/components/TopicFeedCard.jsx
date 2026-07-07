import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import HandDrawnIcon from './HandDrawnIcon.jsx';
import RichText from './RichText.jsx';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

// A topic-first feed card: the topic's title, image, and average rating with a
// single share action, then the "top 5" ratings (the OP's original rating first,
// then the four most recent) as compact, display-only rows. Tapping anywhere
// opens the full topic page, where liking/commenting/re-rating live.
const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

const TopicFeedCard = ({ item, onTopicPress, onAuthorPress, shareUrl, notify }) => {
  const rateableItemId = item.rateableItem?.id;
  const mediaUrl = useResolvedImageUrl(item.rateableItem?.mediaObjectKey);
  const topicLabel = item.rateableItem?.title || item.rateableItem?.body || 'Topic';
  const ratingCount = Number(item.rateableItem?.ratingCount ?? 1);
  const [others, setOthers] = useState(null);

  // Only single-topic-with-multiple-ratings cards need the full list (for the
  // average and the other rows); single-rating topics render from the OP alone.
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

  const allRatings = useMemo(() => {
    const rest = (others || []).filter((r) => r.ratingId !== item.ratingId);
    return [item, ...rest];
  }, [item, others]);

  // OP first, then the four most recent other ratings.
  const topRatings = useMemo(() => {
    const rest = (others || []).filter((r) => r.ratingId !== item.ratingId).sort(byNewest).slice(0, 4);
    return [item, ...rest];
  }, [item, others]);

  const average = useMemo(() => {
    const scores = allRatings.map((r) => Number(r.score)).filter((n) => Number.isFinite(n));
    if (scores.length === 0) return Number(item.score) || 0;
    return scores.reduce((sum, n) => sum + n, 0) / scores.length;
  }, [allRatings, item.score]);

  const openTopic = () => onTopicPress?.(rateableItemId);

  const share = async () => {
    if (!shareUrl) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        notify?.({ message: 'Added to clipboard', type: 'info' });
        return;
      }
      await Share.share({ message: shareUrl, url: shareUrl });
    } catch (error) {
      notify?.({ message: error.message || 'Failed to share', type: 'error' });
    }
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={openTopic}>
        {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" /> : null}
        <RichText style={styles.title} numberOfLines={2}>{topicLabel}</RichText>
        <View style={styles.avgRow}>
          <StarRating value={average} size="sm" label={`Average rating: ${average.toFixed(1)} out of 5`} />
          <Text style={styles.avg}>{average.toFixed(1)}</Text>
          <Text style={styles.count}>· {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Share" hitSlop={8} onPress={share} style={styles.actionBtn}>
          <HandDrawnIcon name="share" color={colors.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={styles.ratings}>
        {topRatings.map((r) => (
          <Pressable key={r.ratingId} onPress={openTopic} style={styles.ratingRow}>
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
        ))}
      </View>
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
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  avg: {
    color: colors.text,
    fontWeight: '800',
    fontVariant: ['tabular-nums']
  },
  count: {
    ...text.muted
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionBtn: {
    minHeight: 40,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center'
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
