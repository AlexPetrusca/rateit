import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import FeedList from '../components/FeedList.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import Screen from '../components/Screen.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useRatingInteractions } from '../hooks/useRatingInteractions.js';
import BackendApiService from '../services/BackendApiService.js';
import { spacing, text } from '../theme.js';

const PAGE_SIZE = 5;

const ProfileScreen = ({ navigation, route }) => {
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
      setPosts(postPage.content || []);
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
    if (loadingMore || !hasMore || profileUserId == null) {
      return;
    }
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const postPage = await BackendApiService.getUserPosts({ userId: profileUserId, page: nextPage, size: PAGE_SIZE });
      setPosts((current) => [...current, ...(postPage.content || [])]);
      setPage(nextPage);
      setHasMore(((postPage.number || nextPage) + 1) * (postPage.size || PAGE_SIZE) < (postPage.totalElements || 0));
    } catch (error) {
      notify({ message: error.message || 'Failed to load posts', type: 'error' });
    } finally {
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
      <UserAvatar username={profile.username} profilePicUrl={profile.profilePicUrl} size="xl" />
      <View style={styles.profileCopy}>
        <Text style={styles.name}>{profile.username}</Text>
        <Text style={styles.handle}>@{profile.username}</Text>
        <View style={styles.counts}>
          <AppButton variant="ghost" label={`${profile.followerCount || 0} followers`} onPress={() => navigation.navigate('FollowList', { userId: profile.userId, type: 'followers' })} />
          <AppButton variant="ghost" label={`${profile.followingCount || 0} following`} onPress={() => navigation.navigate('FollowList', { userId: profile.userId, type: 'following' })} />
        </View>
        {isOwnProfile ? (
          <AppButton variant="secondary" label="Edit profile photo" onPress={() => navigation.navigate('ProfileEditor')} />
        ) : (
          <AppButton label={profile.followRelation === 'FOLLOWING' ? 'Following' : 'Follow'} onPress={toggleFollow} />
        )}
      </View>
    </Card>
  ) : null;

  return (
    <Screen title={isOwnProfile ? 'Your Profile' : 'Profile'} scroll={false}>
      <FeedList
        items={posts}
        loading={loading}
        loadingMore={loadingMore}
        onEndReached={loadMore}
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
    alignItems: 'center'
  },
  profileCopy: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm
  },
  name: text.h2,
  handle: text.muted,
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm
  }
});

export default ProfileScreen;
