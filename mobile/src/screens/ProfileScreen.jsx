import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import FeedList from '../components/FeedList.jsx';
import RatingFeedItem from '../components/RatingFeedItem.jsx';
import TopicRatingsInline from '../components/TopicRatingsInline.jsx';
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
  const { user, logout } = useAuth();
  const { notify } = useNotifications();
  const currentUserId = user?.userId ?? user?.id;
  const profileUserId = route.params?.userId ?? currentUserId;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
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
      setPostCount(postPage.totalElements || 0);
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
      setPostCount(postPage.totalElements || 0);
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
    setFollowLoading(true);
    try {
      const following = profile.followRelation === 'FOLLOWING';
      const result = following
        ? await BackendApiService.unfollowUser(profileUserId)
        : await BackendApiService.followUser(profileUserId);
      setProfile((current) => ({
        ...current,
        followRelation: result.followRelation,
        followerCount: (current.followerCount || 0) + (following ? -1 : 1)
      }));
    } catch (error) {
      notify({ message: error.message || 'Failed to update follow', type: 'error' });
    } finally {
      setFollowLoading(false);
    }
  };

  const header = profile ? (
    <View style={styles.profileHeader}>
      <Card style={styles.profileCard}>
        {isOwnProfile ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open tourney"
              onPress={() => navigation.navigate('Tourney')}
              style={({ pressed }) => [styles.tourneyButton, pressed && styles.profileIconButtonPressed]}
            >
              <Text style={styles.tourneyIcon}>🏆</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={() => (navigation.getParent() || navigation).navigate('ProfileEditor')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.profileIconButtonPressed]}
            >
              <HandDrawnIcon name="gear" color={colors.textMuted} />
            </Pressable>
          </>
        ) : null}
        <UserAvatar username={profile.username} profilePicUrl={profile.profilePicUrl} size={width < 375 ? 'lg' : 'xl'} />
        <View style={[styles.profileCopy, isOwnProfile && styles.profileCopyOwn]}>
          <Text style={styles.name}>{profile.username}</Text>
          <Text style={styles.handle}>@{profile.username}</Text>
          <View style={styles.counts}>
            <Pressable onPress={() => navigation.navigate('FollowList', { userId: profileUserId, type: 'following' })} style={styles.countButton}>
              <Text style={styles.countStrong}>{profile.followingCount || 0}</Text>
              <Text style={styles.countLabel}>Following</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('FollowList', { userId: profileUserId, type: 'followers' })} style={styles.countButton}>
              <Text style={styles.countStrong}>{profile.followerCount || 0}</Text>
              <Text style={styles.countLabel}>Followers</Text>
            </Pressable>
          </View>
          {isOwnProfile ? (
            <AppButton label="Sign out" variant="ghost" onPress={logout} style={styles.profileAction} />
          ) : (
            <AppButton
              label={profile.followRelation === 'FOLLOWING' ? 'Following' : 'Follow'}
              variant={profile.followRelation === 'FOLLOWING' ? 'secondary' : 'primary'}
              onPress={toggleFollow}
              loading={followLoading}
              style={styles.profileAction}
            />
          )}
        </View>
      </Card>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Posts</Text>
        <Text style={styles.sectionCount}>{postCount} total</Text>
      </View>
    </View>
  ) : null;

  return (
    <Screen title={null} scroll={false}>
      <FeedList
        items={posts}
        loading={loading}
        loadingMore={loadingMore}
        onEndReached={loadMore}
        hasMore={hasMore}
        onRefresh={loadProfile}
        endMessage={hasMore ? '' : 'No more posts to show.'}
        emptyTitle="No posts to show."
        renderItem={({ item }) => (
          <RatingFeedItem
            item={item}
            currentUserId={currentUserId}
            interactions={interactions}
            refresh={loadProfile}
            onAuthorPress={(userId) => navigation.navigate('Profile', { userId })}
            onTopicPress={(rateableItemId) => navigation.navigate('Topic', { rateableItemId })}
            onCardPress={(post) => navigation.navigate('Topic', {
              rateableItemId: post.rateableItem?.id,
              openReviewId: post.ratingId
            })}
            renderTopicRatings={(it) => (
              <TopicRatingsInline
                rateableItemId={it.rateableItem?.id}
                excludeRatingId={it.ratingId}
                currentUserId={currentUserId}
                notify={notify}
                navigation={navigation}
              />
            )}
            onEditPress={(ratingId) => navigation.navigate('PostEditor', { ratingId })}
          />
        )}
        ListHeaderComponent={header}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  profileCard: {
    position: 'relative',
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
    gap: spacing.sm,
    paddingTop: 2
  },
  profileCopyOwn: {
    paddingRight: 82
  },
  name: {
    ...text.h2
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
    position: 'absolute',
    zIndex: 1,
    elevation: 1,
    top: spacing.sm,
    right: spacing.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22
  },
  tourneyButton: {
    position: 'absolute',
    zIndex: 1,
    elevation: 1,
    top: spacing.sm,
    right: spacing.sm + 48,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22
  },
  profileIconButtonPressed: {
    backgroundColor: colors.surfacePressed
  },
  tourneyIcon: {
    fontSize: 23,
    lineHeight: 28
  },
  profileAction: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: spacing.lg
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm
  },
  sectionTitle: {
    ...text.h3
  },
  sectionCount: {
    ...text.muted
  }
});

export default ProfileScreen;
