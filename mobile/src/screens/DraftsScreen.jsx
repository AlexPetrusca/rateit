import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import Screen from '../components/Screen.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

const DraftsScreen = ({ navigation }) => {
  const { notify } = useNotifications();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      setDrafts(await BackendApiService.getDrafts());
    } catch (error) {
      notify({ message: error.message || 'Failed to load drafts', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const deleteDraft = async (draftId) => {
    setDeletingId(draftId);
    try {
      await BackendApiService.deleteDraft(draftId);
      setDrafts((current) => current.filter((draft) => draft.id !== draftId));
    } catch (error) {
      notify({ message: error.message || 'Failed to delete draft', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Screen title="Drafts" scroll={false}>
      <FlatList
        data={drafts}
        refreshing={loading}
        onRefresh={loadDrafts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <EmptyState title="No saved drafts." /> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('MainTabs', {
            screen: 'Create',
            params: { draft: item }
          })}>
            <Card style={styles.item}>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.body || '(no title)'}</Text>
                <Text style={styles.date}>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</Text>
              </View>
              <AppButton
                variant="ghost"
                label="Delete draft"
                icon={<HandDrawnIcon name="x" color={colors.text} />}
                loading={deletingId === item.id}
                onPress={() => deleteDraft(item.id)}
                style={styles.deleteButton}
              />
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  title: text.h3,
  date: text.muted,
  deleteButton: {
    width: 44,
    minWidth: 44,
    paddingHorizontal: 0
  }
});

export default DraftsScreen;
