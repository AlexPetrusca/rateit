import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import PostActions from './PostActions.jsx';
import RatingComposer from './RatingComposer.jsx';
import RichText from './RichText.jsx';
import StarRating from './StarRating.jsx';
import UserAvatar from './UserAvatar.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

// A topic-first feed card: the OP's avatar/name header, the topic title/image,
// then the most recent rating featured beneath with like + comment actions. The
// comment button expands the other recent ratings, and at the bottom of that
// list a centered star row lets you post your own rating. Tapping a rating opens
// the full topic page.
const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

const TopicFeedCard = ({ item, onTopicPress, onAuthorPress, notify, onRated }) => {
  const rateableItemId = item.rateableItem?.id;
  const mediaUrl = useResolvedImageUrl(item.rateableItem?.mediaObjectKey);
  const topicLabel = item.rateableItem?.title || item.rateableItem?.body || 'Topic';
  const ratingCount = Number(item.rateableItem?.ratingCount ?? 1);
  const [others, setOthers] = useState(null);

  const [expanded, setExpanded] = useState(false);
  const [likeOverrides, setLikeOverrides] = useState({});
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingScore, setPendingScore] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the topic's ratings so we can feature the latest and list the rest.
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

  // The five most recent ratings, newest first: the first is featured, the rest
  // show when the card is expanded.
  const topRatings = useMemo(() => {
    const rest = (others || []).filter((r) => r.ratingId !== item.ratingId);
    return [item, ...rest].sort(byNewest).slice(0, 5);
  }, [item, others]);

  const featured = topRatings[0];
  const rest = topRatings.slice(1);

  const openTopic = () => onTopicPress?.(rateableItemId);

  const fLiked = featured
    ? (likeOverrides[featured.ratingId]?.liked ?? Boolean(featured.likedByCurrentUser))
    : false;
  const fLikeCount = featured
    ? (likeOverrides[featured.ratingId]?.likeCount ?? (featured.likeCount || 0))
    : 0;

  const toggleLike = async () => {
    if (!featured) return;
    const id = featured.ratingId;
    const wasLiked = fLiked;
    const prevCount = fLikeCount;
    setLikeOverrides((o) => ({ ...o, [id]: { liked: !wasLiked, likeCount: Math.max(0, prevCount + (wasLiked ? -1 : 1)) } }));
    try {
      const updated = wasLiked
        ? await BackendApiService.unlikeRating(id)
        : await BackendApiService.likeRating(id);
      if (updated) {
        setLikeOverrides((o) => ({ ...o, [id]: { liked: updated.likedByCurrentUser ?? !wasLiked, likeCount: updated.likeCount ?? o[id]?.likeCount } }));
      }
    } catch (error) {
      setLikeOverrides((o) => ({ ...o, [id]: { liked: wasLiked, likeCount: prevCount } }));
      notify?.({ message: error.message || 'Failed to like post', type: 'error' });
    }
  };

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
      setPendingScore(0);
      setReviewText('');
      notify?.({ message: 'Rating posted', type: 'success' });
      onRated?.();
    } catch (error) {
      notify?.({ message: error.message || 'Failed to post rating', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderRating = (r, style, reviewLines = 2) => (
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
        <RichText numberOfLines={reviewLines} ellipsizeMode="tail" style={styles.review}>{r.reviewText}</RichText>
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

      {featured ? (
        <View style={styles.featuredBlock}>
          {renderRating(featured, styles.featuredRow, 5)}
          <PostActions
            liked={fLiked}
            likeCount={fLikeCount}
            commentCount={ratingCount}
            onLike={toggleLike}
            onComment={() => setExpanded((open) => !open)}
            commentLabel={expanded ? 'Hide' : 'Comments'}
          />
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.expanded}>
          {rest.length > 0 ? (
            <View style={styles.ratings}>
              {rest.map((r) => renderRating(r, styles.ratingRow))}
            </View>
          ) : null}

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
  featuredBlock: {
    gap: spacing.sm
  },
  featuredRow: {
    gap: spacing.xs
  },
  expanded: {
    gap: spacing.md
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
  }
});

export default TopicFeedCard;
