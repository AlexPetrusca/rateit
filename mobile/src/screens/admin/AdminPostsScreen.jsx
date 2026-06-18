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

const AdminPostsScreen = () => {
  const { notify } = useNotifications();
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await BackendApiService.getAdminPosts({ page: 0, size: 50 });
      setPosts(page.content || []);
    } catch (error) {
      notify({ message: error.message || 'Failed to load posts', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    await BackendApiService.updateAdminPost(editing.ratingId || editing.postId, editing);
    setEditing(null);
    await load();
  };

  const remove = async (postId) => {
    await BackendApiService.deleteAdminPost(postId);
    await load();
  };

  return (
    <Screen title="Admin Posts" scroll={false}>
      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={posts}
        keyExtractor={(item) => String(item.ratingId || item.postId)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.title}>{item.body || item.topicText || item.rateableItemBody || 'Post'}</Text>
            <Text style={styles.muted}>@{item.authorUsername || item.author?.username || 'unknown'} · {formatShortTimestamp(item.createdAt)}</Text>
            <StarRating value={item.score} size="sm" />
            <Text style={text.body}>{item.reviewText || item.contentPreview || ''}</Text>
            {editing && (editing.ratingId || editing.postId) === (item.ratingId || item.postId) ? (
              <>
                <AppTextInput label="Topic" value={editing.body || editing.topicText || ''} onChangeText={(body) => setEditing((current) => ({ ...current, body, topicText: body }))} multiline />
                <AppTextInput label="Review" value={editing.reviewText || ''} onChangeText={(reviewText) => setEditing((current) => ({ ...current, reviewText }))} multiline />
                <AppTextInput label="Score" value={String(editing.score || '')} onChangeText={(score) => setEditing((current) => ({ ...current, score: Number(score) }))} keyboardType="decimal-pad" />
                <AppButton label="Save" onPress={save} />
                <AppButton variant="ghost" label="Cancel" onPress={() => setEditing(null)} />
              </>
            ) : (
              <View style={styles.actions}>
                <AppButton variant="secondary" label="Edit" onPress={() => setEditing(item)} />
                <AppButton variant="danger" label="Delete" onPress={() => remove(item.ratingId || item.postId)} />
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

export default AdminPostsScreen;
