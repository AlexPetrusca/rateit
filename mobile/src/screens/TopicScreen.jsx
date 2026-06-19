import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RatingComposer from '../components/RatingComposer.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import RichText from '../components/RichText.jsx';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';
import { mergeUniqueBy } from '../utils/lists.js';

const PAGE_SIZE = 20;

const formatAverageRating = (value) => {
  const score = Number(value);
  return Number.isFinite(score)
    ? score.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '0';
};

const TopicScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const { rateableItemId } = route.params || {};
  const [topic, setTopic] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
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
      setItems(mergeUniqueBy([], ratings, (item) => item.ratingId));
    } catch (error) {
      notify({ message: error.message || 'Failed to load topic', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify, rateableItemId]);

  useEffect(() => {
    setBlurIntensity(0);
    setImageFailed(false);
    loadTopic();
  }, [loadTopic]);

  const topicTitle = topic?.title || topic?.body || items[0]?.rateableItem?.title || items[0]?.rateableItem?.body || 'Topic';
  const mediaObjectKey = topic?.mediaObjectKey || items[0]?.rateableItem?.mediaObjectKey;
  const mediaUrl = useResolvedImageUrl(mediaObjectKey);
  const hasTopicPhoto = Boolean(mediaUrl && !imageFailed);
  const averageScore = useMemo(() => {
    if (topic?.averageScore != null || topic?.averageRating != null) {
      return Number(topic.averageScore ?? topic.averageRating);
    }
    return items.length
      ? items.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / items.length
      : 0;
  }, [items, topic]);
  const displayedItems = useMemo(() => [...items].reverse(), [items]);
  const ratingCount = topic?.ratingCount ?? items.length;
  const feedWidth = Math.min(420, viewportWidth - 24);
  const listTopPadding = Math.max(360, viewportHeight - 72);
  const titleSize = topicTitle.length <= 12 ? 46 : topicTitle.length <= 24 ? 40 : topicTitle.length <= 40 ? 34 : 29;

  const submitTopicRating = async () => {
    const sourceRatingId = items.find((item) => !item.deleted && !item.deletedAt)?.ratingId;
    if (sourceRatingId == null) {
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

  const footer = items.length ? (
    <View style={[styles.footer, { width: feedWidth }]}>
      <RatingComposer
        title="Add your rating"
        score={composerScore}
        onScoreChange={setComposerScore}
        textValue={composerText}
        onTextChange={setComposerText}
        placeholder="Add your take on this topic"
        submitLabel="Add rating"
        onSubmit={submitTopicRating}
        loading={saving}
      />
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        {hasTopicPhoto ? (
          <Image
            source={{ uri: mediaUrl }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            style={styles.backgroundImage}
          />
        ) : (
          <View style={styles.backgroundFallback} />
        )}
        <View style={styles.backgroundShade} />
      </View>

      <View pointerEvents="none" style={[styles.metadataLayer, { paddingBottom: viewportHeight * 0.29 }]}>
        <RichText style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 0.96 }]}>
          {topicTitle}
        </RichText>
        <View style={styles.ratingRow}>
          <Text style={styles.average}>{formatAverageRating(averageScore)}</Text>
          <StarRating value={averageScore} size="sm" label={`Average rating: ${formatAverageRating(averageScore)} out of 5`} />
        </View>
        <Text style={styles.count}>{ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</Text>
      </View>

      {blurIntensity > 0 ? (
        <BlurView pointerEvents="none" intensity={blurIntensity} tint="dark" style={styles.blurLayer} />
      ) : null}

      <FlatList
        style={styles.reviewsLayer}
        data={displayedItems}
        keyExtractor={(item) => String(item.ratingId)}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{
          paddingTop: listTopPadding,
          paddingBottom: insets.bottom + spacing.xxl,
          alignItems: 'center'
        }}
        renderItem={({ item }) => (
          <View style={[styles.reviewWrap, { width: feedWidth }]}>
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
              cardStyle={styles.reviewCard}
            />
          </View>
        )}
        ListEmptyComponent={(
          <View style={[styles.empty, { width: feedWidth }]}>
            {loading ? <ActivityIndicator color={colors.accent} /> : <Text style={text.muted}>No ratings yet.</Text>}
          </View>
        )}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading && items.length > 0}
        onRefresh={loadTopic}
        onScroll={({ nativeEvent }) => {
          setBlurIntensity(Math.min(70, Math.max(0, nativeEvent.contentOffset.y / 8)));
        }}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090d16'
  },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  backgroundImage: {
    width: '100%',
    height: '100%'
  },
  backgroundFallback: {
    flex: 1,
    backgroundColor: '#26070b'
  },
  backgroundShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 6, 12, 0.3)'
  },
  metadataLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs
  },
  title: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  average: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800'
  },
  count: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '700'
  },
  blurLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  reviewsLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  reviewWrap: {
    alignSelf: 'center'
  },
  reviewCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(22, 22, 25, 0.94)'
  },
  separator: {
    height: spacing.sm
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center'
  },
  footer: {
    alignSelf: 'center',
    marginTop: spacing.md
  }
});

export default TopicScreen;
