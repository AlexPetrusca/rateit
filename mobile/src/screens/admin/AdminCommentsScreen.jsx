import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton.jsx';
import AppTextInput from '../../components/AppTextInput.jsx';
import Card from '../../components/Card.jsx';
import Screen from '../../components/Screen.jsx';
import StarRating from '../../components/StarRating.jsx';
import { useNotifications } from '../../contexts/NotificationContext.jsx';
import BackendApiService from '../../services/BackendApiService.js';
import { spacing, text } from '../../theme.js';
import { formatShortTimestamp } from '../../utils/dateTime.js';

const AdminCommentsScreen = () => {
  const { notify } = useNotifications();
  const [comments, setComments] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await BackendApiService.getAdminComments({ page: 0, size: 50 });
      setComments(page.content || []);
    } catch (error) {
      notify({ message: error.message || 'Failed to load comments', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    await BackendApiService.updateAdminComment(editing.commentId || editing.id, editing);
    setEditing(null);
    await load();
  };

  const remove = async (commentId) => {
    await BackendApiService.deleteAdminComment(commentId);
    await load();
  };

  return (
    <Screen title="Admin Comments" scroll={false}>
      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={comments}
        keyExtractor={(item) => String(item.commentId || item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.title}>{item.text || item.contentPreview || 'Comment'}</Text>
            <Text style={styles.muted}>@{item.authorUsername || item.author?.username || 'unknown'} · {formatShortTimestamp(item.createdAt)}</Text>
            <StarRating value={item.score} size="sm" />
            {editing && (editing.commentId || editing.id) === (item.commentId || item.id) ? (
              <>
                <AppTextInput label="Text" value={editing.text || ''} onChangeText={(nextText) => setEditing((current) => ({ ...current, text: nextText }))} multiline />
                <AppTextInput label="Score" value={String(editing.score || '')} onChangeText={(score) => setEditing((current) => ({ ...current, score: Number(score) }))} keyboardType="decimal-pad" />
                <AppButton label="Save" onPress={save} />
                <AppButton variant="ghost" label="Cancel" onPress={() => setEditing(null)} />
              </>
            ) : (
              <View style={styles.actions}>
                <AppButton variant="secondary" label="Edit" onPress={() => setEditing(item)} />
                <AppButton variant="danger" label="Delete" onPress={() => remove(item.commentId || item.id)} />
              </View>
            )}
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

export default AdminCommentsScreen;
