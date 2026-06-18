import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import RatingComposer from '../components/RatingComposer.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import RichText from '../components/RichText.jsx';
import Screen from '../components/Screen.jsx';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

const PAGE_SIZE = 20;
const TOPIC_PHOTO_CARD_PEEK = 100;
const MAX_TOPIC_PHOTO_BLUR = 14;

const formatAverageRating = (value) => {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return '0';
  }

  return score.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const TopicScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const { rateableItemId } = route.params || {};
  const [topic, setTopic] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topicPhotoBlur, setTopicPhotoBlur] = useState(0);
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
  const hasTopicPhoto = Boolean(mediaUrl);
  const averageScore = useMemo(() => {
    if (topic?.averageScore != null || topic?.averageRating != null) {
      return Number(topic.averageScore ?? topic.averageRating);
    }

    if (items.length === 0) {
      return 0;
    }

    const total = items.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
    return total / items.length;
  }, [items, topic]);
  const displayedItems = useMemo(() => [...items].reverse(), [items]);
  const ratingCount = topic?.ratingCount ?? items.length;
  const listTopPadding = Math.max(420, viewportHeight - TOPIC_PHOTO_CARD_PEEK);
  const feedWidth = Math.min(360, Math.max(280, viewportWidth - 80));
  const topicTitleSize = useMemo(() => {
    const titleLength = topicTitle.trim().length;

    if (titleLength <= 12) {
      return 46;
    }

    if (titleLength <= 24) {
      return 42;
    }

    if (titleLength <= 40) {
      return 36;
    }

    return 31;
  }, [topicTitle]);

  const handleScroll = ({ nativeEvent }) => {
    setTopicPhotoBlur(Math.min(MAX_TOPIC_PHOTO_BLUR, nativeEvent.contentOffset.y / 70));
  };

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

  const footer = (
    <View style={[styles.footerComposer, { width: feedWidth }]}>
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
        cardStyle={styles.topicComposerCard}
      />
    </View>
  );

  const renderStatus = () => {
    if (loading && items.length === 0) {
      return (
        <View style={[styles.feedStatus, { width: feedWidth }]}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.feedStatusText}>Loading ratings...</Text>
        </View>
      );
    }

    if (!loading && items.length === 0) {
      return (
        <View style={[styles.feedStatus, { width: feedWidth }]}>
          <Text style={styles.feedStatusText}>No ratings yet.</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Screen title={null} scroll={false} contentStyle={styles.topicContent}>
      <View style={styles.topicShell}>
        <ImageBackground
          source={hasTopicPhoto ? { uri: mediaUrl } : undefined}
          resizeMode="cover"
          blurRadius={topicPhotoBlur}
          style={[styles.topicHero, !hasTopicPhoto && styles.topicHeroNoPhoto]}
          imageStyle={styles.topicHeroImage}
        >
          {!hasTopicPhoto ? <View style={styles.noPhotoGlow} /> : null}
          <View style={styles.topicHeroOverlay} />
          <View style={[styles.topicHeroContent, { opacity: Math.max(0.32, 1 - topicPhotoBlur / 18) }]}>
            {topicTitle ? (
              <RichText style={[styles.topicTitle, styles.topicTextShadow, { fontSize: topicTitleSize, lineHeight: topicTitleSize * 0.96 }]}>
                {topicTitle}
              </RichText>
            ) : null}
            <View style={styles.topicMeta}>
              <View style={styles.topicRatingRow}>
                <Text style={styles.topicAverage}>{formatAverageRating(averageScore)}</Text>
                <StarRating value={averageScore} size="sm" label={`Average rating: ${formatAverageRating(averageScore)} out of 5`} />
              </View>
              <Text style={styles.topicCount}>{ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</Text>
            </View>
          </View>
        </ImageBackground>

        <Animated.FlatList
          data={displayedItems}
          keyExtractor={(item) => String(item.ratingId)}
          renderItem={({ item }) => (
            <View style={[styles.feedCardWrap, { width: feedWidth }]}>
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
                cardStyle={styles.topicRatingCard}
              />
            </View>
          )}
          ListHeaderComponent={renderStatus}
          ListFooterComponent={footer}
          refreshing={loading && items.length > 0}
          onRefresh={loadTopic}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.topicList, { paddingTop: listTopPadding }]}
          ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  topicContent: {
    maxWidth: '100%',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 0
  },
  topicShell: {
    flex: 1,
    backgroundColor: '#090d16',
    position: 'relative',
    overflow: 'hidden'
  },
  topicHero: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: TOPIC_PHOTO_CARD_PEEK + 18,
    backgroundColor: '#090d16'
  },
  topicHeroNoPhoto: {
    backgroundColor: '#000000'
  },
  topicHeroImage: {
    opacity: 0.9,
    transform: [{ scale: 1.08 }]
  },
  noPhotoGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090d16',
    opacity: 0.55
  },
  topicHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 13, 22, 0.28)'
  },
  topicHeroContent: {
    gap: spacing.md,
    maxWidth: 640
  },
  topicTextShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.36)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 32
  },
  topicTitle: {
    color: '#f8fbff',
    fontWeight: '900',
    letterSpacing: 0
  },
  topicMeta: {
    alignItems: 'flex-start',
    gap: spacing.xs
  },
  topicRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  topicAverage: {
    color: 'rgba(248, 251, 255, 0.96)',
    fontSize: 19,
    fontWeight: '800'
  },
  topicCount: {
    color: 'rgba(248, 251, 255, 0.76)',
    fontWeight: '800'
  },
  topicList: {
    paddingBottom: 112,
    alignItems: 'center'
  },
  feedStatus: {
    marginBottom: 6,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 18 },
    alignItems: 'center',
    gap: spacing.sm
  },
  feedStatusText: {
    ...text.muted,
    textAlign: 'center'
  },
  feedCardWrap: {
    alignSelf: 'center'
  },
  topicRatingCard: {
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 }
  },
  topicComposerCard: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 18 }
  },
  cardSeparator: {
    height: 6
  },
  footerComposer: {
    alignSelf: 'center',
    marginTop: 1
  }
});

export default TopicScreen;
