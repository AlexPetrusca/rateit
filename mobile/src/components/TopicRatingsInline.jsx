import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import RatingComposer from './RatingComposer.jsx';
import RatingFeedItem from './RatingFeedItem.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

// Inline "all ratings on this topic" list shown when a feed card's rating bubble
// is tapped. It owns its own interaction state (separate from the feed's) so the
// sibling cards expand their comments independently of the parent card's memo.
const TopicRatingsInline = ({ rateableItemId, excludeRatingId, currentUserId, notify, navigation, suppressComposer = false }) => {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(4);
  const [reviewText, setReviewText] = useState('');
  const [saving, setSaving] = useState(false);

  const updateItem = useCallback((ratingId, updater) => {
    setItems((current) => (current ? current.map((item) => (item.ratingId === ratingId ? updater(item) : item)) : current));
  }, []);
  const interactions = useRatingInteractions({ notify, updateItem });

  const load = useCallback(async () => {
    if (rateableItemId == null) return;
    setLoading(true);
    try {
      const ratings = await BackendApiService.getTopicRatings({ rateableItemId, page: 0, size: 50 });
      setItems(ratings || []);
    } catch (error) {
      notify?.({ message: error.message || 'Failed to load ratings', type: 'error' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rateableItemId, notify]);

  useEffect(() => { load(); }, [load]);

  const submitTopicRating = async () => {
    setSaving(true);
    try {
      await BackendApiService.rateTopic(rateableItemId, score, reviewText || '');
      setReviewText('');
      await load();
    } catch (error) {
      notify?.({ message: error.message || 'Failed to add rating', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const others = (items || []).filter((item) => item.ratingId !== excludeRatingId);

  if (loading && items == null) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <View style={styles.list}>
      {others.length === 0 ? (
        <Text style={styles.empty}>No other ratings on this topic yet.</Text>
      ) : others.map((item) => (
        <View key={item.ratingId} style={styles.siblingWrap}>
          <RatingFeedItem
            item={item}
            currentUserId={currentUserId}
            interactions={interactions}
            reviewNumberOfLines={6}
            commentNumberOfLines={6}
            showMedia={false}
            showTopicText={false}
            refresh={load}
            onCommentOpen={(post, comment) => navigation.navigate('Topic', {
              rateableItemId: post.rateableItem?.id,
              openReviewId: post.ratingId,
              highlightCommentId: comment?.id
            })}
            onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
            onTopicPress={(id) => navigation.navigate('Topic', { rateableItemId: id })}
            onCardPress={(post) => navigation.navigate('Topic', {
              rateableItemId: post.rateableItem?.id,
              openReviewId: post.ratingId
            })}
            onEditPress={(ratingId) => navigation.navigate('PostEditor', { ratingId })}
            cardStyle={styles.siblingCard}
          />
        </View>
      ))}
      {/* Hide the topic-rating composer while a per-rating/comment composer is
          open (either on a sibling rating here, or a reply on the parent
          card's own comments), so only one composer shows at a time. */}
      {interactions.activeComposer || suppressComposer ? null : (
        <RatingComposer
          title="Add your rating"
          score={score}
          onScoreChange={setScore}
          textValue={reviewText}
          onTextChange={setReviewText}
          placeholder="Add your take on this topic"
          submitLabel="Add rating"
          onSubmit={submitTopicRating}
          loading={saving}
          richText
          showStars
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  center: { paddingVertical: spacing.lg, alignItems: 'center' },
  empty: { ...text.muted, paddingVertical: spacing.sm },
  siblingWrap: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm
  },
  siblingCard: {
    backgroundColor: colors.surfaceSoft
  }
});

export default TopicRatingsInline;
