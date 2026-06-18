import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { spacing, text } from '../theme.js';

const SearchUsersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      setResults(await BackendApiService.searchUsers({ query, limit: 20 }));
    } catch (error) {
      notify({ message: error.message || 'Failed to search users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Search" subtitle="Find people by username." scroll={false}>
      <View style={styles.searchRow}>
        <AppTextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="username" autoCapitalize="none" />
        <AppButton label="Search" onPress={search} loading={loading} />
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.userId)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.result}>
            <UserAvatar username={item.username} profilePicUrl={item.profilePicUrl} />
            <View style={styles.resultCopy}>
              <Text style={styles.name}>{item.username}</Text>
              <Text style={styles.muted}>{item.userId === (user?.userId ?? user?.id) ? 'You' : `@${item.username}`}</Text>
            </View>
            <AppButton variant="secondary" label="Open" onPress={() => navigation.navigate('Profile', { userId: item.userId })} />
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end'
  },
  searchInput: {
    flex: 1
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxl
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  resultCopy: {
    flex: 1
  },
  name: text.h3,
  muted: text.muted
});

export default SearchUsersScreen;
