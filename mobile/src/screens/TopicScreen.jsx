import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CommentComposer from '../components/CommentComposer.jsx';
import CommentThread from '../components/CommentThread.jsx';
import PostActions from '../components/PostActions.jsx';
import RatingComposer from '../components/RatingComposer.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import PostCard from '../components/PostCard.jsx';
import RichText from '../components/RichText.jsx';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import { usePeekHold } from '../hooks/usePeekHold.js';
import BackendApiService from '../services/BackendApiService.js';
import { getRatingShareUrl } from '../config.js';
import { colors, spacing, text } from '../theme.js';
import { mergeUniqueBy } from '../utils/lists.js';

const PAGE_SIZE = 20;
const REVIEW_PEEK = 78;
const METADATA_GAP = 10;
const PHOTO_HERO_LAYER = 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(255, 48, 58, 0.16), transparent 34%), linear-gradient(180deg, rgba(9, 13, 22, 0.08) 0%, rgba(9, 13, 22, 0.26) 42%, rgba(9, 13, 22, 0.86) 100%)';
const FALLBACK_HERO_LAYER = 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 28%), radial-gradient(circle at bottom right, rgba(255, 48, 58, 0.40), transparent 34%), radial-gradient(circle at center, rgba(255, 48, 58, 0.12), transparent 42%), linear-gradient(180deg, rgba(9, 13, 22, 0.18) 0%, rgba(0, 0, 0, 0.36) 42%, rgba(0, 0, 0, 0.92) 100%)';

const formatAverageRating = (value) => {
  const score = Number(value);
  return Number.isFinite(score)
    ? score.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '0';
};

const TopicScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const { peeking, handlers: peekHandlers } = usePeekHold();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const { rateableItemId } = route.params || {};
  const [topic, setTopic] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [imagePortrait, setImagePortrait] = useState(false);
  const [composerScore, setComposerScore] = useState(4);
  const [composerText, setComposerText] = useState('');
  const [saving, setSaving] = useState(false);
  const [openReview, setOpenReview] = useState(null);
  const [highlightCommentId, setHighlightCommentId] = useState(null);
  const [modalComposerOpen, setModalComposerOpen] = useState(false);

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

  // Deep link from a feed comment: open the rating modal and highlight the tapped
  // comment. Consume the params once so reopening by tapping the rating later
  // doesn't re-highlight/re-scroll.
  useEffect(() => {
    const openReviewId = route.params?.openReviewId;
    if (openReviewId == null) {
      return;
    }
    const review = items.find((item) => String(item.ratingId) === String(openReviewId));
    if (review) {
      setOpenReview(review);
      setHighlightCommentId(route.params?.highlightCommentId ?? null);
      navigation.setParams({ openReviewId: undefined, highlightCommentId: undefined });
    }
  }, [items, route.params?.openReviewId, route.params?.highlightCommentId, navigation]);

  // Load the open review's comments so the modal can show them fully expanded.
  const modalScrollRef = useRef(null);
  useEffect(() => {
    if (openReview) {
      interactions.loadComments(openReview.ratingId, true).catch(() => {});
    }
  }, [openReview]); // eslint-disable-line react-hooks/exhaustive-deps
  const modalComments = openReview ? (interactions.commentsByRating[openReview.ratingId] || []) : [];
  // Use the live copy from the list so the modal's like button reflects toggles
  // (toggleLike updates `items`, not the openReview snapshot taken at open time).
  const activeReview = openReview
    ? (items.find((it) => it.ratingId === openReview.ratingId) || openReview)
    : null;

  const topicTitle = topic?.title || topic?.body || items[0]?.rateableItem?.title || items[0]?.rateableItem?.body || 'Topic';
  const mediaObjectKey = topic?.mediaObjectKey || items[0]?.rateableItem?.mediaObjectKey;
  const mediaUrl = useResolvedImageUrl(mediaObjectKey);
  const hasTopicPhoto = Boolean(mediaUrl && !imageFailed);

  useEffect(() => {
    setImagePortrait(false);
    if (!mediaUrl) return;
    let active = true;
    Image.getSize(mediaUrl, (w, h) => { if (active) setImagePortrait(h > w); }, () => {});
    return () => { active = false; };
  }, [mediaUrl]);
  const heroLayer = hasTopicPhoto ? PHOTO_HERO_LAYER : FALLBACK_HERO_LAYER;
  const heroLayerStyle = Platform.OS === 'web'
    ? { backgroundImage: heroLayer }
    : { experimental_backgroundImage: heroLayer };
  const fallbackLayerStyle = Platform.OS === 'web'
    ? { backgroundImage: FALLBACK_HERO_LAYER }
    : { experimental_backgroundImage: FALLBACK_HERO_LAYER };
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
  const listTopPadding = Math.max(360, viewportHeight - REVIEW_PEEK);
  const titleSize = topicTitle.length <= 12 ? 46 : topicTitle.length <= 24 ? 40 : topicTitle.length <= 40 ? 34 : 29;

  const submitTopicRating = async () => {
    setSaving(true);
    try {
      await BackendApiService.rateTopic(rateableItemId, composerScore, composerText || '');
      setComposerText('');
      await loadTopic();
    } catch (error) {
      notify({ message: error.message || 'Failed to add rating', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const closeReview = () => { setOpenReview(null); setHighlightCommentId(null); setModalComposerOpen(false); };

  // Composer for replying to a specific comment inside the modal thread.
  const renderModalReplyComposer = (parentCommentId) => {
    if (!activeReview) return null;
    const draft = interactions.getDraft(activeReview.ratingId, parentCommentId);
    return (
      <CommentComposer
        nested
        score={Number(draft.score || 2.5)}
        onScoreChange={(score) => interactions.updateDraft(activeReview.ratingId, parentCommentId, { score: String(score) })}
        text={draft.text}
        onTextChange={(nextText) => interactions.updateDraft(activeReview.ratingId, parentCommentId, { text: nextText })}
        onSubmit={() => interactions.submitComment(activeReview, parentCommentId)
          .catch((error) => notify({ message: error.message, type: 'error' }))}
      />
    );
  };
  const closeTopic = () => navigation.canGoBack()
    ? navigation.goBack()
    : navigation.navigate('MainTabs', { screen: 'Home' });

  // Hide the topic-level "Add your rating" composer while a per-rating comment
  // composer is open, so only one composer shows at a time.
  const footer = interactions.activeComposer ? null : (
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
        richText
        showStars
      />
    </View>
  );

  return (
    <View style={styles.screen} {...peekHandlers}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.backgroundFallback, fallbackLayerStyle]} />
        {hasTopicPhoto ? (
          <Image
            source={{ uri: mediaUrl }}
            resizeMode={peeking ? 'contain' : (imagePortrait ? 'cover' : 'contain')}
            onError={() => setImageFailed(true)}
            style={styles.backgroundImage}
          />
        ) : null}
        <View style={[styles.heroLayer, heroLayerStyle, peeking && styles.hidden]} />
      </View>

      <View pointerEvents="none" style={[styles.metadataLayer, { paddingBottom: REVIEW_PEEK + METADATA_GAP }, peeking && styles.hidden]}>
        <RichText style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 0.96 }]}>
          {topicTitle}
        </RichText>
        <View style={styles.ratingRow}>
          <Text style={styles.average}>{formatAverageRating(averageScore)}</Text>
          <StarRating value={averageScore} size="sm" label={`Average rating: ${formatAverageRating(averageScore)} out of 5`} />
        </View>
        <Text style={styles.count}>{ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</Text>
      </View>

      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={[styles.blurLayer, {
            backdropFilter: `blur(${blurIntensity * 0.2}px)`,
            WebkitBackdropFilter: `blur(${blurIntensity * 0.2}px)`
          }, peeking && styles.hidden]}
        />
      ) : (
        <BlurView pointerEvents="none" intensity={blurIntensity} tint="dark" style={[styles.blurLayer, peeking && styles.hidden]} />
      )}

      <FlatList
        pointerEvents={peeking ? 'none' : 'auto'}
        style={[styles.reviewsLayer, peeking && styles.hidden]}
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
              reviewNumberOfLines={6}
              refresh={loadTopic}
              onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
              onTopicPress={() => null}
              onCardPress={() => { setOpenReview(item); setHighlightCommentId(null); }}
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
        refreshControl={(
          <RefreshControl
            refreshing={loading && items.length > 0}
            onRefresh={loadTopic}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surfaceElevated}
          />
        )}
        onScroll={({ nativeEvent }) => {
          setBlurIntensity(Math.min(70, Math.max(0, nativeEvent.contentOffset.y / 8)));
        }}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close topic"
        hitSlop={8}
        onPress={closeTopic}
        pointerEvents={peeking ? 'none' : 'auto'}
        style={({ pressed }) => [
          styles.closeTopic,
          { top: insets.top + spacing.sm },
          pressed && styles.closeTopicPressed,
          peeking && styles.hidden
        ]}
      >
        <HandDrawnIcon name="x" color="#ffffff" size={20} />
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(openReview)}
        onRequestClose={closeReview}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeReview}>
          <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
            <ScrollView ref={modalScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {activeReview ? (
                <>
                  <PostCard
                    post={activeReview}
                    style={styles.modalCard}
                    actions={(
                      <PostActions
                        liked={activeReview.likedByCurrentUser}
                        likeCount={activeReview.likeCount}
                        commentCount={activeReview.commentCount}
                        onLike={() => interactions.toggleLike(activeReview)}
                        onComment={() => setModalComposerOpen((open) => !open)}
                        shareUrl={getRatingShareUrl(activeReview.rateableItem?.id, activeReview.ratingId)}
                        commentLabel={modalComposerOpen ? 'Cancel' : 'Comment'}
                      />
                    )}
                    expandedContent={(modalComposerOpen || modalComments.length > 0) ? (
                      <View style={styles.modalExpanded}>
                        {modalComposerOpen ? (
                          <CommentComposer
                            score={Number(interactions.getDraft(activeReview.ratingId).score || 2.5)}
                            onScoreChange={(score) => interactions.updateDraft(activeReview.ratingId, null, { score: String(score) })}
                            text={interactions.getDraft(activeReview.ratingId).text}
                            onTextChange={(nextText) => interactions.updateDraft(activeReview.ratingId, null, { text: nextText })}
                            onSubmit={() => interactions.submitComment(activeReview)
                              .then(() => setModalComposerOpen(false))
                              .catch((error) => notify({ message: error.message, type: 'error' }))}
                          />
                        ) : null}
                        {modalComments.length > 0 ? (
                          <CommentThread
                            comments={modalComments}
                            currentUserId={user?.userId ?? user?.id}
                            highlightCommentId={highlightCommentId}
                            scrollRef={modalScrollRef}
                            autoExpandDepth={Infinity}
                            autoExpandFlatLimit={Infinity}
                            activeReplyKey={interactions.activeComposer}
                            getReplyKey={(comment) => interactions.getReplyKey(activeReview.ratingId, comment.id)}
                            renderReplyComposer={(comment) => renderModalReplyComposer(comment.id)}
                            expandedReplyKeys={interactions.expandedReplyKeys}
                            onToggleReplies={interactions.toggleReplies}
                            onReplyPress={(comment) => {
                              const replyKey = interactions.getReplyKey(activeReview.ratingId, comment.id);
                              interactions.setActiveComposer(interactions.activeComposer === replyKey ? null : replyKey);
                            }}
                            onAuthorPress={(userId) => { closeReview(); navigation.navigate('Profile', { userId }); }}
                            onLikePress={async (comment) => {
                              try {
                                if (comment.likedByCurrentUser) {
                                  await BackendApiService.unlikeComment(comment.id);
                                } else {
                                  await BackendApiService.likeComment(comment.id);
                                }
                                await interactions.loadComments(activeReview.ratingId, true);
                              } catch (error) {
                                notify({ message: error.message || 'Failed to like comment', type: 'error' });
                              }
                            }}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  />
                </>
              ) : null}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close review"
              hitSlop={12}
              onPress={closeReview}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090d16',
    // Holding the image to peek would otherwise start a native text selection on
    // iOS Safari. Inputs opt back in via AppTextInput's userSelect: 'text'.
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none'
  },
  hidden: {
    opacity: 0
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
    height: '100%',
    userSelect: 'none',
    WebkitTouchCallout: 'none'
  },
  backgroundFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090d16'
  },
  heroLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
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
    fontFamily: 'PlayfairDisplay_400Regular',
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
    fontWeight: 'normal'
  },
  count: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: 'normal'
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
  closeTopic: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 20,
    elevation: 20,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10
  },
  closeTopicPressed: {
    opacity: 0.65
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
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.82)'
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '86%',
    alignSelf: 'center'
  },
  modalScroll: {
    flexGrow: 1,
    // Top-align rather than center: a rating with comments makes the content
    // taller than the modal, and flex-centering an overflowing scroll container
    // on web clips the ends so the comments underneath can't be scrolled to.
    justifyContent: 'flex-start',
    paddingVertical: spacing.sm
  },
  modalCard: {
    backgroundColor: 'rgba(22, 22, 25, 0.98)'
  },
  modalExpanded: {
    gap: spacing.md
  },
  modalClose: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.72)'
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30
  }
});

export default TopicScreen;
