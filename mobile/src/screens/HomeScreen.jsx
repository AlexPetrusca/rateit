import { useCallback, useEffect, useState } from 'react';
import FeedList from '../components/FeedList.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import Screen from '../components/Screen.jsx';
import { APP_PUBLIC_URL } from '../config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import BackendApiService from '../services/BackendApiService.js';

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

  const updateItem = useCallback((ratingId, updater) => {
    setItems((current) => current.map((item) => (item.ratingId === ratingId ? updater(item) : item)));
  }, []);

  const interactions = useRatingInteractions({ notify, updateItem });

  const loadPage = useCallback(async (nextPage = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const fetchFeed = feedType === 'following' ? BackendApiService.getFollowingFeed : BackendApiService.getFeed;
      const nextItems = await fetchFeed({ page: nextPage, size: PAGE_SIZE });
      setItems((current) => (append ? [...current, ...nextItems] : nextItems));
      setPage(nextPage);
      setHasMore(nextItems.length === PAGE_SIZE);
    } catch (error) {
      notify({ message: error.message || 'Failed to load feed', type: 'error' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [feedType, notify]);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const refresh = () => {
    setRefreshing(true);
    return loadPage(0, false);
  };

  return (
    <Screen
      title={null}
      scroll={false}
      actions={null}
    >
      <FeedList
        items={items}
        loading={loading}
        loadingMore={loadingMore}
        refreshing={refreshing}
        onRefresh={refresh}
        onEndReached={() => {
          if (!loadingMore && hasMore) {
            loadPage(page + 1, true);
          }
        }}
        endMessage={hasMore ? '' : 'You reached the end of the feed.'}
        emptyTitle="No ratings yet."
        renderItem={({ item }) => (
          <RatingFeedItem
            item={item}
            currentUserId={user?.userId ?? user?.id}
            interactions={interactions}
            refresh={refresh}
            onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
            onTopicPress={(rateableItemId) => navigation.navigate('Topic', { rateableItemId })}
            onCardPress={(post) => navigation.navigate('Topic', { rateableItemId: post.rateableItem?.id })}
            onEditPress={(ratingId) => navigation.navigate('PostEditor', { ratingId })}
            shareUrl={`${APP_PUBLIC_URL}/posts/${item.ratingId}`}
          />
        )}
      />
    </Screen>
  );
};

export default HomeScreen;
