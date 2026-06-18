import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton.jsx';
import Card from '../../components/Card.jsx';
import Screen from '../../components/Screen.jsx';
import { useNotifications } from '../../contexts/NotificationContext.jsx';
import BackendApiService from '../../services/BackendApiService.js';
import { spacing, text } from '../../theme.js';
import { formatShortTimestamp } from '../../utils/dateTime.js';

const AdminSuggestionsScreen = () => {
  const { notify } = useNotifications();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await BackendApiService.getAdminSuggestions({ page: 0, size: 50 });
      setSuggestions(page.content || []);
    } catch (error) {
      notify({ message: error.message || 'Failed to load suggestions', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (suggestionId) => {
    await BackendApiService.deleteAdminSuggestion(suggestionId);
    await load();
  };

  return (
    <Screen title="Admin Suggestions" scroll={false}>
      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={suggestions}
        keyExtractor={(item) => String(item.suggestionId)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.title}>{item.title}</Text>
            {item.body ? <Text style={text.body}>{item.body}</Text> : null}
            <Text style={styles.muted}>@{item.authorUsername || 'unknown'} · {formatShortTimestamp(item.createdAt)}</Text>
            <View style={styles.actions}>
              <AppButton variant="danger" label="Delete" onPress={() => remove(item.suggestionId)} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  title: text.h3,
  muted: text.muted,
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }
});

export default AdminSuggestionsScreen;
