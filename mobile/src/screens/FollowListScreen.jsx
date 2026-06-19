import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Screen from '../components/Screen.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { spacing, text } from '../theme.js';

const FollowListScreen = ({ navigation, route }) => {
  const { notify } = useNotifications();
  const { userId, type = 'followers' } = route.params || {};
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      setPeople(type === 'following'
        ? await BackendApiService.getFollowing(userId)
        : await BackendApiService.getFollowers(userId));
    } catch (error) {
      notify({ message: error.message || 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify, type, userId]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  return (
    <Screen title={type === 'following' ? 'Following' : 'Followers'} scroll={false}>
      <FlatList
        data={people}
        refreshing={loading}
        onRefresh={loadPeople}
        keyExtractor={(item) => String(item.userId)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <EmptyState title="No users to show." /> : null}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <UserAvatar username={item.username} profilePicUrl={item.profilePicUrl} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.username}</Text>
              <Text style={styles.muted}>@{item.username}</Text>
            </View>
            <AppButton variant="secondary" label="Open" onPress={() => navigation.navigate('Profile', { userId: item.userId })} />
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxl
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  copy: {
    flex: 1,
    minWidth: 120
  },
  name: text.h3,
  muted: text.muted
});

export default FollowListScreen;
