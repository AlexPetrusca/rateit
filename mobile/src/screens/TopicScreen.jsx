import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card.jsx';
import FeedList from '../components/FeedList.jsx';
import RatingComposer from '../components/RatingComposer.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import Screen from '../components/Screen.jsx';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';
import { formatFiveStarScore } from '../utils/ratingDisplay.js';

const PAGE_SIZE = 20;

const TopicScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const { rateableItemId } = route.params || {};
  const [topic, setTopic] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerScore, setComposerScore] = useState(4);
  const [composerText, setComposerText] = useState('');
  const [saving, setSaving] = useState(false);

  const updateItem = useCallback((ratingId, updater) => {
    setItems((current) => current.map((item) => (item.ratingId === ratingId ? updater(item) : item)));
  }, []);
  const interactions = useRatingInteractions({ notify, updateItem });

  const loadTopic = useCallback(async () => {
    if (rateableItemId == null) {
      return;
    }
    setLoading(true);
    try {
      const [topicData, ratings] = await Promise.all([
        BackendApiService.getTopic(rateableItemId),
        BackendApiService.getTopicRatings({ rateableItemId, page: 0, size: PAGE_SIZE })
      ]);
      setTopic(topicData);
      setItems(ratings);
    } catch (error) {
      notify({ message: error.message || 'Failed to load topic', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify, rateableItemId]);

  useEffect(() => {
    loadTopic();
  }, [loadTopic]);

  const topicTitle = topic?.title || topic?.body || items[0]?.rateableItem?.title || items[0]?.rateableItem?.body || 'Topic';
  const mediaObjectKey = useMemo(() => topic?.mediaObjectKey || items[0]?.rateableItem?.mediaObjectKey, [items, topic]);
  const mediaUrl = useResolvedImageUrl(mediaObjectKey);
  const averageScore = Number(topic?.averageScore || topic?.averageRating || 0);

  const submitTopicRating = async () => {
    const sourceRatingId = items.find((item) => !item.deleted && !item.deletedAt)?.ratingId ?? null;
    if (sourceRatingId == null) {
      notify({ message: 'Add a rating before posting another one to this topic.', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await BackendApiService.rerate(sourceRatingId, composerScore, composerText || '');
      setComposerText('');
      await loadTopic();
    } catch (error) {
      notify({ message: error.message || 'Failed to add rating', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <View style={styles.headerWrap}>
      <Card style={styles.topicCard}>
        {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.hero} /> : null}
        <Text style={styles.topicTitle}>{topicTitle}</Text>
        <View style={styles.scoreRow}>
          <StarRating value={averageScore} />
          <Text style={styles.meta}>{averageScore ? formatFiveStarScore(averageScore) : 'No average yet'}</Text>
        </View>
        <Text style={styles.meta}>{topic?.ratingCount || items.length || 0} ratings</Text>
      </Card>
      <RatingComposer
        title="Add your rating"
        score={composerScore}
        onScoreChange={setComposerScore}
        textValue={composerText}
        onTextChange={setComposerText}
        placeholder="Add your take on this topic"
        submitLabel="Post rating"
        onSubmit={submitTopicRating}
        loading={saving}
      />
    </View>
  );

  return (
    <Screen title="Topic" scroll={false}>
      <FeedList
        items={items}
        loading={loading}
        onRefresh={loadTopic}
        ListHeaderComponent={header}
        emptyTitle="No ratings yet."
        renderItem={({ item }) => (
          <RatingFeedItem
            item={item}
            currentUserId={user?.userId ?? user?.id}
            interactions={interactions}
            refresh={loadTopic}
            onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
            onTopicPress={() => null}
            onCardPress={() => interactions.toggleComments(item.ratingId)}
            onEditPress={(ratingId) => navigation.navigate('PostEditor', { ratingId })}
            showMedia={false}
            showTopicText={false}
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    gap: spacing.md,
    marginBottom: spacing.md
  },
  topicCard: {
    backgroundColor: colors.text
  },
  hero: {
    height: 260,
    borderRadius: 8,
    marginBottom: spacing.sm
  },
  topicTitle: {
    ...text.h1,
    color: '#ffffff'
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  meta: {
    color: '#d1d5db',
    fontWeight: '700'
  }
});

export default TopicScreen;
