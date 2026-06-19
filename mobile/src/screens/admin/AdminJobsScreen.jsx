import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton.jsx';
import AppTextInput from '../../components/AppTextInput.jsx';
import Card from '../../components/Card.jsx';
import Screen from '../../components/Screen.jsx';
import { useNotifications } from '../../contexts/NotificationContext.jsx';
import BackendApiService from '../../services/BackendApiService.js';
import { colors, spacing, text } from '../../theme.js';
import { formatShortTimestamp } from '../../utils/dateTime.js';

const AdminJobsScreen = () => {
  const { notify } = useNotifications();
  const [jobs, setJobs] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState('20');
  const [usernamePrefix, setUsernamePrefix] = useState('test_user');
  const [phonePrefix, setPhonePrefix] = useState('+1555000');
  const [postBodyPrefix, setPostBodyPrefix] = useState('');
  const [postReviewPrefix, setPostReviewPrefix] = useState('');
  const [commentMaxDepth, setCommentMaxDepth] = useState('3');
  const [commentReplyChance, setCommentReplyChance] = useState('0.5');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await BackendApiService.getAdminJobs(30));
    } catch (error) {
      notify({ message: error.message || 'Failed to load jobs', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const queue = async (kind) => {
    const numericCount = Number(count);
    if (!Number.isInteger(numericCount) || numericCount < 1) {
      notify({ message: 'Count must be at least 1.', type: 'warning' });
      return;
    }

    if (kind === 'users') {
      await BackendApiService.createUsersJob({ count: numericCount, usernamePrefix, phonePrefix });
    } else if (kind === 'posts') {
      await BackendApiService.createPostsJob({ count: numericCount, bodyPrefix: postBodyPrefix, reviewPrefix: postReviewPrefix });
    } else if (kind === 'comments') {
      await BackendApiService.createCommentsJob({
        count: numericCount,
        maxDepth: Number(commentMaxDepth),
        replyChance: Number(commentReplyChance),
        commentPrefix: '',
        replyPrefix: ''
      });
    } else if (kind === 'likes') {
      await BackendApiService.createLikesJob({ count: numericCount });
    }
    notify({ message: 'Job queued.', type: 'info' });
    await load();
  };

  const openDetail = async (jobId) => {
    setDetail(await BackendApiService.getAdminJob(jobId));
  };

  return (
    <Screen title="Admin Jobs" scroll={false}>
      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={jobs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <Card>
            <Text style={styles.title}>Queue jobs</Text>
            <AppTextInput label="Count" value={count} onChangeText={setCount} keyboardType="number-pad" />
            <AppTextInput label="Username prefix" value={usernamePrefix} onChangeText={setUsernamePrefix} autoCapitalize="none" />
            <AppTextInput label="Phone prefix" value={phonePrefix} onChangeText={setPhonePrefix} keyboardType="phone-pad" />
            <View style={styles.actions}>
              <AppButton variant="secondary" label="Users" onPress={() => queue('users')} />
              <AppButton variant="secondary" label="Likes" onPress={() => queue('likes')} />
            </View>
            <AppTextInput label="Post body prefix" value={postBodyPrefix} onChangeText={setPostBodyPrefix} />
            <AppTextInput label="Post review prefix" value={postReviewPrefix} onChangeText={setPostReviewPrefix} />
            <AppButton variant="secondary" label="Posts" onPress={() => queue('posts')} />
            <AppTextInput label="Comment max depth" value={commentMaxDepth} onChangeText={setCommentMaxDepth} keyboardType="number-pad" />
            <AppTextInput label="Reply chance" value={commentReplyChance} onChangeText={setCommentReplyChance} keyboardType="decimal-pad" />
            <AppButton variant="secondary" label="Comments" onPress={() => queue('comments')} />
            {detail ? (
              <View style={styles.detail}>
                <Text style={styles.title}>Job #{detail.id}</Text>
                <Text style={text.body}>{JSON.stringify(detail, null, 2)}</Text>
              </View>
            ) : null}
          </Card>
        )}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.title}>#{item.id} {item.jobType || item.type}</Text>
                <Text style={styles.muted}>{formatShortTimestamp(item.createdAt)} · {item.status}</Text>
              </View>
              <Text style={[styles.status, item.status === 'FAILED' && styles.failed]}>{item.status}</Text>
            </View>
            <AppButton variant="secondary" label="Details" onPress={() => openDetail(item.id)} />
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1 },
  title: text.h3,
  muted: text.muted,
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  status: { color: colors.success, fontWeight: '900' },
  failed: { color: colors.danger },
  detail: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }
});

export default AdminJobsScreen;
