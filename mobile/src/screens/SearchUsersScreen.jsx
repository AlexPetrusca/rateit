import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

const DEBOUNCE_MS = 220;

const SearchUsersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // Bumped on every query change so out-of-order responses (a slow earlier
  // keystroke resolving after a later one) are ignored.
  const requestSeq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const seq = ++requestSeq.current;

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return undefined;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const found = await BackendApiService.searchUsers({ query: trimmed, limit: 20 });
        if (seq === requestSeq.current) {
          setResults(found || []);
          setSearched(true);
        }
      } catch (error) {
        if (seq === requestSeq.current) {
          notify({ message: error.message || 'Failed to search users', type: 'error' });
        }
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query, notify]);

  const currentUserId = user?.userId ?? user?.id;

  return (
    <Screen title="Search" subtitle="Find people by username." scroll={false}>
      <View style={styles.searchRow}>
        <AppTextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by username"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.userId)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Card style={styles.result}>
            <UserAvatar username={item.username} profilePicUrl={item.profilePicUrl} />
            <View style={styles.resultCopy}>
              <Text style={styles.name}>{item.username}</Text>
              <Text style={styles.muted}>{item.userId === currentUserId ? 'You' : `@${item.username}`}</Text>
            </View>
            <AppButton variant="secondary" label="Open" onPress={() => navigation.navigate('Profile', { userId: item.userId })} />
          </Card>
        )}
        ListEmptyComponent={searched && !loading ? (
          <Text style={styles.empty}>No users found for “{query.trim()}”.</Text>
        ) : null}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  searchInput: {
    flex: 1,
    minWidth: 190
  },
  spinner: {
    marginLeft: spacing.xs
  },
  list: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  resultCopy: {
    flex: 1,
    minWidth: 120
  },
  name: text.h3,
  muted: text.muted,
  empty: {
    ...text.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl
  }
});

export default SearchUsersScreen;
