import { useCallback, useEffect, useRef, useState } from 'react';
import FeedList from '../components/FeedList.jsx';
import Screen from '../components/Screen.jsx';
import TopicFeedCard from '../components/TopicFeedCard.jsx';
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
        endMessage={hasMore ? '' : 'You reached the end of the feed.'}
        emptyTitle="No ratings yet."
        renderItem={({ item }) => (
          <TopicFeedCard
            item={item}
            onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
            onTopicPress={(rateableItemId) => navigation.navigate('Topic', { rateableItemId })}
            shareUrl={getRatingShareUrl(item.rateableItem?.id, item.ratingId)}
            notify={notify}
          />
        )}
      />
    </Screen>
  );
};

export default HomeScreen;
