import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { backlogData } from '../data/backlogData.js';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { spacing, text } from '../theme.js';
import { formatShortTimestamp } from '../utils/dateTime.js';

const BacklogScreen = ({ navigation }) => {
  const { notify } = useNotifications();
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');

  const loadSuggestions = useCallback(async () => {
    try {
      const page = await BackendApiService.getSuggestions({ page: 0, size: 20 });
      setSuggestions(page.content || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load suggestions');
      notify({ message: err.message || 'Failed to load suggestions', type: 'error' });
    }
  }, [notify]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return (
    <Screen
      title="Backlog"
      subtitle="Rendered from build-status."
      actions={<AppButton variant="secondary" label="Suggest" onPress={() => navigation.navigate('SuggestionSubmit')} />}
    >
      <StatusMessage message={error} type="error" />
      {backlogData.sections.map((section) => (
        <Card key={section.priority}>
          <Text style={styles.sectionTitle}>{section.priority}</Text>
          {section.items.map((item, index) => (
            <Text key={`${section.priority}:${index}`} style={styles.item}>• {item}</Text>
          ))}
        </Card>
      ))}
      <Card>
        <Text style={styles.sectionTitle}>Suggestions</Text>
        <FlatList
          scrollEnabled={false}
          data={suggestions}
          keyExtractor={(item) => String(item.suggestionId)}
          renderItem={({ item }) => (
            <View style={styles.suggestion}>
              <Text style={styles.suggestionTitle}>{item.title}</Text>
              {item.body ? <Text style={styles.item}>{item.body}</Text> : null}
              <Text style={styles.muted}>@{item.authorUsername} · {formatShortTimestamp(item.createdAt)}</Text>
            </View>
          )}
        />
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  sectionTitle: text.h2,
  item: {
    ...text.body,
    marginTop: spacing.xs
  },
  suggestion: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  suggestionTitle: text.h3,
  muted: text.muted
});

export default BacklogScreen;
