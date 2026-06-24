import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AppButton from '../components/AppButton.jsx';
import FeedList from '../components/FeedList.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import Screen from '../components/Screen.jsx';
import StoryBar from '../components/StoryBar.jsx';
import { getRatingShareUrl } from '../config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import BackendApiService from '../services/BackendApiService.js';
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
    BackendApiService.getAllRecentPrompts()
      .then((prompts) => {
        if (!active) return;
        setHasOwnPrompt(prompts.some((prompt) => prompt.authorUserId === currentUserId));
        setStoryPeople(prompts.map((prompt) => ({
          userId: prompt.authorUserId,
          username: prompt.authorUsername,
          profilePicUrl: prompt.authorProfilePicUrl
        })));
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
        ListFooterExtra={hasMore ? <AppButton variant="ghost" label="Load more" onPress={loadMore} loading={loadingMore} /> : null}
        endMessage={hasMore ? '' : 'You reached the end of the feed.'}
        emptyTitle="No ratings yet."
        renderItem={({ item }) => (
          <RatingFeedItem
            item={item}
            currentUserId={user?.userId ?? user?.id}
            interactions={interactions}
            reviewNumberOfLines={6}
            openCardOnlyWhenTruncated
            showReply={false}
            refresh={refresh}
            onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
            onTopicPress={(rateableItemId) => navigation.navigate('Topic', { rateableItemId })}
            onCardPress={(post) => navigation.navigate('Topic', {
              rateableItemId: post.rateableItem?.id,
              openReviewId: post.ratingId
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
