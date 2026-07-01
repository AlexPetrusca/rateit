import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import FeedList from '../components/FeedList.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import Screen from '../components/Screen.jsx';
import TopicRatingsInline from '../components/TopicRatingsInline.jsx';
import StoryBar from '../components/StoryBar.jsx';
import { getRatingShareUrl } from '../config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import BackendApiService from '../services/BackendApiService.js';
import { getSeenPromptIds } from '../storage/promptSeen.js';
import { mergeUniqueBy } from '../utils/lists.js';

const PAGE_SIZE = 5;

const HomeScreen = ({ navigation, route }) => {
  const feedType = route.params?.feedType || 'home';
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storyPeople, setStoryPeople] = useState([]);
  const [hasOwnPrompt, setHasOwnPrompt] = useState(false);
  const loadingMoreRef = useRef(false);

  const updateItem = useCallback((ratingId, updater) => {
    setItems((current) => current.map((item) => (item.ratingId === ratingId ? updater(item) : item)));
  }, []);

  const interactions = useRatingInteractions({ notify, updateItem });

  const loadPage = useCallback(async (nextPage = 0, append = false) => {
    if (append && loadingMoreRef.current) {
      return;
    }
    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const fetchFeed = feedType === 'following' ? BackendApiService.getFollowingFeed : BackendApiService.getFeed;
      const nextItems = await fetchFeed({ page: nextPage, size: PAGE_SIZE });
      setItems((current) => mergeUniqueBy(append ? current : [], nextItems, (item) => item.ratingId));
      setPage(nextPage);
      setHasMore(nextItems.length === PAGE_SIZE);
    } catch (error) {
      notify({ message: error.message || 'Failed to load feed', type: 'error' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setRefreshing(false);
    }
  }, [feedType, notify]);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const currentUserId = user?.userId ?? user?.id;
    Promise.all([BackendApiService.getAllRecentPrompts(), getSeenPromptIds(currentUserId)])
      .then(([prompts, seen]) => {
        if (!active) return;
        // Group prompts by author; an author's circle is "new" if any of their
        // prompts haven't been seen on this device yet.
        const byAuthor = new Map();
        prompts.forEach((prompt) => {
          const entry = byAuthor.get(prompt.authorUserId) || {
            userId: prompt.authorUserId,
            username: prompt.authorUsername,
            profilePicUrl: prompt.authorProfilePicUrl,
            hasUnseen: false,
            latest: 0
          };
          if (!seen.has(String(prompt.id))) entry.hasUnseen = true;
          entry.latest = Math.max(entry.latest, new Date(prompt.createdAt).getTime() || 0);
          byAuthor.set(prompt.authorUserId, entry);
        });
        setHasOwnPrompt(byAuthor.has(currentUserId));
        // Others only; surface unseen authors first, then most recent.
        setStoryPeople([...byAuthor.values()]
          .filter((person) => person.userId !== currentUserId)
          .sort((a, b) => (b.hasUnseen - a.hasUnseen) || (b.latest - a.latest)));
      })
      .catch(() => { if (active) { setStoryPeople([]); setHasOwnPrompt(false); } });
    return () => { active = false; };
  }, [user]));

  const refresh = () => {
    setRefreshing(true);
    return loadPage(0, false);
  };

  const loadMore = () => {
    if (hasMore) {
      loadPage(page + 1, true);
    }
  };

  return (
    <Screen
      title={null}
      scroll={false}
      actions={null}
      safeBottom={false}
      contentStyle={{ paddingBottom: 0 }}
    >
      <FeedList
        items={items}
        loading={loading}
        loadingMore={loadingMore}
        refreshing={refreshing}
        onRefresh={refresh}
        onEndReached={loadMore}
        hasMore={hasMore}
        ListHeaderComponent={(
          <StoryBar
            user={user}
            people={storyPeople}
            ownHasPrompt={hasOwnPrompt}
            onAddStory={() => navigation.navigate('Create', { mode: 'prompt' })}
            onOpenOwnStories={() => navigation.navigate('Prompts', { own: true, username: user?.username })}
            onOpenStories={(person) => navigation.navigate('Prompts', {
              userId: person.userId ?? person.id,
              username: person.username
            })}
          />
        )}
        endMessage={hasMore ? '' : 'You reached the end of the feed.'}
        emptyTitle="No ratings yet."
        renderItem={({ item }) => (
          <RatingFeedItem
            item={item}
            currentUserId={user?.userId ?? user?.id}
            interactions={interactions}
            reviewNumberOfLines={6}
            commentNumberOfLines={6}
            openCardOnlyWhenTruncated
            showReply={false}
            refresh={refresh}
            renderTopicRatings={(it, suppressComposer) => (
              <TopicRatingsInline
                rateableItemId={it.rateableItem?.id}
                excludeRatingId={it.ratingId}
                currentUserId={user?.userId ?? user?.id}
                notify={notify}
                navigation={navigation}
                suppressComposer={suppressComposer}
              />
            )}
            onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
            onTopicPress={(rateableItemId) => navigation.navigate('Topic', { rateableItemId })}
            onCardPress={(post) => navigation.navigate('Topic', {
              rateableItemId: post.rateableItem?.id,
              openReviewId: post.ratingId
            })}
            onCommentOpen={(post, comment) => navigation.navigate('Topic', {
              rateableItemId: post.rateableItem?.id,
              openReviewId: post.ratingId,
              highlightCommentId: comment?.id
            })}
            onEditPress={(ratingId) => navigation.navigate('PostEditor', { ratingId })}
            shareUrl={getRatingShareUrl(item.rateableItem?.id, item.ratingId)}
          />
        )}
      />
    </Screen>
  );
};

export default HomeScreen;
