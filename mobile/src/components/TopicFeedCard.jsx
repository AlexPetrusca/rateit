import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import RatingComposer from './RatingComposer.jsx';
import RichText from './RichText.jsx';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

// A topic-first feed card: the topic's title and image, then a centered row of
// empty stars you can drag to fill — releasing opens a prompt to post your own
// rating. Below that, the "top 5" ratings (the OP's original rating first, then
// the four most recent) as compact, display-only rows. Tapping a row opens the
// full topic page, where liking/commenting/re-rating live.
const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

const TopicFeedCard = ({ item, onTopicPress, onAuthorPress, notify, onRated }) => {
  const rateableItemId = item.rateableItem?.id;
  const mediaUrl = useResolvedImageUrl(item.rateableItem?.mediaObjectKey);
  const topicLabel = item.rateableItem?.title || item.rateableItem?.body || 'Topic';
  const ratingCount = Number(item.rateableItem?.ratingCount ?? 1);
  const [others, setOthers] = useState(null);

  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingScore, setPendingScore] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [saving, setSaving] = useState(false);

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

  // OP first, then the four most recent other ratings.
  const topRatings = useMemo(() => {
    const rest = (others || []).filter((r) => r.ratingId !== item.ratingId).sort(byNewest).slice(0, 4);
    return [item, ...rest];
  }, [item, others]);

  const openTopic = () => onTopicPress?.(rateableItemId);

  const openPrompt = (score) => {
    setPendingScore(score);
    setReviewText('');
    setPromptOpen(true);
  };

  const closePrompt = () => {
    if (saving) return;
    setPromptOpen(false);
    setPendingScore(0);
    setReviewText('');
  };

  const submit = async () => {
    if (!pendingScore || rateableItemId == null || saving) return;
    setSaving(true);
    try {
      await BackendApiService.rateTopic(rateableItemId, pendingScore, reviewText.trim());
      setPromptOpen(false);
      notify?.({ message: 'Rating posted', type: 'success' });
      onRated?.();
    } catch (error) {
      notify?.({ message: error.message || 'Failed to post rating', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={openTopic}>
        {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" /> : null}
        <RichText style={styles.title} numberOfLines={2}>{topicLabel}</RichText>
      </Pressable>

      <View style={styles.rateRow}>
        <StarRating
          value={pendingScore}
          interactive
          size="lg"
          onChange={openPrompt}
          label="Rate this topic"
          style={styles.rateStars}
        />
      </View>

      {promptOpen ? (
        <View style={styles.composer}>
          <RatingComposer
            title="Your rating"
            richText
            textValue={reviewText}
            onTextChange={setReviewText}
            placeholder="Add your take (optional)"
            submitLabel="Post rating"
            loading={saving}
            submitDisabled={!pendingScore}
            onSubmit={submit}
            cardStyle={styles.composerCard}
          />
          <Pressable onPress={closePrompt} disabled={saving} style={styles.cancel} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.ratings}>
        {topRatings.map((r) => (
          <Pressable key={r.ratingId} onPress={() => onTopicPress?.(rateableItemId, r.ratingId)} style={styles.ratingRow}>
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
  rateRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs
  },
  rateStars: {
    alignSelf: 'center'
  },
  composer: {
    gap: spacing.xs
  },
  composerCard: {
    padding: 0
  },
  cancel: {
    alignSelf: 'center',
    paddingVertical: spacing.xs
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: '700'
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
