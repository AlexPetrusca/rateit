import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import RatingFeedItem from './RatingFeedItem.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

// Inline "all ratings on this topic" list shown when a feed card's rating bubble
// is tapped. It owns its own interaction state (separate from the feed's) so the
// sibling cards expand their comments independently of the parent card's memo.
const TopicRatingsInline = ({ rateableItemId, excludeRatingId, currentUserId, notify, navigation }) => {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const others = (items || []).filter((item) => item.ratingId !== excludeRatingId);

  if (loading && items == null) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (others.length === 0) {
    return <Text style={styles.empty}>No other ratings on this topic yet.</Text>;
  }

  return (
    <View style={styles.list}>
      {others.map((item) => (
        <View key={item.ratingId} style={styles.siblingWrap}>
          <RatingFeedItem
            item={item}
            currentUserId={currentUserId}
            interactions={interactions}
            reviewNumberOfLines={6}
            commentNumberOfLines={4}
            showMedia={false}
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
