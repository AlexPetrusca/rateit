import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import FeedList from '../components/FeedList.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import Screen from '../components/Screen.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';
import { mergeUniqueBy } from '../utils/lists.js';

const PAGE_SIZE = 5;

const ProfileScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const currentUserId = user?.userId ?? user?.id;
  const profileUserId = route.params?.userId ?? currentUserId;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  const isOwnProfile = useMemo(() => profileUserId != null && currentUserId === profileUserId, [profileUserId, currentUserId]);

  const updateItem = useCallback((ratingId, updater) => {
    setPosts((current) => current.map((item) => (item.ratingId === ratingId ? updater(item) : item)));
  }, []);
  const interactions = useRatingInteractions({ notify, updateItem });

  const loadProfile = useCallback(async () => {
    if (profileUserId == null) {
      return;
    }
    setLoading(true);
    try {
      const [nextProfile, postPage] = await Promise.all([
        BackendApiService.getUserProfile(profileUserId),
        BackendApiService.getUserPosts({ userId: profileUserId, page: 0, size: PAGE_SIZE })
      ]);
      setProfile(nextProfile);
      setPosts(mergeUniqueBy([], postPage.content || [], (item) => item.ratingId));
      setPage(0);
      setHasMore(((postPage.number || 0) + 1) * (postPage.size || PAGE_SIZE) < (postPage.totalElements || 0));
    } catch (error) {
      notify({ message: error.message || 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify, profileUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadMore = async () => {
    if (loadingMoreRef.current || !hasMore || profileUserId == null) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const postPage = await BackendApiService.getUserPosts({ userId: profileUserId, page: nextPage, size: PAGE_SIZE });
      setPosts((current) => mergeUniqueBy(current, postPage.content || [], (item) => item.ratingId));
      setPage(nextPage);
      setHasMore(((postPage.number || nextPage) + 1) * (postPage.size || PAGE_SIZE) < (postPage.totalElements || 0));
    } catch (error) {
      notify({ message: error.message || 'Failed to load posts', type: 'error' });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile || isOwnProfile) {
      return;
    }
    const following = profile.followRelation === 'FOLLOWING';
    const nextProfile = following
      ? await BackendApiService.unfollowUser(profile.userId)
      : await BackendApiService.followUser(profile.userId);
    setProfile(nextProfile);
  };

  const header = profile ? (
    <Card style={styles.profileCard}>
      <UserAvatar username={profile.username} profilePicUrl={profile.profilePicUrl} size={width < 375 ? 'lg' : 'xl'} />
      <View style={styles.profileCopy}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.username}</Text>
          {isOwnProfile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={() => navigation.navigate('Menu')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
            >
              <HandDrawnIcon name="gear" color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.handle}>@{profile.username}</Text>
        <View style={styles.counts}>
          <Pressable onPress={() => navigation.navigate('FollowList', { userId: profile.userId, type: 'following' })} style={styles.countButton}>
            <Text style={styles.countStrong}>{profile.followingCount || 0}</Text>
            <Text style={styles.countLabel}>Following</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('FollowList', { userId: profile.userId, type: 'followers' })} style={styles.countButton}>
            <Text style={styles.countStrong}>{profile.followerCount || 0}</Text>
            <Text style={styles.countLabel}>Followers</Text>
          </Pressable>
        </View>
        {!isOwnProfile ? (
          <AppButton label={profile.followRelation === 'FOLLOWING' ? 'Following' : 'Follow'} onPress={toggleFollow} />
        ) : null}
      </View>
    </Card>
  ) : null;

  return (
    <Screen title={null} scroll={false}>
      <FeedList
        items={posts}
        loading={loading}
        loadingMore={loadingMore}
        onEndReached={loadMore}
        ListFooterExtra={hasMore ? <AppButton variant="ghost" label="Load more" onPress={loadMore} loading={loadingMore} /> : null}
        onRefresh={loadProfile}
        endMessage={hasMore ? '' : 'No more posts to show.'}
        emptyTitle="No posts to show."
        renderItem={({ item, index }) => (
          <View>
            {index === 0 ? header : null}
            <RatingFeedItem
              item={item}
              currentUserId={currentUserId}
              interactions={interactions}
              refresh={loadProfile}
              onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
              onTopicPress={(rateableItemId) => navigation.navigate('Topic', { rateableItemId })}
              onCardPress={(post) => navigation.navigate('Topic', { rateableItemId: post.rateableItem?.id })}
              onEditPress={(ratingId) => navigation.navigate('PostEditor', { ratingId })}
            />
          </View>
        )}
        ListHeaderComponent={posts.length === 0 ? header : null}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  name: {
    ...text.h2,
    flexShrink: 1
  },
  handle: text.muted,
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg
  },
  countButton: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5
  },
  countStrong: {
    color: colors.text,
    fontWeight: '800'
  },
  countLabel: {
    color: colors.textMuted
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22
  },
  settingsButtonPressed: {
    backgroundColor: colors.surfacePressed
  }
});

export default ProfileScreen;
